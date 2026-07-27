import periodicResultsJson from "@/data/real/periodic-results.json";

interface PeriodicResultBase {
  ticker: string;
  fiscalYear: number;
  periodType: "quarterly" | "semiannual";
  periodCode: string;
  periodLabel: string;
  comparisonLabel: string;
  asOfDate: string;
  source: string;
  publishedOn: string;
  status: "integrated" | "review_required";
  confidence: "high" | "medium" | "low";
  sourceType: string;
}

export interface PeriodicResult extends PeriodicResultBase {
  status: "integrated";
  revenueLabel: "CA" | "PNB";
  revenueM: number;
  revenuePrevM: number;
  netIncomeM: number;
  netIncomePrevM: number;
  ordinaryIncomeM: number | null;
  ordinaryIncomePrevM: number | null;
  unit: string;
}

interface ReviewPeriodicResult extends PeriodicResultBase {
  status: "review_required";
  detail: string;
}

const payload = periodicResultsJson as unknown as {
  generatedAt: string;
  results: Record<string, PeriodicResult | ReviewPeriodicResult>;
};

export function getPeriodicResult(ticker: string): PeriodicResult | undefined {
  const result = payload.results[ticker.toUpperCase()];
  return result?.status === "integrated" ? result : undefined;
}
