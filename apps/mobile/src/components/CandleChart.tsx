import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  useDerivedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { OHLCV } from "@afriterminal/core/types";
import type { TimeValue } from "@afriterminal/core/indicators";

/**
 * Spike Phase 1 (docs/mobile-app-plan.md) : preuve que le rendu de
 * chandelles + pan/pinch-zoom + overlay d'indicateur tient la route en
 * Skia natif, avant d'engager la réécriture complète du moteur de chart.
 * Simplifications assumées d'un spike (pas encore dans la vraie v1) :
 * échelle de prix fixée sur tout le jeu de données (pas d'auto-fit sur
 * la fenêtre visible), zoom centré sur le milieu du viewport plutôt que
 * sur le point du pincement.
 */

const UP = "#22c55e";
const DOWN = "#ef4444";
const ACCENT = "#e2a63d";

const BASE_SLOT_WIDTH = 10;
const MIN_SCALE = 0.4;
const MAX_SCALE = 4;

function clamp(v: number, lo: number, hi: number): number {
  "worklet";
  return Math.max(lo, Math.min(hi, v));
}

export function CandleChart({
  data,
  sma,
  height = 300,
}: {
  data: OHLCV[];
  sma?: TimeValue[];
  height?: number;
}) {
  const [width, setWidth] = useState(0);

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const startTranslateX = useSharedValue(0);
  const startScale = useSharedValue(1);

  const { min: priceMin, max: priceMax } = data.reduce(
    (acc, d) => ({ min: Math.min(acc.min, d.low), max: Math.max(acc.max, d.high) }),
    { min: Infinity, max: -Infinity }
  );
  const pricePad = (priceMax - priceMin) * 0.08;
  const yLo = priceMin - pricePad;
  const yHi = priceMax + pricePad;

  const smaByTime = new Map((sma ?? []).map((p) => [p.time, p.value]));

  const priceToY = (price: number) => {
    "worklet";
    return height - ((price - yLo) / (yHi - yLo)) * height;
  };

  const minTranslateFor = (s: number) => {
    "worklet";
    const totalWidth = data.length * BASE_SLOT_WIDTH * s;
    return Math.min(0, width - totalWidth);
  };

  // Une chandelle = une mèche (ligne) + un corps (rectangle) dans le MÊME
  // path, dessiné deux fois (stroke puis fill) — la mèche n'a pas d'aire
  // donc n'apparaît qu'au stroke, le corps est rempli au fill. Deux paths
  // (hausse/baisse) pour porter chacun sa couleur.
  function buildCandlePath(direction: "up" | "down") {
    "worklet";
    const path = Skia.Path.Make();
    if (width === 0) return path;
    const slotW = BASE_SLOT_WIDTH * scale.value;
    const halfW = slotW * 0.35;
    const startIdx = Math.max(0, Math.floor(-translateX.value / slotW) - 1);
    const endIdx = Math.min(data.length, startIdx + Math.ceil(width / slotW) + 2);
    for (let i = startIdx; i < endIdx; i++) {
      const bar = data[i];
      const isUp = bar.close >= bar.open;
      if ((direction === "up") !== isUp) continue;
      const x = i * slotW + translateX.value + slotW / 2;
      path.moveTo(x, priceToY(bar.high));
      path.lineTo(x, priceToY(bar.low));
      const openY = priceToY(bar.open);
      const closeY = priceToY(bar.close);
      const top = Math.min(openY, closeY);
      const bot = Math.max(openY, closeY);
      path.addRect({ x: x - halfW, y: top, width: halfW * 2, height: Math.max(1, bot - top) });
    }
    return path;
  }

  const upPath = useDerivedValue(() => buildCandlePath("up"), [data, width, height]);
  const downPath = useDerivedValue(() => buildCandlePath("down"), [data, width, height]);

  const smaPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (width === 0 || smaByTime.size === 0) return path;
    const slotW = BASE_SLOT_WIDTH * scale.value;
    let started = false;
    for (let i = 0; i < data.length; i++) {
      const v = smaByTime.get(data[i].time as string);
      if (v === undefined) continue;
      const x = i * slotW + translateX.value + slotW / 2;
      if (x < -slotW || x > width + slotW) {
        started = false;
        continue;
      }
      const y = priceToY(v);
      if (!started) {
        path.moveTo(x, y);
        started = true;
      } else {
        path.lineTo(x, y);
      }
    }
    return path;
  }, [data, width, height, sma]);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      startTranslateX.value = translateX.value;
    })
    .onChange((e) => {
      const lo = minTranslateFor(scale.value);
      translateX.value = clamp(startTranslateX.value + e.translationX, lo, 0);
    });

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      startScale.value = scale.value;
      startTranslateX.value = translateX.value;
    })
    .onChange((e) => {
      const newScale = clamp(startScale.value * e.scale, MIN_SCALE, MAX_SCALE);
      // Zoom centré sur le milieu du viewport (simplification du spike —
      // pas le point exact du pincement).
      const center = width / 2;
      const ratio = newScale / scale.value;
      const lo = minTranslateFor(newScale);
      translateX.value = clamp(center - (center - translateX.value) * ratio, lo, 0);
      scale.value = newScale;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withTiming(1);
      translateX.value = withTiming(minTranslateFor(1));
    });

  const composed = Gesture.Simultaneous(panGesture, pinchGesture, doubleTap);

  return (
    <GestureDetector gesture={composed}>
      <View
        style={[styles.container, { height }]}
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setWidth(w);
          const lo = width === 0 ? Math.min(0, w - data.length * BASE_SLOT_WIDTH) : translateX.value;
          if (width === 0) translateX.value = lo;
        }}
      >
        <Canvas style={{ width: "100%", height }}>
          <Path path={upPath} color={UP} style="stroke" strokeWidth={1} />
          <Path path={upPath} color={UP} style="fill" />
          <Path path={downPath} color={DOWN} style="stroke" strokeWidth={1} />
          <Path path={downPath} color={DOWN} style="fill" />
          <Path path={smaPath} color={ACCENT} style="stroke" strokeWidth={1.5} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    backgroundColor: "#111113",
    borderRadius: 12,
    overflow: "hidden",
  },
});
