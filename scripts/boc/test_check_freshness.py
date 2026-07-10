#!/usr/bin/env python3
"""Tests du watchdog de fraîcheur — logique de dates pure (le réseau
de bulletin_online n'est pas testé ici, il est isolé exprès)."""

from __future__ import annotations

import unittest
from datetime import date

from check_freshness import latest_trading_date, missing_weekdays


class TestLatestTradingDate(unittest.TestCase):
    def test_max_des_dates(self) -> None:
        snap = {
            "SNTS": {"asOfDate": "2026-07-09"},
            "SVOC": {"asOfDate": "2019-05-10"},  # valeur inactive réelle
            "PALC": {"asOfDate": "2026-07-08"},
        }
        self.assertEqual(latest_trading_date(snap), "2026-07-09")


class TestMissingWeekdays(unittest.TestCase):
    def test_a_jour_aucun_manquant(self) -> None:
        # Ingéré jeudi, on est vendredi : le bulletin de vendredi ne
        # paraît que le soir — rien de manquant.
        self.assertEqual(missing_weekdays("2026-07-09", date(2026, 7, 10)), [])

    def test_incident_du_10_juillet(self) -> None:
        # Le cas réel : ingéré mercredi 8, on est vendredi 10 → il
        # manque la séance de jeudi 9.
        self.assertEqual(
            missing_weekdays("2026-07-08", date(2026, 7, 10)), ["2026-07-09"]
        )

    def test_weekend_ignore(self) -> None:
        # Ingéré vendredi 10, on est lundi 13 : samedi/dimanche ne
        # comptent pas — rien de manquant.
        self.assertEqual(missing_weekdays("2026-07-10", date(2026, 7, 13)), [])

    def test_lundi_manquant_vu_le_mardi(self) -> None:
        # Ingéré vendredi 10, on est mardi 14 → il manque lundi 13.
        self.assertEqual(
            missing_weekdays("2026-07-10", date(2026, 7, 14)), ["2026-07-13"]
        )

    def test_plusieurs_jours(self) -> None:
        # Ingéré lundi 6, on est vendredi 10 → mardi, mercredi, jeudi.
        self.assertEqual(
            missing_weekdays("2026-07-06", date(2026, 7, 10)),
            ["2026-07-07", "2026-07-08", "2026-07-09"],
        )


if __name__ == "__main__":
    unittest.main()
