import type { Metadata } from "next";
import { MarketMap } from "@/components/markets/market-map";
import { LATEST_TRADING_DATE } from "@/lib/real-data";
import { dateFr } from "@/lib/format";

export const metadata: Metadata = {
  title: "Carte du marché",
  description:
    "Carte de la BRVM en un coup d'œil : les 48 sociétés cotées groupées par secteur, taille selon la liquidité, couleur selon la variation du jour. Données officielles.",
};

const LEGEND = [-4, -2, 0, 2, 4];

export default function MapPage() {
  return (
    <div className="space-y-4 fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">
            Carte du marché
          </h1>
          <p className="mt-1 text-sm text-ink-3">
            La cote BRVM en un coup d&apos;œil · séance du{" "}
            {dateFr(LATEST_TRADING_DATE)}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-ink-3">
          {LEGEND.map((v) => (
            <span key={v} className="flex items-center gap-1">
              <span
                className="inline-block h-3 w-5 rounded-[3px]"
                style={{
                  background:
                    v === 0
                      ? "rgb(63,63,70)"
                      : v > 0
                        ? `rgb(${Math.round(63 + (22 - 63) * Math.min(v / 4, 1))},${Math.round(63 + (163 - 63) * Math.min(v / 4, 1))},${Math.round(70 + (74 - 70) * Math.min(v / 4, 1))})`
                        : `rgb(${Math.round(63 + (220 - 63) * Math.min(-v / 4, 1))},${Math.round(63 + (38 - 63) * Math.min(-v / 4, 1))},${Math.round(70 + (38 - 70) * Math.min(-v / 4, 1))})`,
                }}
              />
              {v > 0 ? `+${v} %` : `${v} %`}
            </span>
          ))}
        </div>
      </div>

      <MarketMap />

      <p className="text-[11px] text-ink-3">
        Taille des tuiles = <strong>liquidité</strong> (volume moyen 30 jours ×
        cours), pas la capitalisation boursière — la BRVM ne publie pas le
        nombre d&apos;actions en circulation dans le bulletin quotidien.
        Couleur = variation de la dernière séance. Cliquez une tuile pour
        ouvrir la fiche complète.
      </p>
    </div>
  );
}
