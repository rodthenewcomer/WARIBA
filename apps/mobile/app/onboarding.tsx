import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { pct } from "@afriterminal/core/format";
import { useMarketData } from "../src/providers/MarketDataProvider";
import { useChartStore, useSettingsStore, type ExperienceLevel } from "../src/stores";
import { colors, radius, tabular, type } from "../src/theme";

/**
 * Première ouverture — trois écrans qui montrent le produit (avec une
 * vraie donnée du jour, pas une illustration générique) puis une
 * question de niveau. Tout est passable ; « Débutant » active les
 * explications pédagogiques et un graphique simplifié par défaut,
 * sans jamais masquer de données.
 */

const SLIDES = [
  {
    icon: "trending-up" as const,
    title: "La BRVM, lisible",
    body: "Cours officiels, indices, dividendes et états financiers vérifiés des 48 sociétés cotées d'Afrique de l'Ouest — présentés pour être compris, pas déchiffrés.",
  },
  {
    icon: "notifications-outline" as const,
    title: "Suivez ce qui compte",
    body: "Watchlist, portefeuille avec PRU et dividendes perçus, seuils de prix. Les alertes sont évaluées sur le cours officiel de clôture — honnête, pas « temps réel ».",
  },
  {
    icon: "lock-closed-outline" as const,
    title: "Vos données, votre appareil",
    body: "Portefeuille et alertes restent sur ce téléphone. Exportez ou restaurez une sauvegarde JSON quand vous voulez — un compte optionnel arrivera pour synchroniser.",
  },
] as const;

const LEVELS: { id: ExperienceLevel; title: string; detail: string; icon: "school-outline" | "walk-outline" | "rocket-outline" }[] = [
  { id: "debutant", icon: "school-outline", title: "Débutant", detail: "Explications simples partout (PER, PRU, rendement…) et graphique épuré au départ." },
  { id: "intermediaire", icon: "walk-outline", title: "Intermédiaire", detail: "L'expérience standard : chandelles, indicateurs et lexique à la demande." },
  { id: "avance", icon: "rocket-outline", title: "Avancé", detail: "Tout est déjà là : indicateurs, échelle log, comparaison %, niveaux, export." },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const market = useMarketData();
  const completeOnboarding = useSettingsStore((state) => state.completeOnboarding);
  const chart = useChartStore();
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(0);
  const pagerRef = useRef<ScrollView>(null);

  const composite = market.indices.find((index) => /composite/i.test(index.name)) ?? market.indices[0];

  const finish = (level: ExperienceLevel | null) => {
    if (level === "debutant") {
      // Défaut épuré une seule fois — l'utilisateur reste libre ensuite.
      chart.setType("line");
      chart.setIndicators([]);
    }
    completeOnboarding(level);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
  };

  const onScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!width) return;
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const next = () => {
    if (!width) return;
    pagerRef.current?.scrollTo({ x: (page + 1) * width, animated: true });
  };

  const pages = SLIDES.length + 1;

  return (
    <View
      style={[styles.screen, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 16 }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <View style={styles.topBar}>
        <Text style={styles.brand}>
          Afri<Text style={styles.brandAccent}>Terminal</Text>
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Passer l'introduction" hitSlop={10} onPress={() => finish(null)}>
          <Text style={styles.skip}>Passer</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.pager}
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.title} style={[styles.slide, { width: width || 1 }]}>
            <Animated.View entering={FadeInDown.duration(300)} style={styles.slideBadge}>
              <Ionicons name={slide.icon} size={30} color={colors.accent} />
            </Animated.View>
            <Animated.Text entering={FadeInDown.delay(60).duration(300)} style={styles.slideTitle}>
              {slide.title}
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(120).duration(300)} style={styles.slideBody}>
              {slide.body}
            </Animated.Text>
            {index === 0 && composite ? (
              <Animated.View entering={FadeInDown.delay(200).duration(300)} style={styles.liveChip}>
                <View style={[styles.liveDot, { backgroundColor: composite.dayChangePct >= 0 ? colors.up : colors.down }]} />
                <Text style={styles.liveText}>
                  {composite.name} {composite.level.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}
                </Text>
                <Text style={[styles.liveChange, { color: composite.dayChangePct >= 0 ? colors.up : colors.down }]}>
                  {pct(composite.dayChangePct, { signed: true, digits: 2 })}
                </Text>
              </Animated.View>
            ) : null}
          </View>
        ))}

        <View style={[styles.slide, { width: width || 1 }]}>
          <Text style={styles.slideTitle}>Votre niveau ?</Text>
          <Text style={styles.slideBody}>
            Un tap suffit — modifiable à tout moment dans Réglages. Rien n'est jamais masqué.
          </Text>
          <View style={styles.levels}>
            {LEVELS.map((level, index) => (
              <Animated.View key={level.id} entering={FadeInDown.delay(index * 70).duration(280)}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${level.title} — ${level.detail}`}
                  onPress={() => finish(level.id)}
                  style={({ pressed }) => [styles.levelCard, pressed && styles.levelPressed]}
                >
                  <View style={styles.levelIcon}>
                    <Ionicons name={level.icon} size={20} color={colors.accent} />
                  </View>
                  <View style={styles.levelCopy}>
                    <Text style={styles.levelTitle}>{level.title}</Text>
                    <Text style={styles.levelDetail}>{level.detail}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.ink3} />
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityLabel={`Écran ${page + 1} sur ${pages}`}>
          {Array.from({ length: pages }, (_, index) => (
            <View key={index} style={[styles.dot, page === index && styles.dotActive]} />
          ))}
        </View>
        {page < pages - 1 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Écran suivant"
            onPress={next}
            style={({ pressed }) => [styles.next, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.nextText}>Continuer</Text>
            <Ionicons name="arrow-forward" size={16} color={colors.background} />
          </Pressable>
        ) : (
          <View style={{ minHeight: 46 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingVertical: 8 },
  brand: { color: colors.ink, fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  brandAccent: { color: colors.accent },
  skip: { ...type.caption, color: colors.ink2, fontWeight: "600" },
  pager: { flex: 1 },
  slide: { flex: 1, justifyContent: "center", paddingHorizontal: 30, gap: 16 },
  slideBadge: {
    width: 64, height: 64, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.accentSoft, borderColor: "rgba(226,166,61,0.35)", borderWidth: 1, borderRadius: 20,
  },
  slideTitle: { color: colors.ink, fontSize: 30, fontWeight: "800", letterSpacing: -0.7, lineHeight: 36 },
  slideBody: { ...type.sub, fontSize: 14.5, lineHeight: 22 },
  liveChip: {
    flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start",
    paddingHorizontal: 12, paddingVertical: 8, marginTop: 4,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.full,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { color: colors.ink2, fontSize: 12, fontWeight: "600", fontVariant: tabular },
  liveChange: { fontSize: 12, fontWeight: "800", fontVariant: tabular },
  levels: { gap: 10, marginTop: 6 },
  levelCard: {
    flexDirection: "row", alignItems: "center", gap: 13, padding: 15,
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: radius.xl,
  },
  levelPressed: { borderColor: "rgba(226,166,61,0.5)", backgroundColor: colors.accentSoft },
  levelIcon: {
    width: 40, height: 40, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface2, borderRadius: radius.md,
  },
  levelCopy: { flex: 1, gap: 3 },
  levelTitle: { ...type.body, fontWeight: "700" },
  levelDetail: { ...type.caption, lineHeight: 15 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 22, paddingTop: 10 },
  dots: { flexDirection: "row", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.surface2 },
  dotActive: { width: 22, backgroundColor: colors.accent },
  next: {
    minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingHorizontal: 20, backgroundColor: colors.accent, borderRadius: radius.full,
  },
  nextText: { color: colors.background, fontSize: 14, fontWeight: "800" },
});
