"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import {
  isTriggered,
  usePriceAlerts,
  usePriceAlertsHydrated,
} from "@/hooks/use-price-alerts";
import { fcfa } from "@afriterminal/core/format";
import { cn } from "@afriterminal/core/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/**
 * Alertes de prix locales — le maximum honnête sans backend : le seuil
 * vit dans ce navigateur et est vérifié à chaque ouverture contre le
 * dernier cours officiel. Pas d'e-mail ni de push, et on le dit.
 */
export function PriceAlertDialog({
  open,
  onClose,
  ticker,
  lastPrice,
}: {
  open: boolean;
  onClose: () => void;
  ticker: string;
  lastPrice: number;
}) {
  const hydrated = usePriceAlertsHydrated();
  const alerts = usePriceAlerts((s) => s.alerts).filter((a) => a.ticker === ticker);
  const add = usePriceAlerts((s) => s.add);
  const remove = usePriceAlerts((s) => s.remove);

  const [direction, setDirection] = useState<"above" | "below">("above");
  const [threshold, setThreshold] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const v = parseFloat(threshold.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(v) || v <= 0) return setError("Seuil invalide.");
    add({ ticker, direction, threshold: v });
    setThreshold("");
    setError(null);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="space-y-4 p-5 sm:p-6">
        <header className="pr-8">
          <h2 className="text-base font-semibold text-ink">
            Alerte de prix — {ticker}
          </h2>
          <p className="mt-0.5 text-xs text-ink-3">
            Cours actuel : <span className="num font-medium text-ink-2">{fcfa(lastPrice)}</span>.
            Vérifiée à chaque ouverture de l&apos;application contre le dernier
            cours officiel — pas d&apos;e-mail ni de notification push (site
            sans compte), tout reste dans ce navigateur.
          </p>
        </header>

        <div className="flex gap-1 rounded-lg border border-line bg-surface-2/60 p-0.5">
          {(
            [
              ["above", "Passe au-dessus de", ArrowUp],
              ["below", "Passe en dessous de", ArrowDown],
            ] as const
          ).map(([dir, label, Icon]) => (
            <button
              key={dir}
              onClick={() => setDirection(dir)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium cursor-pointer transition-colors",
                direction === dir
                  ? dir === "above"
                    ? "border border-up/30 bg-up/15 text-up"
                    : "border border-down/30 bg-down/15 text-down"
                  : "text-ink-3 hover:text-ink"
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 space-y-1">
            <span className="text-[11px] font-medium text-ink-3">Seuil (FCFA)</span>
            <Input
              inputMode="decimal"
              placeholder={`ex. ${Math.round(lastPrice * (direction === "above" ? 1.1 : 0.9))}`}
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
            />
          </label>
          <Button variant="accent" size="sm" onClick={submit} disabled={!hydrated}>
            Créer l&apos;alerte
          </Button>
        </div>
        {error ? <p className="text-xs font-medium text-down">{error}</p> : null}

        {alerts.length > 0 ? (
          <div className="space-y-1.5 border-t border-line pt-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-3">
              Alertes actives sur {ticker}
            </p>
            {alerts.map((a) => {
              const hit = isTriggered(a, lastPrice);
              return (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
                    hit ? "border-up/40 bg-up/10" : "border-line bg-surface/50"
                  )}
                >
                  {a.direction === "above" ? (
                    <ArrowUp className="h-3.5 w-3.5 text-up" />
                  ) : (
                    <ArrowDown className="h-3.5 w-3.5 text-down" />
                  )}
                  <span className="num font-medium text-ink">{fcfa(a.threshold)}</span>
                  {hit ? <Badge tone="positive">Seuil franchi</Badge> : null}
                  <span className="ml-auto text-[10px] text-ink-3">
                    créée le {a.createdAt}
                  </span>
                  <button
                    onClick={() => remove(a.id)}
                    aria-label="Supprimer cette alerte"
                    className="rounded-md p-1 text-ink-3 hover:bg-surface-2 hover:text-down cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
