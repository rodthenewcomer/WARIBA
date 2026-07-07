import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { STOCKS, STOCK_MAP } from "@/lib/mock/stocks";
import { StockView } from "@/components/stocks/stock-view";

export function generateStaticParams() {
  return STOCKS.map((s) => ({ ticker: s.ticker }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const stock = STOCK_MAP.get(ticker.toUpperCase());
  return {
    title: stock ? `${stock.ticker} — ${stock.name}` : "Action introuvable",
  };
}

export default async function StockPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const key = ticker.toUpperCase();
  if (!STOCK_MAP.has(key)) notFound();
  return <StockView ticker={key} />;
}
