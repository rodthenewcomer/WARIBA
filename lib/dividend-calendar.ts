import { dividendHistoryFor, type DividendEvent } from "@/lib/real-dividends";

export interface TickerDividendEvent extends DividendEvent {
  ticker: string;
}

export interface MonthlyDividendEntry {
  ticker: string;
  /** Dernier montant net par action versé ce mois-ci, FCFA */
  lastNet: number;
  /** Date du dernier versement dans ce mois, AAAA-MM-JJ */
  lastDate: string;
  /** Années où un versement a eu lieu ce mois-ci, triées croissant */
  years: number[];
}

const MONTH_COUNT = 12;

/**
 * Regroupe l'historique réel des dividendes par mois calendaire (1-12),
 * tous tickers confondus — la seule « prévision » honnête possible sans
 * dates d'ex-dividende publiées par la BRVM : ce que le marché a versé,
 * mois par mois, les années précédentes. Récurrence ≠ garantie, jamais
 * présenté comme une date certaine.
 */
export function dividendsByMonth(
  tickers: string[]
): Record<number, MonthlyDividendEntry[]> {
  const byMonth: Record<number, Map<string, MonthlyDividendEntry>> = {};
  for (let m = 1; m <= MONTH_COUNT; m++) byMonth[m] = new Map();

  for (const ticker of tickers) {
    for (const ev of dividendHistoryFor(ticker)) {
      const month = Number(ev.date.slice(5, 7));
      const year = Number(ev.date.slice(0, 4));
      if (!Number.isFinite(month) || month < 1 || month > MONTH_COUNT) continue;
      const map = byMonth[month];
      const existing = map.get(ticker);
      if (!existing) {
        map.set(ticker, { ticker, lastNet: ev.net, lastDate: ev.date, years: [year] });
      } else {
        if (!existing.years.includes(year)) existing.years.push(year);
        if (ev.date > existing.lastDate) {
          existing.lastNet = ev.net;
          existing.lastDate = ev.date;
        }
      }
    }
  }

  const result: Record<number, MonthlyDividendEntry[]> = {};
  for (let m = 1; m <= MONTH_COUNT; m++) {
    result[m] = Array.from(byMonth[m].values())
      .map((e) => ({ ...e, years: e.years.sort((a, b) => a - b) }))
      .sort((a, b) => b.years.length - a.years.length || b.lastDate.localeCompare(a.lastDate));
  }
  return result;
}

/** Journal complet des versements réels, tous tickers, du plus récent au plus ancien. */
export function allDividendEvents(tickers: string[]): TickerDividendEvent[] {
  const events: TickerDividendEvent[] = [];
  for (const ticker of tickers) {
    for (const ev of dividendHistoryFor(ticker)) events.push({ ticker, ...ev });
  }
  return events.sort((a, b) => b.date.localeCompare(a.date));
}

/** Un versement est jugé « récurrent » s'il a eu lieu au moins 2 années différentes ce mois-ci. */
export function isRecurring(entry: MonthlyDividendEntry): boolean {
  return entry.years.length >= 2;
}
