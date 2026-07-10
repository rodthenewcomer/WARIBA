import { describe, expect, it } from "vitest";
import {
  computePositions,
  valuePortfolio,
  type PortfolioTransaction,
} from "./portfolio";

function tx(over: Partial<PortfolioTransaction>): PortfolioTransaction {
  return {
    id: Math.random().toString(36).slice(2),
    ticker: "SNTS",
    side: "achat",
    date: "2026-01-05",
    quantity: 10,
    price: 25_000,
    ...over,
  };
}

describe("computePositions — coût moyen (PRU)", () => {
  it("un achat simple : PRU = prix, investi = qté × prix", () => {
    const [p] = computePositions([tx({})]);
    expect(p.quantity).toBe(10);
    expect(p.averageCost).toBe(25_000);
    expect(p.invested).toBe(250_000);
    expect(p.realizedPnl).toBe(0);
  });

  it("deux achats à prix différents : PRU pondéré", () => {
    const [p] = computePositions([
      tx({ quantity: 10, price: 20_000 }),
      tx({ date: "2026-02-01", quantity: 10, price: 30_000 }),
    ]);
    expect(p.quantity).toBe(20);
    expect(p.averageCost).toBe(25_000);
  });

  it("les frais d'achat entrent dans le PRU", () => {
    const [p] = computePositions([tx({ quantity: 10, price: 25_000, fees: 5_000 })]);
    expect(p.averageCost).toBe(25_500);
  });

  it("une vente réalise la plus-value contre le PRU sans le changer", () => {
    const [p] = computePositions([
      tx({ quantity: 10, price: 20_000 }),
      tx({ date: "2026-03-01", side: "vente", quantity: 4, price: 26_000 }),
    ]);
    expect(p.quantity).toBe(6);
    expect(p.averageCost).toBe(20_000);
    expect(p.realizedPnl).toBe(4 * 6_000);
  });

  it("vente au-delà du détenu : plafonnée et signalée", () => {
    const [p] = computePositions([
      tx({ quantity: 5, price: 20_000 }),
      tx({ date: "2026-03-01", side: "vente", quantity: 8, price: 22_000 }),
    ]);
    expect(p.quantity).toBe(0);
    expect(p.oversold).toBe(true);
    expect(p.realizedPnl).toBe(5 * 2_000);
  });

  it("l'ordre chronologique prime sur l'ordre de saisie", () => {
    const [p] = computePositions([
      tx({ date: "2026-05-01", side: "vente", quantity: 5, price: 30_000 }),
      tx({ date: "2026-01-01", quantity: 10, price: 20_000 }),
    ]);
    expect(p.quantity).toBe(5);
    expect(p.realizedPnl).toBe(5 * 10_000);
  });
});

describe("valuePortfolio", () => {
  it("valorise au dernier cours et calcule les poids", () => {
    const positions = computePositions([
      tx({ ticker: "SNTS", quantity: 10, price: 25_000 }),
      tx({ ticker: "PALC", quantity: 100, price: 8_000 }),
    ]);
    const summary = valuePortfolio(positions, (t) =>
      t === "SNTS" ? 31_000 : 9_000
    );
    expect(summary.totalValue).toBe(10 * 31_000 + 100 * 9_000);
    expect(summary.totalInvested).toBe(250_000 + 800_000);
    expect(summary.totalUnrealizedPnl).toBe(60_000 + 100_000);
    const weights = summary.positions.map((p) => p.weightPct);
    expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(100);
  });

  it("position soldée : hors valorisation, réalisé conservé", () => {
    const positions = computePositions([
      tx({ quantity: 10, price: 20_000 }),
      tx({ date: "2026-04-01", side: "vente", quantity: 10, price: 25_000 }),
    ]);
    const summary = valuePortfolio(positions, () => 26_000);
    expect(summary.positions).toHaveLength(0);
    expect(summary.totalValue).toBe(0);
    expect(summary.totalRealizedPnl).toBe(10 * 5_000);
  });

  it("cours inconnu (valeur radiée) : repli sur le PRU, P&L latent nul", () => {
    const positions = computePositions([tx({ ticker: "XXXX" })]);
    const summary = valuePortfolio(positions, () => undefined);
    expect(summary.positions[0].unrealizedPnl).toBe(0);
  });
});
