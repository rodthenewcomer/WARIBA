export interface ChartTransform {
  scale: number;
  translateX: number;
}

export function clampChartValue(value: number, min: number, max: number): number {
  "worklet";
  return Math.max(min, Math.min(max, value));
}

export function minimumChartTranslate(
  plotWidth: number,
  itemCount: number,
  baseSlotWidth: number,
  scale: number
): number {
  "worklet";
  return Math.min(0, plotWidth - itemCount * baseSlotWidth * scale);
}

export function anchoredChartZoom({
  startScale,
  startTranslateX,
  gestureScale,
  focalX,
  plotWidth,
  itemCount,
  baseSlotWidth,
  minScale,
  maxScale,
}: {
  startScale: number;
  startTranslateX: number;
  gestureScale: number;
  focalX: number;
  plotWidth: number;
  itemCount: number;
  baseSlotWidth: number;
  minScale: number;
  maxScale: number;
}): ChartTransform {
  "worklet";
  const scale = clampChartValue(startScale * gestureScale, minScale, maxScale);
  const safeStartScale = Math.max(startScale, Number.EPSILON);
  const contentX = (focalX - startTranslateX) / safeStartScale;
  const translated = focalX - contentX * scale;
  return {
    scale,
    translateX: clampChartValue(
      translated,
      minimumChartTranslate(plotWidth, itemCount, baseSlotWidth, scale),
      0
    ),
  };
}
