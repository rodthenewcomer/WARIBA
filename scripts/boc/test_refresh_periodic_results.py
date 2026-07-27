#!/usr/bin/env python3

from __future__ import annotations

import unittest

from refresh_periodic_results import build_record, period_descriptor


ANNUAL = {
    "fiscalYear": 2025,
    "revenueLabel": "PNB",
    "revenueM": 52805,
    "revenuePrevM": 45100,
    "netIncomeM": 36237,
    "netIncomePrevM": 27000,
}


class PeriodicResultsTest(unittest.TestCase):
    def test_identifie_periode(self) -> None:
        descriptor = period_descriptor(
            {"title": "Rapport dactivites — 1er trimestre 2026"}
        )
        self.assertEqual(descriptor["periodLabel"], "T1 2026")
        self.assertEqual(descriptor["asOfDate"], "2026-03-31")

    def test_extrait_pnb_et_resultat_net_en_millions(self) -> None:
        document = {
            "title": "Rapport dactivites — 1er trimestre 2026",
            "date": "2026-07-22",
            "url": "https://www.brvm.org/biic.pdf",
        }
        text = """
        Indicateurs du compte de résultat En millions de FCFA
        Produit Net Bancaire (PNB) 14 640 10 814 35%
        Résultat Net 7 957 5 391 48%
        """
        record = build_record("BICB", ANNUAL, document, text)
        self.assertIsNotNone(record)
        self.assertEqual(record["revenueM"], 14640)
        self.assertEqual(record["revenuePrevM"], 10814)
        self.assertEqual(record["netIncomeM"], 7957)
        self.assertEqual(record["netIncomePrevM"], 5391)
        self.assertEqual(record["status"], "integrated")

    def test_ignore_un_tableau_place_avant_le_pnb_sur_la_meme_ligne(self) -> None:
        document = {
            "title": "Rapport dactivites — 1er trimestre 2026",
            "date": "2026-07-22",
            "url": "https://www.brvm.org/biic.pdf",
        }
        text = """
        Crédits nets clientèle   1 187 915   1 151 536   3%   Produit Net Bancaire (PNB)   14 640   10 814   35%
        Titres   491 996   508 602   (3%)   Résultat Net   7 957   5 391   48%
        """
        record = build_record("BICB", ANNUAL, document, text)
        self.assertIsNotNone(record)
        self.assertEqual(record["revenueM"], 14640)
        self.assertEqual(record["netIncomeM"], 7957)

    def test_preserve_les_cellules_fcfa_completes(self) -> None:
        annual = {
            **ANNUAL,
            "revenueLabel": "CA",
            "revenueM": 29032,
            "revenuePrevM": 27333,
            "netIncomeM": -624,
            "netIncomePrevM": -2189,
        }
        document = {
            "title": "Rapport dactivites — 1er semestre 2026",
            "date": "2026-07-13",
            "url": "https://www.brvm.org/uniwax.pdf",
        }
        text = """
        Chiffre d'affaires             15 752 453 379        15 711 008 256            41 445 123       0,3%
        Résultat net                      771 279 466         8 216 545 331       -7 445 265 865       90,6%
        """
        record = build_record("UNXC", annual, document, text)
        self.assertIsNotNone(record)
        self.assertEqual(record["revenueM"], 15752)
        self.assertEqual(record["netIncomeM"], 771)
        self.assertEqual(record["netIncomePrevM"], 8217)

    def test_ne_confond_pas_intermediaire_et_annuel(self) -> None:
        self.assertIsNone(
            period_descriptor({"title": "États financiers exercice 2025"})
        )


if __name__ == "__main__":
    unittest.main()
