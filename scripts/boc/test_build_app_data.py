#!/usr/bin/env python3
"""Tests unitaires de build_app_data : fusion des fourchettes intraday
observées (data/live/, sortie de live_poll.py) dans les bougies OHLCV.

Exécution :
    cd scripts/boc && python3 -m unittest test_build_app_data -v
"""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from build_app_data import load_live_bounds, with_live_bounds


def row(**overrides) -> dict:
    base = {
        "time": "2026-07-08",
        "open": 29000.0,
        "high": 29500.0,
        "low": 29000.0,
        "close": 29500.0,
        "volume": 1200,
    }
    base.update(overrides)
    return base


class WithLiveBoundsTest(unittest.TestCase):
    def test_elargit_la_fourchette(self) -> None:
        out = with_live_bounds(row(), {"high": 29800.0, "low": 28700.0})
        self.assertEqual(out["high"], 29800.0)
        self.assertEqual(out["low"], 28700.0)
        # open/close : le BOC reste la vérité
        self.assertEqual(out["open"], 29000.0)
        self.assertEqual(out["close"], 29500.0)

    def test_ne_retrecit_jamais(self) -> None:
        # Une fourchette observée plus étroite que open/close (peu
        # d'échantillons en séance) ne doit pas rétrécir la bougie.
        out = with_live_bounds(row(), {"high": 29200.0, "low": 29100.0})
        self.assertEqual(out["high"], 29500.0)
        self.assertEqual(out["low"], 29000.0)

    def test_sans_donnee_live_bougie_inchangee(self) -> None:
        self.assertEqual(with_live_bounds(row(), None), row())

    def test_ne_mute_pas_la_bougie_d_origine(self) -> None:
        original = row()
        with_live_bounds(original, {"high": 30000.0, "low": 28000.0})
        self.assertEqual(original, row())


class LoadLiveBoundsTest(unittest.TestCase):
    def test_indexe_par_date_puis_ticker(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            live = Path(tmp)
            (live / "2026-07-08.json").write_text(
                json.dumps(
                    {
                        "SNTS": {"open": 29400, "high": 29800, "low": 29300,
                                 "close": 29500, "samples": 12,
                                 "first_seen": "x", "last_seen": "y"},
                    }
                ),
                encoding="utf-8",
            )
            bounds = load_live_bounds(live)
            self.assertEqual(
                bounds, {"2026-07-08": {"SNTS": {"high": 29800, "low": 29300}}}
            )

    def test_repertoire_absent(self) -> None:
        self.assertEqual(load_live_bounds(Path("/nonexistent-dir-xyz")), {})


if __name__ == "__main__":
    unittest.main()
