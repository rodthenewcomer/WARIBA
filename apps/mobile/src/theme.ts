import {
  DynamicColorIOS,
  Platform,
  PlatformColor,
  type ColorValue,
} from "react-native";

export type ColorMode = "dark" | "light" | "system";

/**
 * Couleurs sémantiques natives : iOS bascule via DynamicColorIOS et Android
 * via les attributs de thème de la plateforme. Les deux modes restent
 * volontairement neutres ; le jade WARIBA est réservé aux actions et états.
 */
function adaptiveColor(
  light: string,
  dark: string,
  androidAttribute: string,
): ColorValue {
  if (Platform.OS === "ios") return DynamicColorIOS({ light, dark });
  if (Platform.OS === "android") return PlatformColor(androidAttribute);
  return light;
}

export const colors = {
  background: adaptiveColor("#F7F8FA", "#000000", "?android:attr/colorBackground"),
  surface: adaptiveColor("#FFFFFF", "#09090B", "?android:attr/colorBackgroundFloating"),
  surface2: adaptiveColor("#EEF1F4", "#18181B", "?android:attr/colorButtonNormal"),
  elevated: adaptiveColor("#FFFFFF", "#27272A", "?android:attr/colorBackgroundFloating"),
  line: adaptiveColor("rgba(15,23,42,0.12)", "rgba(255,255,255,0.11)", "?android:attr/textColorTertiary"),
  lineStrong: adaptiveColor("rgba(15,23,42,0.20)", "rgba(255,255,255,0.18)", "?android:attr/textColorSecondary"),
  ink: adaptiveColor("#09090B", "#FAFAFA", "?android:attr/textColorPrimary"),
  ink2: adaptiveColor("#3F3F46", "#D4D4D8", "?android:attr/textColorSecondary"),
  ink3: adaptiveColor("#71717A", "#A1A1AA", "?android:attr/textColorTertiary"),
  accent: "#20C982",
  onAccent: "#00150C",
  accentSoft: "rgba(32,201,130,0.14)",
  gold: "#D8A72E",
  up: "#22C55E",
  upSoft: "rgba(34,197,94,0.14)",
  down: "#EF4444",
  downSoft: "rgba(239,68,68,0.14)",
  warn: "#F97316",
  violet: "#8B5CF6",
} as const;

export const radius = { sm: 7, md: 9, lg: 12, xl: 16, full: 999 } as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const tabular: ("tabular-nums")[] = ["tabular-nums"];

/** Échelle typographique unique — même hiérarchie visuelle que le site web. */
export const type = {
  /** Grand titre d'écran (onglets). */
  display: { fontSize: 28, fontWeight: "800", letterSpacing: -0.6, color: colors.ink } as const,
  /** Titre de section. */
  title: { fontSize: 16, fontWeight: "700", letterSpacing: -0.2, color: colors.ink } as const,
  /** Texte principal (lignes, boutons). */
  body: { fontSize: 14.5, fontWeight: "600", color: colors.ink } as const,
  /** Texte secondaire. */
  sub: { fontSize: 12.5, fontWeight: "400", color: colors.ink2, lineHeight: 18 } as const,
  /** Micro-libellé en capitales (métriques, axes). */
  label: {
    fontSize: 10.5, fontWeight: "700", letterSpacing: 0.8,
    textTransform: "uppercase", color: colors.ink3,
  } as const,
  /** Légendes et notes. */
  caption: { fontSize: 11.5, fontWeight: "400", color: colors.ink3, lineHeight: 16 } as const,
} as const;
