import { useRouter } from "expo-router";
import { Page, Row, Section } from "../../src/components/ui";

export default function MoreScreen() {
  const router = useRouter();
  return (
    <Page title="Plus" subtitle="Recherche, suivi et transparence des données">
      <Section title="Outils">
        <Row icon="notifications-outline" title="Alertes" detail="Alertes factuelles et seuils de prix locaux" onPress={() => router.push("/alerts")} />
        <Row icon="filter-outline" title="Screener" detail="Filtrer les 48 valeurs réelles" onPress={() => router.push("/screener")} />
        <Row icon="cash-outline" title="Dividendes" detail="Historique net par société" onPress={() => router.push("/dividends")} />
        <Row icon="document-text-outline" title="Documents & actualités" detail="Publications officielles liées" onPress={() => router.push("/documents")} />
        <Row icon="rocket-outline" title="IPO & opérations" detail="Avis réels et scénarios pédagogiques identifiés" onPress={() => router.push("/ipo")} />
        <Row icon="grid-outline" title="Carte du marché" detail="Lecture sectorielle de la cote" onPress={() => router.push("/map")} />
      </Section>
      <Section title="Application">
        <Row icon="settings-outline" title="Réglages" onPress={() => router.push("/settings")} />
        <Row icon="pulse-outline" title="État des données" onPress={() => router.push("/status")} />
      </Section>
    </Page>
  );
}

