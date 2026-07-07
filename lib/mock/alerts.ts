import type { AlertItem } from "../types";

export const ALERTS: AlertItem[] = [
  {
    id: "a1",
    type: "ia",
    ticker: "UNXC",
    title: "Bénéfice non durable détecté",
    detail:
      "Résultat net de 8,2 Mds FCFA mais résultat ordinaire de -330 M : le bénéfice provient d'éléments exceptionnels. Ne pas traiter comme un bénéfice récurrent.",
    time: "2026-07-07T09:12:00Z",
    severity: "critical",
    active: true,
  },
  {
    id: "a2",
    type: "volume",
    ticker: "PALC",
    title: "Volume à 3,4× la moyenne 30 jours",
    detail:
      "Palm CI traite un volume inhabituel dès l'ouverture. Mouvement d'accumulation ou prise de profit : à surveiller sur les prochaines séances.",
    time: "2026-07-07T10:05:00Z",
    severity: "warning",
    active: true,
  },
  {
    id: "a3",
    type: "ia",
    ticker: "NSBC",
    title: "Levier opérationnel positif confirmé",
    detail:
      "PNB +28 %, coefficient d'exploitation en baisse de 58 % à 52 % : signal de qualité pour une banque en croissance.",
    time: "2026-07-07T09:30:00Z",
    severity: "positive",
    active: true,
  },
  {
    id: "a4",
    type: "dividende",
    ticker: "ORAC",
    title: "Détachement du dividende le 21 juillet",
    detail:
      "950 FCFA brut (855 FCFA net). Dernier jour pour acheter avec droit au dividende : le 20 juillet 2026.",
    time: "2026-07-06T16:40:00Z",
    severity: "info",
    active: true,
  },
  {
    id: "a5",
    type: "fondamental",
    ticker: "CBIBF",
    title: "Coût du risque +42 % sur un an",
    detail:
      "La croissance rapide des crédits (+26 %) s'accompagne d'une montée du coût du risque. Surveiller le taux de créances douteuses au prochain arrêté.",
    time: "2026-07-05T11:20:00Z",
    severity: "warning",
    active: true,
  },
  {
    id: "a6",
    type: "document",
    ticker: "SNTS",
    title: "Résultats S1 2026 publiés",
    detail:
      "CA +6,9 %, marge EBITDA 45,3 %, objectifs annuels confirmés. Résumé IA disponible sur la fiche Sonatel.",
    time: "2026-07-06T08:05:00Z",
    severity: "info",
    active: true,
  },
  {
    id: "a7",
    type: "fondamental",
    ticker: "BOAB",
    title: "Payout à 92 % : durabilité du dividende",
    detail:
      "Le rendement net de ~8,4 % est attractif, mais presque tout le bénéfice est distribué. Toute baisse de résultat toucherait le dividende.",
    time: "2026-07-04T14:15:00Z",
    severity: "warning",
    active: true,
  },
  {
    id: "a8",
    type: "prix",
    ticker: "NSBC",
    title: "NSBC franchit 9 000 FCFA",
    detail: "Objectif de prix personnel atteint (alerte utilisateur mockée).",
    time: "2026-07-03T13:45:00Z",
    severity: "positive",
    active: false,
  },
  {
    id: "a9",
    type: "ia",
    ticker: "SPHC",
    title: "Turnaround : retour aux bénéfices",
    detail:
      "SAPH publie 6,5 Mds FCFA de résultat net après -12 Mds en 2024. Redressement à confirmer, pas encore de dividende.",
    time: "2026-06-20T09:50:00Z",
    severity: "info",
    active: true,
  },
  {
    id: "a10",
    type: "document",
    ticker: "BICC",
    title: "IPO Bridge Bank : note d'information disponible",
    detail:
      "Prix indicatif 6 750 FCFA, PER implicite 12,4. Analyse comparative disponible sur la page IPO. (Simulation)",
    time: "2026-06-27T10:00:00Z",
    severity: "info",
    active: true,
  },
  {
    id: "a11",
    type: "prix",
    ticker: "UNXC",
    title: "UNXC sous 1 500 FCFA",
    detail: "Le titre casse son plus bas de 12 mois (alerte utilisateur mockée).",
    time: "2026-07-02T12:30:00Z",
    severity: "warning",
    active: false,
  },
  {
    id: "a12",
    type: "ia",
    ticker: "PALC",
    title: "Momentum fort : +55 % sur un an",
    detail:
      "La hausse est soutenue par les résultats (+45 % de RN), mais le risque de FOMO augmente. Éviter d'acheter uniquement la tendance.",
    time: "2026-07-01T15:10:00Z",
    severity: "warning",
    active: true,
  },
];

export function alertsOfDay(): AlertItem[] {
  return ALERTS.filter((a) => a.time.startsWith("2026-07-07"));
}
