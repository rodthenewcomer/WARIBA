/** Même nomenclature BOC → libellés que lib/real-universe.ts côté web. */
const SECTOR_LABELS: Record<string, string> = {
  FIN: "Banque",
  TEL: "Télécom",
  CB: "Agro-industrie",
  CD: "Distribution",
  ENE: "Distribution",
  IND: "Industrie",
  SPU: "Services publics",
};

export function sectorLabel(code: string | null): string {
  return (code !== null && SECTOR_LABELS[code]) || "Autre";
}

/** Ordre fixe des secteurs (même lecture stable que la market map web). */
export const SECTOR_ORDER = [
  "Banque", "Télécom", "Agro-industrie", "Industrie",
  "Distribution", "Services publics", "Autre",
] as const;

/**
 * Convention de nommage BRVM : le suffixe du ticker encode le pays
 * (BOAB = Bénin, BOABF = Burkina, SNTS = Sénégal…) — même heuristique
 * que lib/real-universe.ts côté web.
 */
const COUNTRY_BY_SUFFIX: Record<string, string> = {
  B: "Bénin", C: "Côte d'Ivoire", M: "Mali", N: "Niger", S: "Sénégal", T: "Togo",
};

export function countryFromTicker(ticker: string): string | null {
  if (ticker.endsWith("BF")) return "Burkina Faso";
  return COUNTRY_BY_SUFFIX[ticker.slice(-1)] ?? null;
}
