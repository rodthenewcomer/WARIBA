import { describe, expect, it } from "vitest";
import { getAllRealQuotes } from "./real-data";
import { getAllRealFundamentals } from "./real-fundamentals";
import { clearRealAnalysisCache, getRealAnalysis } from "./real-analysis";

describe("getRealAnalysis (univers réel committé)", () => {
  it("produit une analyse réelle pour chaque ticker couvert", () => {
    clearRealAnalysisCache();
    const quotes = getAllRealQuotes();
    const fundamentals = getAllRealFundamentals();

    // BBGC est cotée depuis septembre 2026 mais ses états financiers n'ont
    // pas encore été intégrés au registre vérifié : ne jamais inventer son score.
    expect(quotes).toHaveLength(49);
    expect(fundamentals).toHaveLength(48);
    const covered = new Set(fundamentals.map((item) => item.ticker));
    expect(quotes.filter((item) => !covered.has(item.ticker)).map((item) => item.ticker)).toEqual(["BBGC"]);
    for (const quote of quotes) {
      const analysis = getRealAnalysis(quote.ticker);
      if (!covered.has(quote.ticker)) {
        expect(analysis, quote.ticker).toBeNull();
        continue;
      }
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

  it("n'invente rien pour un ticker inconnu", () => {
    expect(getRealAnalysis("INCONNU")).toBeNull();
  });
});
