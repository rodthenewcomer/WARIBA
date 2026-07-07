"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useWatchlist } from "@/hooks/use-watchlist";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function WatchlistButton({ ticker }: { ticker: string }) {
  const [mounted, setMounted] = useState(false);
  const isWatched = useWatchlist((s) => s.lists.some((l) => l.tickers.includes(ticker)));
  const toggle = useWatchlist((s) => s.toggle);
  useEffect(() => setMounted(true), []);

  const watched = mounted && isWatched;
  return (
    <Button
      variant={watched ? "accent" : "outline"}
      size="sm"
      onClick={() => toggle(ticker, "default")}
      aria-pressed={watched}
    >
      <Star className={cn("h-3.5 w-3.5", watched && "fill-current")} />
      {watched ? "Suivie" : "Watchlist"}
    </Button>
  );
}
