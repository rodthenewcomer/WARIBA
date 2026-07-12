import { describe, expect, it } from "vitest";
import { anchoredChartZoom, minimumChartTranslate } from "./chartTransform";

describe("anchoredChartZoom", () => {
  it("keeps the candle under the focal point stationary", () => {
    const startScale = 1.5;
    const startTranslateX = -780;
    const focalX = 146;
    const before = (focalX - startTranslateX) / startScale;
    const next = anchoredChartZoom({
      startScale,
      startTranslateX,
      gestureScale: 1.8,
      focalX,
      plotWidth: 330,
      itemCount: 1_800,
      baseSlotWidth: 10,
      minScale: 0.4,
      maxScale: 4,
    });

    expect((focalX - next.translateX) / next.scale).toBeCloseTo(before, 8);
    expect(next.scale).toBeCloseTo(2.7, 8);
  });

  it("clamps zoom and translation to the content bounds", () => {
    const next = anchoredChartZoom({
      startScale: 1,
      startTranslateX: -50,
      gestureScale: 100,
      focalX: 10,
      plotWidth: 320,
      itemCount: 20,
      baseSlotWidth: 10,
      minScale: 0.4,
      maxScale: 4,
    });

    expect(next.scale).toBe(4);
    expect(next.translateX).toBeGreaterThanOrEqual(minimumChartTranslate(320, 20, 10, 4));
    expect(next.translateX).toBeLessThanOrEqual(0);
  });
});
