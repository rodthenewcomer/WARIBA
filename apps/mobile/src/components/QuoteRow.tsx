import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { RealQuote } from "@afriterminal/core/types";
import { fcfa, pct } from "@afriterminal/core/format";
import { colors, tabular } from "../theme";
import { useWatchlistStore } from "../stores";

export function QuoteRow({ quote, rank, onRemove }: { quote: RealQuote; rank?: number; onRemove?: () => void }) {
  const router = useRouter();
  const watched = useWatchlistStore((state) => state.tickers.includes(quote.ticker));
  const toggle = useWatchlistStore((state) => state.toggle);
  const up = quote.dayChangePct >= 0;
  const previousPrice = useRef(quote.lastClose);
  const flash = useSharedValue(0);
  useEffect(() => {
    if (previousPrice.current !== quote.lastClose) {
      flash.value = withSequence(withTiming(1, { duration: 100 }), withTiming(0, { duration: 500 }));
      previousPrice.current = quote.lastClose;
    }
  }, [flash, quote.lastClose]);
  const flashStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      flash.value,
      [0, 1],
      ["rgba(0,0,0,0)", up ? "rgba(34,197,94,0.14)" : "rgba(239,68,68,0.14)"]
    ),
  }), [up]);
  const content = (
    <Animated.View style={flashStyle}>
      <Pressable onPress={() => router.push(`/stocks/${quote.ticker}`)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.65 }]}>
      {rank ? <Text style={styles.rank}>{rank}</Text> : null}
      <View style={styles.identity}>
        <Text style={styles.ticker}>{quote.ticker}</Text>
        <Text numberOfLines={1} style={styles.name}>{quote.name}</Text>
      </View>
      <View style={styles.quote}>
        <Text style={styles.price}>{fcfa(quote.lastClose)}</Text>
        <Text style={[styles.change, { color: up ? colors.up : colors.down }]}>{pct(quote.dayChangePct, { signed: true, digits: 2 })}</Text>
      </View>
      <Pressable hitSlop={10} onPress={(event) => { event.stopPropagation(); toggle(quote.ticker); }}>
        <Ionicons name={watched ? "star" : "star-outline"} size={17} color={watched ? colors.accent : colors.ink3} />
      </Pressable>
      </Pressable>
    </Animated.View>
  );
  if (!onRemove) return content;
  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={36}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${quote.ticker} de la watchlist`} onPress={onRemove} style={styles.remove}>
          <Ionicons name="trash-outline" size={18} color={colors.ink} />
          <Text style={styles.removeText}>Retirer</Text>
        </Pressable>
      )}
    >
      {content}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 10, borderBottomColor: colors.line, borderBottomWidth: 1 },
  rank: { width: 18, color: colors.ink3, fontSize: 10, fontVariant: tabular },
  identity: { flex: 1 }, ticker: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  name: { color: colors.ink3, fontSize: 10, marginTop: 3 }, quote: { alignItems: "flex-end" },
  price: { color: colors.ink, fontSize: 12, fontWeight: "700", fontVariant: tabular },
  change: { fontSize: 10, fontWeight: "700", marginTop: 3, fontVariant: tabular },
  remove: { width: 82, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: colors.down },
  removeText: { color: colors.ink, fontSize: 9, fontWeight: "700" },
});
