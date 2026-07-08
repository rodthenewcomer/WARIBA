"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSnapshots } from "@/lib/data";
import { squarify, type TreemapRect } from "@/lib/treemap";
import { fcfa, pct } from "@/lib/format";
import type { StockSnapshot } from "@/lib/types";

const GROUP_GAP = 3;
const HEADER_H = 17;

/**
 * Couleur d'une tuile selon la variation du jour, saturation pleine à
 * ±4 %. Palette fixe (indépendante du thème) : la carte est un canvas
 * de données, comme le chart — texte blanc lisible sur toutes les tuiles.
 */
export function tileColor(changePct: number): string {
  const t = Math.min(Math.abs(changePct) / 4, 1);
  const base = [63, 63, 70]; // zinc-700 : stable / ± 0 %
  const target = changePct >= 0 ? [22, 163, 74] : [220, 38, 38];
  const mix = base.map((b, i) => Math.round(b + (target[i] - b) * t));
  if (Math.abs(changePct) < 0.005) return `rgb(${base.join(",")})`;
  return `rgb(${mix.join(",")})`;
}

/** Poids d'une tuile : liquidité (volume moyen 30 j × cours). Un plancher
 * garde les valeurs illiquides visibles (fine tuile plutôt qu'absente). */
function weight(s: StockSnapshot): number {
  return s.avgVolume30d * s.lastPrice;
}

interface Layout {
  groups: {
    sector: string;
    rect: TreemapRect;
    tiles: { stock: StockSnapshot; rect: TreemapRect }[];
  }[];
}

function computeLayout(
  snapshots: StockSnapshot[],
  width: number,
  height: number
): Layout {
  const bySector = new Map<string, StockSnapshot[]>();
  for (const s of snapshots) {
    const arr = bySector.get(s.sector) ?? [];
    arr.push(s);
    bySector.set(s.sector, arr);
  }
  const maxW = Math.max(...snapshots.map(weight));
  const floor = maxW * 0.004;
  const w = (s: StockSnapshot) => Math.max(weight(s), floor);

  const sectorItems = [...bySector.entries()].map(([sector, stocks]) => ({
    id: sector,
    weight: stocks.reduce((a, s) => a + w(s), 0),
  }));

  const sectorRects = squarify(sectorItems, 0, 0, width, height);

  const groups = sectorRects.map((rect) => {
    const stocks = bySector.get(rect.id)!;
    const inner = {
      x: rect.x + GROUP_GAP / 2,
      y: rect.y + GROUP_GAP / 2 + HEADER_H,
      width: Math.max(0, rect.width - GROUP_GAP),
      height: Math.max(0, rect.height - GROUP_GAP - HEADER_H),
    };
    const tiles = squarify(
      stocks.map((s) => ({ id: s.ticker, weight: w(s) })),
      inner.x,
      inner.y,
      inner.width,
      inner.height
    ).map((r) => ({
      stock: stocks.find((s) => s.ticker === r.id)!,
      rect: r,
    }));
    return { sector: rect.id, rect, tiles };
  });

  return { groups };
}

interface Hover {
  stock: StockSnapshot;
  x: number;
  y: number;
}

export function MarketMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const router = useRouter();
  const snapshots = getSnapshots();

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: width, h: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () => (size ? computeLayout(snapshots, size.w, size.h) : null),
    [snapshots, size]
  );

  return (
    <div
      ref={containerRef}
      className="relative h-[62vh] min-h-[460px] w-full overflow-hidden rounded-xl bg-[#0c0c0e]"
      onMouseLeave={() => setHover(null)}
    >
      {layout?.groups.map((g) => (
        <div key={g.sector}>
          {g.rect.width > 70 && g.rect.height > 42 ? (
            <div
              className="pointer-events-none absolute truncate px-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400"
              style={{
                left: g.rect.x + GROUP_GAP / 2,
                top: g.rect.y + GROUP_GAP / 2,
                width: g.rect.width - GROUP_GAP,
                height: HEADER_H,
                lineHeight: `${HEADER_H}px`,
              }}
            >
              {g.sector}
            </div>
          ) : null}
          {g.tiles.map(({ stock, rect }) => {
            const showTicker = rect.width >= 34 && rect.height >= 16;
            const showPct = rect.width >= 44 && rect.height >= 34;
            const big = rect.width >= 90 && rect.height >= 56;
            return (
              <button
                key={stock.ticker}
                onClick={() => router.push(`/stocks/${stock.ticker}`)}
                onMouseMove={(e) =>
                  setHover({ stock, x: e.clientX, y: e.clientY })
                }
                className="absolute flex cursor-pointer flex-col items-center justify-center overflow-hidden outline outline-1 outline-black/40 transition-[filter] hover:brightness-125 hover:z-10"
                style={{
                  left: rect.x,
                  top: rect.y,
                  width: Math.max(0, rect.width - 1),
                  height: Math.max(0, rect.height - 1),
                  background: tileColor(stock.dayChange),
                }}
                aria-label={`${stock.ticker} ${pct(stock.dayChange)}`}
              >
                {showTicker ? (
                  <span
                    className="font-bold leading-none text-white drop-shadow-sm"
                    style={{ fontSize: big ? 15 : rect.width >= 56 ? 12 : 9 }}
                  >
                    {stock.ticker}
                  </span>
                ) : null}
                {showPct ? (
                  <span
                    className="num mt-0.5 leading-none text-white/85"
                    style={{ fontSize: big ? 12 : 9 }}
                  >
                    {pct(stock.dayChange)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ))}

      {!layout ? (
        <div className="absolute inset-0 animate-pulse bg-surface-2" />
      ) : null}

      {hover ? (
        <div
          className="pointer-events-none fixed z-50 w-56 rounded-lg border border-line bg-surface p-2.5 shadow-xl"
          style={{
            left: Math.min(hover.x + 14, (size?.w ?? 320) - 230),
            top: hover.y + 14,
          }}
        >
          <p className="text-xs font-bold text-ink">
            {hover.stock.ticker}{" "}
            <span className="font-medium text-ink-3">{hover.stock.name}</span>
          </p>
          <div className="num mt-1 flex items-baseline justify-between text-xs">
            <span className="font-semibold text-ink">{fcfa(hover.stock.lastPrice)}</span>
            <span className={hover.stock.dayChange >= 0 ? "text-up" : "text-down"}>
              {pct(hover.stock.dayChange)}
            </span>
          </div>
          <p className="mt-1 text-[10px] text-ink-3">
            {hover.stock.sector} · volume {hover.stock.volumeRatio.toFixed(1)}× la
            moyenne 30 j
          </p>
        </div>
      ) : null}
    </div>
  );
}
