import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { fcfa, pct } from "@afriterminal/core/format";
import { ActionButton, LoadingState, Metric, Page, Row, Section } from "../../src/components/ui";
import { QuoteRow } from "../../src/components/QuoteRow";
import { useMarketData } from "../../src/providers/MarketDataProvider";
import { colors } from "../../src/theme";

export default function DashboardScreen() {
  const router = useRouter();
  const market = useMarketData();
  if (market.loading && Object.keys(market.quotes).length === 0) return <LoadingState />;
  const quotes = Object.values(market.quotes);
  const movers = [...quotes].sort((a, b) => Math.abs(b.dayChangePct) - Math.abs(a.dayChangePct)).slice(0, 5);
  const up = quotes.filter((quote) => quote.dayChangePct > 0).length;
  const down = quotes.filter((quote) => quote.dayChangePct < 0).length;
  const mainIndex = market.indices.find((index) => index.code === "BRVMC") ?? market.indices[0];

  return (
    <Page
      title="AfriTerminal"
      subtitle={`${market.offline ? "Cache appareil" : "Sources BRVM"} · ${quotes[0]?.asOfDate ?? "chargement"}`}
      refreshing={market.refreshing}
      onRefresh={() => void market.refresh()}
      action={<ActionButton label="Alertes" icon="notifications-outline" onPress={() => router.push("/alerts")} />}
    >
      {market.error ? <Text style={styles.error}>{market.error}</Text> : null}
      <Section title="Marché" detail="Dernière clôture">
        <View style={styles.metrics}>
          <Metric label={mainIndex?.name ?? "BRVM Composite"} value={mainIndex ? mainIndex.level.toLocaleString("fr-FR", { maximumFractionDigits: 2 }) : "—"} tone={mainIndex?.dayChangePct >= 0 ? "up" : "down"} detail={mainIndex ? pct(mainIndex.dayChangePct, { signed: true, digits: 2 }) : undefined} />
          <Metric label="VALEURS EN HAUSSE" value={`${up} / ${quotes.length}`} tone="up" detail={`${down} en baisse`} />
          <Metric label="VOLUME ÉCHANGÉ" value={quotes.reduce((sum, quote) => sum + quote.dayVolume, 0).toLocaleString("fr-FR")} detail="titres" />
          <Metric label="VALEUR ÉCHANGÉE" value={fcfa(quotes.reduce((sum, quote) => sum + (quote.dayValueFcfa ?? 0), 0))} />
        </View>
      </Section>

      <Section title="Mouvements marquants" detail="Amplitude du jour">
        {movers.map((quote, index) => <QuoteRow key={quote.ticker} quote={quote} rank={index + 1} />)}
      </Section>

      <Section title="Dernières alertes" detail="Faits calculés">
        {market.alerts.slice(0, 4).map((alert) => (
          <Row key={alert.id} icon="pulse-outline" title={alert.title} detail={alert.detail} onPress={alert.ticker ? () => router.push(`/stocks/${alert.ticker}`) : undefined} />
        ))}
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  error: { color: colors.warn, borderColor: colors.line, borderWidth: 1, padding: 10, fontSize: 11 },
});

