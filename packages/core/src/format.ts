const nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const nf2 = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function fcfa(n: number): string {
  const digits = Math.abs(n) < 100 ? nf2 : nf0;
  return `${digits.format(n)} FCFA`;
}

export function num(n: number): string {
  return nf0.format(n);
}

/** Montant absolu en FCFA → forme compacte (Mds / M) */
export function compactFcfa(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${nf1.format(n / 1e9)} Mds FCFA`;
  if (abs >= 1e6) return `${nf0.format(n / 1e6)} M FCFA`;
  return fcfa(n);
}

/** Montant exprimé en millions de FCFA → forme compacte */
export function millions(m: number): string {
  const abs = Math.abs(m);
  if (abs >= 1000) return `${nf1.format(m / 1000)} Mds FCFA`;
  return `${nf0.format(m)} M FCFA`;
}

export function pct(n: number, opts?: { signed?: boolean; digits?: number }): string {
  const signed = opts?.signed ?? true;
  const digits = opts?.digits ?? 2;
  const f = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  const sign = signed && n > 0 ? "+" : "";
  return `${sign}${f.format(n)} %`;
}

export function compactVolume(n: number): string {
  if (n >= 1e6) return `${nf1.format(n / 1e6)} M`;
  if (n >= 1e3) return `${nf1.format(n / 1e3)} k`;
  return nf0.format(n);
}

export function ratio(n: number, digits = 1): string {
  const f = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return f.format(n);
}

const MONTHS_FR = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

export function dateFr(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_FR[m - 1]} ${y}`;
}

export function changeTone(n: number): "up" | "down" | "flat" {
  if (n > 0.001) return "up";
  if (n < -0.001) return "down";
  return "flat";
}
