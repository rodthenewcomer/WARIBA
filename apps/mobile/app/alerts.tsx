import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ActionButton, EmptyState, Page, Row, Section } from "../src/components/ui";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { usePriceAlertStore, useSettingsStore } from "../src/stores";
import { disableNotifications, enableNotifications, evaluatePriceAlerts } from "../src/services/alerts";
import { colors, radius, tabular } from "../src/theme";

export default function AlertsScreen() {
  const market = useMarketData();
  const rules = usePriceAlertStore((state) => state.rules);
  const add = usePriceAlertStore((state) => state.add);
  const remove = usePriceAlertStore((state) => state.remove);
  const notifications = useSettingsStore((state) => state.notifications);
  const [ticker, setTicker] = useState("SNTS");
  const [target, setTarget] = useState("");
  const [direction, setDirection] = useState<"above" | "below">("above");
  const submit = () => {
    const parsed = Number(target.replace(/\s/g, "").replace(",", "."));
    if (!market.quotes[ticker.toUpperCase()] || parsed <= 0) return;
    add({ id: `${Date.now()}`, ticker: ticker.toUpperCase(), target: parsed, direction, enabled: true });
    setTarget("");
  };
  return (
    <Page subtitle="Faits BRVM et seuils de prix évalués par l’app" refreshing={market.refreshing} onRefresh={() => void market.refresh().then(() => evaluatePriceAlerts(market.quotes))}>
      <Section title="Livraison locale" detail={notifications ? "autorisée" : "désactivée"}>
        <Text style={styles.note}>Sans serveur, les seuils sont contrôlés à l’ouverture, au rafraîchissement et lors des fenêtres système autorisées. Une app totalement arrêtée ne reçoit pas de push temps réel.</Text>
        <ActionButton label={notifications ? "Désactiver" : "Autoriser les notifications"} icon="notifications-outline" active={notifications} onPress={() => void (notifications ? disableNotifications() : enableNotifications())} />
      </Section>
      <Section title="Créer un seuil">
        <View style={styles.formRow}><TextInput value={ticker} onChangeText={setTicker} placeholder="Ticker" placeholderTextColor={colors.ink3} autoCapitalize="characters" style={[styles.input, { flex: 0.7 }]} /><TextInput value={target} onChangeText={setTarget} placeholder="Prix FCFA" placeholderTextColor={colors.ink3} keyboardType="decimal-pad" style={styles.input} /></View>
        <View style={styles.formRow}><ActionButton label="Au-dessus" active={direction === "above"} onPress={() => setDirection("above")} /><ActionButton label="En dessous" active={direction === "below"} onPress={() => setDirection("below")} /><Pressable onPress={submit} style={styles.add}><Text style={styles.addText}>Ajouter</Text></Pressable></View>
        {rules.length ? rules.map((rule) => <Row key={rule.id} icon="notifications-outline" title={`${rule.ticker} ${rule.direction === "above" ? "≥" : "≤"} ${rule.target.toLocaleString("fr-FR")} FCFA`} detail={rule.triggeredAt ? `Déclenchée le ${rule.triggeredAt.slice(0, 10)}` : "En attente"} value="Supprimer" onPress={() => remove(rule.id)} />) : <EmptyState icon="notifications-off-outline" title="Aucun seuil" detail="Créez une alerte de prix locale." />}
      </Section>
      <Section title="Alertes factuelles" detail={`${market.alerts.length} actives`}>
        {market.alerts.map((alert) => <Row key={alert.id} icon="pulse-outline" title={alert.title} detail={alert.detail} />)}
      </Section>
    </Page>
  );
}

const styles = StyleSheet.create({
  note: { color: colors.ink3, fontSize: 10, lineHeight: 15 }, formRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, height: 42, color: colors.ink, fontSize: 12, fontVariant: tabular, backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 10 },
  add: { flex: 1, minHeight: 34, alignItems: "center", justifyContent: "center", backgroundColor: colors.accent, borderRadius: radius.sm }, addText: { color: colors.background, fontSize: 11, fontWeight: "800" },
});

