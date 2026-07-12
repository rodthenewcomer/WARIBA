import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ViewShot, { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import type { ChartType, IndicatorId, OHLCV } from "@afriterminal/core/types";
import {
  calculateATR, calculateBollingerBands, calculateEMA, calculateHeikinAshi,
  calculateMACD, calculateRSI, calculateSMA, calculateStochastic, calculateVWAP,
} from "@afriterminal/core/indicators";
import { CandleChart, type ChartEvent, type ChartOverlay, type ChartPane } from "./CandleChart";
import { ActionButton } from "./ui";
import { useChartLevelStore, useChartStore } from "../stores";
import { colors } from "../theme";

const TYPES: { id: ChartType; label: string }[] = [
  { id: "candlestick", label: "Bougies" }, { id: "line", label: "Ligne" },
  { id: "area", label: "Aire" }, { id: "baseline", label: "Baseline" },
  { id: "bars", label: "Barres" }, { id: "heikin-ashi", label: "Heikin" },
];
const INDICATORS: { id: IndicatorId; label: string; pane?: boolean }[] = [
  { id: "sma20", label: "SMA 20" }, { id: "sma50", label: "SMA 50" },
  { id: "sma100", label: "SMA 100" }, { id: "sma200", label: "SMA 200" },
  { id: "ema20", label: "EMA 20" }, { id: "vwap", label: "VWAP" },
  { id: "bollinger", label: "Bollinger" }, { id: "rsi", label: "RSI", pane: true },
  { id: "macd", label: "MACD", pane: true }, { id: "atr", label: "ATR", pane: true },
  { id: "stoch", label: "Stoch", pane: true },
];

function toValues(data: OHLCV[], points: { time: string | number; value: number }[]): (number | null)[] {
  const map = new Map(points.map((point) => [String(point.time), point.value]));
  return data.map((bar) => map.get(String(bar.time)) ?? null);
}

export function AdvancedChart({
  ticker, data, previousClose, week52High, week52Low, events = [],
}: {
  ticker: string;
  data: OHLCV[];
  previousClose?: number;
  week52High?: number;
  week52Low?: number;
  events?: ChartEvent[];
}) {
  const shotRef = useRef<ViewShot>(null);
  const [showIndicators, setShowIndicators] = useState(false);
  const [levelMode, setLevelMode] = useState(false);
  const type = useChartStore((state) => state.type);
  const indicators = useChartStore((state) => state.indicators);
  const logarithmic = useChartStore((state) => state.logarithmic);
  const percentMode = useChartStore((state) => state.percentMode);
  const setType = useChartStore((state) => state.setType);
  const toggleIndicator = useChartStore((state) => state.toggleIndicator);
  const toggleLog = useChartStore((state) => state.toggleLog);
  const togglePercent = useChartStore((state) => state.togglePercent);
  const levels = useChartLevelStore((state) => state.byTicker[ticker] ?? []);
  const toggleLevel = useChartLevelStore((state) => state.toggle);
  const chartData = useMemo(() => type === "heikin-ashi" ? calculateHeikinAshi(data) : data, [data, type]);

  const computed = useMemo(() => {
    const sma20 = calculateSMA(data, 20);
    const sma50 = calculateSMA(data, 50);
    const sma100 = calculateSMA(data, 100);
    const sma200 = calculateSMA(data, 200);
    const ema20 = calculateEMA(data, 20);
    const vwap = calculateVWAP(data);
    const bollinger = calculateBollingerBands(data);
    const rsi = calculateRSI(data);
    const macd = calculateMACD(data);
    const atr = calculateATR(data);
    const stoch = calculateStochastic(data);
    return { sma20, sma50, sma100, sma200, ema20, vwap, bollinger, rsi, macd, atr, stoch };
  }, [data]);

  const overlays = useMemo<ChartOverlay[]>(() => {
    const result: ChartOverlay[] = [];
    const add = (id: IndicatorId, color: string, points: { time: string | number; value: number }[]) => {
      if (indicators.includes(id)) result.push({ id, color, values: toValues(data, points) });
    };
    add("sma20", colors.accent, computed.sma20);
    add("sma50", "#60a5fa", computed.sma50);
    add("sma100", "#c084fc", computed.sma100);
    add("sma200", colors.warn, computed.sma200);
    add("ema20", "#2dd4bf", computed.ema20);
    add("vwap", colors.violet, computed.vwap);
    if (indicators.includes("bollinger")) {
      result.push({ id: "bollinger-upper", color: "rgba(96,165,250,0.65)", values: toValues(data, computed.bollinger.upper) });
      result.push({ id: "bollinger-middle", color: "rgba(96,165,250,0.4)", values: toValues(data, computed.bollinger.middle) });
      result.push({ id: "bollinger-lower", color: "rgba(96,165,250,0.65)", values: toValues(data, computed.bollinger.lower) });
    }
    return result;
  }, [computed, data, indicators]);

  const panes = useMemo(() => {
    const result: ChartPane[] = [];
    if (indicators.includes("rsi")) result.push({ id: "rsi", label: "RSI 14", values: toValues(data, computed.rsi), color: colors.violet });
    if (indicators.includes("macd")) result.push({ id: "macd", label: "MACD 12·26·9", values: toValues(data, computed.macd.macd), second: toValues(data, computed.macd.signal), color: colors.violet });
    if (indicators.includes("atr")) result.push({ id: "atr", label: "ATR 14", values: toValues(data, computed.atr), color: colors.warn });
    if (indicators.includes("stoch")) result.push({ id: "stoch", label: "Stoch 14·3", values: toValues(data, computed.stoch.k), second: toValues(data, computed.stoch.d), color: colors.accent });
    return result;
  }, [computed, data, indicators]);

  const share = async () => {
    if (!shotRef.current) return;
    const uri = await captureRef(shotRef, { format: "png", quality: 1, result: "tmpfile" });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: `${ticker} · AfriTerminal` });
  };

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbar}>
        {TYPES.map((item) => <ActionButton key={item.id} label={item.label} active={type === item.id} onPress={() => setType(item.id)} />)}
      </ScrollView>
      <View style={styles.actions}>
        <ActionButton label="Indicateurs" icon="options-outline" active={showIndicators} onPress={() => setShowIndicators((value) => !value)} />
        <ActionButton label="Log" active={logarithmic} onPress={toggleLog} />
        <ActionButton label="%" active={percentMode} onPress={togglePercent} />
        <ActionButton label="Niveau" icon="remove-outline" active={levelMode} onPress={() => setLevelMode((value) => !value)} />
        <ActionButton label="PNG" icon="share-outline" onPress={() => void share()} />
      </View>
      {showIndicators ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.indicators}>
          {INDICATORS.map((item) => <ActionButton key={item.id} label={item.label} active={indicators.includes(item.id)} onPress={() => toggleIndicator(item.id)} />)}
        </ScrollView>
      ) : null}
      <ViewShot ref={shotRef} options={{ format: "png", quality: 1 }} style={styles.capture}>
        <CandleChart
          data={chartData}
          type={type}
          overlays={overlays}
          referenceLines={[previousClose, week52High, week52Low].filter((value): value is number => value !== undefined)}
          levels={levels}
          events={events}
          panes={panes}
          logarithmic={logarithmic}
          percentMode={percentMode}
          levelMode={levelMode}
          onToggleLevel={(price) => toggleLevel(ticker, price)}
          height={360}
        />
      </ViewShot>
      {levelMode ? <Text style={styles.levelHint}>Touchez le chart pour poser ou retirer un niveau de prix.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 9 }, toolbar: { gap: 7 }, actions: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, indicators: { gap: 7 },
  capture: { backgroundColor: colors.background, gap: 6 },
  levelHint: { color: colors.accent, fontSize: 10, lineHeight: 14 },
});
