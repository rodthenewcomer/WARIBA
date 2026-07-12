import * as Notifications from "expo-notifications";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { fetchDataFile } from "../data/api";
import type { QuoteMap } from "../data/types";
import { usePriceAlertStore, useSettingsStore } from "../stores";

const TASK_NAME = "afriterminal-price-alert-check";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function evaluatePriceAlerts(quotes: QuoteMap): Promise<number> {
  if (!useSettingsStore.getState().notifications) return 0;
  const state = usePriceAlertStore.getState();
  let triggered = 0;
  for (const rule of state.rules) {
    if (!rule.enabled || rule.triggeredAt) continue;
    const price = quotes[rule.ticker]?.lastClose;
    if (price === undefined) continue;
    const matches = rule.direction === "above" ? price >= rule.target : price <= rule.target;
    if (!matches) continue;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${rule.ticker} · seuil atteint`,
        body: `Cours ${Math.round(price).toLocaleString("fr-FR")} FCFA · seuil ${rule.direction === "above" ? "haut" : "bas"} ${Math.round(rule.target).toLocaleString("fr-FR")} FCFA`,
        data: { ticker: rule.ticker },
        sound: false,
      },
      trigger: null,
    });
    state.markTriggered(rule.id, new Date().toISOString());
    triggered += 1;
  }
  return triggered;
}

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    await Promise.all([
      usePriceAlertStore.persist.rehydrate(),
      useSettingsStore.persist.rehydrate(),
    ]);
    const quotes = await fetchDataFile<QuoteMap>("real/snapshot.json");
    await evaluatePriceAlerts(quotes.data);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function enableNotifications(): Promise<boolean> {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Alertes de prix",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  const enabled = permission.granted;
  useSettingsStore.getState().setNotifications(enabled);
  if (enabled && await TaskManager.isAvailableAsync()) {
    await BackgroundTask.registerTaskAsync(TASK_NAME, { minimumInterval: 15 });
  }
  return enabled;
}

export async function disableNotifications(): Promise<void> {
  useSettingsStore.getState().setNotifications(false);
  if (await TaskManager.isTaskRegisteredAsync(TASK_NAME)) {
    await BackgroundTask.unregisterTaskAsync(TASK_NAME);
  }
}
