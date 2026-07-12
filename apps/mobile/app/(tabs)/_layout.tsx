import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { colors } from "../../src/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

const ICONS: Record<string, [IconName, IconName]> = {
  index: ["grid-outline", "grid"],
  market: ["stats-chart-outline", "stats-chart"],
  watchlist: ["star-outline", "star"],
  portfolio: ["briefcase-outline", "briefcase"],
  more: ["ellipsis-horizontal-circle-outline", "ellipsis-horizontal-circle"],
};

export default function TabLayout() {
  return (
    <Tabs screenOptions={({ route }) => ({
      headerShown: false,
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, height: 66, paddingTop: 7 },
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.ink3,
      tabBarLabelStyle: { fontSize: 9, fontWeight: "600", paddingBottom: 5 },
      tabBarIcon: ({ color, focused, size }) => {
        const pair = ICONS[route.name] ?? ICONS.more;
        return <Ionicons name={pair[focused ? 1 : 0]} size={size} color={color} />;
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
