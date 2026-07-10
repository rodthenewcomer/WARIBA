/**
 * Moteur de calcul du portefeuille — fonctions pures, testées.
 *
 * Méthode du coût moyen (PRU, prix de revient unitaire) : chaque achat
 * fait évoluer le PRU ; une vente réalise la plus/moins-value contre le
 * PRU courant sans le modifier (standard de la comptabilité des
 * particuliers, cohérent avec ce que pratiquent les SGI).
 */

export interface PortfolioTransaction {
  id: string;
  ticker: string;
  side: "achat" | "vente";
  /** AAAA-MM-JJ */
  date: string;
  quantity: number;
  /** FCFA par action */
  price: number;
  /** Frais SGI/courtage en FCFA, optionnels */
  fees?: number;
}

export interface Position {
  ticker: string;
  quantity: number;
  /** Prix de revient unitaire (coût moyen), FCFA */
  averageCost: number;
  /** Montant investi restant = quantity × averageCost */
  invested: number;
  /** Plus/moins-value réalisée cumulée sur ce titre (ventes), FCFA */
  realizedPnl: number;
  /** true si une vente a dépassé la quantité détenue (saisie à vérifier) */
  oversold: boolean;
}

export interface PositionValue extends Position {
  lastPrice: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPct: number;
  /** Part de la valeur totale du portefeuille, 0-100 */
  weightPct: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalUnrealizedPnl: number;
  totalUnrealizedPnlPct: number;
  totalRealizedPnl: number;
  positions: PositionValue[];
}

/** Positions par ticker à partir des transactions (triées par date puis
 * ordre de saisie — deux opérations le même jour gardent leur ordre). */
export function computePositions(
  transactions: PortfolioTransaction[]
): Position[] {
  const byTicker = new Map<string, PortfolioTransaction[]>();
  for (const tx of transactions) {
    const arr = byTicker.get(tx.ticker) ?? [];
    arr.push(tx);
    byTicker.set(tx.ticker, arr);
  }

  const out: Position[] = [];
  for (const [ticker, txs] of byTicker) {
    const ordered = [...txs].sort((a, b) => a.date.localeCompare(b.date));
    let quantity = 0;
    let totalCost = 0;
    let realizedPnl = 0;
    let oversold = false;

    for (const tx of ordered) {
      const fees = tx.fees ?? 0;
      if (tx.side === "achat") {
        totalCost += tx.quantity * tx.price + fees;
        quantity += tx.quantity;
      } else {
        const sellable = Math.min(tx.quantity, quantity);
        if (tx.quantity > quantity) oversold = true;
        const avg = quantity > 0 ? totalCost / quantity : 0;
        realizedPnl += sellable * (tx.price - avg) - fees;
        totalCost -= sellable * avg;
        quantity -= sellable;
      }
    }

    out.push({
      ticker,
      quantity,
      averageCost: quantity > 0 ? totalCost / quantity : 0,
      invested: quantity > 0 ? totalCost : 0,
      realizedPnl,
      oversold,
    });
  }
  return out;
}

/** Valorise les positions au dernier cours connu et agrège le total.
 * Les positions soldées (quantité 0) sont exclues de la valorisation
 * mais leur résultat réalisé reste compté dans le total. */
export function valuePortfolio(
  positions: Position[],
  lastPriceOf: (ticker: string) => number | undefined
): PortfolioSummary {
  const totalRealizedPnl = positions.reduce((a, p) => a + p.realizedPnl, 0);
  const held = positions.filter((p) => p.quantity > 0);

  const valued = held.map((p) => {
    const lastPrice = lastPriceOf(p.ticker) ?? p.averageCost;
    const marketValue = p.quantity * lastPrice;
    const unrealizedPnl = marketValue - p.invested;
    return {
      ...p,
      lastPrice,
      marketValue,
      unrealizedPnl,
      unrealizedPnlPct: p.invested > 0 ? (unrealizedPnl / p.invested) * 100 : 0,
      weightPct: 0, // rempli après le total
    };
  });

  const totalValue = valued.reduce((a, p) => a + p.marketValue, 0);
  const totalInvested = valued.reduce((a, p) => a + p.invested, 0);
  for (const p of valued) {
    p.weightPct = totalValue > 0 ? (p.marketValue / totalValue) * 100 : 0;
  }
  valued.sort((a, b) => b.marketValue - a.marketValue);

  const totalUnrealizedPnl = totalValue - totalInvested;
  return {
    totalValue,
    totalInvested,
    totalUnrealizedPnl,
    totalUnrealizedPnlPct:
      totalInvested > 0 ? (totalUnrealizedPnl / totalInvested) * 100 : 0,
    totalRealizedPnl,
    positions: valued,
  };
}
