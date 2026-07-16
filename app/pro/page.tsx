import type { Metadata } from "next";
import { REAL_ANALYSIS_VERSION } from "@wariba/core/real-analysis";
import { getSnapshots } from "@/lib/data";
import { getRealAnalysis } from "@/lib/real-analysis";
import { MARKET_DATA_LABEL } from "@/lib/real-data";
import { ProWorkspace, type ProResearchRow } from "@/components/pro/pro-workspace";

export const metadata: Metadata = {
  title: "WARIBA Pro — Laboratoire 48",
  description: "Classement factuel, comparaison multi-facteurs et fraîcheur des comptes pour les 48 actions de la BRVM.",
};

export default function ProPage() {
  const rows: ProResearchRow[] = getSnapshots().flatMap((snapshot) => {
    const analysis = getRealAnalysis(snapshot.ticker);
    if (!analysis || !snapshot.real) return [];
    return [{
      ticker: snapshot.ticker,
      name: snapshot.name,
      sector: snapshot.sector,
      country: snapshot.country,
      price: snapshot.lastPrice,
      dayChange: snapshot.dayChange,
      ytdChange: snapshot.ytdChange,
      per: snapshot.real.per,
      yieldNet: snapshot.real.netYieldPct,
      volumeRatio: snapshot.real.volumeRatio,
      overallScore: analysis.overallScore,
      quality: analysis.scores.quality,
      valuation: analysis.scores.valuation,
      momentum: analysis.scores.momentum,
      risk: analysis.scores.risk,
      confidence: analysis.confidence.level,
      confidenceLabel: analysis.confidence.label,
      coveragePct: analysis.confidence.coveragePct,
      confidenceReasons: analysis.confidence.reasons,
      fiscalYear: analysis.fiscalYear,
      publishedOn: analysis.publishedOn,
      signals: analysis.signals.map(({ id, label, tone }) => ({ id, label, tone })),
    }];
  });

  return <ProWorkspace rows={rows} marketLabel={MARKET_DATA_LABEL} methodologyVersion={REAL_ANALYSIS_VERSION} />;
}
