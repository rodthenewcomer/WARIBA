#!/usr/bin/env python3

from __future__ import annotations

import unittest
from unittest.mock import MagicMock, patch

import live_poll


def homepage(count: int = 48) -> bytes:
    return "".join(
        f"<span>T{i:02d}</span>&nbsp;<span>{1000 + i}</span>&nbsp;"
        "<span>1,2%</span>"
        for i in range(count)
    ).encode()


class FetchQuotesTest(unittest.TestCase):
    @patch("live_poll.time.sleep")
    @patch("live_poll.urlopen")
    def test_reessaie_apres_timeout(self, mocked_open: MagicMock, mocked_sleep: MagicMock) -> None:
        response = MagicMock()
        response.__enter__.return_value.read.return_value = homepage()
        mocked_open.side_effect = [TimeoutError("timeout"), response]

        quotes = live_poll.fetch_quotes()

        self.assertEqual(len(quotes), 48)
        self.assertEqual(mocked_open.call_count, 2)
        mocked_sleep.assert_called_once_with(1)

    @patch("live_poll.time.sleep")
    @patch("live_poll.urlopen")
    def test_format_incomplet_echoue_apres_reessais(
        self, mocked_open: MagicMock, mocked_sleep: MagicMock
    ) -> None:
        responses = []
        for _ in range(live_poll.FETCH_ATTEMPTS):
            response = MagicMock()
            response.__enter__.return_value.read.return_value = homepage(2)
            responses.append(response)
        mocked_open.side_effect = responses

        with self.assertRaisesRegex(RuntimeError, "après 4 tentatives"):
            live_poll.fetch_quotes()

        self.assertEqual(mocked_sleep.call_count, live_poll.FETCH_ATTEMPTS - 1)


if __name__ == "__main__":
    unittest.main()
