import { describe, expect, it } from "vitest";
import { getAllRealQuotes } from "./real-data";
import { getAllRealFundamentals } from "./real-fundamentals";
import { clearRealAnalysisCache, getRealAnalysis } from "./real-analysis";

describe("getRealAnalysis (univers réel committé)", () => {
  it("produit une analyse réelle pour chaque ticker couvert", () => {
    clearRealAnalysisCache();
    const quotes = getAllRealQuotes();
    const fundamentals = getAllRealFundamentals();

    expect(quotes).toHaveLength(49);
    expect(fundamentals).toHaveLength(48);
    for (const quote of quotes.filter((quote) => fundamentals.some((fundamental) => fundamental.ticker === quote.ticker))) {
      const analysis = getRealAnalysis(quote.ticker);
      expect(analysis, quote.ticker).not.toBeNull();
      expect(analysis?.overallScore, quote.ticker).toBeGreaterThanOrEqual(0);
      expect(analysis?.overallScore, quote.ticker).toBeLessThanOrEqual(100);
      expect(analysis?.confidence.coveragePct, quote.ticker).toBeGreaterThan(0);
      for (const key of ["quality", "valuation", "momentum", "liquidity"] as const) {
        expect(analysis?.scores[key], `${quote.ticker} ${key}`).toBeGreaterThan(0);
        expect(analysis?.scores[key], `${quote.ticker} ${key}`).toBeLessThan(100);
      }
      expect(analysis?.scores.dividend, `${quote.ticker} dividend`).toBeLessThan(100);
    }
  });

  it("ne fabrique pas de fondamentaux pour la nouvelle cotation BBGC", () => {
    expect(getAllRealQuotes().some((quote) => quote.ticker === "BBGC")).toBe(true);
    expect(getAllRealFundamentals().some((fundamental) => fundamental.ticker === "BBGC")).toBe(false);
    expect(getRealAnalysis("BBGC")).toBeNull();
  });

  it("n'invente rien pour un ticker inconnu", () => {
    expect(getRealAnalysis("INCONNU")).toBeNull();
  });
});
