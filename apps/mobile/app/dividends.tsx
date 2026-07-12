import { useMemo, useState } from "react";
import { ActionButton, Page, Row, Section } from "../src/components/ui";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { fcfa } from "@afriterminal/core/format";

export default function DividendsScreen() {
  const market = useMarketData();
  const [limit, setLimit] = useState(80);
  const latest = useMemo(() => Object.entries(market.dividends).flatMap(([ticker, history]) => history.map((item) => ({ ticker, ...item }))).sort((a, b) => b.date.localeCompare(a.date)), [market.dividends]);
  return <Page title="Dividendes" subtitle="Montants nets issus des bulletins officiels"><Section title="Versements" detail={`${Math.min(limit, latest.length)} sur ${latest.length}`}>{latest.slice(0, limit).map((item, index) => <Row key={`${item.ticker}-${item.date}-${index}`} icon="cash-outline" title={item.ticker} detail={`Payé le ${item.date}`} value={fcfa(item.net)} />)}{limit < latest.length ? <ActionButton label="Afficher 80 de plus" icon="chevron-down" onPress={() => setLimit((value) => value + 80)} /> : null}</Section></Page>;
}
