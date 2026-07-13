import { type ReactNode } from "react";
import { Alert, Linking, StyleSheet, Switch, Text, View } from "react-native";
import Constants from "expo-constants";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";
import { Page, Row, Section } from "../src/components/ui";
import { usePortfolioStore, usePriceAlertStore, useSettingsStore, useWatchlistStore } from "../src/stores";
import { disableNotifications, enableNotifications } from "../src/services/alerts";
import { parseBackupPayload } from "../src/lib/forms";
import { colors, radius, type } from "../src/theme";

/** Groupe de réglages façon iOS : lignes rassemblées dans une carte. */
function Group({ children }: { children: ReactNode }) {
  return <View style={styles.group}>{children}</View>;
}

function Setting({ label, detail, value, onChange }: { label: string; detail: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.setting}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDetail}>{detail}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
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
  const version = Constants.expoConfig?.version ?? "1.0.0";

  const exportBackup = async () => {
    const payload = {
      app: "AfriTerminal",
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

  const importBackup = async () => {
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ["application/json", "text/plain"], copyToCacheDirectory: true });
      if (picked.canceled || !picked.assets[0]) return;
      const raw = await FileSystem.readAsStringAsync(picked.assets[0].uri);
      const result = parseBackupPayload(raw);
      if ("error" in result) {
        Alert.alert("Import impossible", result.error);
        return;
      }
      const { payload, skipped } = result;
      const summary = [
        `${payload.watchlist.length} valeur${payload.watchlist.length > 1 ? "s" : ""} suivie${payload.watchlist.length > 1 ? "s" : ""}`,
        `${payload.transactions.length} transaction${payload.transactions.length > 1 ? "s" : ""}`,
        `${payload.alerts.length} alerte${payload.alerts.length > 1 ? "s" : ""}`,
      ].join(", ");
      Alert.alert(
        "Restaurer cette sauvegarde ?",
        `${summary}.${skipped ? `\n${skipped} entrée(s) invalide(s) ignorée(s).` : ""}\nLes données actuelles de cet appareil seront remplacées.`,
        [
          { text: "Annuler", style: "cancel" },
          {
            text: "Restaurer", style: "destructive",
            onPress: () => {
              useWatchlistStore.getState().replaceAll(payload.watchlist);
              usePortfolioStore.getState().replaceAll(payload.transactions);
              usePriceAlertStore.getState().replaceAll(payload.alerts);
            },
          },
        ]
      );
    } catch {
      Alert.alert("Import impossible", "Le fichier n'a pas pu être lu. Réessayez avec une sauvegarde AfriTerminal au format JSON.");
    }
  };

  const confirmClear = () => {
    Alert.alert("Effacer le portefeuille ?", "Toutes les transactions locales seront supprimées. Action irréversible.", [
      { text: "Annuler", style: "cancel" },
      { text: "Effacer", style: "destructive", onPress: () => usePortfolioStore.getState().clear() },
    ]);
  };

  return (
    <Page subtitle="Préférences locales — rien ne quitte cet appareil sans votre action">
      <View style={styles.identity}>
        <View style={styles.monogram}>
          <Text style={styles.monogramText}>A</Text>
        </View>
        <View style={styles.identityCopy}>
          <Text style={styles.identityName}>
            Afri<Text style={styles.identityAccent}>Terminal</Text>
          </Text>
          <Text style={styles.identityVersion}>Version {version} · mode sombre permanent</Text>
        </View>
      </View>

      <Section title="Notifications">
        <Group>
          <Setting
            label="Alertes de prix locales"
            detail="Seuils évalués à l'ouverture, au rafraîchissement et lors des fenêtres système autorisées"
            value={notifications}
            onChange={(value) => void (value ? enableNotifications() : disableNotifications())}
          />
        </Group>
      </Section>

      <Section title="Données">
        <Group>
          <Setting
            label="Économie de données"
            detail="Réduit les rafraîchissements automatiques en arrière-plan"
            value={dataSaver}
            onChange={setDataSaver}
          />
          <Row icon="pulse-outline" title="État des données" detail="Fraîcheur et couverture de chaque source" onPress={() => router.push("/status")} />
        </Group>
      </Section>

      <Section title="Sauvegarde locale">
        <Group>
          <Row icon="share-outline" title="Exporter une sauvegarde" detail="Watchlist, portefeuille et seuils au format JSON" onPress={() => void exportBackup()} />
          <Row icon="download-outline" title="Importer une sauvegarde" detail="Restaure un fichier JSON exporté depuis l'app ou le site" onPress={() => void importBackup()} />
          <Row icon="trash-outline" title="Effacer le portefeuille" detail="Supprime toutes les transactions de cet appareil" onPress={confirmClear} />
        </Group>
      </Section>

      <Section title="À propos">
        <Group>
          <Row icon="globe-outline" title="Site web AfriTerminal" detail="Mêmes données, même pipeline officiel BOC" onPress={() => void Linking.openURL("https://rodthenewcomer.github.io/AfriTerminal/")} />
        </Group>
      </Section>

      <Text style={styles.disclaimer}>
        AfriTerminal fournit des données et outils descriptifs à partir des publications officielles de la BRVM.
        Aucun contenu ne constitue un conseil en investissement ni une affiliation officielle à la BRVM.
      </Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  identity: {
    flexDirection: "row", alignItems: "center", gap: 14, padding: 16,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.xl,
  },
  monogram: {
    width: 52, height: 52, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.accentSoft, borderColor: "rgba(226,166,61,0.35)", borderWidth: 1, borderRadius: 14,
  },
  monogramText: { color: colors.accent, fontSize: 24, fontWeight: "800" },
  identityCopy: { flex: 1 },
  identityName: { color: colors.ink, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  identityAccent: { color: colors.accent },
  identityVersion: { ...type.caption, marginTop: 3 },
  group: {
    paddingHorizontal: 14, paddingVertical: 2,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg,
  },
  setting: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 12, borderBottomColor: colors.line, borderBottomWidth: 1, paddingVertical: 10 },
  settingCopy: { flex: 1 },
  settingLabel: { ...type.body },
  settingDetail: { ...type.caption, marginTop: 3 },
  disclaimer: {
    ...type.caption, textAlign: "center", paddingHorizontal: 8,
    borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, backgroundColor: colors.surface, paddingVertical: 14,
  },
});
