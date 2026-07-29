#!/usr/bin/env python3

from __future__ import annotations

import json
import unittest
from pathlib import Path

from refresh_periodic_results import (
    build_record,
    columns_reversed_hint,
    descriptor_is_newer_than_annual,
    exceptional_item_note,
    latest_periodic_documents,
    period_descriptor,
)


ANNUAL = {
    "fiscalYear": 2025,
    "revenueLabel": "PNB",
    "revenueM": 52805,
    "revenuePrevM": 45100,
    "netIncomeM": 36237,
    "netIncomePrevM": 27000,
}


class PeriodicResultsTest(unittest.TestCase):
    def test_detecte_lordre_des_colonnes_depuis_les_dates(self) -> None:
        self.assertTrue(columns_reversed_hint("31/03/2025 | 31/03/2026", 2026))
        self.assertFalse(columns_reversed_hint("31/03/2026 | 31/03/2025", 2026))
        self.assertIsNone(columns_reversed_hint("Trimestre clos en mars", 2026))
        self.assertIsNone(
            columns_reversed_hint(
                "L'année 2026 poursuit le plan stratégique 2025-2027 avec trois priorités",
                2026,
            )
        )

    def test_boa_niger_scan_preserve_la_colonne_courante(self) -> None:
        annual = {
            "fiscalYear": 2025,
            "revenueLabel": "PNB",
            "revenueM": 21_125,
            "revenuePrevM": 21_380,
            "netIncomeM": 409,
            "netIncomePrevM": 5_002,
        }
        document = {
            "title": "Rapport dactivites — 1er trimestre 2026",
            "date": "2026-04-23",
            "url": "https://www.brvm.org/boa-niger.pdf",
        }
        text = """
        Produit Net bancaire 5 170,0 4 790,9 21 125,2 379,1 7,9%
        Résultat net 1 467,3 1 138,0 409,3 329,3 28,9%
        Le résultat net progresse pour atteindre 1 467 millions de FCFA
        contre 1 138 millions de FCFA un an auparavant.
        """
        record = build_record("BOAN", annual, document, text)
        self.assertEqual(
            (
                record["revenueM"],
                record["revenuePrevM"],
                record["netIncomeM"],
                record["netIncomePrevM"],
            ),
            (5_170, 4_791, 1_467, 1_138),
        )

    def test_boa_senegal_recoupe_libelle_flou_et_cellules_isolees(self) -> None:
        annual = {
            "fiscalYear": 2025,
            "revenueLabel": "PNB",
            "revenueM": 51_926,
            "revenuePrevM": 49_666,
            "netIncomeM": 21_905,
            "netIncomePrevM": 19_984,
        }
        document = {
            "title": "Rapport dactivites — 1er trimestre 2026",
            "date": "2026-04-24",
            "url": "https://www.brvm.org/boa-senegal.pdf",
        }
        text = """
        31/03/2025 | 31/03/2026
        PRODUICNEDEANCAIRES | 11 776 || 12 580 |
        RESULTAT NET

        5 230

        5 741
        """
        record = build_record("BOAS", annual, document, text)
        self.assertEqual(
            (
                record["revenueM"],
                record["revenuePrevM"],
                record["netIncomeM"],
                record["netIncomePrevM"],
            ),
            (12_580, 11_776, 5_741, 5_230),
        )

    def test_movis_conserve_les_fcfa_et_signale_la_cession_exceptionnelle(self) -> None:
        annual = {
            "fiscalYear": 2019,
            "revenueLabel": "CA",
            "revenueM": 12_079,
            "revenuePrevM": 14_289,
            "netIncomeM": -4_496,
            "netIncomePrevM": 170,
        }
        document = {
            "title": "Rapport dactivites — 1er trimestre 2020",
            "date": "2020-10-22",
            "url": "https://www.brvm.org/movis.pdf",
        }
        text = """
        Chiffre d'affaires 2 670 590 558  4 271 340 161  12 079 056 201
        Résultat net 6 663 820 481  -544 333 312  -4 495 590 615
        Le résultat net est bénéficiaire grâce au résultat HAO réalisé sur
        la cession de notre site.
        """
        record = build_record("SVOC", annual, document, text)
        self.assertEqual(
            (
                record["revenueM"],
                record["revenuePrevM"],
                record["netIncomeM"],
                record["netIncomePrevM"],
            ),
            (2_671, 4_271, 6_664, -544),
        )
        self.assertEqual(record["exceptionalItem"], exceptional_item_note(text))

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

    def test_prefere_le_commentaire_recoupe_quand_ocr_corrompt_le_tableau(self) -> None:
        annual = {
            **ANNUAL,
            "revenueLabel": "CA",
            "revenueM": 5139,
            "revenuePrevM": 4960,
            "netIncomeM": 2037,
            "netIncomePrevM": 1800,
        }
        document = {
            "title": "Rapport dactivites — 1er trimestre 2026",
            "date": "2026-04-23",
            "url": "https://www.brvm.org/nei-ceda.pdf",
        }
        text = """
        Chiffre d'affaires 115 101 101 48 534 243 5 139 206 354
        Résultat net -768 857 204 -189 949 576 2 036 626 234
        Le chiffre d'affaires réalisé est de 115 millions de FCFA au premier
        trimestre 2026 contre 49 millions de FCFA en 2025.
        La société affiche un résultat net de (-) 169 millions de FCFA au
        premier trimestre 2026 contre (-) 190 millions de FCFA en 2025.
        """
        record = build_record("NEIC", annual, document, text)
        self.assertIsNotNone(record)
        self.assertEqual(record["revenueM"], 115)
        self.assertEqual(record["revenuePrevM"], 49)
        self.assertEqual(record["netIncomeM"], -169)
        self.assertEqual(record["netIncomePrevM"], -190)

    def test_accepte_le_libelle_chiffres_affaires_au_pluriel(self) -> None:
        annual = {
            **ANNUAL,
            "revenueLabel": "CA",
            "revenueM": 189430,
            "revenuePrevM": 177000,
            "netIncomeM": 4663,
            "netIncomePrevM": 4200,
        }
        document = {
            "title": "Rapport dactivites — 1er trimestre 2026",
            "date": "2026-04-27",
            "url": "https://www.brvm.org/sodeci.pdf",
        }
        text = """
        Chiffres d'affaires  40 916  41 642  -726  -2%  189 430
        Résultat Net  1 318  604  714  118%  4 663
        Le chiffre d'affaires s'établit à 40 916 millions de FCFA au premier
        trimestre 2026, en baisse de 726 millions de FCFA par rapport à 2025.
        Le résultat d'exploitation ressort à 2 730 millions de FCFA, contre
        1 093 millions de FCFA un an plus tôt.
        Le résultat net s'établit à 1 318 millions de FCFA, en hausse de
        714 millions de FCFA par rapport au premier trimestre 2025.
        """
        record = build_record("SDCC", annual, document, text)
        self.assertIsNotNone(record)
        self.assertEqual(record["revenueM"], 40916)
        self.assertEqual(record["revenuePrevM"], 41642)
        self.assertEqual(record["netIncomeM"], 1318)
        self.assertEqual(record["netIncomePrevM"], 604)

    def test_ne_confond_pas_intermediaire_et_annuel(self) -> None:
        self.assertIsNone(
            period_descriptor({"title": "États financiers exercice 2025"})
        )


class GeneratedPeriodicCoverageTest(unittest.TestCase):
    ROOT = Path(__file__).resolve().parents[2]

    def test_latest_detected_releases_are_all_integrated(self) -> None:
        documents = json.loads(
            (self.ROOT / "data/real/documents.json").read_text(encoding="utf-8")
        )
        fundamentals = json.loads(
            (self.ROOT / "data/real/fundamentals.json").read_text(encoding="utf-8")
        )
        results = json.loads(
            (self.ROOT / "data/real/periodic-results.json").read_text(encoding="utf-8")
        )["results"]
        eligible = {
            ticker
            for ticker, document in latest_periodic_documents(documents).items()
            if descriptor_is_newer_than_annual(document, fundamentals.get(ticker))
        }
        self.assertFalse(eligible - results.keys())
        self.assertEqual(
            [
                ticker
                for ticker in sorted(eligible)
                if results[ticker].get("status") != "integrated"
            ],
            [],
        )
        self.assertGreaterEqual(len(eligible), 37)


if __name__ == "__main__":
    unittest.main()
