import type {
  CloudSyncPayload,
  SyncPreference,
  SyncWatchlist,
} from "./sync";

type SyncRecord = { id: string; updatedAt: string; deletedAt?: string };
type PreferenceKey = SyncPreference["key"];

export interface CloudSyncScope {
  /** Undefined means every watchlist is managed by this client. */
  watchlistIds?: readonly string[];
  /** Mobile only displays one list and must not change the web active list. */
  manageWatchlistActive?: boolean;
  preferenceKeys: readonly PreferenceKey[];
  /** Object properties owned by this client inside shared preference rows. */
  preferencePatchKeys?: Partial<Record<PreferenceKey, readonly string[]>>;
}

export interface ReconcileCloudSyncOptions {
  now: string;
  previous?: CloudSyncPayload | null;
  scope: CloudSyncScope;
}

const META_KEYS = new Set(["updatedAt", "deletedAt"]);

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => `${JSON.stringify(key)}:${stable(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function equal(left: unknown, right: unknown): boolean {
  return stable(left) === stable(right);
}

function content(record: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!record) return undefined;
  return Object.fromEntries(Object.entries(record).filter(([key]) => !META_KEYS.has(key)));
}

function recordEqual(left: SyncRecord | undefined, right: SyncRecord | undefined): boolean {
  if (!left || !right) return left === right;
  return equal(content(left), content(right)) && Boolean(left.deletedAt) === Boolean(right.deletedAt);
}

function latest<T extends { updatedAt: string }>(left: T | undefined, right: T | undefined): T | undefined {
  if (!left) return right;
  if (!right) return left;
  return Date.parse(right.updatedAt) >= Date.parse(left.updatedAt) ? right : left;
}

function live<T extends { deletedAt?: string }>(record: T | undefined): record is T {
  return Boolean(record && !record.deletedAt);
}

function mergeSet(local: string[], remote: string[], previous: string[]): string[] {
  const localSet = new Set(local);
  const remoteSet = new Set(remote);
  const previousSet = new Set(previous);
  const ordered = [...local, ...remote, ...previous];
  return [...new Set(ordered)].filter((value) => {
    const locallyChanged = localSet.has(value) !== previousSet.has(value);
    return locallyChanged ? localSet.has(value) : remoteSet.has(value);
  });
}

function mergeWatchlistConflict(
  local: SyncWatchlist,
  remote: SyncWatchlist,
  previous: SyncWatchlist,
  manageActive: boolean,
): SyncWatchlist {
  const localNameChanged = local.name !== previous.name;
  const localActiveChanged = local.isActive !== previous.isActive;
  return {
    ...remote,
    name: localNameChanged ? local.name : remote.name,
    isActive: manageActive && localActiveChanged ? local.isActive : remote.isActive,
    tickers: mergeSet(local.tickers, remote.tickers, previous.tickers),
  };
}

function reconcileRecords<T extends SyncRecord>(
  local: T[],
  remote: T[],
  previous: T[] | undefined,
  now: string,
  managedIds?: Set<string>,
  mergeConflict?: (local: T, remote: T, previous: T) => T,
): T[] {
  const localById = new Map(local.map((item) => [item.id, item]));
  const remoteById = new Map(remote.map((item) => [item.id, item]));
  const previousById = new Map((previous ?? []).map((item) => [item.id, item]));
  const ids = new Set([...remoteById.keys(), ...localById.keys(), ...previousById.keys()]);
  const result: T[] = [];

  for (const id of ids) {
    const localItem = localById.get(id);
    const remoteItem = remoteById.get(id);
    const previousItem = previousById.get(id);
    if (managedIds && !managedIds.has(id)) {
      if (remoteItem) result.push(remoteItem);
      continue;
    }

    // A device without a baseline must never overwrite an existing cloud row.
    if (!previousItem) {
      const initial = remoteItem ?? (localItem ? { ...localItem, updatedAt: now } : undefined);
      if (initial) result.push(initial as T);
      continue;
    }

    if (!localItem) {
      if (live(previousItem)) {
        const tombstone = { ...previousItem, updatedAt: now, deletedAt: now } as T;
        result.push(latest(remoteItem, tombstone) as T);
      } else {
        const retained = latest(previousItem, remoteItem);
        if (retained) result.push(retained);
      }
      continue;
    }

    const localChanged = !recordEqual(localItem, previousItem);
    if (!localChanged) {
      result.push((remoteItem ?? previousItem) as T);
      continue;
    }

    if (live(remoteItem) && !recordEqual(remoteItem, previousItem) && mergeConflict) {
      result.push({ ...mergeConflict(localItem, remoteItem, previousItem), updatedAt: now, deletedAt: undefined });
      continue;
    }

    result.push({ ...localItem, updatedAt: now, deletedAt: undefined });
  }

  return result;
}

function objectValue(value: SyncPreference["value"] | undefined): Record<string, unknown> {
  return value && !Array.isArray(value) && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
}

function mergePreferenceValue(
  local: SyncPreference["value"],
  remote: SyncPreference["value"] | undefined,
  previous: SyncPreference["value"] | undefined,
  patchKeys?: readonly string[],
): SyncPreference["value"] {
  if (Array.isArray(local)) {
    return equal(local, previous) && remote ? remote : local;
  }
  const localObject = objectValue(local);
  const remoteObject = objectValue(remote);
  const previousObject = objectValue(previous);
  const keys = patchKeys ?? [...new Set([
    ...Object.keys(localObject),
    ...Object.keys(remoteObject),
    ...Object.keys(previousObject),
  ])];
  const merged: Record<string, unknown> = patchKeys ? { ...remoteObject } : {};

  for (const key of keys) {
    const localHasKey = Object.prototype.hasOwnProperty.call(localObject, key);
    const localChanged = localHasKey !== Object.prototype.hasOwnProperty.call(previousObject, key)
      || !equal(localObject[key], previousObject[key]);
    if (localChanged) {
      if (localHasKey) merged[key] = localObject[key];
    } else if (Object.prototype.hasOwnProperty.call(remoteObject, key)) {
      merged[key] = remoteObject[key];
    }
  }
  return merged;
}

function reconcilePreferences(
  local: SyncPreference[],
  remote: SyncPreference[],
  previous: SyncPreference[] | undefined,
  now: string,
  scope: CloudSyncScope,
): SyncPreference[] {
  const managed = new Set(scope.preferenceKeys);
  const localByKey = new Map(local.map((item) => [item.key, item]));
  const remoteByKey = new Map(remote.map((item) => [item.key, item]));
  const previousByKey = new Map((previous ?? []).map((item) => [item.key, item]));
  const keys = new Set([...remoteByKey.keys(), ...localByKey.keys(), ...previousByKey.keys()]);
  const result: SyncPreference[] = [];

  for (const key of keys) {
    const localItem = localByKey.get(key);
    const remoteItem = remoteByKey.get(key);
    const previousItem = previousByKey.get(key);
    if (!managed.has(key) || !localItem) {
      const retained = remoteItem ?? previousItem;
      if (retained) result.push(retained);
      continue;
    }
    if (!previousItem) {
      const patchKeys = scope.preferencePatchKeys?.[key];
      if (remoteItem && patchKeys && !Array.isArray(localItem.value) && !Array.isArray(remoteItem.value)) {
        const remoteValue = objectValue(remoteItem.value);
        const localValue = objectValue(localItem.value);
        const value = { ...remoteValue };
        for (const patchKey of patchKeys) {
          if (!Object.prototype.hasOwnProperty.call(remoteValue, patchKey)
            && Object.prototype.hasOwnProperty.call(localValue, patchKey)) {
            value[patchKey] = localValue[patchKey];
          }
        }
        result.push(equal(value, remoteValue) ? remoteItem : { key, value, updatedAt: now });
      } else {
        result.push(remoteItem ?? { ...localItem, updatedAt: now });
      }
      continue;
    }
    const value = mergePreferenceValue(
      localItem.value,
      remoteItem?.value,
      previousItem.value,
      scope.preferencePatchKeys?.[key],
    );
    if (remoteItem && equal(value, remoteItem.value)) {
      result.push(remoteItem);
    } else if (equal(value, previousItem.value)) {
      result.push(previousItem);
    } else {
      result.push({ key, value, updatedAt: now });
    }
  }
  return result;
}

function normalizeActiveWatchlist(
  watchlists: SyncWatchlist[],
  local: SyncWatchlist[],
  remote: SyncWatchlist[],
  previous: SyncWatchlist[] | undefined,
  manageActive: boolean,
): SyncWatchlist[] {
  if (!manageActive) return watchlists;
  const localActive = local.find((item) => item.isActive && !item.deletedAt)?.id;
  const remoteActive = remote.find((item) => item.isActive && !item.deletedAt)?.id;
  const previousActive = previous?.find((item) => item.isActive && !item.deletedAt)?.id;
  const activeId = localActive !== previousActive ? localActive : (remoteActive ?? localActive);
  return watchlists.map((item) => item.deletedAt
    ? item
    : { ...item, isActive: item.id === activeId });
}

export function reconcileCloudSync(
  local: CloudSyncPayload,
  remote: CloudSyncPayload,
  options: ReconcileCloudSyncOptions,
): CloudSyncPayload {
  const previous = options.previous ?? undefined;
  const managedWatchlists = options.scope.watchlistIds
    ? new Set(options.scope.watchlistIds)
    : undefined;
  const manageActive = options.scope.manageWatchlistActive !== false;
  const watchlists = reconcileRecords(
    local.watchlists,
    remote.watchlists,
    previous?.watchlists,
    options.now,
    managedWatchlists,
    (localItem, remoteItem, previousItem) => mergeWatchlistConflict(
      localItem,
      remoteItem,
      previousItem,
      manageActive,
    ),
  );

  return {
    watchlists: normalizeActiveWatchlist(
      watchlists,
      local.watchlists,
      remote.watchlists,
      previous?.watchlists,
      manageActive,
    ),
    transactions: reconcileRecords(local.transactions, remote.transactions, previous?.transactions, options.now),
    alerts: reconcileRecords(local.alerts, remote.alerts, previous?.alerts, options.now),
    savedFilters: reconcileRecords(local.savedFilters, remote.savedFilters, previous?.savedFilters, options.now),
    preferences: reconcilePreferences(local.preferences, remote.preferences, previous?.preferences, options.now, options.scope),
  };
}

function orderedPayload(payload: CloudSyncPayload): CloudSyncPayload {
  const byId = <T extends { id: string }>(items: T[]) => [...items].sort((left, right) => left.id.localeCompare(right.id));
  return {
    watchlists: byId(payload.watchlists),
    transactions: byId(payload.transactions),
    alerts: byId(payload.alerts),
    savedFilters: byId(payload.savedFilters),
    preferences: [...payload.preferences].sort((left, right) => left.key.localeCompare(right.key)),
  };
}

export function cloudSyncPayloadEqual(left: CloudSyncPayload, right: CloudSyncPayload): boolean {
  return equal(orderedPayload(left), orderedPayload(right));
}
