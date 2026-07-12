import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/real-dividends", () => ({
  dividendHistoryFor: (ticker: string) => {
    const fixture: Record<string, { date: string; net: number }[]> = {
      AAA: [
        { date: "2022-05-10", net: 100 },
        { date: "2023-05-12", net: 110 },
        { date: "2024-05-15", net: 120 },
      ],
      BBB: [{ date: "2024-05-20", net: 50 }],
      CCC: [{ date: "2024-09-01", net: 30 }],
    };
    return fixture[ticker] ?? [];
  },
}));

import { allDividendEvents, dividendsByMonth, isRecurring } from "./dividend-calendar";

describe("dividendsByMonth", () => {
  it("regroupe par mois calendaire, plus récurrent d'abord", () => {
    const byMonth = dividendsByMonth(["AAA", "BBB", "CCC"]);
    expect(byMonth[5]).toHaveLength(2);
    expect(byMonth[5][0].ticker).toBe("AAA");
    expect(byMonth[5][0].years).toEqual([2022, 2023, 2024]);
    expect(byMonth[5][0].lastNet).toBe(120);
    expect(byMonth[5][0].lastDate).toBe("2024-05-15");
    expect(byMonth[9]).toHaveLength(1);
    expect(byMonth[9][0].ticker).toBe("CCC");
  });

  it("mois sans historique : tableau vide", () => {
    const byMonth = dividendsByMonth(["AAA"]);
    expect(byMonth[1]).toEqual([]);
  });
});

describe("isRecurring", () => {
  it("au moins 2 années différentes : récurrent", () => {
    expect(isRecurring({ ticker: "AAA", lastNet: 1, lastDate: "x", years: [2022, 2023] })).toBe(true);
  });

  it("une seule année : pas récurrent", () => {
    expect(isRecurring({ ticker: "BBB", lastNet: 1, lastDate: "x", years: [2024] })).toBe(false);
  });
});

describe("allDividendEvents", () => {
  it("trie du plus récent au plus ancien, tous tickers", () => {
    const events = allDividendEvents(["AAA", "BBB", "CCC"]);
    expect(events[0]).toEqual({ ticker: "CCC", date: "2024-09-01", net: 30 });
    expect(events.at(-1)).toEqual({ ticker: "AAA", date: "2022-05-10", net: 100 });
    expect(events).toHaveLength(5);
  });
});
