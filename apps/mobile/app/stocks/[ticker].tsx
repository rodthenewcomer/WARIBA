import { useEffect, useMemo, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { annualizedVolatility, maxDrawdown } from "@afriterminal/core/risk";
import { fcfa, pct } from "@afriterminal/core/format";
import type { OHLCV } from "@afriterminal/core/types";
import { AdvancedChart } from "../../src/components/AdvancedChart";
import type { ChartEvent } from "../../src/components/CandleChart";
import { ActionButton, ChangePill, EmptyState, LoadingState, Metric, Page, Row, Section } from "../../src/components/ui";
import { useMarketData } from "../../src/providers/MarketDataProvider";
import { useWatchlistStore } from "../../src/stores";
import { colors, tabular, type } from "../../src/theme";

type Tab = "chart" | "fundamentals" | "risk" | "documents";

export default function StockScreen() {
  const params = useLocalSearchParams<{ ticker: string }>();
  const ticker = String(params.ticker ?? "SNTS").toUpperCase();
  const market = useMarketData();
  const quote = market.quotes[ticker];
  const fundamental = market.fundamentals[ticker];
  const [series, setSeries] = useState<OHLCV[]>([]);
  const [tab, setTab] = useState<Tab>("chart");
  const watched = useWatchlistStore((state) => state.tickers.includes(ticker));
  const toggle = useWatchlistStore((state) => state.toggle);
  useEffect(() => { void market.loadSeries(ticker).then(setSeries); }, [market.loadSeries, ticker]);
  const riskSeries = useMemo(() => series.map((bar) => ({ time: String(bar.time), close: bar.close })), [series]);
  const risk = useMemo(() => ({ volatility: annualizedVolatility(riskSeries), drawdown: maxDrawdown(riskSeries) }), [riskSeries]);
  const documents = market.documents.filter((document) => document.ticker === ticker).slice(0, 12);
  const events = useMemo<ChartEvent[]>(() => [
    ...(market.dividends[ticker] ?? []).map((item) => ({ time: item.date, color: colors.gold, kind: "dividend" as const })),
    ...documents.filter((item) => /capital|split|fusion/i.test(item.title)).map((item) => ({ time: item.date, color: colors.violet, kind: "operation" as const })),
  ], [documents, market.dividends, ticker]);

  if (!quote) return market.loading ? <LoadingState /> : <EmptyState title="Valeur introuvable" detail={`Aucune cotation pour ${ticker}.`} />;

  return (
    <Page>
      <Stack.Screen options={{ title: ticker }} />

      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text numberOfLines={2} style={styles.name}>{quote.name}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{fcfa(quote.lastClose)}</Text>
            <ChangePill value={quote.dayChangePct} label={pct(quote.dayChangePct, { signed: true, digits: 2 })} />
          </View>
          <Text style={styles.asOf}>Clôture du {quote.asOfDate}</Text>
        </View>
        <ActionButton label={watched ? "Suivie" : "Suivre"} icon={watched ? "star" : "star-outline"} active={watched} onPress={() => toggle(ticker)} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        <ActionButton label="Graphique" active={tab === "chart"} onPress={() => setTab("chart")} />
        <ActionButton label="Fondamentaux" active={tab === "fundamentals"} onPress={() => setTab("fundamentals")} />
        <ActionButton label="Risque" active={tab === "risk"} onPress={() => setTab("risk")} />
        <ActionButton label="Documents" active={tab === "documents"} onPress={() => setTab("documents")} />
      </ScrollView>

      {tab === "chart" ? (
        series.length ? <AdvancedChart ticker={ticker} data={series} previousClose={quote.prevClose} week52High={quote.week52High} week52Low={quote.week52Low} events={events} /> : <LoadingState label="Chargement de la série…" />
      ) : null}

      {tab === "fundamentals" ? (
        <Section title={`Exercice ${fundamental?.fiscalYear ?? "—"}`} detail={fundamental ? `publié le ${fundamental.publishedOn}` : undefined}>
          {fundamental ? <>
            <View style={styles.metrics}>
              <Metric label={`${fundamental.revenueLabel} (M FCFA)`} value={fundamental.revenueM.toLocaleString("fr-FR")} />
              <Metric label="Résultat net (M)" value={fundamental.netIncomeM.toLocaleString("fr-FR")} tone={fundamental.netIncomeM >= 0 ? "up" : "down"} />
              <Metric label="Marge nette" value={pct((fundamental.netIncomeM / fundamental.revenueM) * 100, { digits: 1 })} />
              <Metric label="Capitaux propres" value={fundamental.equityM === null ? "—" : `${fundamental.equityM.toLocaleString("fr-FR")} M`} />
              {fundamental.cirPct !== null ? <Metric label="Coefficient exploit." value={pct(fundamental.cirPct, { digits: 1 })} /> : null}
              {fundamental.depositsM !== null ? <Metric label="Dépôts" value={`${(fundamental.depositsM / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mds`} /> : null}
            </View>
            <Row icon="open-outline" title="Document source BRVM" detail="Publication officielle liée" onPress={() => void Linking.openURL(fundamental.source)} />
          </> : <EmptyState title="Fondamentaux indisponibles" detail="Aucun état financier vérifié n’est chargé." />}
        </Section>
      ) : null}

      {tab === "risk" ? (
        <Section title="Risque historique" detail="Calculs packages/core">
          <View style={styles.metrics}>
            <Metric label="Volatilité annualisée" value={risk.volatility === null ? "—" : pct(risk.volatility, { digits: 1 })} />
            <Metric label="Max drawdown" value={risk.drawdown ? pct(risk.drawdown.pct, { signed: true, digits: 1 }) : "—"} tone="down" />
            <Metric label="Plus haut 52s" value={fcfa(quote.week52High)} />
            <Metric label="Plus bas 52s" value={fcfa(quote.week52Low)} />
          </View>
          <Text style={styles.disclaimer}>Statistiques historiques descriptives, pas une prévision ni un conseil en investissement.</Text>
        </Section>
      ) : null}

      {tab === "documents" ? (
        <Section title="Publications officielles" detail={`${documents.length} récentes`}>
          {documents.length
            ? documents.map((document) => <Row key={document.url} icon="document-text-outline" title={document.title} detail={`${document.type} · ${document.date}`} onPress={() => void Linking.openURL(document.url)} />)
            : <EmptyState icon="document-text-outline" title="Aucune publication" detail={`Aucun document officiel lié à ${ticker} pour le moment.`} />}
        </Section>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  heroCopy: { flex: 1, gap: 6 },
  name: { ...type.sub },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  price: { color: colors.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.6, fontVariant: tabular },
  asOf: { ...type.caption },
  tabs: { gap: 7 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  disclaimer: { ...type.caption, marginTop: 10 },
});
