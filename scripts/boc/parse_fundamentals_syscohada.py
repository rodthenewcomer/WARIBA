#!/usr/bin/env python3
"""
Extraction des fondamentaux depuis un compte de résultat SYSCOHADA
"Système Normal" (états financiers PDF publiés sur la fiche société
BRVM, /fr/rapports-societe-cotes/[slug]).

Contrairement au format bancaire (communiqués en texte libre, un gabarit
différent par société — voir parse_fundamentals_bank.py), les libellés
du compte de résultat SYSCOHADA sont fixés par la norme comptable
elle-même et donc identiques d'une société à l'autre, quelle que soit
la mise en page du PDF (tableau structuré multi-pages chez ERIUM CI,
résumé compact une page chez Palm CI). Extraction par TABLEAU (pas texte
brut) : les nombres français groupés par espaces ("10 074 573 973")
sont ambigus une fois aplatis en texte, mais restent des cellules
distinctes dans les tables détectées par pdfplumber.

Validé sur ERIUM CI (ex Air Liquide) et Palm CI.

Usage :
    python3 parse_fundamentals_syscohada.py etats_financiers.pdf
"""

from __future__ import annotations

import re
import sys
import unicodedata

import pdfplumber

LABELS = {
    "revenue": r"CHIFFRE D'AFFAIRES",
    "ordinary_income": r"RESULTAT DES ACTIVITES ORDINAIRES",
    "net_income": r"RESULTAT NET",
}


def strip_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    )

DIVIDEND_RE = re.compile(
    r"dividende brut propos[ée]?\s+est\s+de\s+([\d\s,]+)\s*francs?\s*CFA",
    re.IGNORECASE,
)


def fr_number(raw: str) -> float | None:
    s = (raw or "").replace("\xa0", " ").replace(" ", "").replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def find_in_tables(tables: list[list[list[str | None]]], label_pattern: str) -> tuple[float, float] | None:
    # Volontairement sensible à la casse et aux accents : une version
    # insensible fait remonter par erreur la ligne "Résultat net" du bilan
    # (report à nouveau) au lieu de celle du compte de résultat — cf.
    # scripts/boc/README.md pour le détail de cette régression constatée
    # sur CIEC. Un vrai fix demanderait de restreindre la recherche à la
    # section "COMPTE DE RESULTAT" du document, pas juste ignorer casse/accents.
    regex = re.compile(label_pattern)
    for table in tables:
        for row in table:
            for cell in row:
                if cell and regex.search(cell):
                    # Les deux dernières cellules non vides de la ligne sont
                    # les valeurs N et N-1 (le nombre de cellules vides avant
                    # varie selon la mise en page, donc pas d'index fixe).
                    values = [c for c in row if c and re.match(r"^-?[\d\s,]+$", c.strip())]
                    if len(values) >= 2:
                        a, b = fr_number(values[-2]), fr_number(values[-1])
                        if a is not None and b is not None:
                            return a, b
    return None


def extract(pdf: pdfplumber.PDF) -> dict:
    result: dict = {}
    all_tables = [t for page in pdf.pages for t in page.extract_tables()]

    for key, label in LABELS.items():
        found = find_in_tables(all_tables, label)
        if found:
            result[key], result[f"{key}_prev"] = found

    full_text = "\n".join((p.extract_text() or "") for p in pdf.pages)
    m = DIVIDEND_RE.search(full_text)
    if m:
        result["proposed_gross_dividend"] = fr_number(m.group(1))

    return result


def main() -> None:
    path = sys.argv[1]
    with pdfplumber.open(path) as pdf:
        result = extract(pdf)

    if not result:
        print("Aucun champ extrait.")
        sys.exit(1)

    for k, v in result.items():
        print(f"{k}: {v}")

    if result.get("net_income_prev"):
        growth = (result["net_income"] / result["net_income_prev"] - 1) * 100
        print(f"→ croissance résultat net : {growth:+.1f}%")
    if result.get("revenue_prev"):
        growth = (result["revenue"] / result["revenue_prev"] - 1) * 100
        print(f"→ croissance CA : {growth:+.1f}%")


if __name__ == "__main__":
    main()
