import { useMemo } from "react";
import { Canvas, Path, Skia } from "@shopify/react-native-skia";

/**
 * Mini-courbe statique (30 clôtures) pour les lignes de cote et les cartes
 * d'indices. Chemins construits une seule fois côté JS — aucun geste, aucun
 * worklet, coût de rendu minimal sur les appareils modestes.
 */
export function Sparkline({
  values, width, height, color, fillOpacity = 0,
}: {
  values: number[];
  width: number;
  height: number;
  color: string;
  fillOpacity?: number;
}) {
  const paths = useMemo(() => {
    const finite = values.filter((value) => Number.isFinite(value));
    if (finite.length < 2) return null;
    const min = Math.min(...finite);
    const max = Math.max(...finite);
    const span = max - min || 1;
    const step = width / (finite.length - 1);
    const pad = 2;
    const usable = height - pad * 2;
    const line = Skia.Path.Make();
    finite.forEach((value, index) => {
      const x = index * step;
      const y = pad + (1 - (value - min) / span) * usable;
      if (index === 0) line.moveTo(x, y);
      else line.lineTo(x, y);
    });
    const area = line.copy();
    area.lineTo(width, height);
    area.lineTo(0, height);
    area.close();
    return { line, area };
  }, [height, values, width]);

  if (!paths) return null;
  return (
    <Canvas style={{ width, height }}>
      {fillOpacity > 0 ? <Path path={paths.area} color={color} opacity={fillOpacity} style="fill" /> : null}
      <Path path={paths.line} color={color} style="stroke" strokeWidth={1.5} strokeJoin="round" strokeCap="round" />
    </Canvas>
  );
}
