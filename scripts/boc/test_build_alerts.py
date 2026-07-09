#!/usr/bin/env python3
"""Tests unitaires du moteur d'alertes réelles.

Exécution :
    cd scripts/boc && python3 -m unittest test_build_alerts -v
"""

from __future__ import annotations

import unittest

from build_alerts import (
    HIGH_LOW_MIN_HISTORY,
    high_low_52w_alert,
    strong_move_alert,
    volume_alert,
)


def rec(**overrides) -> dict:
    base = {
        "time": "2026-07-06",
        "close": 10000.0,
        "volume": 1000,
        "day_change_pct": 1.0,
        "last_dividend_date": None,
        "last_dividend_net": None,
    }
    base.update(overrides)
    return base


class StrongMoveTest(unittest.TestCase):
    def test_seuil_5_pct(self) -> None:
        self.assertIsNone(strong_move_alert("X", "X SA", rec(day_change_pct=4.99), 9500))
        a = strong_move_alert("X", "X SA", rec(day_change_pct=6.38), 9400)
        self.assertIsNotNone(a)
        self.assertEqual(a["severity"], "positive")
        self.assertEqual(a["basis"], "réel")

    def test_baisse_forte_en_warning(self) -> None:
        a = strong_move_alert("X", "X SA", rec(day_change_pct=-5.5), 10600)
        self.assertEqual(a["severity"], "warning")
        self.assertIn("-5,5", a["title"])


class HighLow52wTest(unittest.TestCase):
    def _closes(self, n: int, last: float) -> list[float]:
        return [100.0] * (n - 1) + [last]

    def test_plus_haut_strict(self) -> None:
        closes = self._closes(300, 101.0)
        a = high_low_52w_alert("X", "X SA", closes, rec(close=101.0), len(closes) - 1)
        self.assertIsNotNone(a)
        self.assertIn("plus haut 52 semaines", a["title"])

    def test_egalite_ne_declenche_pas(self) -> None:
        # clôture ÉGALE au plus haut : pas un nouveau plus haut
        closes = self._closes(300, 100.0)
        self.assertIsNone(
            high_low_52w_alert("X", "X SA", closes, rec(close=100.0), len(closes) - 1)
        )

    def test_historique_insuffisant(self) -> None:
        closes = self._closes(HIGH_LOW_MIN_HISTORY - 1, 200.0)
        self.assertIsNone(
            high_low_52w_alert("X", "X SA", closes, rec(close=200.0), len(closes) - 1)
        )

    def test_plus_bas_en_warning(self) -> None:
        closes = self._closes(300, 99.0)
        a = high_low_52w_alert("X", "X SA", closes, rec(close=99.0), len(closes) - 1)
        self.assertEqual(a["severity"], "warning")


class VolumeTest(unittest.TestCase):
    def test_ratio_et_plancher(self) -> None:
        volumes = [100.0] * 60
        # 3× la moyenne mais sous le plancher de 500 titres : ignoré
        self.assertIsNone(
            volume_alert("X", "X SA", volumes + [300], rec(volume=300), 60)
        )
        # 6× la moyenne et 600 titres : alerte, sévérité warning (>= 5×)
        a = volume_alert("X", "X SA", volumes + [600], rec(volume=600), 60)
        self.assertIsNotNone(a)
        self.assertEqual(a["severity"], "warning")

    def test_sous_le_ratio_min(self) -> None:
        volumes = [500.0] * 60
        self.assertIsNone(
            volume_alert("X", "X SA", volumes + [1000], rec(volume=1000), 60)
        )


if __name__ == "__main__":
    unittest.main()
