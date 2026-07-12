import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ActionButton, EmptyState, Page, Row, Section } from "../src/components/ui";
import { useMarketData } from "../src/providers/MarketDataProvider";

type Tab = "documents" | "news";

export default function DocumentsScreen() {
  const market = useMarketData();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<Tab>(params.tab === "news" ? "news" : "documents");
  const [limit, setLimit] = useState(60);
  const switchTab = (next: Tab) => { setTab(next); setLimit(60); };

  return (
    <Page subtitle="Sources liées, jamais de résumé sans provenance">
      <View style={styles.tabs}>
        <ActionButton label="Publications" icon="document-text-outline" active={tab === "documents"} onPress={() => switchTab("documents")} />
        <ActionButton label="Actualités" icon="newspaper-outline" active={tab === "news"} onPress={() => switchTab("news")} />
      </View>

      {tab === "documents" ? (
        <Section title="Publications BRVM" detail={`${Math.min(limit, market.documents.length)} sur ${market.documents.length}`}>
          {market.documents.length ? <>
            {market.documents.slice(0, limit).map((item) => (
              <Row key={item.url} icon="document-text-outline" title={`${item.ticker} · ${item.title}`} detail={`${item.type} · ${item.date}`} onPress={() => void Linking.openURL(item.url)} />
            ))}
            {limit < market.documents.length ? (
              <View style={styles.moreRow}>
                <ActionButton label="Afficher 60 de plus" icon="chevron-down" onPress={() => setLimit((value) => value + 60)} />
              </View>
            ) : null}
          </> : <EmptyState icon="document-text-outline" title="Aucune publication" detail="Les documents officiels apparaîtront ici." />}
        </Section>
      ) : (
        <Section title="Actualités" detail={`${Math.min(limit, market.news.length)} sur ${market.news.length}`}>
          {market.news.length ? <>
            {market.news.slice(0, limit).map((item) => (
              <Row key={item.link} icon="newspaper-outline" title={item.title} detail={`${item.source} · ${item.publishedAt.slice(0, 10)}`} onPress={() => void Linking.openURL(item.link)} />
            ))}
            {limit < market.news.length ? (
              <View style={styles.moreRow}>
                <ActionButton label="Afficher 60 de plus" icon="chevron-down" onPress={() => setLimit((value) => value + 60)} />
              </View>
            ) : null}
          </> : <EmptyState icon="newspaper-outline" title="Aucune actualité" detail="Les articles sourcés apparaîtront ici." />}
        </Section>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", gap: 8 },
  moreRow: { alignSelf: "center", marginTop: 12 },
});
