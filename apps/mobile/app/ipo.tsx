import { Linking, StyleSheet, Text } from "react-native";
import { Page, Row, Section } from "../src/components/ui";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { colors } from "../src/theme";

export default function IpoScreen() {
  const market = useMarketData(); const notices = [...(market.operations.avis ?? []), ...(market.operations.operations ?? [])];
  return <Page subtitle="Avis BRVM réels; pédagogie clairement séparée"><Section title="Avis et opérations" detail={`${notices.length} publications`}>{notices.map((item, index) => <Row key={`${item.pdf}-${index}`} icon="document-attach-outline" title={item.title} detail={item.date} onPress={() => void Linking.openURL(item.pdf)} />)}</Section><Section title="Apprendre" detail="Simulation pédagogique"><Text style={styles.education}>Une introduction, une augmentation de capital ou un split modifie le nombre de titres, le prix de référence et parfois les droits attachés. Cette section explique les mécanismes; elle ne décrit aucune opération à venir et ne constitue pas une recommandation.</Text></Section></Page>;
}
const styles = StyleSheet.create({ education: { color: colors.ink2, fontSize: 11, lineHeight: 17, borderLeftColor: colors.accent, borderLeftWidth: 2, paddingLeft: 12 } });

