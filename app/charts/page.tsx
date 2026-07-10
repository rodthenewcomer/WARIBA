"use client";

import { useEffect, useState } from "react";
import { Columns2, Grid2X2, Sparkles, Square } from "lucide-react";
import { getSnapshots } from "@/lib/data";
import { usePortfolio, usePortfolioHydrated } from "@/hooks/use-portfolio";
import { computePositions } from "@/lib/portfolio";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/input";
import { MainChart } from "@/components/charts/main-chart";

type LayoutKind = 1 | 2 | 4;

const LAYOUTS: { value: LayoutKind; label: string; icon: typeof Square }[] = [
  { value: 1, label: "1 graphique", icon: Square },
  { value: 2, label: "2 graphiques", icon: Columns2 },
  { value: 4, label: "4 graphiques", icon: Grid2X2 },
];

const DEFAULT_TICKERS = ["SNTS", "ORAC", "SGBC", "PALC"];
const STORAGE_KEY = "afriterminal-chart-layout";

/**
 * Graphiques multi-panneaux façon poste de travail : 1, 2 ou 4 charts
 * indépendants côte à côte (ticker, période, type, indicateurs propres à
 * chaque panneau). Disposition mémorisée dans le navigateur.
 */
export default function ChartsPage() {
  const [layout, setLayout] = useState<LayoutKind>(2);
  const [tickers, setTickers] = useState<string[]>(DEFAULT_TICKERS);
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { layout: LayoutKind; tickers: string[] };
        if ([1, 2, 4].includes(saved.layout)) setLayout(saved.layout);
        if (Array.isArray(saved.tickers) && saved.tickers.length === 4)
          setTickers(saved.tickers);
      }
    } catch {
      // stockage corrompu : on repart des défauts
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout, tickers }));
  }, [layout, tickers, restored]);

  const snapshots = getSnapshots();
  usePortfolioHydrated();
  const transactions = usePortfolio((s) => s.transactions);
  const held = new Set(
    computePositions(transactions)
      .filter((p) => p.quantity > 0)
      .map((p) => p.ticker)
  );
  const heldSnapshots = snapshots.filter((s) => held.has(s.ticker));
  const setTickerAt = (i: number, t: string) =>
    setTickers((prev) => prev.map((x, j) => (j === i ? t : x)));

  return (
    <div className="stagger space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Graphiques
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-3">
            Votre poste d&apos;analyse : comparez jusqu&apos;à 4 valeurs côte à
            côte, chacune avec sa période, son type de graphique et ses
            indicateurs. La disposition est mémorisée.
          </p>
        </div>
        <div
          className="flex items-center gap-0.5 rounded-lg border border-line bg-surface-2/60 p-0.5"
          role="radiogroup"
          aria-label="Disposition"
        >
          {LAYOUTS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              role="radio"
              aria-checked={layout === value}
              title={label}
              onClick={() => setLayout(value)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium cursor-pointer transition-colors",
                layout === value
                  ? "bg-surface text-ink shadow-sm border border-line"
                  : "text-ink-3 hover:text-ink"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{value}</span>
            </button>
          ))}
        </div>
      </div>

      <div
        className={cn(
          "grid gap-4",
          layout === 2 && "xl:grid-cols-2",
          layout === 4 && "xl:grid-cols-2"
        )}
      >
        {tickers.slice(0, layout).map((ticker, i) => (
          <div key={i} className="card-glass min-w-0 space-y-3 p-4">
            <Select
              value={ticker}
              onChange={(e) => setTickerAt(i, e.target.value)}
              className="w-full max-w-xs"
              aria-label={`Valeur du panneau ${i + 1}`}
            >
              {heldSnapshots.length > 0 ? (
                <optgroup label="Mon portefeuille">
                  {heldSnapshots.map((s) => (
                    <option key={s.ticker} value={s.ticker}>
                      {s.ticker} — {s.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <optgroup label="Toute la cote">
                {snapshots.map((s) => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker} — {s.name}
                  </option>
                ))}
              </optgroup>
            </Select>
            <MainChart ticker={ticker} />
          </div>
        ))}
      </div>

      {/* Teaser Pro — honnête : rien de payant n'existe encore */}
      <div className="card-glass relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink">
          <Sparkles className="h-4 w-4 text-accent" /> Et ensuite ?
        </p>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-ink-2">
          Dispositions sauvegardées multiples, indicateurs avancés, dessin sur
          graphique, alertes de franchissement et export des données sont à
          l&apos;étude pour une future offre Pro. Tout ce que vous voyez ici
          reste gratuit.
        </p>
      </div>
    </div>
  );
}
