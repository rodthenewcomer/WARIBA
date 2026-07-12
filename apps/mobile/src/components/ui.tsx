import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, tabular } from "../theme";

export function Page({
  title, subtitle, children, refreshing = false, onRefresh, action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  action?: ReactNode;
}) {
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} /> : undefined}
    >
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {action}
      </View>
      {children}
    </ScrollView>
  );
}

export function Section({ title, detail, children }: { title: string; detail?: string; children: ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.duration(300)} style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {detail ? <Text style={styles.sectionDetail}>{detail}</Text> : null}
      </View>
      {children}
    </Animated.View>
  );
}

export function Metric({ label, value, tone = "default", detail }: { label: string; value: string; tone?: "default" | "up" | "down" | "accent"; detail?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, tone === "up" && styles.up, tone === "down" && styles.down, tone === "accent" && styles.accent]}>{value}</Text>
      {detail ? <Text style={styles.metricDetail}>{detail}</Text> : null}
    </View>
  );
}

export function Row({ icon, title, detail, value, onPress, tone }: { icon?: keyof typeof Ionicons.glyphMap; title: string; detail?: string; value?: string; onPress?: () => void; tone?: "up" | "down" }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      {icon ? <Ionicons name={icon} size={18} color={colors.ink3} /> : null}
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{title}</Text>
        {detail ? <Text numberOfLines={2} style={styles.rowDetail}>{detail}</Text> : null}
      </View>
      {value ? <Text style={[styles.rowValue, tone === "up" && styles.up, tone === "down" && styles.down]}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.ink3} /> : null}
    </Pressable>
  );
}

export function ActionButton({ label, icon, onPress, active = false }: { label: string; icon?: keyof typeof Ionicons.glyphMap; onPress: () => void; active?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, active && styles.actionActive, pressed && styles.pressed]}>
      {icon ? <Ionicons name={icon} size={15} color={active ? colors.background : colors.ink2} /> : null}
      <Text style={[styles.actionText, active && styles.actionTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function LoadingState({ label = "Chargement des données BRVM…" }: { label?: string }) {
  const pulse = useSharedValue(0.42);
  useEffect(() => { pulse.value = withRepeat(withTiming(1, { duration: 650 }), -1, true); }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return (
    <View style={styles.loading}>
      <View style={styles.loadingHeader}><ActivityIndicator size="small" color={colors.accent} /><Text style={styles.centerText}>{label}</Text></View>
      {[0.78, 1, 0.9, 1].map((width, index) => <Animated.View key={index} style={[styles.skeleton, { width: `${width * 100}%` }, pulseStyle]} />)}
    </View>
  );
}

export function EmptyState({ icon = "file-tray-outline", title, detail }: { icon?: keyof typeof Ionicons.glyphMap; title: string; detail: string }) {
  return <View style={styles.empty}><Ionicons name={icon} size={24} color={colors.ink3} /><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyDetail}>{detail}</Text></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 44, gap: 24 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  headerCopy: { flex: 1 },
  title: { color: colors.ink, fontSize: 25, fontWeight: "800" },
  subtitle: { color: colors.ink3, fontSize: 11, lineHeight: 16, marginTop: 4 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", gap: 10 },
  sectionTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  sectionDetail: { color: colors.ink3, fontSize: 10 },
  metric: { flex: 1, minWidth: 145, paddingVertical: 12, borderTopColor: colors.line, borderTopWidth: 1 },
  metricLabel: { color: colors.ink3, fontSize: 9, fontWeight: "700" },
  metricValue: { color: colors.ink, fontSize: 19, fontWeight: "800", marginTop: 5, fontVariant: tabular },
  metricDetail: { color: colors.ink3, fontSize: 9, marginTop: 3 },
  row: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, borderBottomColor: colors.line, borderBottomWidth: 1, paddingVertical: 10 },
  rowCopy: { flex: 1 },
  rowTitle: { color: colors.ink, fontSize: 13, fontWeight: "600" },
  rowDetail: { color: colors.ink3, fontSize: 10, lineHeight: 14, marginTop: 3 },
  rowValue: { color: colors.ink, fontSize: 12, fontWeight: "700", fontVariant: tabular },
  action: { minHeight: 34, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface },
  actionActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  actionText: { color: colors.ink2, fontSize: 11, fontWeight: "700" },
  actionTextActive: { color: colors.background },
  pressed: { opacity: 0.65 },
  center: { minHeight: 240, alignItems: "center", justifyContent: "center", gap: 12 },
  loading: { flex: 1, minHeight: 300, justifyContent: "center", gap: 12, paddingHorizontal: 16, backgroundColor: colors.background },
  loadingHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  skeleton: { height: 54, borderRadius: radius.sm, backgroundColor: colors.surface2, borderColor: colors.line, borderWidth: 1 },
  centerText: { color: colors.ink3, fontSize: 11 },
  empty: { minHeight: 160, alignItems: "center", justifyContent: "center", padding: 24, borderColor: colors.line, borderWidth: 1, borderRadius: radius.lg, backgroundColor: colors.surface },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: "700", marginTop: 10 },
  emptyDetail: { color: colors.ink3, fontSize: 10, lineHeight: 15, textAlign: "center", marginTop: 5 },
  up: { color: colors.up }, down: { color: colors.down }, accent: { color: colors.accent },
});
