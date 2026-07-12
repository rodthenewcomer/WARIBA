import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { compactFcfa, fcfa } from "@afriterminal/core/format";
import { ActionButton, EmptyState, Metric, Page, Row, Section } from "../src/components/ui";
import { useMarketData } from "../src/providers/MarketDataProvider";

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS_FR[(month ?? 1) - 1]} ${year}`;
}

type Payment = { ticker: string; date: string; net: number };

export default function DividendsScreen() {
  const market = useMarketData();
  const [monthLimit, setMonthLimit] = useState(6);

  const { months, totalYear, payersYear } = useMemo(() => {
    const all: Payment[] = Object.entries(market.dividends)
      .flatMap(([ticker, history]) => history.map((item) => ({ ticker, ...item })))
      .sort((a, b) => b.date.localeCompare(a.date));
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    const cutoff = yearAgo.toISOString().slice(0, 10);
    const lastYear = all.filter((item) => item.date >= cutoff);
    const grouped = all.reduce<Map<string, Payment[]>>((acc, item) => {
      const key = item.date.slice(0, 7);
      const next = new Map(acc);
      next.set(key, [...(next.get(key) ?? []), item]);
      return next;
    }, new Map());
    return {
      months: [...grouped.entries()],
      totalYear: lastYear.reduce((sum, item) => sum + item.net, 0),
      payersYear: new Set(lastYear.map((item) => item.ticker)).size,
    };
  }, [market.dividends]);

  if (!months.length) {
    return (
      <Page subtitle="Montants nets issus des bulletins officiels">
        <EmptyState icon="cash-outline" title="Aucun versement" detail="L'historique des dividendes n'est pas encore chargé." />
      </Page>
    );
  }

  return (
    <Page subtitle="Montants nets par action, issus des bulletins officiels BRVM">
      <View style={styles.metrics}>
        <Metric label="Cumul 12 mois" value={compactFcfa(totalYear)} tone="accent" detail="net par action, toutes valeurs" />
        <Metric label="Sociétés payeuses" value={`${payersYear}`} detail="sur 12 mois glissants" />
      </View>

      {months.slice(0, monthLimit).map(([key, payments]) => (
        <Section key={key} title={monthLabel(key)} detail={`${payments.length} versement${payments.length > 1 ? "s" : ""}`}>
          {payments.map((item, index) => (
            <Row
              key={`${item.ticker}-${item.date}-${index}`}
              icon="cash-outline"
              title={item.ticker}
              detail={`Payé le ${item.date}`}
              value={fcfa(item.net)}
              valueDetail="net / action"
            />
          ))}
        </Section>
      ))}

      {monthLimit < months.length ? (
        <View style={styles.moreRow}>
          <ActionButton label="Mois précédents" icon="chevron-down" onPress={() => setMonthLimit((value) => value + 6)} />
        </View>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  moreRow: { alignSelf: "center" },
});
