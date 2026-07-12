import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import * as Haptics from "expo-haptics";
import type { ChartType, OHLCV } from "@afriterminal/core/types";
import type { TimeValue } from "@afriterminal/core/indicators";
import { anchoredChartZoom } from "./chartTransform";

const COLORS = {
  background: "#09090b",
  surface: "#111113",
  surface2: "#18181b",
  line: "rgba(255,255,255,0.08)",
  ink: "#fafafa",
  ink2: "#a1a1aa",
  ink3: "#63636b",
  accent: "#e2a63d",
  up: "#22c55e",
  down: "#ef4444",
} as const;

const BASE_SLOT_WIDTH = 10;
const MIN_SCALE = 0.4;
const MAX_SCALE = 4;
const PRICE_AXIS_WIDTH = 58;
const DATE_AXIS_HEIGHT = 26;
const PLOT_TOP = 10;
const TOOLTIP_WIDTH = 174;
const SPRING = { damping: 19, stiffness: 190, mass: 0.82 } as const;
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const integerFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

type DateTick = { key: string; label: string; x: number };

export interface ChartOverlay {
  id: string;
  color: string;
  values: (number | null)[];
}

export interface ChartEvent {
  time: string;
  color: string;
  kind: "dividend" | "operation";
}

export interface ChartPane {
  id: string;
  label: string;
  values: (number | null)[];
  second?: (number | null)[];
  color: string;
}

function clamp(v: number, lo: number, hi: number): number {
  "worklet";
  return Math.max(lo, Math.min(hi, v));
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function formatShortDate(value: string): string {
  const [, month, day] = value.split("-").map(Number);
  if (!month || !day) return value;
  return `${day} ${MONTHS[month - 1]}`;
}

function formatPrice(value: number): string {
  return integerFormatter.format(value);
}

function triggerResetHaptic(): void {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function triggerSelectionHaptic(): void {
  void Haptics.selectionAsync();
}

function makeDateTicks(
  data: OHLCV[],
  scale: number,
  translateX: number,
  containerWidth: number
): DateTick[] {
  const plotWidth = Math.max(0, containerWidth - PRICE_AXIS_WIDTH);
  if (plotWidth === 0 || data.length === 0) return [];
  const slotWidth = BASE_SLOT_WIDTH * scale;
  const anchors = [18, plotWidth / 2, Math.max(18, plotWidth - 18)];
  const seen = new Set<number>();

  return anchors.flatMap((x, position) => {
    const index = Math.round((x - translateX - slotWidth / 2) / slotWidth);
    const safeIndex = Math.max(0, Math.min(data.length - 1, index));
    if (seen.has(safeIndex)) return [];
    seen.add(safeIndex);
    return [{
      key: `${position}-${safeIndex}`,
      label: formatShortDate(String(data[safeIndex].time)),
      x,
    }];
  });
}

function OverlayLine({
  overlay, scale, translateX, plotWidth, plotHeight, yLo, yHi, basePrice,
  logarithmic, percentMode,
}: {
  overlay: ChartOverlay;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  plotWidth: number;
  plotHeight: number;
  yLo: number;
  yHi: number;
  basePrice: number;
  logarithmic: boolean;
  percentMode: boolean;
}) {
  const path = useDerivedValue(() => {
    const next = Skia.Path.Make();
    const slotWidth = BASE_SLOT_WIDTH * scale.value;
    let started = false;
    overlay.values.forEach((value, index) => {
      if (value === null) { started = false; return; }
      const x = index * slotWidth + translateX.value + slotWidth / 2;
      if (x < -slotWidth || x > plotWidth + slotWidth) { started = false; return; }
      const projected = percentMode ? ((value / basePrice) - 1) * 100 : logarithmic ? Math.log(Math.max(1, value)) : value;
      const y = PLOT_TOP + (1 - (projected - yLo) / (yHi - yLo)) * plotHeight;
      if (!started) { next.moveTo(x, y); started = true; } else next.lineTo(x, y);
    });
    return next;
  }, [overlay.values, plotWidth, plotHeight, yLo, yHi, logarithmic, percentMode]);
  return <Path path={path} color={overlay.color} style="stroke" strokeWidth={1.25} />;
}

function HorizontalGuide({
  price, color, dashed = false, plotWidth, plotHeight, yLo, yHi, basePrice,
  logarithmic, percentMode,
}: {
  price: number;
  color: string;
  dashed?: boolean;
  plotWidth: number;
  plotHeight: number;
  yLo: number;
  yHi: number;
  basePrice: number;
  logarithmic: boolean;
  percentMode: boolean;
}) {
  const path = useMemo(() => {
    const next = Skia.Path.Make();
    const projected = percentMode ? ((price / basePrice) - 1) * 100 : logarithmic ? Math.log(Math.max(1, price)) : price;
    const y = PLOT_TOP + (1 - (projected - yLo) / (yHi - yLo)) * plotHeight;
    if (dashed) {
      for (let x = 0; x < plotWidth; x += 8) { next.moveTo(x, y); next.lineTo(Math.min(plotWidth, x + 4), y); }
    } else { next.moveTo(0, y); next.lineTo(plotWidth, y); }
    return next;
  }, [price, plotWidth, plotHeight, yLo, yHi, basePrice, logarithmic, percentMode, dashed]);
  return <Path path={path} color={color} style="stroke" strokeWidth={StyleSheet.hairlineWidth} />;
}

function EventMarkers({ events, data, scale, translateX, plotWidth, plotBottom }: { events: ChartEvent[]; data: OHLCV[]; scale: SharedValue<number>; translateX: SharedValue<number>; plotWidth: number; plotBottom: number }) {
  const indices = useMemo(() => events.map((event) => ({ ...event, index: data.findIndex((bar) => String(bar.time) === event.time) })).filter((event) => event.index >= 0), [data, events]);
  return <>{indices.map((event) => <EventMarker key={`${event.time}-${event.kind}`} event={event} scale={scale} translateX={translateX} plotWidth={plotWidth} plotBottom={plotBottom} />)}</>;
}

function EventMarker({ event, scale, translateX, plotWidth, plotBottom }: { event: ChartEvent & { index: number }; scale: SharedValue<number>; translateX: SharedValue<number>; plotWidth: number; plotBottom: number }) {
  const path = useDerivedValue(() => {
    const next = Skia.Path.Make();
    const slotWidth = BASE_SLOT_WIDTH * scale.value;
    const x = event.index * slotWidth + translateX.value + slotWidth / 2;
    if (x < 0 || x > plotWidth) return next;
    next.moveTo(x, plotBottom - 3); next.lineTo(x - 4, plotBottom - 10); next.lineTo(x + 4, plotBottom - 10); next.close();
    return next;
  }, [event.index, plotWidth, plotBottom]);
  return <Path path={path} color={event.color} style="fill" />;
}

/** Native Skia price engine; continuous gestures stay on the UI thread. */
export function CandleChart({
  data,
  sma,
  type = "candlestick",
  overlays = [],
  referenceLines = [],
  levels = [],
  events = [],
  panes = [],
  logarithmic = false,
  percentMode = false,
  levelMode = false,
  onToggleLevel,
  height = 340,
}: {
  data: OHLCV[];
  sma?: TimeValue[];
  type?: ChartType;
  overlays?: ChartOverlay[];
  referenceLines?: number[];
  levels?: number[];
  events?: ChartEvent[];
  panes?: ChartPane[];
  logarithmic?: boolean;
  percentMode?: boolean;
  levelMode?: boolean;
  onToggleLevel?: (price: number) => void;
  height?: number;
}) {
  const [width, setWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(Math.max(0, data.length - 1));
  const [dateTicks, setDateTicks] = useState<DateTick[]>([]);

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const startTranslateX = useSharedValue(0);
  const startScale = useSharedValue(1);
  const pinchFocalX = useSharedValue(0);
  const crosshairX = useSharedValue(0);
  const crosshairY = useSharedValue(PLOT_TOP);
  const crosshairIndex = useSharedValue(-1);
  const crosshairActive = useSharedValue(0);
  const tooltipOpacity = useSharedValue(0);

  const plotWidth = Math.max(0, width - PRICE_AXIS_WIDTH);
  const plotBottom = height - DATE_AXIS_HEIGHT;
  const plotHeight = Math.max(1, plotBottom - PLOT_TOP);

  const basePrice = data[0]?.close ?? 1;
  const projectOnJS = useCallback((price: number) => {
    if (percentMode) return ((price / basePrice) - 1) * 100;
    if (logarithmic) return Math.log(Math.max(1, price));
    return price;
  }, [basePrice, logarithmic, percentMode]);
  const unprojectOnJS = useCallback((value: number) => {
    if (percentMode) return basePrice * (1 + value / 100);
    if (logarithmic) return Math.exp(value);
    return value;
  }, [basePrice, logarithmic, percentMode]);

  const { min: priceMin, max: priceMax } = useMemo(
    () => data.reduce(
      (acc, d) => ({ min: Math.min(acc.min, projectOnJS(d.low)), max: Math.max(acc.max, projectOnJS(d.high)) }),
      { min: Infinity, max: -Infinity }
    ),
    [data, projectOnJS]
  );
  const pricePad = Math.max(1, (priceMax - priceMin) * 0.08);
  const yLo = priceMin - pricePad;
  const yHi = priceMax + pricePad;

  const smaValues = useMemo(() => {
    const byTime = new Map((sma ?? []).map((point) => [String(point.time), point.value]));
    return data.map((bar) => byTime.get(String(bar.time)) ?? null);
  }, [data, sma]);
  const allOverlays = overlays;

  const priceTicks = useMemo(
    () => Array.from({ length: 5 }, (_, index) => ({
      key: index,
      price: yHi - ((yHi - yLo) * index) / 4,
      y: PLOT_TOP + (plotHeight * index) / 4,
    })),
    [plotHeight, yHi, yLo]
  );

  const selectedBar = data[selectedIndex] ?? data[data.length - 1];

  const syncDateTicks = useCallback(
    (nextScale: number, nextTranslateX: number, nextWidth: number) => {
      setDateTicks(makeDateTicks(data, nextScale, nextTranslateX, nextWidth));
    },
    [data]
  );

  const priceToY = (price: number) => {
    "worklet";
    const projected = percentMode
      ? ((price / basePrice) - 1) * 100
      : logarithmic ? Math.log(Math.max(1, price)) : price;
    return PLOT_TOP + (1 - (projected - yLo) / (yHi - yLo)) * plotHeight;
  };

  const yToPrice = (y: number) => {
    "worklet";
    const projected = yHi - ((clamp(y, PLOT_TOP, plotBottom) - PLOT_TOP) / plotHeight) * (yHi - yLo);
    if (percentMode) return basePrice * (1 + projected / 100);
    if (logarithmic) return Math.exp(projected);
    return projected;
  };

  const minTranslateFor = (nextScale: number) => {
    "worklet";
    const totalWidth = data.length * BASE_SLOT_WIDTH * nextScale;
    return Math.min(0, plotWidth - totalWidth);
  };

  function buildCandlePath(
    direction: "up" | "down",
    currentScale: number,
    currentTranslateX: number
  ) {
    "worklet";
    const path = Skia.Path.Make();
    if (plotWidth === 0) return path;
    const slotWidth = BASE_SLOT_WIDTH * currentScale;
    const halfWidth = Math.max(1, slotWidth * 0.34);
    const startIndex = Math.max(0, Math.floor(-currentTranslateX / slotWidth) - 1);
    const endIndex = Math.min(data.length, startIndex + Math.ceil(plotWidth / slotWidth) + 2);

    for (let index = startIndex; index < endIndex; index++) {
      const bar = data[index];
      const isUp = bar.close >= bar.open;
      if ((direction === "up") !== isUp) continue;
      const x = index * slotWidth + currentTranslateX + slotWidth / 2;
      path.moveTo(x, priceToY(bar.high));
      path.lineTo(x, priceToY(bar.low));
      const openY = priceToY(bar.open);
      const closeY = priceToY(bar.close);
      const top = Math.min(openY, closeY);
      const bottom = Math.max(openY, closeY);
      path.addRect({
        x: x - halfWidth,
        y: top,
        width: halfWidth * 2,
        height: Math.max(1, bottom - top),
      });
    }
    return path;
  }

  const upPath = useDerivedValue(() => {
    const currentScale = scale.value;
    const currentTranslateX = translateX.value;
    return buildCandlePath("up", currentScale, currentTranslateX);
  }, [data, plotWidth, plotHeight, yLo, yHi, logarithmic, percentMode]);
  const downPath = useDerivedValue(() => {
    const currentScale = scale.value;
    const currentTranslateX = translateX.value;
    return buildCandlePath("down", currentScale, currentTranslateX);
  }, [data, plotWidth, plotHeight, yLo, yHi, logarithmic, percentMode]);

  const closePath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const slotWidth = BASE_SLOT_WIDTH * scale.value;
    let started = false;
    data.forEach((bar, index) => {
      const x = index * slotWidth + translateX.value + slotWidth / 2;
      if (x < -slotWidth || x > plotWidth + slotWidth) { started = false; return; }
      const y = priceToY(bar.close);
      if (!started) { path.moveTo(x, y); started = true; } else path.lineTo(x, y);
    });
    return path;
  }, [data, plotWidth, plotHeight, yLo, yHi, logarithmic, percentMode]);

  const areaPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const slotWidth = BASE_SLOT_WIDTH * scale.value;
    const startIndex = Math.max(0, Math.floor(-translateX.value / slotWidth) - 1);
    const endIndex = Math.min(data.length, startIndex + Math.ceil(plotWidth / slotWidth) + 2);
    if (startIndex >= endIndex) return path;
    const startX = startIndex * slotWidth + translateX.value + slotWidth / 2;
    path.moveTo(startX, plotBottom);
    for (let index = startIndex; index < endIndex; index++) {
      const x = index * slotWidth + translateX.value + slotWidth / 2;
      path.lineTo(x, priceToY(data[index].close));
    }
    const endX = (endIndex - 1) * slotWidth + translateX.value + slotWidth / 2;
    path.lineTo(endX, plotBottom);
    path.close();
    return path;
  }, [data, plotWidth, plotBottom, yLo, yHi, logarithmic, percentMode]);

  const barPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const slotWidth = BASE_SLOT_WIDTH * scale.value;
    const tick = Math.max(1.5, slotWidth * 0.25);
    const startIndex = Math.max(0, Math.floor(-translateX.value / slotWidth) - 1);
    const endIndex = Math.min(data.length, startIndex + Math.ceil(plotWidth / slotWidth) + 2);
    for (let index = startIndex; index < endIndex; index++) {
      const bar = data[index];
      const x = index * slotWidth + translateX.value + slotWidth / 2;
      path.moveTo(x, priceToY(bar.high)); path.lineTo(x, priceToY(bar.low));
      path.moveTo(x - tick, priceToY(bar.open)); path.lineTo(x, priceToY(bar.open));
      path.moveTo(x, priceToY(bar.close)); path.lineTo(x + tick, priceToY(bar.close));
    }
    return path;
  }, [data, plotWidth, yLo, yHi, logarithmic, percentMode]);

  const smaPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (plotWidth === 0) return path;
    const slotWidth = BASE_SLOT_WIDTH * scale.value;
    let started = false;
    for (let index = 0; index < data.length; index++) {
      const value = smaValues[index];
      if (value === null) continue;
      const x = index * slotWidth + translateX.value + slotWidth / 2;
      if (x < -slotWidth || x > plotWidth + slotWidth) {
        started = false;
        continue;
      }
      const y = priceToY(value);
      if (!started) {
        path.moveTo(x, y);
        started = true;
      } else {
        path.lineTo(x, y);
      }
    }
    return path;
  }, [data, plotWidth, plotHeight, smaValues, yLo, yHi, logarithmic, percentMode]);

  const crosshairPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (!crosshairActive.value || plotWidth === 0) return path;
    path.moveTo(crosshairX.value, PLOT_TOP);
    path.lineTo(crosshairX.value, plotBottom);
    path.moveTo(0, crosshairY.value);
    path.lineTo(plotWidth, crosshairY.value);
    return path;
  }, [plotWidth, plotBottom]);

  const tooltipStyle = useAnimatedStyle(() => {
    const left = crosshairX.value < plotWidth / 2
      ? Math.max(8, plotWidth - TOOLTIP_WIDTH - 8)
      : 8;
    return {
      opacity: tooltipOpacity.value,
      transform: [{ translateX: left }],
    };
  }, [plotWidth]);

  const selectCrosshair = (x: number, y: number) => {
    "worklet";
    if (plotWidth === 0) return;
    const slotWidth = BASE_SLOT_WIDTH * scale.value;
    const index = Math.round((clamp(x, 0, plotWidth) - translateX.value - slotWidth / 2) / slotWidth);
    const safeIndex = Math.max(0, Math.min(data.length - 1, index));
    const candleX = safeIndex * slotWidth + translateX.value + slotWidth / 2;
    crosshairX.value = clamp(candleX, 0, plotWidth);
    crosshairY.value = clamp(y, PLOT_TOP, plotBottom);
    if (safeIndex !== crosshairIndex.value) {
      crosshairIndex.value = safeIndex;
      scheduleOnRN(setSelectedIndex, safeIndex);
    }
  };

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .activeOffsetX([-12, 12])
    .failOffsetY([-16, 16])
    .onStart(() => {
      cancelAnimation(translateX);
      startTranslateX.value = translateX.value;
    })
    .onUpdate((event) => {
      const minTranslate = minTranslateFor(scale.value);
      translateX.value = clamp(startTranslateX.value + event.translationX, minTranslate, 0);
    })
    .onEnd((event) => {
      const minTranslate = minTranslateFor(scale.value);
      translateX.value = withDecay(
        {
          velocity: event.velocityX,
          deceleration: 0.995,
          clamp: [minTranslate, 0],
          rubberBandEffect: false,
        },
        (finished) => {
          if (finished) scheduleOnRN(syncDateTicks, scale.value, translateX.value, width);
        }
      );
    });

  const pinchGesture = Gesture.Pinch()
    .onStart((event) => {
      cancelAnimation(scale);
      cancelAnimation(translateX);
      startScale.value = scale.value;
      startTranslateX.value = translateX.value;
      pinchFocalX.value = clamp(event.focalX, 0, plotWidth);
    })
    .onUpdate((event) => {
      const next = anchoredChartZoom({
        startScale: startScale.value,
        startTranslateX: startTranslateX.value,
        gestureScale: event.scale,
        focalX: pinchFocalX.value,
        plotWidth,
        itemCount: data.length,
        baseSlotWidth: BASE_SLOT_WIDTH,
        minScale: MIN_SCALE,
        maxScale: MAX_SCALE,
      });
      translateX.value = next.translateX;
      scale.value = next.scale;
    })
    .onEnd(() => {
      const targetScale = clamp(scale.value, MIN_SCALE, MAX_SCALE);
      const targetTranslate = clamp(translateX.value, minTranslateFor(targetScale), 0);
      scale.value = withSpring(targetScale, SPRING);
      translateX.value = withSpring(targetTranslate, SPRING, (finished) => {
        if (finished) scheduleOnRN(syncDateTicks, targetScale, targetTranslate, width);
      });
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(240)
    .onEnd(() => {
      const resetTranslate = minTranslateFor(1);
      scale.value = withSpring(1, SPRING);
      translateX.value = withSpring(resetTranslate, SPRING, (finished) => {
        if (finished) scheduleOnRN(syncDateTicks, 1, resetTranslate, width);
      });
      scheduleOnRN(triggerResetHaptic);
    });

  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(220)
    .onEnd((event) => {
      if (levelMode && onToggleLevel) scheduleOnRN(onToggleLevel, yToPrice(event.y));
    });

  const longPress = Gesture.LongPress()
    .minDuration(320)
    .maxDistance(14)
    .onStart((event) => {
      crosshairActive.value = 1;
      tooltipOpacity.value = withTiming(1, { duration: 120 });
      selectCrosshair(event.x, event.y);
      scheduleOnRN(triggerSelectionHaptic);
    })
    .onTouchesMove((event) => {
      if (!crosshairActive.value) return;
      const touch = event.allTouches[0];
      if (touch) selectCrosshair(touch.x, touch.y);
    })
    .onFinalize(() => {
      crosshairActive.value = 0;
      tooltipOpacity.value = withTiming(0, { duration: 100 });
    });

  const tapGesture = Gesture.Exclusive(doubleTap, singleTap);
  const composedGesture = Gesture.Simultaneous(
    panGesture,
    pinchGesture,
    tapGesture,
    longPress
  );

  return (
    <View style={styles.chartStack}>
      <GestureDetector gesture={composedGesture}>
      <View
        style={[styles.container, { height }]}
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width;
          const nextPlotWidth = Math.max(0, nextWidth - PRICE_AXIS_WIDTH);
          const initialTranslate = width === 0
            ? Math.min(0, nextPlotWidth - data.length * BASE_SLOT_WIDTH)
            : translateX.value;
          setWidth(nextWidth);
          if (width === 0) translateX.value = initialTranslate;
          syncDateTicks(scale.value, initialTranslate, nextWidth);
        }}
      >
        <Canvas style={StyleSheet.absoluteFill}>
          {type === "candlestick" || type === "heikin-ashi" ? <>
            <Path path={upPath} color={COLORS.up} style="stroke" strokeWidth={1} />
            <Path path={upPath} color={COLORS.up} style="fill" />
            <Path path={downPath} color={COLORS.down} style="stroke" strokeWidth={1} />
            <Path path={downPath} color={COLORS.down} style="fill" />
          </> : null}
          {type === "bars" ? <Path path={barPath} color={COLORS.ink2} style="stroke" strokeWidth={1} /> : null}
          {type === "area" || type === "baseline" ? <Path path={areaPath} color={type === "baseline" ? "rgba(34,197,94,0.10)" : "rgba(226,166,61,0.10)"} style="fill" /> : null}
          {type === "line" || type === "area" || type === "baseline" ? <Path path={closePath} color={type === "baseline" ? (data[data.length - 1]?.close >= basePrice ? COLORS.up : COLORS.down) : COLORS.accent} style="stroke" strokeWidth={1.6} /> : null}
          {sma ? <Path path={smaPath} color={COLORS.accent} style="stroke" strokeWidth={1.5} /> : null}
          {allOverlays.map((overlay) => <OverlayLine key={overlay.id} overlay={overlay} scale={scale} translateX={translateX} plotWidth={plotWidth} plotHeight={plotHeight} yLo={yLo} yHi={yHi} basePrice={basePrice} logarithmic={logarithmic} percentMode={percentMode} />)}
          {referenceLines.map((price, index) => <HorizontalGuide key={`reference-${index}-${price}`} price={price} color="rgba(161,161,170,0.32)" dashed plotWidth={plotWidth} plotHeight={plotHeight} yLo={yLo} yHi={yHi} basePrice={basePrice} logarithmic={logarithmic} percentMode={percentMode} />)}
          {levels.map((price) => <HorizontalGuide key={`level-${price}`} price={price} color={COLORS.accent} plotWidth={plotWidth} plotHeight={plotHeight} yLo={yLo} yHi={yHi} basePrice={basePrice} logarithmic={logarithmic} percentMode={percentMode} />)}
          <EventMarkers events={events} data={data} scale={scale} translateX={translateX} plotWidth={plotWidth} plotBottom={plotBottom} />
          <Path
            path={crosshairPath}
            color="rgba(250,250,250,0.42)"
            style="stroke"
            strokeWidth={StyleSheet.hairlineWidth}
          />
        </Canvas>

        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {priceTicks.map((tick) => (
            <View key={tick.key} style={[styles.gridLine, { top: tick.y, right: PRICE_AXIS_WIDTH }]} />
          ))}

          <View style={[styles.priceAxis, { width: PRICE_AXIS_WIDTH, bottom: DATE_AXIS_HEIGHT }]}>
            {priceTicks.map((tick) => (
              <Text key={tick.key} style={[styles.axisText, styles.priceLabel, { top: tick.y - 7 }]}>
                {percentMode ? `${tick.price.toFixed(1)} %` : formatPrice(unprojectOnJS(tick.price))}
              </Text>
            ))}
          </View>

          <View style={[styles.dateAxis, { right: PRICE_AXIS_WIDTH, height: DATE_AXIS_HEIGHT }]}>
            {dateTicks.map((tick) => (
              <Text
                key={tick.key}
                numberOfLines={1}
                style={[styles.axisText, styles.dateLabel, { left: Math.min(Math.max(tick.x - 30, 2), Math.max(2, plotWidth - 62)) }]}
              >
                {tick.label}
              </Text>
            ))}
          </View>

          {selectedBar ? (
            <Animated.View style={[styles.tooltip, tooltipStyle]}>
              <View style={styles.tooltipHeader}>
                <Text style={styles.tooltipDate}>{formatDate(String(selectedBar.time))}</Text>
                <View style={styles.liveDot} />
              </View>
              <View style={styles.tooltipValues}>
                <Text style={styles.tooltipLabel}>O <Text style={styles.tooltipNumber}>{formatPrice(selectedBar.open)}</Text></Text>
                <Text style={styles.tooltipLabel}>H <Text style={styles.tooltipNumber}>{formatPrice(selectedBar.high)}</Text></Text>
                <Text style={styles.tooltipLabel}>L <Text style={styles.tooltipNumber}>{formatPrice(selectedBar.low)}</Text></Text>
                <Text style={styles.tooltipLabel}>C <Text style={styles.tooltipNumber}>{formatPrice(selectedBar.close)}</Text></Text>
              </View>
            </Animated.View>
          ) : null}
        </View>
      </View>
      </GestureDetector>
      {panes.map((pane) => (
        <SyncedIndicatorPane
          key={pane.id}
          pane={pane}
          scale={scale}
          translateX={translateX}
          plotWidth={plotWidth}
        />
      ))}
    </View>
  );
}

function SyncedIndicatorPane({
  pane, scale, translateX, plotWidth,
}: {
  pane: ChartPane;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  plotWidth: number;
}) {
  const height = 74;
  const limits = useMemo(() => {
    const present = [...pane.values, ...(pane.second ?? [])].filter((value): value is number => value !== null && Number.isFinite(value));
    if (!present.length) return { min: 0, max: 1 };
    const min = Math.min(...present);
    const max = Math.max(...present);
    return { min, max: max === min ? min + 1 : max };
  }, [pane.second, pane.values]);
  const primary = useSyncedIndicatorPath(pane.values, scale, translateX, plotWidth, height, limits);
  const secondary = useSyncedIndicatorPath(pane.second ?? [], scale, translateX, plotWidth, height, limits);
  const last = [...pane.values].reverse().find((value) => value !== null);
  return (
    <View style={styles.pane}>
      <View style={styles.paneHeader}>
        <Text style={styles.paneLabel}>{pane.label}</Text>
        <Text style={styles.paneValue}>{last?.toFixed(2) ?? "—"}</Text>
      </View>
      <Canvas style={{ width: "100%", height }}>
        <Path path={primary} color={pane.color} style="stroke" strokeWidth={1.4} />
        {pane.second ? <Path path={secondary} color={COLORS.ink3} style="stroke" strokeWidth={1} /> : null}
      </Canvas>
    </View>
  );
}

function useSyncedIndicatorPath(
  series: (number | null)[],
  scale: SharedValue<number>,
  translateX: SharedValue<number>,
  plotWidth: number,
  height: number,
  limits: { min: number; max: number }
) {
  return useDerivedValue(() => {
    const path = Skia.Path.Make();
    const slotWidth = BASE_SLOT_WIDTH * scale.value;
    const startIndex = Math.max(0, Math.floor(-translateX.value / slotWidth) - 1);
    const endIndex = Math.min(series.length, startIndex + Math.ceil(plotWidth / slotWidth) + 2);
    let started = false;
    for (let index = startIndex; index < endIndex; index++) {
      const value = series[index];
      if (value === null || !Number.isFinite(value)) { started = false; continue; }
      const x = index * slotWidth + translateX.value + slotWidth / 2;
      const y = 7 + (1 - (value - limits.min) / (limits.max - limits.min)) * (height - 14);
      if (!started) { path.moveTo(x, y); started = true; } else path.lineTo(x, y);
    }
    return path;
  }, [series, plotWidth, limits.min, limits.max]);
}

const styles = StyleSheet.create({
  chartStack: { gap: 6 },
  container: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.line,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  gridLine: {
    position: "absolute",
    left: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.line,
  },
  priceAxis: {
    position: "absolute",
    right: 0,
    top: 0,
    borderLeftColor: COLORS.line,
    borderLeftWidth: 1,
    backgroundColor: COLORS.surface,
  },
  dateAxis: {
    position: "absolute",
    left: 0,
    bottom: 0,
    borderTopColor: COLORS.line,
    borderTopWidth: 1,
    backgroundColor: COLORS.surface,
  },
  axisText: {
    color: COLORS.ink3,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
    fontVariant: ["tabular-nums"],
  },
  priceLabel: {
    position: "absolute",
    right: 6,
  },
  dateLabel: {
    position: "absolute",
    top: 7,
    width: 60,
    textAlign: "center",
  },
  tooltip: {
    position: "absolute",
    top: PLOT_TOP + 8,
    width: TOOLTIP_WIDTH,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: COLORS.surface2,
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 7,
  },
  tooltipHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  tooltipDate: {
    color: COLORS.ink2,
    fontSize: 10,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
  },
  tooltipValues: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tooltipLabel: {
    color: COLORS.ink3,
    fontSize: 9,
    fontWeight: "700",
  },
  tooltipNumber: {
    color: COLORS.ink,
    fontVariant: ["tabular-nums"],
  },
  pane: { borderColor: COLORS.line, borderWidth: 1, borderRadius: 7, backgroundColor: COLORS.surface, overflow: "hidden" },
  paneHeader: { height: 24, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 8, borderBottomColor: COLORS.line, borderBottomWidth: 1 },
  paneLabel: { color: COLORS.ink3, fontSize: 9, fontWeight: "700" },
  paneValue: { color: COLORS.ink2, fontSize: 9, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
