import { EmptyState, Page, Section } from "../../src/components/ui";
import { QuoteRow } from "../../src/components/QuoteRow";
import { useMarketData } from "../../src/providers/MarketDataProvider";
import { useWatchlistStore } from "../../src/stores";

export default function WatchlistScreen() {
  const market = useMarketData();
  const tickers = useWatchlistStore((state) => state.tickers);
  const toggle = useWatchlistStore((state) => state.toggle);
  const quotes = tickers.map((ticker) => market.quotes[ticker]).filter(Boolean);
  return (
    <Page title="Watchlist" subtitle="Synchronisée localement sur cet appareil" refreshing={market.refreshing} onRefresh={() => void market.refresh()}>
      <Section title="Valeurs suivies" detail={`${quotes.length} titres`}>
        {quotes.length ? quotes.map((quote) => <QuoteRow key={quote.ticker} quote={quote} onRemove={() => toggle(quote.ticker)} />) : <EmptyState icon="star-outline" title="Aucune valeur suivie" detail="Ajoutez une étoile depuis le marché ou une fiche action." />}
      </Section>
    </Page>
  );
}
