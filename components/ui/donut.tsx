import { CATEGORICAL_COLORS } from "@/lib/chart-utils";

export interface DonutSlice {
  label: string;
  value: number;
}

const TAU = Math.PI * 2;

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/**
 * Anneau de répartition en SVG pur (aucune dépendance). Couleurs
 * catégorielles en ordre FIXE ; au-delà de maxSlices, repli dans
 * « Autres » (jamais de teinte générée). La légende porte l'identité —
 * la couleur seule ne suffit jamais (CVD). Interstice de ~2° entre
 * les parts pour la lisibilité.
 */
export function Donut({
  slices,
  centerLabel,
  centerSub,
  maxSlices = 6,
}: {
  slices: DonutSlice[];
  centerLabel: string;
  centerSub?: string;
  maxSlices?: number;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  if (total <= 0) return null;

  const sorted = [...slices].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, maxSlices);
  const rest = sorted.slice(maxSlices);
  const shown = rest.length
    ? [...top, { label: "Autres", value: rest.reduce((a, s) => a + s.value, 0) }]
    : top;

  const size = 168;
  const c = size / 2;
  const r = 66;
  const gap = shown.length > 1 ? 0.035 : 0; // ~2°
  let angle = -Math.PI / 2;

  const arcs = shown.map((s, i) => {
    const sweep = (s.value / total) * TAU;
    const a0 = angle + gap / 2;
    const a1 = angle + Math.max(sweep - gap / 2, 0.01);
    angle += sweep;
    return {
      ...s,
      color: CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length],
      d: arcPath(c, c, r, a0, a1),
      pct: (s.value / total) * 100,
    };
  });

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
        role="img"
        aria-label={`${centerLabel} — répartition`}
      >
        {arcs.map((a) => (
          <path
            key={a.label}
            d={a.d}
            fill="none"
            stroke={a.color}
            strokeWidth={22}
            strokeLinecap="butt"
          >
            <title>{`${a.label} : ${a.pct.toFixed(1)} %`}</title>
          </path>
        ))}
        <text
          x={c}
          y={c - 4}
          textAnchor="middle"
          className="fill-[var(--ink)]"
          style={{ fontSize: 17, fontWeight: 700 }}
        >
          {centerLabel}
        </text>
        {centerSub ? (
          <text
            x={c}
            y={c + 16}
            textAnchor="middle"
            className="fill-[var(--ink-3)]"
            style={{ fontSize: 11 }}
          >
            {centerSub}
          </text>
        ) : null}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1">
        {arcs.map((a) => (
          <li key={a.label} className="flex items-center gap-2 text-[11px]">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
              style={{ background: a.color }}
            />
            <span className="min-w-0 flex-1 truncate text-ink-2">{a.label}</span>
            <span className="num shrink-0 text-ink">{a.pct.toFixed(1)} %</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
