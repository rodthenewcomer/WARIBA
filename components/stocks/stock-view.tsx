"use client";

import { useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { getSectorStats, getSnapshot } from "@/lib/data";
import { docsForTicker } from "@/lib/mock/documents";
import { DIVIDEND_MAP } from "@/lib/mock/dividends";
import type { DocItem } from "@/lib/types";
import {
  compactFcfa,
  compactVolume,
  fcfa,
  millions,
  pct,
  ratio,
} from "@/lib/format";
import { MainChart } from "@/components/charts/main-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { AIInsightCard } from "./ai-insight-card";
import { PriceChange, ScoreBadge, SignalBadges } from "./badges";
import { DividendPanel } from "./dividend-panel";
import { MetricCard } from "./metric-card";
import { SectorComparison } from "./sector-comparison";
import { WatchlistButton } from "./watchlist-button";
import { DocumentCard } from "@/components/documents/document-card";
import { DocumentViewerModal } from "@/components/documents/document-viewer-modal";

export function StockView({ ticker }: { ticker: string }) {
  const stock = useMemo(() => getSnapshot(ticker), [ticker]);
  const [openDoc, setOpenDoc] = useState<DocItem | null>(null);

  if (!stock) return null;
  const docs = docsForTicker(ticker);
  const dividend = DIVIDEND_MAP.get(ticker);
  const sectorStats = getSectorStats().find((s) => s.sector === stock.sector);
  const f = stock.fundamentals;

  return (
    <div className="space-y-4 fade-in">
      {/* Sticky price header */}
      <div className="sticky top-14 z-20 -mx-4 border-b border-line bg-background/85 px-4 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent/20 to-violet/20 text-[10px] font-black text-accent border border-accent/20">
            {stock.ticker}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold tracking-tight text-ink sm:text-lg">
              {stock.name}
            </h1>
            <p className="text-[11px] text-ink-3">
              BRVM · {stock.sector} · {stock.country}
            </p>
          </div>
          <div className="text-right">
            <p className="num text-xl font-bold text-ink sm:text-2xl">
              {fcfa(stock.lastPrice)}
            </p>
            <PriceChange value={stock.dayChange} className="text-sm" />
          </div>
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <WatchlistButton ticker={stock.ticker} />
            <Button variant="outline" size="sm">
              <Bell className="h-3.5 w-3.5" /> Alerte
            </Button>
          </div>
        </div>
      </div>

      {/* Chart + résumé */}
      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="p-4 sm:p-5">
          <MainChart ticker={stock.ticker} />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Résumé" />
            <CardBody className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <ScoreBadge kind="quality" value={stock.scores.quality} />
                <ScoreBadge kind="valuation" value={stock.scores.valuation} />
                <ScoreBadge kind="momentum" value={stock.scores.momentum} />
                <ScoreBadge kind="risk" value={stock.scores.risk} />
              </div>
              <dl className="space-y-1.5 text-xs">
                {[
                  ["Variation 1 semaine", <PriceChange key="w" value={stock.weekChange} arrow={false} />],
                  ["Variation 1 mois", <PriceChange key="m" value={stock.monthChange} arrow={false} />],
                  ["Variation YTD", <PriceChange key="y" value={stock.ytdChange} arrow={false} />],
                  ["Variation 1 an", <PriceChange key="a" value={stock.yearChange} arrow={false} />],
                ].map(([label, node], i) => (
                  <div key={i} className="flex items-center justify-between">
                    <dt className="text-ink-3">{label}</dt>
                    <dd className="num font-medium">{node}</dd>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <dt className="text-ink-3">Volume du jour</dt>
                  <dd className={`num font-medium ${stock.volumeRatio >= 3 ? "text-warn" : "text-ink"}`}>
                    {compactVolume(stock.dayVolume)}{" "}
                    <span className="text-ink-3">({stock.volumeRatio.toFixed(1)}×)</span>
                  </dd>
                </div>
              </dl>
              {stock.signals.length > 0 ? (
                <div className="border-t border-line pt-3">
                  <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-3">
                    Signaux détectés
                  </p>
                  <SignalBadges signals={stock.signals} />
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="À propos" />
            <CardBody>
              <p className="text-xs leading-relaxed text-ink-2">{stock.description}</p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Métriques */}
      <section>
        <h2 className="mb-2.5 text-sm font-semibold text-ink">Fondamentaux</h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
          <MetricCard label="Capitalisation" value={compactFcfa(stock.marketCap)} />
          <MetricCard
            label="PER"
            value={stock.per > 0 ? ratio(stock.per) : "—"}
            hint={sectorStats ? `Secteur : ${ratio(sectorStats.avgPer)}` : undefined}
          />
          <MetricCard label="P/B" value={ratio(f.pb)} />
          <MetricCard label="ROE" value={pct(f.roe, { signed: false, digits: 1 })} />
          <MetricCard
            label="Rendement net"
            value={pct(stock.yieldNet, { signed: false, digits: 2 })}
            tone={stock.yieldNet >= 6 ? "up" : undefined}
          />
          <MetricCard
            label="Payout"
            value={pct(f.payout, { signed: false, digits: 0 })}
            tone={f.payout > 90 ? "warn" : undefined}
          />
          <MetricCard
            label={`${f.revenueLabel} ${f.revenueLabel === "PNB" ? "" : "annuel"}`}
            value={millions(f.revenue)}
            hint={`${pct(stock.revenueGrowth, { digits: 1 })} vs N-1`}
          />
          <MetricCard
            label="Résultat net"
            value={millions(f.netIncome)}
            hint={`${pct(stock.netIncomeGrowth, { digits: 1 })} vs N-1`}
            tone={f.ordinaryIncome < 0 ? "warn" : undefined}
          />
          <MetricCard
            label="Résultat ordinaire"
            value={millions(f.ordinaryIncome)}
            tone={f.ordinaryIncome < 0 ? "down" : undefined}
            hint={f.ordinaryIncome < 0 ? "Cœur d'activité déficitaire" : undefined}
          />
          <MetricCard
            label="Vol. moyen 30 j"
            value={compactVolume(stock.avgVolume30d)}
            hint={`Aujourd'hui : ${stock.volumeRatio.toFixed(1)}×`}
          />
        </div>
      </section>

      {/* Analyse IA + dividendes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AIInsightCard insight={stock.insight} />
        <div className="space-y-4">
          <DividendPanel stock={stock} dividend={dividend} />
          <SectorComparison stock={stock} stats={sectorStats} />
        </div>
      </div>

      {/* Documents */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Documents officiels</h2>
          <Badge tone="neutral">{docs.length} document{docs.length > 1 ? "s" : ""}</Badge>
        </div>
        {docs.length === 0 ? (
          <Card className="p-8 text-center text-sm text-ink-3">
            Aucun document récent pour cette valeur.
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {docs.map((d) => (
              <DocumentCard key={d.id} doc={d} onOpen={setOpenDoc} showTicker={false} />
            ))}
          </div>
        )}
      </section>

      <p className="text-[10px] text-ink-3">
        Les informations présentées sont fournies à titre éducatif et informatif
        sur données simulées. Elles ne constituent pas un conseil en
        investissement.
      </p>

      <DocumentViewerModal doc={openDoc} onClose={() => setOpenDoc(null)} />
    </div>
  );
}
