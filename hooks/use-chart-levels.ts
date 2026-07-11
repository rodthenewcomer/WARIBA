"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChartLevelsState {
  /** Niveaux horizontaux (supports/résistances) posés par l'utilisateur,
   * en FCFA, par ticker. */
  levels: Record<string, number[]>;
  add: (ticker: string, price: number) => void;
  remove: (ticker: string, price: number) => void;
  clear: (ticker: string) => void;
}

export const useChartLevels = create<ChartLevelsState>()(
  persist(
    (set) => ({
      levels: {},
      add: (ticker, price) =>
        set((s) => ({
          levels: {
            ...s.levels,
            [ticker]: [...(s.levels[ticker] ?? []), price].sort((a, b) => b - a),
          },
        })),
      remove: (ticker, price) =>
        set((s) => ({
          levels: {
            ...s.levels,
            [ticker]: (s.levels[ticker] ?? []).filter((p) => p !== price),
          },
        })),
      clear: (ticker) =>
        set((s) => ({ levels: { ...s.levels, [ticker]: [] } })),
    }),
    { name: "afriterminal-chart-levels", skipHydration: true }
  )
);

/** À l'initialisation côté client uniquement (pattern des autres stores). */
export function rehydrateChartLevels(): void {
  useChartLevels.persist?.rehydrate?.();
}
