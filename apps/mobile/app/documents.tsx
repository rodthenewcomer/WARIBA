import { useState } from "react";
import { Linking } from "react-native";
import { ActionButton, Page, Row, Section } from "../src/components/ui";
import { useMarketData } from "../src/providers/MarketDataProvider";

export default function DocumentsScreen() {
  const market = useMarketData(); const [tab, setTab] = useState<"documents" | "news">("documents"); const [limit, setLimit] = useState(60);
  return <Page title="Documents & actualités" subtitle="Sources liées, jamais de résumé sans provenance">
    <ActionButton label={tab === "documents" ? "Voir les actualités" : "Voir les documents"} icon="swap-horizontal-outline" onPress={() => { setTab(tab === "documents" ? "news" : "documents"); setLimit(60); }} />
    {tab === "documents" ? <Section title="Publications BRVM" detail={`${Math.min(limit, market.documents.length)} sur ${market.documents.length}`}>{market.documents.slice(0, limit).map((item) => <Row key={item.url} icon="document-text-outline" title={`${item.ticker} · ${item.title}`} detail={`${item.type} · ${item.date}`} onPress={() => void Linking.openURL(item.url)} />)}{limit < market.documents.length ? <ActionButton label="Afficher 60 de plus" icon="chevron-down" onPress={() => setLimit((value) => value + 60)} /> : null}</Section> : <Section title="Actualités" detail={`${Math.min(limit, market.news.length)} sur ${market.news.length}`}>{market.news.slice(0, limit).map((item) => <Row key={item.link} icon="newspaper-outline" title={item.title} detail={`${item.source} · ${item.publishedAt.slice(0,10)}\n${item.summary}`} onPress={() => void Linking.openURL(item.link)} />)}{limit < market.news.length ? <ActionButton label="Afficher 60 de plus" icon="chevron-down" onPress={() => setLimit((value) => value + 60)} /> : null}</Section>}
  </Page>;
}
