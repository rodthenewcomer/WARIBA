"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, GitCompareArrows, SlidersHorizontal } from "lucide-react";
import type { ChartType, IndicatorId, Timeframe } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PillTabs } from "@/components/ui/tabs";

const TIMEFRAMES: Timeframe[] = ["1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y"];

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: "candlestick", label: "Bougies" },
  { value: "line", label: "Ligne" },
  { value: "area", label: "Aire" },
  { value: "bars", label: "OHLC" },
  { value: "heikin-ashi", label: "Heikin Ashi" },
];

const INDICATORS: { id: IndicatorId; label: string }[] = [
  { id: "sma20", label: "SMA 20" },
  { id: "sma50", label: "SMA 50" },
  { id: "sma100", label: "SMA 100" },
  { id: "sma200", label: "SMA 200" },
  { id: "ema20", label: "EMA 20" },
  { id: "bollinger", label: "Bandes de Bollinger" },
  { id: "rsi", label: "RSI 14" },
  { id: "macd", label: "MACD" },
];

function Dropdown({
  label,
  icon,
  count,
  children,
}: {
  label: string;
  icon: ReactNode;
  count: number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium cursor-pointer transition-colors",
          count > 0
            ? "border-accent/30 bg-accent/10 text-accent"
            : "border-line bg-surface/60 text-ink-2 hover:bg-surface-2"
        )}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        {count > 0 ? (
          <span className="rounded-full bg-accent/20 px-1.5 text-[10px]">{count}</span>
        ) : null}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1.5 w-56 rounded-xl border border-line bg-surface p-1.5 shadow-xl">
          {children}
        </div>
      ) : null}
    </div>
  );
}

function CheckItem({
  checked,
  label,
  onToggle,
  disabled,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs cursor-pointer disabled:opacity-40",
        checked ? "text-ink" : "text-ink-2 hover:bg-surface-2"
      )}
    >
      <span
        className={cn(
          "flex h-3.5 w-3.5 items-center justify-center rounded border",
          checked ? "border-accent bg-accent" : "border-line"
        )}
      >
        {checked ? (
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 fill-none stroke-white stroke-2">
            <path d="M1.5 5.5l2.5 2.5 4.5-6" />
          </svg>
        ) : null}
      </span>
      {label}
    </button>
  );
}

export interface ChartToolbarProps {
  tf: Timeframe;
  onTf: (tf: Timeframe) => void;
  chartType: ChartType;
  onChartType: (t: ChartType) => void;
  indicators: IndicatorId[];
  onIndicators: (ids: IndicatorId[]) => void;
  showVolume: boolean;
  onShowVolume: (v: boolean) => void;
  adjusted: boolean;
  onAdjusted: (v: boolean) => void;
  compare: string[];
  onCompare: (codes: string[]) => void;
  compareOptions: { code: string; label: string }[];
  intraday: boolean;
}

export function ChartToolbar(props: ChartToolbarProps) {
  const toggleIndicator = (id: IndicatorId) => {
    props.onIndicators(
      props.indicators.includes(id)
        ? props.indicators.filter((i) => i !== id)
        : [...props.indicators, id]
    );
  };
  const toggleCompare = (code: string) => {
    props.onCompare(
      props.compare.includes(code)
        ? props.compare.filter((c) => c !== code)
        : props.compare.length >= 4
          ? props.compare
          : [...props.compare, code]
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <PillTabs
        options={TIMEFRAMES.map((t) => ({ value: t, label: t }))}
        value={props.tf}
        onChange={props.onTf}
        className="max-w-full"
      />
      <PillTabs
        options={CHART_TYPES.map((t) => ({ value: t.value, label: t.label }))}
        value={props.chartType}
        onChange={props.onChartType}
        className="max-w-full"
      />
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={() => props.onShowVolume(!props.showVolume)}
          className={cn(
            "h-8 rounded-lg border px-2.5 text-xs font-medium cursor-pointer transition-colors",
            props.showVolume
              ? "border-accent/30 bg-accent/10 text-accent"
              : "border-line bg-surface/60 text-ink-3 hover:bg-surface-2"
          )}
        >
          Vol
        </button>
        <button
          onClick={() => props.onAdjusted(!props.adjusted)}
          disabled={props.intraday}
          title="Cours ajustés des dividendes"
          className={cn(
            "h-8 rounded-lg border px-2.5 text-xs font-medium cursor-pointer transition-colors disabled:opacity-40",
            props.adjusted
              ? "border-gold/40 bg-gold/10 text-gold"
              : "border-line bg-surface/60 text-ink-3 hover:bg-surface-2"
          )}
        >
          Div. adj
        </button>
        <Dropdown
          label="Indicateurs"
          icon={<SlidersHorizontal className="h-3.5 w-3.5" />}
          count={props.indicators.length}
        >
          {INDICATORS.map((ind) => (
            <CheckItem
              key={ind.id}
              label={ind.label}
              checked={props.indicators.includes(ind.id)}
              onToggle={() => toggleIndicator(ind.id)}
            />
          ))}
        </Dropdown>
        <Dropdown
          label="Comparer"
          icon={<GitCompareArrows className="h-3.5 w-3.5" />}
          count={props.compare.length}
        >
          <p className="px-2.5 py-1 text-[10px] text-ink-3">
            {props.intraday
              ? "Indisponible en intraday — choisissez 1M ou plus."
              : "Jusqu'à 4 comparaisons, échelle en %."}
          </p>
          {props.compareOptions.map((opt) => (
            <CheckItem
              key={opt.code}
              label={opt.label}
              checked={props.compare.includes(opt.code)}
              onToggle={() => toggleCompare(opt.code)}
              disabled={props.intraday}
            />
          ))}
        </Dropdown>
      </div>
    </div>
  );
}
