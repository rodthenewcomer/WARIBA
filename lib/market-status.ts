export interface MarketPhase {
  phase:
    | "pre-ouverture"
    | "cotation"
    | "pre-cloture"
    | "fixing"
    | "tal"
    | "ferme";
  label: string;
  isOpen: boolean;
}

/**
 * Phases de cotation BRVM (heure d'Abidjan, GMT) :
 * pré-ouverture 09:00–09:45, cotation continue 09:45–14:00,
 * pré-clôture 14:00–14:30, fixing 14:30, TAL 14:30–14:45.
 */
export function getMarketPhase(now: Date = new Date()): MarketPhase {
  const abidjan = new Date(
    now.toLocaleString("en-US", { timeZone: "Africa/Abidjan" })
  );
  const day = abidjan.getDay();
  const minutes = abidjan.getHours() * 60 + abidjan.getMinutes();

  if (day === 0 || day === 6) {
    return { phase: "ferme", label: "Fermé — week-end", isOpen: false };
  }
  if (minutes >= 540 && minutes < 585) {
    return { phase: "pre-ouverture", label: "Pré-ouverture", isOpen: false };
  }
  if (minutes >= 585 && minutes < 840) {
    return { phase: "cotation", label: "Cotation continue", isOpen: true };
  }
  if (minutes >= 840 && minutes < 870) {
    return { phase: "pre-cloture", label: "Pré-clôture", isOpen: true };
  }
  if (minutes >= 870 && minutes < 875) {
    return { phase: "fixing", label: "Fixing de clôture", isOpen: true };
  }
  if (minutes >= 875 && minutes < 885) {
    return { phase: "tal", label: "Trading au dernier prix", isOpen: true };
  }
  return { phase: "ferme", label: "Fermé", isOpen: false };
}
