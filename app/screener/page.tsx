"use client";

import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { getSnapshots } from "@/lib/data";
import type { Sector, StockSnapshot } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StockTable } from "@/components/stocks/stock-table";

interface Filters {
  sector: Sector | "";
  perMax: string;
  pbMax: string;
  roeMin: string;
  yieldMin: string;
  growthMin: string;
  qualityMin: string;
  riskMax: string;
}

const EMPTY: Filters = {
  sector: "",
  perMax: "",
  pbMax: "",
  roeMin: "",
  yieldMin: "",
  growthMin: "",
  qualityMin: "",
  riskMax: "",
};

const PRESETS: { id: string; label: string; filters: Partial<Filters> }[] = [
  { id: "banques", label: "Banques rentables", filters: { sector: "Banque", roeMin: "18", perMax: "12" } },
  { id: "dividendes", label: "Dividendes solides", filters: { yieldMin: "5.5", riskMax: "50" } },
  { id: "value", label: "Sous-évaluées", filters: { perMax: "8", pbMax: "1.2" } },
  { id: "momentum", label: "Momentum fort", filters: { growthMin: "15", qualityMin: "55" } },
  { id: "qualite", label: "Qualité premium", filters: { qualityMin: "70", riskMax: "45" } },
  { id: "danger", label: "Actions à éviter", filters: { riskMax: "", qualityMin: "" } },
];

function num(v: string): number | null {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function applyFilters(stocks: StockSnapshot[], f: Filters, dangerMode: boolean): StockSnapshot[] {
  if (dangerMode) {
    return stocks.filter((s) => s.scores.risk >= 55 || s.scores.quality <= 35);
  }
  return stocks.filter((s) => {
    if (f.sector && s.sector !== f.sector) return false;
    const perMax = num(f.perMax);
    if (perMax !== null && (s.per <= 0 || s.per > perMax)) return false;
    const pbMax = num(f.pbMax);
    if (pbMax !== null && s.fundamentals.pb > pbMax) return false;
    const roeMin = num(f.roeMin);
    if (roeMin !== null && s.fundamentals.roe < roeMin) return false;
    const yieldMin = num(f.yieldMin);
    if (yieldMin !== null && s.yieldNet < yieldMin) return false;
    const growthMin = num(f.growthMin);
    if (growthMin !== null && s.netIncomeGrowth < growthMin) return false;
    const qualityMin = num(f.qualityMin);
    if (qualityMin !== null && s.scores.quality < qualityMin) return false;
    const riskMax = num(f.riskMax);
    if (riskMax !== null && s.scores.risk > riskMax) return false;
    return true;
  });
}

const FIELDS: { key: keyof Filters; label: string; placeholder: string }[] = [
  { key: "perMax", label: "PER max", placeholder: "ex. 12" },
  { key: "pbMax", label: "P/B max", placeholder: "ex. 1,5" },
  { key: "roeMin", label: "ROE min (%)", placeholder: "ex. 18" },
  { key: "yieldMin", label: "Rdt net min (%)", placeholder: "ex. 6" },
  { key: "growthMin", label: "Croiss. RN min (%)", placeholder: "ex. 15" },
  { key: "qualityMin", label: "Qualité min", placeholder: "0–100" },
  { key: "riskMax", label: "Risque max", placeholder: "0–100" },
];

export default function ScreenerPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [preset, setPreset] = useState<string | null>(null);

  const snapshots = getSnapshots();
  const results = useMemo(
    () => applyFilters(snapshots, filters, preset === "danger"),
    [snapshots, filters, preset]
  );

  const setField = (key: keyof Filters, value: string) => {
    setPreset(null);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  const usePreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPreset(id);
    setFilters({ ...EMPTY, ...p.filters });
  };

  return (
    <div className="space-y-4 fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">Screener</h1>
          <p className="mt-1 text-sm text-ink-3">
            « Banques sous PER 10 », « dividende net &gt; 6 % »… trouvez-les en
            deux clics.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFilters(EMPTY);
            setPreset(null);
          }}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => usePreset(p.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors",
              preset === p.id
                ? "border-violet/40 bg-violet/15 text-violet"
                : "border-line bg-surface/60 text-ink-2 hover:bg-surface-2"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="card-glass p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="space-y-1">
            <span className="text-[11px] font-medium text-ink-3">Secteur</span>
            <Select
              value={filters.sector}
              onChange={(e) => setField("sector", e.target.value)}
              className="w-full"
            >
              <option value="">Tous</option>
              {["Banque", "Télécom", "Agro-industrie", "Industrie", "Distribution", "Services publics"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </label>
          {FIELDS.map((f) => (
            <label key={f.key} className="space-y-1">
              <span className="text-[11px] font-medium text-ink-3">{f.label}</span>
              <Input
                inputMode="decimal"
                placeholder={f.placeholder}
                value={filters[f.key]}
                onChange={(e) => setField(f.key, e.target.value)}
              />
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-ink-3">
          <span className="font-semibold text-ink">{results.length}</span> action
          {results.length > 1 ? "s" : ""} sur {snapshots.length}
        </p>
      </div>

      {results.length === 0 ? (
        <div className="card-glass p-10 text-center">
          <p className="text-sm font-medium text-ink">Aucun résultat</p>
          <p className="mt-1 text-xs text-ink-3">
            Assouplissez vos critères ou repartez d&apos;un filtre prédéfini.
          </p>
        </div>
      ) : (
        <StockTable stocks={results} />
      )}
    </div>
  );
}
