#!/usr/bin/env python3
"""Structure les derniers résultats trimestriels et semestriels BRVM.

Les résultats intermédiaires restent séparés des fondamentaux annuels :
ils rendent la nouvelle publication visible immédiatement sans mélanger un
T1/S1 avec un exercice complet. CA/PNB et résultat net ne sont intégrés que
si deux périodes comparables sont extraites et si leur échelle recoupe le
dernier exercice annuel validé.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from refresh_fundamentals import (
    LABELS,
    NUMBER_RE,
    UNITS,
    document_year,
    download,
    extract_pairs,
    extract_pdf_text,
    matching_alias,
    normalized,
    parse_number,
    to_millions,
)

PERIODS = (
    (("1er semestre", "premier semestre"), "semiannual", "S1", 6, 0.50),
    (("2eme semestre", "deuxieme semestre"), "semiannual", "S2", 12, 1.00),
    (("1er trimestre", "premier trimestre"), "quarterly", "T1", 3, 0.25),
    (("2eme trimestre", "deuxieme trimestre"), "quarterly", "T2", 6, 0.50),
    (("3eme trimestre", "troisieme trimestre"), "quarterly", "T3", 9, 0.75),
    (("4eme trimestre", "quatrieme trimestre"), "quarterly", "T4", 12, 1.00),
)


def period_descriptor(document: dict) -> dict | None:
    title = normalized(str(document.get("title", "")))
    year = document_year(title)
    if year is None:
        return None
    for aliases, period_type, code, month, expected_ratio in PERIODS:
        if any(alias in title for alias in aliases):
            day = 31 if month in (3, 12) else 30
            return {
                "fiscalYear": year,
                "periodType": period_type,
                "periodCode": code,
                "periodLabel": f"{code} {year}",
                "comparisonLabel": f"{code} {year - 1}",
                "asOfDate": f"{year}-{month:02d}-{day:02d}",
                "expectedAnnualRatio": expected_ratio,
            }
    return None


def latest_periodic_documents(documents: list[dict]) -> dict[str, dict]:
    latest: dict[str, dict] = {}
    for document in documents:
        descriptor = period_descriptor(document)
        ticker = document.get("ticker")
        if not descriptor or not ticker:
            continue
        current = latest.get(ticker)
        candidate_key = (
            document.get("date", ""),
            descriptor["fiscalYear"],
            descriptor["asOfDate"],
        )
        current_descriptor = period_descriptor(current) if current else None
        current_key = (
            current.get("date", ""),
            current_descriptor["fiscalYear"],
            current_descriptor["asOfDate"],
        ) if current and current_descriptor else ("", 0, "")
        if candidate_key > current_key:
            latest[ticker] = document
    return latest


def pending_documents(
    documents: list[dict],
    fundamentals: dict[str, dict],
    results: dict[str, dict],
    retry_review: bool = False,
) -> dict[str, dict]:
    return {
        ticker: document
        for ticker, document in latest_periodic_documents(documents).items()
        if descriptor_is_newer_than_annual(document, fundamentals.get(ticker))
        and (
            results.get(ticker, {}).get("source") != document.get("url")
            or (
                retry_review
                and results.get(ticker, {}).get("status") != "integrated"
            )
        )
    }


def descriptor_is_newer_than_annual(document: dict, annual: dict | None) -> bool:
    descriptor = period_descriptor(document)
    return bool(
        descriptor
        and annual
        and descriptor["fiscalYear"] > annual.get("fiscalYear", 0)
    )


def relative_scale_score(value: int, annual: float, expected_ratio: float) -> float:
    ratio = abs(value) / max(abs(annual), 1)
    if ratio < 0.005 or ratio > 1.75:
        return math.inf
    return abs(math.log(max(ratio, 1e-9) / expected_ratio))


def income_scale_score(value: int, annual: float, expected_ratio: float) -> float:
    ratio = abs(value) / max(abs(annual), 1)
    if ratio < 0.005 or ratio > 8:
        return math.inf
    return abs(math.log(max(ratio, 1e-9) / expected_ratio))


def extract_strict_pairs(
    text: str, aliases: tuple[str, ...]
) -> list[tuple[float, float]]:
    pairs: list[tuple[float, float]] = []
    for raw_line in text.splitlines():
        line = normalized(raw_line)
        alias = matching_alias(line, aliases)
        if alias is None:
            continue
        # pdftotext -layout sépare les cellules par au moins deux espaces.
        # Les espaces simples à l'intérieur d'un montant sont des séparateurs
        # de milliers et doivent rester dans la même cellule.
        cells = [cell.strip() for cell in re.split(r"\s{2,}|\t+", raw_line) if cell.strip()]
        alias_index = next(
            (
                index
                for index, cell in enumerate(cells)
                if matching_alias(normalized(cell), (alias,)) is not None
            ),
            0,
        )
        values = []
        for cell in cells[alias_index + 1 :]:
            matches = NUMBER_RE.findall(cell)
            if not matches:
                continue
            value = parse_number(matches[0])
            if value is not None:
                values.append(value)
        if len(values) >= 2 and (values[0], values[1]) not in pairs:
            pairs.append((values[0], values[1]))
    return pairs


def extract_prose_million_pairs(
    text: str, aliases: tuple[str, ...]
) -> list[tuple[float, float]]:
    """Extrait les comparaisons explicites « X millions ... contre Y millions ».

    Le commentaire de direction répète souvent les chiffres du tableau et
    permet de corriger une cellule dont l'OCR confond 1/7 ou 0/8. Ces paires
    sont déjà libellées en millions et sont converties en FCFA bruts afin de
    rester compatibles avec la sélection d'unité existante.
    """

    prose = normalized(text)
    amount_re = re.compile(
        r"(?P<sign>\(\s*-\s*\)|[-−])?\s*"
        r"(?P<value>\d{1,3}(?:[ .]\d{3})*|\d+)\s+millions?"
    )
    pairs: list[tuple[float, float]] = []

    def amount(match: re.Match[str]) -> float | None:
        value = parse_number(match.group("value"))
        if value is None:
            return None
        if match.group("sign"):
            value = -abs(value)
        return value * 1_000_000

    for alias in aliases:
        for found in re.finditer(re.escape(alias), prose):
            window = prose[found.end() : found.end() + 420]
            if "contre" not in window:
                continue
            before, after = window.split("contre", 1)
            boundaries = (
                "chiffre d'affaires",
                "chiffres d'affaires",
                "produit net bancaire",
                "resultat d'exploitation",
                "resultat financier",
                "resultat des activites ordinaires",
                "resultat net",
            )
            if any(boundary in before for boundary in boundaries):
                continue
            current_matches = list(amount_re.finditer(before))
            previous_match = amount_re.search(after)
            if not current_matches or previous_match is None:
                continue
            current = amount(current_matches[-1])
            previous = amount(previous_match)
            if current is None or previous is None:
                continue
            pair = (current, previous)
            if pair not in pairs:
                pairs.append(pair)
    return pairs


def columns_reversed_hint(text: str, fiscal_year: int) -> bool | None:
    current = str(fiscal_year)
    previous = str(fiscal_year - 1)
    for raw_line in text.splitlines():
        line = normalized(raw_line)
        is_compact_header = len(line) <= 60 or "/" in line
        if is_compact_header and current in line and previous in line:
            return line.find(current) > line.find(previous)
    return None


def exceptional_item_note(text: str) -> str | None:
    prose = normalized(text)
    if "cession" in prose and (
        "resultat hao" in prose or "resultat net" in prose
    ):
        return (
            "Élément exceptionnel non récurrent : résultat net soutenu par "
            "une cession d'actif, selon la publication officielle."
        )
    return None


def choose_periodic_values(
    text: str, annual: dict, descriptor: dict
) -> tuple[dict, dict] | None:
    revenue_key = "pnb" if annual.get("revenueLabel") == "PNB" else "revenue"
    prose_revenue_pairs = extract_prose_million_pairs(text, LABELS[revenue_key])
    prose_income_pairs = extract_prose_million_pairs(text, LABELS["net_income"])
    prose_recouped = bool(prose_revenue_pairs and prose_income_pairs)
    if prose_recouped:
        revenue_pairs = prose_revenue_pairs
        income_pairs = prose_income_pairs
    else:
        revenue_pairs = list(
            dict.fromkeys(
                prose_revenue_pairs
                + extract_strict_pairs(text, LABELS[revenue_key])
                + extract_pairs(text, LABELS[revenue_key])
            )
        )
        income_pairs = list(
            dict.fromkeys(
                prose_income_pairs
                + extract_strict_pairs(text, LABELS["net_income"])
                + extract_pairs(text, LABELS["net_income"])
            )
        )
    if not revenue_pairs or not income_pairs:
        return None

    expected_ratio = descriptor["expectedAnnualRatio"]
    reversed_hint = columns_reversed_hint(text, descriptor["fiscalYear"])
    expected_reversed = reversed_hint if reversed_hint is not None else False
    exceptional_item = exceptional_item_note(text)
    max_income_multiple = 4 if exceptional_item else 2
    choices = []
    for unit in UNITS:
        for reverse in (False, True):
            for revenue_pair in revenue_pairs:
                revenue_current_raw, revenue_previous_raw = (
                    (revenue_pair[1], revenue_pair[0]) if reverse else revenue_pair
                )
                revenue_current = to_millions(revenue_current_raw, unit)
                revenue_previous = to_millions(revenue_previous_raw, unit)
                revenue_score = relative_scale_score(
                    revenue_current, annual["revenueM"], expected_ratio
                )
                previous_annual = annual.get("revenuePrevM") or annual["revenueM"]
                previous_score = relative_scale_score(
                    revenue_previous, previous_annual, expected_ratio
                )
                if not math.isfinite(revenue_score + previous_score):
                    continue
                for income_pair in income_pairs:
                    income_current_raw, income_previous_raw = (
                        (income_pair[1], income_pair[0]) if reverse else income_pair
                    )
                    income_current = to_millions(income_current_raw, unit)
                    income_previous = to_millions(income_previous_raw, unit)
                    if (
                        max(abs(income_current), abs(income_previous))
                        > revenue_current * max_income_multiple
                    ):
                        continue
                    income_score = income_scale_score(
                        income_current,
                        annual.get("netIncomeM") or revenue_current,
                        expected_ratio,
                    )
                    previous_income_score = income_scale_score(
                        income_previous,
                        annual.get("netIncomePrevM")
                        or annual.get("netIncomeM")
                        or revenue_previous,
                        expected_ratio,
                    )
                    if not math.isfinite(income_score + previous_income_score):
                        continue
                    score = (
                        revenue_score
                        + previous_score
                        + income_score * 0.2
                        + previous_income_score * 0.2
                    )
                    if reverse != expected_reversed:
                        score += 3
                    choices.append(
                        (
                            score,
                            unit,
                            reverse,
                            revenue_current,
                            revenue_previous,
                            income_current,
                            income_previous,
                        )
                    )
    if not choices:
        return None
    (
        score,
        unit,
        reverse,
        revenue_current,
        revenue_previous,
        income_current,
        income_previous,
    ) = min(choices, key=lambda item: item[0])
    # Deux phrases de gestion donnant explicitement N et N-1 constituent un
    # second tableau narratif. Elles autorisent une saisonnalité atypique tout
    # en conservant une confiance moyenne via le scaleScore public.
    if score > (7 if prose_recouped else 3):
        return None

    values = {
        "revenueM": revenue_current,
        "revenuePrevM": revenue_previous,
        "netIncomeM": income_current,
        "netIncomePrevM": income_previous,
        "ordinaryIncomeM": None,
        "ordinaryIncomePrevM": None,
    }
    ordinary_pairs = extract_strict_pairs(text, LABELS["ordinary_income"])
    if not ordinary_pairs:
        ordinary_pairs = extract_pairs(text, LABELS["ordinary_income"])
    if ordinary_pairs:
        ordinary_choices = []
        for pair in ordinary_pairs:
            current_raw, previous_raw = (pair[1], pair[0]) if reverse else pair
            current = to_millions(current_raw, unit)
            previous = to_millions(previous_raw, unit)
            if max(abs(current), abs(previous)) <= revenue_current * 2:
                ordinary_choices.append(
                    (
                        abs(current - income_current) + abs(previous - income_previous),
                        current,
                        previous,
                    )
                )
        if ordinary_choices:
            _, current, previous = min(ordinary_choices)
            values["ordinaryIncomeM"] = current
            values["ordinaryIncomePrevM"] = previous
    return values, {
        "unit": unit,
        "columnsReversed": reverse,
        "columnsReversedHint": reversed_hint,
        "exceptionalItem": exceptional_item,
        "scaleScore": round(score, 3),
        "proseRecouped": prose_recouped,
    }


def build_record(ticker: str, annual: dict, document: dict, text: str) -> dict | None:
    descriptor = period_descriptor(document)
    if descriptor is None:
        return None
    chosen = choose_periodic_values(text, annual, descriptor)
    if chosen is None:
        return None
    values, audit = chosen
    public_descriptor = {
        key: value
        for key, value in descriptor.items()
        if key != "expectedAnnualRatio"
    }
    return {
        "ticker": ticker,
        **public_descriptor,
        "revenueLabel": annual["revenueLabel"],
        **values,
        "source": document["url"],
        "publishedOn": document["date"],
        "status": "integrated",
        "confidence": "high" if audit["scaleScore"] <= 1.5 else "medium",
        "sourceType": "publication officielle BRVM",
        "unit": "millions FCFA",
        **(
            {"exceptionalItem": audit["exceptionalItem"]}
            if audit.get("exceptionalItem")
            else {}
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--documents", default="data/real/documents.json")
    parser.add_argument("--fundamentals", default="data/real/fundamentals.json")
    parser.add_argument("--out", default="data/real/periodic-results.json")
    parser.add_argument("--pending-count", action="store_true")
    parser.add_argument("--retry-review", action="store_true")
    parser.add_argument(
        "--force-ticker",
        action="append",
        default=[],
        help="Réextrait un ticker déjà intégré après une amélioration du parseur.",
    )
    parser.add_argument("--max-documents", type=int, default=6)
    args = parser.parse_args()

    documents = json.loads(Path(args.documents).read_text(encoding="utf-8"))
    fundamentals = json.loads(Path(args.fundamentals).read_text(encoding="utf-8"))
    out_path = Path(args.out)
    existing = json.loads(out_path.read_text(encoding="utf-8")) if out_path.exists() else {}
    results = existing.get("results", existing)
    pending = pending_documents(
        documents, fundamentals, results, retry_review=args.retry_review
    )
    if args.force_ticker:
        latest = latest_periodic_documents(documents)
        for ticker in {item.upper() for item in args.force_ticker}:
            document = latest.get(ticker)
            if document and descriptor_is_newer_than_annual(
                document, fundamentals.get(ticker)
            ):
                pending[ticker] = document
    if args.pending_count:
        print(len(pending))
        return

    queue = sorted(
        pending.items(), key=lambda item: item[1].get("date", ""), reverse=True
    )[: max(1, args.max_documents)]
    for ticker, document in queue:
        descriptor = period_descriptor(document)
        try:
            with tempfile.TemporaryDirectory(prefix=f"wariba-periodic-{ticker.lower()}-") as tmp:
                workdir = Path(tmp)
                pdf_path = workdir / "source.pdf"
                download(document["url"], pdf_path)
                text = extract_pdf_text(pdf_path, workdir)
                record = build_record(ticker, fundamentals[ticker], document, text)
            if record is None:
                raise RuntimeError("CA/PNB et résultat net N/N-1 non recoupés")
            results[ticker] = record
            print(
                f"{ticker}: {record['periodLabel']} · {record['revenueLabel']} "
                f"{record['revenueM']:,} M · RN {record['netIncomeM']:,} M"
            )
        except Exception as error:
            public_descriptor = {
                key: value
                for key, value in (descriptor or {}).items()
                if key != "expectedAnnualRatio"
            }
            results[ticker] = {
                "ticker": ticker,
                **public_descriptor,
                "source": document["url"],
                "publishedOn": document["date"],
                "status": "review_required",
                "confidence": "low",
                "sourceType": "publication officielle BRVM",
                "detail": (
                    "Publication détectée; chiffres non publiés faute de "
                    "recoupement automatique suffisant."
                ),
            }
            print(f"{ticker}: publication détectée, extraction à revoir: {error}")

    public_results = {}
    for ticker, record in results.items():
        public_record = {
            key: value
            for key, value in record.items()
            if key not in {"audit", "expectedAnnualRatio"}
        }
        if public_record.get("status") == "review_required":
            public_record["detail"] = (
                "Publication détectée; chiffres non publiés faute de "
                "recoupement automatique suffisant."
            )
        public_results[ticker] = public_record
    payload = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "results": dict(sorted(public_results.items())),
    }
    out_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    integrated = sum(
        item.get("status") == "integrated" for item in results.values()
    )
    print(f"Résultats intermédiaires: {integrated}/{len(results)} intégrés.")


if __name__ == "__main__":
    main()
