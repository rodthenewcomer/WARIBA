import { Alert, Linking, StyleSheet, Switch, Text, View } from "react-native";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";
import { Page, Row, Section } from "../src/components/ui";
import { usePortfolioStore, usePriceAlertStore, useSettingsStore, useWatchlistStore } from "../src/stores";
import { disableNotifications, enableNotifications } from "../src/services/alerts";
import { colors, radius, type } from "../src/theme";

function Setting({ label, detail, value, onChange }: { label: string; detail: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.setting}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDetail}>{detail}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.surface2, true: "rgba(226,166,61,0.45)" }}
        thumbColor={value ? colors.accent : colors.ink3}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const notifications = useSettingsStore((state) => state.notifications);
  const dataSaver = useSettingsStore((state) => state.dataSaver);
  const setDataSaver = useSettingsStore((state) => state.setDataSaver);

  const exportBackup = async () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      watchlist: useWatchlistStore.getState().tickers,
      transactions: usePortfolioStore.getState().transactions,
      alerts: usePriceAlertStore.getState().rules,
    };
    const uri = `${FileSystem.cacheDirectory}afriterminal-backup.json`;
    await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2));
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/json" });
  };

  const confirmClear = () => {
    Alert.alert("Effacer le portefeuille ?", "Toutes les transactions locales seront supprimées. Action irréversible.", [
      { text: "Annuler", style: "cancel" },
      { text: "Effacer", style: "destructive", onPress: () => usePortfolioStore.getState().clear() },
    ]);
  };

  return (
    <Page subtitle="Préférences locales — rien ne quitte cet appareil sans votre action">
      <Section title="Notifications">
        <Setting
          label="Alertes de prix locales"
          detail="Seuils évalués à l'ouverture, au rafraîchissement et lors des fenêtres système autorisées"
          value={notifications}
          onChange={(value) => void (value ? enableNotifications() : disableNotifications())}
        />
      </Section>

      <Section title="Données">
        <Setting
          label="Économie de données"
          detail="Réduit les rafraîchissements automatiques en arrière-plan"
          value={dataSaver}
          onChange={setDataSaver}
        />
        <Row icon="pulse-outline" title="État des données" detail="Fraîcheur et couverture de chaque source" onPress={() => router.push("/status")} />
      </Section>

      <Section title="Sauvegarde locale">
        <Row icon="share-outline" title="Exporter une sauvegarde" detail="Watchlist, portefeuille et seuils au format JSON" onPress={() => void exportBackup()} />
        <Row icon="trash-outline" title="Effacer le portefeuille" detail="Supprime toutes les transactions de cet appareil" onPress={confirmClear} />
      </Section>

      <Section title="À propos">
        <Row icon="phone-portrait-outline" title="Version" detail={`AfriTerminal Mobile ${Constants.expoConfig?.version ?? "1.0.0"} · mode sombre permanent`} />
        <Row icon="globe-outline" title="Site web AfriTerminal" detail="Même données, même pipeline officiel BOC" onPress={() => void Linking.openURL("https://rodthenewcomer.github.io/AfriTerminal/")} />
      </Section>

      <Text style={styles.disclaimer}>
        AfriTerminal fournit des données et outils descriptifs à partir des publications officielles de la BRVM.
        Aucun contenu ne constitue un conseil en investissement ni une affiliation officielle à la BRVM.
      </Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  setting: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, borderBottomColor: colors.line, borderBottomWidth: 1, paddingVertical: 10 },
  settingCopy: { flex: 1 },
  settingLabel: { ...type.body },
  settingDetail: { ...type.caption, marginTop: 3 },
  disclaimer: {
    ...type.caption, textAlign: "center", paddingHorizontal: 8,
    borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, backgroundColor: colors.surface, paddingVertical: 14,
  },
});
