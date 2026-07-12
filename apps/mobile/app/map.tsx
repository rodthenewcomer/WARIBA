import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { RealQuote } from "@afriterminal/core/types";
import { compactFcfa, pct } from "@afriterminal/core/format";
import { ChangePill, EmptyState, Page } from "../src/components/ui";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { colors, radius, tabular, type } from "../src/theme";

/** Même nomenclature BOC → libellés que lib/real-universe.ts côté web. */
const SECTOR_LABELS: Record<string, string> = {
  FIN: "Banque", TEL: "Télécom", CB: "Agro-industrie",
  CD: "Distribution", ENE: "Distribution", IND: "Industrie", SPU: "Services publics",
};

/** Intensité de la teinte proportionnelle à l'amplitude (style heatmap). */
function tileColor(changePct: number): string {
  const alpha = 0.10 + Math.min(0.34, Math.abs(changePct) * 0.055);
  return changePct >= 0 ? `rgba(34,197,94,${alpha.toFixed(3)})` : `rgba(239,68,68,${alpha.toFixed(3)})`;
}

/** Trois classes de largeur selon le poids de liquidité dans le secteur. */
function tileBasis(share: number): `${number}%` {
  if (share >= 0.32) return "64.5%";
  if (share >= 0.12) return "47.5%";
  return "30.5%";
}

function SectorBlock({ label, quotes, onOpen }: { label: string; quotes: RealQuote[]; onOpen: (ticker: string) => void }) {
  const totalValue = quotes.reduce((sum, quote) => sum + (quote.dayValueFcfa ?? 0), 0);
  const weightedChange = totalValue > 0
    ? quotes.reduce((sum, quote) => sum + quote.dayChangePct * (quote.dayValueFcfa ?? 0), 0) / totalValue
    : quotes.reduce((sum, quote) => sum + quote.dayChangePct, 0) / Math.max(1, quotes.length);
  const sorted = [...quotes].sort((a, b) => (b.dayValueFcfa ?? 0) - (a.dayValueFcfa ?? 0));

  return (
    <View style={styles.sector}>
      <View style={styles.sectorHeader}>
        <View style={styles.sectorCopy}>
          <Text style={styles.sectorTitle}>{label}</Text>
          <Text style={styles.sectorDetail}>{quotes.length} valeurs · {compactFcfa(totalValue)}</Text>
        </View>
        <ChangePill value={weightedChange} label={pct(weightedChange, { signed: true, digits: 2 })} />
      </View>
      <View style={styles.tiles}>
        {sorted.map((quote) => {
          const share = totalValue > 0 ? (quote.dayValueFcfa ?? 0) / totalValue : 0;
          return (
            <Pressable
              key={quote.ticker}
              onPress={() => onOpen(quote.ticker)}
              style={({ pressed }) => [
                styles.tile,
                { flexBasis: tileBasis(share), backgroundColor: tileColor(quote.dayChangePct) },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.tileTicker}>{quote.ticker}</Text>
              <Text style={[styles.tileChange, { color: quote.dayChangePct >= 0 ? colors.up : colors.down }]}>
                {pct(quote.dayChangePct, { signed: true, digits: 2 })}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function MapScreen() {
  const market = useMarketData();
  const router = useRouter();
  const sectors = useMemo(() => {
    const groups = Object.values(market.quotes).reduce<Record<string, RealQuote[]>>((acc, quote) => {
      const label = SECTOR_LABELS[quote.sectorCode ?? ""] ?? "Autre";
      return { ...acc, [label]: [...(acc[label] ?? []), quote] };
    }, {});
    return Object.entries(groups).sort(([, a], [, b]) =>
      b.reduce((sum, quote) => sum + (quote.dayValueFcfa ?? 0), 0) - a.reduce((sum, quote) => sum + (quote.dayValueFcfa ?? 0), 0));
  }, [market.quotes]);

  return (
    <Page subtitle="Couleur : variation du jour · taille : part de la liquidité du secteur">
      {sectors.length
        ? sectors.map(([label, quotes]) => (
          <SectorBlock key={label} label={label} quotes={quotes} onOpen={(ticker) => router.push(`/stocks/${ticker}`)} />
        ))
        : <EmptyState icon="grid-outline" title="Carte indisponible" detail="Les cotations n'ont pas encore été chargées." />}
    </Page>
  );
}

const styles = StyleSheet.create({
  sector: { gap: 10 },
  sectorHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sectorCopy: { flex: 1 },
  sectorTitle: { ...type.title },
  sectorDetail: { ...type.caption, marginTop: 2 },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  tile: {
    flexGrow: 1, minHeight: 64, justifyContent: "center", gap: 3,
    paddingHorizontal: 12, borderRadius: radius.md,
  },
  tileTicker: { color: colors.ink, fontSize: 13.5, fontWeight: "800", letterSpacing: 0.2 },
  tileChange: { fontSize: 11.5, fontWeight: "700", fontVariant: tabular },
});
