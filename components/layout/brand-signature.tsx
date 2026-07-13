/**
 * Signature de marque animée — le monogramme « A » se trace, trois
 * chandelles poussent. Même séquence que l'ouverture de l'app mobile,
 * en SVG + CSS pur (classes sig-* dans globals.css, ≤ 1 s,
 * prefers-reduced-motion respecté). Décorative : aria-hidden.
 */
export function BrandSignature({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 178 100" className={className} aria-hidden="true">
      <path
        d="M 22 88 L 50 14 L 78 88"
        className="sig-stroke"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 34 63 L 66 63"
        className="sig-stroke sig-stroke-bar"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <g className="sig-candle" style={{ animationDelay: "0.45s" }}>
        <line x1="118" y1="36" x2="118" y2="92" stroke="var(--up)" strokeWidth="2.5" opacity="0.55" />
        <rect x="110" y="46" width="16" height="34" rx="3" fill="var(--up)" />
      </g>
      <g className="sig-candle" style={{ animationDelay: "0.58s" }}>
        <line x1="144" y1="24" x2="144" y2="86" stroke="var(--down)" strokeWidth="2.5" opacity="0.55" />
        <rect x="136" y="32" width="16" height="40" rx="3" fill="var(--down)" />
      </g>
      <g className="sig-candle" style={{ animationDelay: "0.71s" }}>
        <line x1="170" y1="12" x2="170" y2="78" stroke="var(--up)" strokeWidth="2.5" opacity="0.55" />
        <rect x="162" y="22" width="16" height="42" rx="3" fill="var(--up)" />
      </g>
    </svg>
  );
}
