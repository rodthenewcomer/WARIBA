import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MarketPayload, SeriesPayload } from "./types";

const PAGE_ROOT = "https://rodthenewcomer.github.io/AfriTerminal/data";
const RAW_ROOT = "https://raw.githubusercontent.com/rodthenewcomer/AfriTerminal/main/data";
const CACHE_PREFIX = "@afriterminal:data:";
const TIMEOUT_MS = 12_000;

type CachedValue<T> = { savedAt: string; data: T };
export type FetchResult<T> = { data: T; fromCache: boolean; source: string };

async function requestJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchDataFile<T>(path: string): Promise<FetchResult<T>> {
  const cleanPath = path.replace(/^\/+/, "");
  const cacheKey = `${CACHE_PREFIX}${cleanPath}`;
  const sources = [`${PAGE_ROOT}/${cleanPath}`, `${RAW_ROOT}/${cleanPath}`];

  for (const source of sources) {
    try {
      const data = await requestJson<T>(source);
      const cached: CachedValue<T> = { savedAt: new Date().toISOString(), data };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cached));
      return { data, fromCache: false, source };
    } catch {
      // Try the next official mirror before falling back to device cache.
    }
  }

  const cachedRaw = await AsyncStorage.getItem(cacheKey);
  if (cachedRaw) {
    const cached = JSON.parse(cachedRaw) as CachedValue<T>;
    return { data: cached.data, fromCache: true, source: "cache-appareil" };
  }
  throw new Error(`Donnée indisponible: ${cleanPath}`);
}

export async function fetchMarketPayload(): Promise<{ payload: MarketPayload; offline: boolean }> {
  const [quotes, fundamentals, indices, alerts, dividends, documents, operations, news] = await Promise.all([
    fetchDataFile<MarketPayload["quotes"]>("real/snapshot.json"),
    fetchDataFile<MarketPayload["fundamentals"]>("real/fundamentals.json"),
    fetchDataFile<MarketPayload["indices"]>("real/indices.json"),
    fetchDataFile<MarketPayload["alerts"]>("real/alerts.json"),
    fetchDataFile<MarketPayload["dividends"]>("real/dividends.json"),
    fetchDataFile<MarketPayload["documents"]>("real/documents.json"),
    fetchDataFile<MarketPayload["operations"]>("real/operations.json"),
    fetchDataFile<MarketPayload["news"]>("news/news.json"),
  ]);
  return {
    payload: {
      quotes: quotes.data,
      fundamentals: fundamentals.data,
      indices: indices.data,
      alerts: alerts.data,
      dividends: dividends.data,
      documents: documents.data,
      operations: operations.data,
      news: news.data,
    },
    offline: [quotes, fundamentals, indices, alerts, dividends, documents, operations, news]
      .some((result) => result.fromCache),
  };
}

export async function fetchSeries(ticker: string): Promise<FetchResult<SeriesPayload>> {
  return fetchDataFile<SeriesPayload>(`real/series/${ticker.toUpperCase()}.json`);
}

