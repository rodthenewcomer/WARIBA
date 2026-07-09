#!/usr/bin/env python3
"""
Moteur d'alertes réelles : détecte des événements FACTUELS dans les
séries du bulletin officiel (data/boc/series/) sur les 5 dernières
séances, et écrit data/real/alerts.json consommé par l'app.

Règles (toutes descriptives, jamais prescriptives — contrainte
AMF-UMOA assumée depuis le début du produit) :
- variation forte : |variation jour| >= 5 % (la BRVM plafonne à ±7,5 %) ;
- plus haut / plus bas 52 semaines : clôture strictement au-delà de
  l'extrême des 251 séances précédentes (strict -> ne se redéclenche
  pas chaque jour d'une tendance), historique minimal 100 séances ;
- volume inhabituel : >= 3× la moyenne des 30 séances précédentes ET
  >= 500 titres (les ratios sur valeurs illiquides ne signifient rien) ;
- dividende payé dans la fenêtre ;
- états financiers publiés récemment (data/real/fundamentals.json).

Usage :
    python3 scripts/boc/build_alerts.py --out data/real/alerts.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

WINDOW = 5  # séances analysées
STRONG_MOVE_PCT = 5.0
HIGH_LOW_MIN_HISTORY = 100
VOLUME_RATIO_MIN = 3.0
VOLUME_FLOOR = 500
FUNDAMENTALS_FRESH_DAYS = 30


def fmt_fcfa(v: float) -> str:
    return f"{v:,.0f}".replace(",", " ") + " FCFA"


def fmt_pct(v: float) -> str:
    return f"{v:+.2f}".replace(".", ",").replace("+", "+").rstrip("0").rstrip(",") + " %"


def alert(
    kind: str,
    ticker: str,
    date: str,
    title: str,
    detail: str,
    severity: str,
    hour: str = "15:30",
) -> dict:
    return {
        "id": f"{kind}-{ticker}-{date}",
        "type": kind,
        "ticker": ticker,
        "title": title,
        "detail": detail,
        "time": f"{date}T{hour}:00+00:00",
        "severity": severity,
        "active": True,
        "basis": "réel",
    }


def strong_move_alert(ticker: str, name: str, rec: dict, prev_close: float) -> dict | None:
    chg = rec.get("day_change_pct")
    if chg is None or abs(chg) < STRONG_MOVE_PCT:
        return None
    return alert(
        "prix",
        ticker,
        rec["time"],
        f"{ticker} : {fmt_pct(chg)} sur la séance",
        f"{name} clôture à {fmt_fcfa(rec['close'])} le {rec['time']}, "
        f"contre {fmt_fcfa(prev_close)} la séance précédente "
        f"({rec['volume']:,} titres échangés).".replace(",", " "),
        "positive" if chg > 0 else "warning",
    )


def high_low_52w_alert(ticker: str, name: str, closes: list[float], rec: dict, idx: int) -> dict | None:
    """closes = clôtures jusqu'à idx inclus ; extrême STRICT vs les 251 précédentes."""
    if idx < HIGH_LOW_MIN_HISTORY:
        return None
    window = closes[max(0, idx - 251) : idx]
    close = closes[idx]
    if close > max(window):
        return alert(
            "prix",
            ticker,
            rec["time"],
            f"{ticker} au plus haut 52 semaines",
            f"{name} clôture à {fmt_fcfa(close)} le {rec['time']} — au-delà de "
            f"son plus haut des 52 dernières semaines ({fmt_fcfa(max(window))}).",
            "positive",
        )
    if close < min(window):
        return alert(
            "prix",
            ticker,
            rec["time"],
            f"{ticker} au plus bas 52 semaines",
            f"{name} clôture à {fmt_fcfa(close)} le {rec['time']} — sous son "
            f"plus bas des 52 dernières semaines ({fmt_fcfa(min(window))}).",
            "warning",
        )
    return None


def volume_alert(ticker: str, name: str, volumes: list[float], rec: dict, idx: int) -> dict | None:
    if idx < 30 or rec["volume"] < VOLUME_FLOOR:
        return None
    avg30 = sum(volumes[idx - 30 : idx]) / 30
    if avg30 <= 0:
        return None
    ratio = rec["volume"] / avg30
    if ratio < VOLUME_RATIO_MIN:
        return None
    return alert(
        "volume",
        ticker,
        rec["time"],
        f"Volume inhabituel sur {ticker}",
        f"{rec['volume']:,} titres {name} échangés le {rec['time']}, soit "
        f"{ratio:.1f}× la moyenne des 30 séances précédentes.".replace(",", " "),
        "warning" if ratio >= 5 else "info",
    )


def dividend_alert(ticker: str, name: str, rec: dict, window_dates: list[str]) -> dict | None:
    d = rec.get("last_dividend_date")
    if not d or d not in window_dates or rec["time"] != next(
        (wd for wd in window_dates if wd >= d), None
    ):
        return None
    net = rec.get("last_dividend_net")
    if not net:
        return None
    return alert(
        "dividende",
        ticker,
        rec["time"],
        f"Dividende {ticker} : {fmt_fcfa(net)} net par action",
        f"{name} a payé un dividende net de {fmt_fcfa(net)} par action "
        f"le {d} (source : bulletin officiel).",
        "info",
        hour="09:00",
    )


def fundamentals_alerts(fundamentals: dict, latest_date: str, names: dict[str, str]) -> list[dict]:
    from datetime import date

    out = []
    latest = date.fromisoformat(latest_date)
    for ticker, f in fundamentals.items():
        pub = date.fromisoformat(f["publishedOn"])
        if (latest - pub).days > FUNDAMENTALS_FRESH_DAYS:
            continue
        growth = ""
        if f.get("netIncomePrevM"):
            g = (f["netIncomeM"] / f["netIncomePrevM"] - 1) * 100
            growth = f" Résultat net {fmt_pct(g)} vs {f['fiscalYear'] - 1}."
        out.append(
            alert(
                "fondamental",
                ticker,
                f["publishedOn"],
                f"{ticker} : états financiers {f['fiscalYear']} publiés",
                f"{names.get(ticker, ticker)} a publié ses états financiers "
                f"{f['fiscalYear']} le {f['publishedOn']}.{growth}",
                "info",
                hour="09:00",
            )
        )
    return out


def build(series_dir: Path, fundamentals_path: Path) -> list[dict]:
    alerts: list[dict] = []
    latest_date = ""
    names: dict[str, str] = {}

    for f in sorted(series_dir.glob("*.json")):
        records = json.loads(f.read_text(encoding="utf-8"))
        if len(records) < 2:
            continue
        ticker = f.stem
        names[ticker] = records[-1]["name"]
        closes = [r["close"] for r in records]
        volumes = [r["volume"] for r in records]
        n = len(records)
        window_idx = range(max(1, n - WINDOW), n)
        window_dates = [records[i]["time"] for i in window_idx]
        latest_date = max(latest_date, records[-1]["time"])

        for i in window_idx:
            rec = records[i]
            for a in (
                strong_move_alert(ticker, names[ticker], rec, records[i - 1]["close"]),
                high_low_52w_alert(ticker, names[ticker], closes, rec, i),
                volume_alert(ticker, names[ticker], volumes, rec, i),
                dividend_alert(ticker, names[ticker], rec, window_dates),
            ):
                if a:
                    alerts.append(a)

    if fundamentals_path.exists() and latest_date:
        fundamentals = json.loads(fundamentals_path.read_text(encoding="utf-8"))
        alerts.extend(fundamentals_alerts(fundamentals, latest_date, names))

    # En période de tendance, une valeur peut inscrire un nouvel extrême
    # 52 semaines plusieurs séances de suite : on ne garde que le plus
    # récent par valeur et par direction (sinon la page devient du bruit).
    alerts.sort(key=lambda a: a["time"], reverse=True)
    seen: set[tuple[str, str]] = set()
    deduped = []
    for a in alerts:
        if "52 semaines" in a["title"]:
            key = (a["ticker"], a["severity"])
            if key in seen:
                continue
            seen.add(key)
        deduped.append(a)
    return deduped


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--series-dir", default="data/boc/series")
    parser.add_argument("--fundamentals", default="data/real/fundamentals.json")
    parser.add_argument("--out", default="data/real/alerts.json")
    args = parser.parse_args()

    alerts = build(Path(args.series_dir), Path(args.fundamentals))
    Path(args.out).write_text(
        json.dumps(alerts, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    by_type: dict[str, int] = {}
    for a in alerts:
        by_type[a["type"]] = by_type.get(a["type"], 0) + 1
    print(f"{len(alerts)} alertes -> {args.out} ({by_type})")


if __name__ == "__main__":
    main()
