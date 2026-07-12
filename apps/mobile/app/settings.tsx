import { Alert, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Page, Row, Section } from "../src/components/ui";
import { usePortfolioStore, usePriceAlertStore, useSettingsStore, useWatchlistStore } from "../src/stores";
import { disableNotifications, enableNotifications } from "../src/services/alerts";
import { colors, radius } from "../src/theme";

export default function SettingsScreen() {
  const notifications = useSettingsStore((state) => state.notifications); const dataSaver = useSettingsStore((state) => state.dataSaver); const setDataSaver = useSettingsStore((state) => state.setDataSaver);
  const exportBackup = async () => {
    const payload = { version: 1, exportedAt: new Date().toISOString(), watchlist: useWatchlistStore.getState().tickers, transactions: usePortfolioStore.getState().transactions, alerts: usePriceAlertStore.getState().rules };
    const uri = `${FileSystem.cacheDirectory}afriterminal-backup.json`; await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2)); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: "application/json" });
  };
  return <Page title="Réglages" subtitle="Préférences locales et transparence">
    <Section title="Notifications"><Setting label="Alertes locales" detail="Évaluées au rafraîchissement et lors des fenêtres système" value={notifications} onChange={(value) => void (value ? enableNotifications() : disableNotifications())} /><Setting label="Économie de données" detail="Réduit les rafraîchissements automatiques" value={dataSaver} onChange={setDataSaver} /></Section>
    <Section title="Données locales"><Row icon="share-outline" title="Exporter une sauvegarde" detail="Watchlist, portefeuille et seuils au format JSON" onPress={() => void exportBackup()} /><Row icon="trash-outline" title="Effacer le portefeuille" detail="Action irréversible sur cet appareil" onPress={() => Alert.alert("Effacer le portefeuille ?","Toutes les transactions locales seront supprimées.",[{text:"Annuler",style:"cancel"},{text:"Effacer",style:"destructive",onPress:()=>usePortfolioStore.getState().clear()}])} /></Section>
    <Section title="Affichage"><Text style={styles.note}>Mode sombre permanent. Police système native choisie pour la lisibilité et les performances; les nombres utilisent des chiffres tabulaires. Aucun blur ou effet verre.</Text></Section>
    <Text style={styles.disclaimer}>AfriTerminal fournit des données et outils descriptifs. Aucun contenu ne constitue un conseil en investissement ni une affiliation officielle à la BRVM.</Text>
  </Page>;
}
function Setting({label,detail,value,onChange}:{label:string;detail:string;value:boolean;onChange:(value:boolean)=>void}){return <View style={styles.setting}><View style={{flex:1}}><Text style={styles.settingLabel}>{label}</Text><Text style={styles.settingDetail}>{detail}</Text></View><Switch value={value} onValueChange={onChange} trackColor={{false:colors.surface2,true:"rgba(226,166,61,0.45)"}} thumbColor={value?colors.accent:colors.ink3}/></View>}
const styles=StyleSheet.create({setting:{minHeight:62,flexDirection:"row",alignItems:"center",gap:12,borderBottomColor:colors.line,borderBottomWidth:1},settingLabel:{color:colors.ink,fontSize:13,fontWeight:"700"},settingDetail:{color:colors.ink3,fontSize:10,lineHeight:14,marginTop:3},note:{color:colors.ink2,fontSize:11,lineHeight:17,padding:12,borderColor:colors.line,borderWidth:1,borderRadius:radius.sm,backgroundColor:colors.surface},disclaimer:{color:colors.ink3,fontSize:9,lineHeight:14,textAlign:"center"}});

