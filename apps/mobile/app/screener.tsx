import { useMemo } from "react";
import { ScrollView, StyleSheet, TextInput } from "react-native";
import { ActionButton, Page, Section } from "../src/components/ui";
import { QuoteRow } from "../src/components/QuoteRow";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { colors, radius } from "../src/theme";
import { useScreenerStore, type ScreenerSort } from "../src/stores";

export default function ScreenerScreen() {
  const market = useMarketData();
  const { query, sector, sort, saved, setQuery, setSector, setSort, saveCurrent, apply, remove } = useScreenerStore();
  const sectors = ["Tous", ...new Set(Object.values(market.quotes).map((quote) => quote.sectorCode ?? "Autre"))];
  const quotes = useMemo(() => Object.values(market.quotes).filter((quote) => sector === "Tous" || (quote.sectorCode ?? "Autre") === sector).filter((quote) => `${quote.ticker} ${quote.name}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => {
    if (sort === "rendement") return (b.netYieldPct ?? -Infinity) - (a.netYieldPct ?? -Infinity);
    if (sort === "per") return (a.per ?? Infinity) - (b.per ?? Infinity);
    if (sort === "liquidite") return (b.dayValueFcfa ?? 0) - (a.dayValueFcfa ?? 0);
    return b.dayChangePct - a.dayChangePct;
  }), [market.quotes, query, sector, sort]);
  return <Page title="Screener" subtitle={`${quotes.length} résultats sur ${Object.keys(market.quotes).length}`}>
    <TextInput value={query} onChangeText={setQuery} placeholder="Ticker ou société" placeholderTextColor={colors.ink3} style={styles.search} />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{sectors.map((item) => <ActionButton key={item} label={item} active={sector === item} onPress={() => setSector(item)} />)}</ScrollView>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{([['variation','Variation'],['rendement','Rendement'],['per','PER'],['liquidite','Liquidité']] as const).map(([id,label]) => <ActionButton key={id} label={label} active={sort === id} onPress={() => setSort(id as ScreenerSort)} />)}</ScrollView>
    <ActionButton label="Enregistrer ce filtre" icon="bookmark-outline" onPress={saveCurrent} />
    {saved.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{saved.map((filter) => <ActionButton key={filter.id} label={filter.label} active={filter.query === query && filter.sector === sector && filter.sort === sort} onPress={() => apply(filter)} />)}<ActionButton label="Effacer le dernier" icon="trash-outline" onPress={() => remove(saved[saved.length - 1].id)} /></ScrollView> : null}
    <Section title="Résultats" detail="Données officielles uniquement">{quotes.map((quote, index) => <QuoteRow key={quote.ticker} quote={quote} rank={index + 1} />)}</Section>
  </Page>;
}
const styles = StyleSheet.create({ search: { height: 44, borderColor: colors.line, borderWidth: 1, borderRadius: radius.md, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: 12 }, filters: { gap: 7 } });
