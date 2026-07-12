import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { computePositions, valuePortfolio } from "@afriterminal/core/portfolio";
import { fcfa, pct } from "@afriterminal/core/format";
import { ActionButton, EmptyState, Metric, Page, Row, Section } from "../../src/components/ui";
import { useMarketData } from "../../src/providers/MarketDataProvider";
import { usePortfolioStore } from "../../src/stores";
import { colors, radius, tabular } from "../../src/theme";

export default function PortfolioScreen() {
  const market = useMarketData();
  const transactions = usePortfolioStore((state) => state.transactions);
  const add = usePortfolioStore((state) => state.add);
  const [open, setOpen] = useState(false);
  const [ticker, setTicker] = useState("SNTS");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [fees, setFees] = useState("0");
  const [side, setSide] = useState<"achat" | "vente">("achat");
  const summary = useMemo(() => valuePortfolio(computePositions(transactions), (symbol) => market.quotes[symbol]?.lastClose), [transactions, market.quotes]);

  const submit = () => {
    const parsedQuantity = Number(quantity.replace(",", "."));
    const parsedPrice = Number(price.replace(/\s/g, "").replace(",", "."));
    const parsedFees = Number(fees.replace(/\s/g, "").replace(",", ".")) || 0;
    if (!market.quotes[ticker.toUpperCase()] || parsedQuantity <= 0 || parsedPrice <= 0) return;
    add({ id: `${Date.now()}`, ticker: ticker.toUpperCase(), side, date: new Date().toISOString().slice(0, 10), quantity: parsedQuantity, price: parsedPrice, fees: parsedFees });
    setQuantity(""); setPrice(""); setFees("0"); setOpen(false);
  };

  return (
    <Page title="Portefeuille" subtitle="PRU et performance calculés localement" action={<ActionButton label="Transaction" icon="add" onPress={() => setOpen(true)} />}>
      <Section title="Synthèse" detail="Cours de la dernière clôture">
        <View style={styles.metrics}>
          <Metric label="VALEUR" value={fcfa(summary.totalValue)} />
          <Metric label="INVESTI" value={fcfa(summary.totalInvested)} />
          <Metric label="P&L LATENT" value={fcfa(summary.totalUnrealizedPnl)} tone={summary.totalUnrealizedPnl >= 0 ? "up" : "down"} detail={pct(summary.totalUnrealizedPnlPct, { signed: true, digits: 2 })} />
          <Metric label="P&L RÉALISÉ" value={fcfa(summary.totalRealizedPnl)} tone={summary.totalRealizedPnl >= 0 ? "up" : "down"} />
        </View>
      </Section>
      <Section title="Positions" detail={`${summary.positions.length} lignes`}>
        {summary.positions.length ? summary.positions.map((position) => (
          <Row key={position.ticker} title={position.ticker} detail={`${position.quantity.toLocaleString("fr-FR")} titres · PRU ${fcfa(position.averageCost)}`} value={`${fcfa(position.marketValue)}\n${pct(position.unrealizedPnlPct, { signed: true, digits: 2 })}`} tone={position.unrealizedPnl >= 0 ? "up" : "down"} />
        )) : <EmptyState icon="briefcase-outline" title="Portefeuille vide" detail="Ajoutez un achat ou une vente. Les données restent uniquement sur cet appareil." />}
      </Section>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Nouvelle transaction</Text><Pressable onPress={() => setOpen(false)}><Text style={styles.close}>Fermer</Text></Pressable></View>
            <View style={styles.sideRow}><ActionButton label="Achat" active={side === "achat"} onPress={() => setSide("achat")} /><ActionButton label="Vente" active={side === "vente"} onPress={() => setSide("vente")} /></View>
            <TextInput value={ticker} onChangeText={setTicker} autoCapitalize="characters" placeholder="Ticker" placeholderTextColor={colors.ink3} style={styles.input} />
            <TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="Quantité" placeholderTextColor={colors.ink3} style={styles.input} />
            <TextInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="Prix par action (FCFA)" placeholderTextColor={colors.ink3} style={styles.input} />
            <TextInput value={fees} onChangeText={setFees} keyboardType="decimal-pad" placeholder="Frais (FCFA)" placeholderTextColor={colors.ink3} style={styles.input} />
            <Pressable onPress={submit} style={styles.submit}><Text style={styles.submitText}>Enregistrer</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Page>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.72)" },
  sheet: { backgroundColor: colors.surface, borderTopColor: colors.lineStrong, borderTopWidth: 1, padding: 18, paddingBottom: 34, gap: 12 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sheetTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" }, close: { color: colors.ink3, fontSize: 12 },
  sideRow: { flexDirection: "row", gap: 8 },
  input: { height: 44, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface2, color: colors.ink, paddingHorizontal: 12, fontSize: 13, fontVariant: tabular },
  submit: { height: 46, alignItems: "center", justifyContent: "center", borderRadius: radius.sm, backgroundColor: colors.accent },
  submitText: { color: colors.background, fontSize: 13, fontWeight: "800" },
});

