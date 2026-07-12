import { useMemo } from "react";
import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { calculateSMA } from "@afriterminal/core/indicators";
import { fcfa, pct } from "@afriterminal/core/format";
import { CandleChart } from "./components/CandleChart";
import snts from "./data/snts-sample.json";
import type { OHLCV } from "@afriterminal/core/types";

const data = snts as OHLCV[];

/**
 * Écran unique du spike Phase 1 — pas encore une vraie app (pas de
 * navigation, un seul ticker en dur). But : prouver le rendu Skia natif
 * avant d'engager la réécriture complète du moteur de chart mobile.
 */
export default function AppContent() {
  const sma20 = useMemo(() => calculateSMA(data, 20), []);
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const change = ((last.close - prev.close) / prev.close) * 100;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaView style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <Text style={styles.brand}>
            Afri<Text style={styles.brandAccent}>Terminal</Text>
          </Text>
          <Text style={styles.badge}>Spike Skia — non final</Text>
        </View>

        <View style={styles.tickerRow}>
          <Text style={styles.ticker}>SNTS</Text>
          <Text style={styles.price}>{fcfa(last.close)}</Text>
          <Text style={[styles.change, change >= 0 ? styles.up : styles.down]}>
            {pct(change, { signed: true, digits: 2 })}
          </Text>
        </View>

        <CandleChart data={data} sma={sma20} height={340} />

        <Text style={styles.hint}>
          Glisser pour naviguer · pincer pour zoomer · double-tap pour
          recadrer — 180 dernières séances réelles, ligne dorée = SMA 20
        </Text>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#09090b" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  brand: { fontSize: 17, fontWeight: "800", color: "#fafafa" },
  brandAccent: { color: "#e2a63d" },
  badge: {
    fontSize: 10,
    fontWeight: "600",
    color: "#d2a13c",
    backgroundColor: "rgba(226,166,61,0.12)",
    borderColor: "rgba(226,166,61,0.3)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden",
  },
  tickerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 12,
  },
  ticker: { fontSize: 15, fontWeight: "700", color: "#fafafa" },
  price: { fontSize: 20, fontWeight: "700", color: "#fafafa" },
  change: { fontSize: 13, fontWeight: "600" },
  up: { color: "#22c55e" },
  down: { color: "#ef4444" },
  hint: {
    fontSize: 11,
    color: "#71717a",
    paddingHorizontal: 16,
    paddingTop: 10,
    textAlign: "center",
  },
});
