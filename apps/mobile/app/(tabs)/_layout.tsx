import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { colors } from "../../src/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

const ICONS: Record<string, [IconName, IconName]> = {
  index: ["home-outline", "home"],
  market: ["trending-up-outline", "trending-up"],
  watchlist: ["star-outline", "star"],
  portfolio: ["pie-chart-outline", "pie-chart"],
  more: ["ellipsis-horizontal", "ellipsis-horizontal"],
};

export default function TabLayout() {
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      // Pas de hauteur fixe : la barre garde l'inset « home indicator » géré nativement.
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, paddingTop: 6 },
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.ink3,
      tabBarLabelStyle: { fontSize: 10.5, fontWeight: "600", letterSpacing: 0.1 },
      tabBarIcon: ({ color, focused }) => {
        const pair = ICONS[route.name] ?? ICONS.more;
        return <Ionicons name={pair[focused ? 1 : 0]} size={23} color={color} />;
      },
    })}>
      <Tabs.Screen name="index" options={{ title: "Accueil" }} />
      <Tabs.Screen name="market" options={{ title: "Marché" }} />
      <Tabs.Screen name="watchlist" options={{ title: "Watchlist" }} />
      <Tabs.Screen name="portfolio" options={{ title: "Portefeuille" }} />
      <Tabs.Screen name="more" options={{ title: "Plus" }} />
    </Tabs>
  );
}
