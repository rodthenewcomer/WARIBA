import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Page, Section } from "../src/components/ui";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { colors, radius, tabular } from "../src/theme";

export default function MapScreen() {
  const market = useMarketData(); const router = useRouter();
  const sectors = useMemo(() => Object.values(market.quotes).reduce<Record<string, typeof market.quotes[string][]>>((acc, quote) => { const key = quote.sectorCode ?? "Autre"; (acc[key] ??= []).push(quote); return acc; }, {}), [market.quotes]);
  return <Page title="Carte du marché" subtitle="Taille relative par liquidité; couleur par variation"><Section title="Secteurs">{Object.entries(sectors).map(([sector, quotes]) => <View key={sector} style={styles.sector}><Text style={styles.sectorTitle}>{sector}</Text><View style={styles.tiles}>{quotes.sort((a,b)=>(b.dayValueFcfa??0)-(a.dayValueFcfa??0)).map((quote) => <Pressable key={quote.ticker} onPress={() => router.push(`/stocks/${quote.ticker}`)} style={[styles.tile,{ flexGrow: Math.max(1, Math.min(4, Math.log10((quote.dayValueFcfa ?? 1)+1)-5)), borderColor: quote.dayChangePct >= 0 ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)" }]}><Text style={styles.ticker}>{quote.ticker}</Text><Text style={[styles.change,{color:quote.dayChangePct>=0?colors.up:colors.down}]}>{quote.dayChangePct.toFixed(2)} %</Text></Pressable>)}</View></View>)}</Section></Page>;
}
const styles=StyleSheet.create({sector:{gap:7,marginBottom:10},sectorTitle:{color:colors.ink3,fontSize:9,fontWeight:"700"},tiles:{flexDirection:"row",flexWrap:"wrap",gap:6},tile:{minWidth:76,minHeight:54,justifyContent:"center",padding:9,backgroundColor:colors.surface,borderWidth:1,borderRadius:radius.sm},ticker:{color:colors.ink,fontSize:12,fontWeight:"800"},change:{fontSize:9,fontWeight:"700",marginTop:4,fontVariant:tabular}});

