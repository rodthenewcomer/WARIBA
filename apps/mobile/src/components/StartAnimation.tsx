import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Canvas, Path } from "@shopify/react-native-skia";
import { colors, tabular } from "../theme";

/**
 * Signature d'ouverture (~1,8 s) : le monogramme « A » se trace, trois
 * chandelles poussent, le wordmark apparaît, puis fondu vers l'app.
 * Le chargement des données tourne pendant toute la séquence (le
 * provider est monté au-dessus) — l'animation n'ajoute aucune attente.
 * Avec « réduire les animations », la séquence saute au fondu final.
 */

const MONOGRAM_SIZE = 108;
const A_OUTLINE = "M 22 88 L 50 14 L 78 88";
const A_BAR = "M 34 63 L 66 63";

const CANDLES = [
  { body: 22, wick: 34, up: true, delay: 420 },
  { body: 30, wick: 46, up: false, delay: 540 },
  { body: 38, wick: 56, up: true, delay: 660 },
] as const;

function Candle({ body, wick, up, delay, reduceMotion }: {
  body: number;
  wick: number;
  up: boolean;
  delay: number;
  reduceMotion: boolean;
}) {
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!reduceMotion) progress.value = withDelay(delay, withSpring(1, { damping: 13, stiffness: 150 }));
  }, [delay, progress, reduceMotion]);
  // Croissance depuis la base : scaleY compensé pour ancrer le bas.
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 2),
    transform: [
      { translateY: ((1 - progress.value) * wick) / 2 },
      { scaleY: progress.value },
    ],
  }));
  const color = up ? colors.up : colors.down;
  return (
    <Animated.View style={[styles.candle, { height: wick }, style]}>
      <View style={[styles.wick, { backgroundColor: color, height: wick }]} />
      <View style={[styles.body, { backgroundColor: color, height: body }]} />
    </Animated.View>
  );
}

export function StartAnimation({ reduceMotion, onDone }: {
  reduceMotion: boolean;
  onDone: () => void;
}) {
  const draw = useSharedValue(reduceMotion ? 1 : 0);
  const bar = useSharedValue(reduceMotion ? 1 : 0);
  const text = useSharedValue(reduceMotion ? 1 : 0);
  const veil = useSharedValue(1);

  useEffect(() => {
    const holdBeforeFade = reduceMotion ? 420 : 1450;
    if (!reduceMotion) {
      draw.value = withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) });
      bar.value = withDelay(280, withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) }));
      text.value = withDelay(880, withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) }));
    }
    veil.value = withDelay(holdBeforeFade, withTiming(0, { duration: 350 }, (finished) => {
      if (finished) runOnJS(onDone)();
    }));
  }, [bar, draw, onDone, reduceMotion, text, veil]);

  const veilStyle = useAnimatedStyle(() => ({ opacity: veil.value }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: text.value,
    transform: [{ translateY: (1 - text.value) * 8 }],
  }));

  return (
    <Animated.View style={[styles.screen, veilStyle]} accessibilityLabel="AfriTerminal — la BRVM, lisible">
      <View style={styles.stage}>
        <Canvas style={styles.monogram}>
          <Path
            path={A_OUTLINE}
            style="stroke"
            strokeWidth={9}
            strokeCap="round"
            strokeJoin="round"
            color={colors.accent}
            start={0}
            end={draw as SharedValue<number>}
          />
          <Path
            path={A_BAR}
            style="stroke"
            strokeWidth={9}
            strokeCap="round"
            color={colors.accent}
            start={0}
            end={bar as SharedValue<number>}
          />
        </Canvas>
        <View style={styles.candles}>
          {CANDLES.map((candle) => (
            <Candle key={candle.delay} {...candle} reduceMotion={reduceMotion} />
          ))}
        </View>
      </View>
      <Animated.View style={[styles.copy, textStyle]}>
        <Text style={styles.wordmark}>
          Afri<Text style={styles.wordmarkAccent}>Terminal</Text>
        </Text>
        <Text style={styles.tagline}>La BRVM, lisible.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 26,
    backgroundColor: colors.background,
  },
  stage: { flexDirection: "row", alignItems: "flex-end", gap: 18 },
  monogram: { width: MONOGRAM_SIZE, height: MONOGRAM_SIZE },
  candles: { flexDirection: "row", alignItems: "flex-end", gap: 9, paddingBottom: 13 },
  candle: { width: 11, alignItems: "center", justifyContent: "flex-end" },
  wick: { position: "absolute", bottom: 0, width: 2, borderRadius: 1, opacity: 0.55 },
  body: { width: 11, borderRadius: 3 },
  copy: { alignItems: "center", gap: 7 },
  wordmark: { color: colors.ink, fontSize: 27, fontWeight: "800", letterSpacing: -0.6 },
  wordmarkAccent: { color: colors.accent },
  tagline: { color: colors.ink3, fontSize: 13, fontWeight: "500", letterSpacing: 0.2, fontVariant: tabular },
});
