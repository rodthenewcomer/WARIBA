#!/usr/bin/env python3
"""
Preuve de concept : extraction des fondamentaux bancaires depuis le
communiqué de résultats annuels (PDF), format texte libre mais avec des
tournures récurrentes ("X s'établit à N milliards FCFA ... contre M
milliards FCFA au 31 décembre N-1").

Validé sur NSIA Banque CI, exercice 2025. Hypothèse à vérifier ensuite :
est-ce que d'autres banques (SGBC, SIBC, CBIBF, BOAB) suivent un gabarit
de communiqué suffisamment proche pour que les mêmes regex s'appliquent ?

Usage :
    python3 parse_fundamentals_bank.py communique.pdf
"""

from __future__ import annotations

import re
import sys

import pdfplumber


def fr_billions(raw: str) -> float:
    return float(raw.strip().replace(",", ".").replace(" ", ""))


def normalize(text: str) -> str:
    """Apostrophes courbes -> droites, espaces insécables -> normaux, replie les retours à la ligne en espaces."""
    text = text.replace("’", "'").replace(" ", " ")
    return re.sub(r"\s+", " ", text)


def extract(text: str) -> dict:
    text = normalize(text)
    result: dict = {}

    m = re.search(
        r"Produit Net Bancaire \(PNB\).{0,30}?s'établit à ([\d,]+) milliards? FCFA "
        r"contre ([\d,]+) milliards? FCFA réalisés? (?:en|au) (?:décembre|31 décembre) (\d{4})",
        text,
    )
    if m:
        result["pnb"] = fr_billions(m.group(1))
        result["pnb_prev"] = fr_billions(m.group(2))
        result["prev_year"] = int(m.group(3))

    m = re.search(
        r"Résultat Net.{0,200}?s'établit à ([\d,]+) milliards? FCFA "
        r"contre ([\d,]+) milliards? FCFA au 31 décembre (\d{4})",
        text,
    )
    if m:
        result["net_income"] = fr_billions(m.group(1))
        result["net_income_prev"] = fr_billions(m.group(2))

    m = re.search(
        r"[Cc]oefficient d'exploitation.{0,60}?s'établit à ([\d,]+)\s*%.{0,60}?"
        r"contre ([\d,]+)\s*%",
        text,
    )
    if m:
        result["cir"] = fr_billions(m.group(1))
        result["cir_prev"] = fr_billions(m.group(2))

    m = re.search(
        r"co[ûu]t (?:net )?du risque.{0,60}?à (-?[\d,]+) milliards? FCFA "
        r"contre (-?[\d,]+) milliards? FCFA",
        text,
        re.IGNORECASE,
    )
    if m:
        result["cost_of_risk"] = fr_billions(m.group(1))
        result["cost_of_risk_prev"] = fr_billions(m.group(2))

    return result


def extract_columns(pdf: "pdfplumber.PDF") -> str:
    """Concatène chaque page colonne par colonne (gauche puis droite) — le
    communiqué est en 2 colonnes, extract_text() naïf entrelace les lignes
    des deux colonnes et casse les phrases."""
    parts = []
    for page in pdf.pages:
        w, h = page.width, page.height
        left = page.crop((0, 0, w / 2, h)).extract_text() or ""
        right = page.crop((w / 2, 0, w, h)).extract_text() or ""
        parts.append(left)
        parts.append(right)
    return "\n".join(parts)


def main() -> None:
    path = sys.argv[1]
    with pdfplumber.open(path) as pdf:
        full_text = extract_columns(pdf)

    result = extract(full_text)
    if not result:
        print("Aucun champ extrait — le gabarit du communiqué ne correspond pas.")
        sys.exit(1)

    for k, v in result.items():
        print(f"{k}: {v}")

    if "net_income" in result:
        growth = (result["net_income"] / result["net_income_prev"] - 1) * 100
        print(f"→ croissance résultat net : {growth:+.1f}%")
    if "pnb" in result:
        growth = (result["pnb"] / result["pnb_prev"] - 1) * 100
        print(f"→ croissance PNB : {growth:+.1f}%")


if __name__ == "__main__":
    main()
