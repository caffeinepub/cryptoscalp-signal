// CoinGecko API helpers (client-side fetch)

const BASE = "https://api.coingecko.com/api/v3";
const CACHE_KEY = "cryptoscalp_top_coins_cache";
const VOLUME_CACHE_KEY = "cryptoscalp_top_volume_cache";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour — matches refresh interval
const MIN_VALID_COINS = 20; // cache is invalid if it has fewer than this

export interface CoinListItem {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  priceChange24h: number;
  marketCapRank: number;
  volume24h?: number;
}

export interface OHLCVPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CoinsCache {
  data: CoinListItem[];
  fetchedAt: number;
}

// Stablecoin IDs to exclude
const STABLE_IDS = new Set([
  "tether",
  "usd-coin",
  "binance-usd",
  "dai",
  "true-usd",
  "pax-dollar",
  "frax",
  "neutrino",
  "terrausd",
  "fei-protocol",
  "gemini-dollar",
  "liquity-usd",
  "mim",
  "celo-dollar",
  "euro-coin",
  "paypal-usd",
  "first-digital-usd",
  "usdd",
  "usdb",
  "pax-gold",
  "tether-gold",
  "stasis-euro",
  "eurc",
  "eur-coin",
  "usd-plus",
  "origin-dollar",
  "usdn",
  "nusd",
  "veur",
  "eurs",
  "seur",
  "ageur",
  "crvusd",
  "usde",
  "ethena-usde",
  "frax-ether",
  "frxeth",
  "lusd",
  "mxnc",
  "brl-coin",
  "jeur",
  "nzds",
  "xsgd",
  "tryb",
  "usdk",
  "susd",
  "alusd",
  "musd",
  "ousd",
  "wrapped-bitcoin",
  "wrapped-ethereum",
  "weth",
  "wbtc",
  "staked-ether",
  "coinbase-wrapped-staked-eth",
]);

// Stablecoin symbol patterns
const STABLE_SYMBOLS = new Set([
  "usdt",
  "usdc",
  "dai",
  "busd",
  "tusd",
  "usdp",
  "fdusd",
  "frax",
  "gusd",
  "susd",
  "lusd",
  "usdd",
  "usdb",
  "usde",
  "usdx",
  "ausd",
  "cusd",
  "nusd",
  "musd",
  "ousd",
  "xusd",
  "zusd",
  "eurs",
  "eurt",
  "eurc",
  "jeur",
  "seur",
  "ageur",
  "tryb",
  "xsgd",
  "nzds",
  "brl",
  "mxnc",
  "crvusd",
  "alusd",
  "wbtc",
  "weth",
  "steth",
  "cbeth",
]);

export function isStablecoin(id: string, symbol: string): boolean {
  if (STABLE_IDS.has(id.toLowerCase())) return true;
  const sym = symbol.toLowerCase();
  if (STABLE_SYMBOLS.has(sym)) return true;
  if (sym.endsWith("usd") || sym.startsWith("usd")) return true;
  if (sym.endsWith("eur") && sym !== "eur") return true;
  // Exclude wrapped tokens (e.g. wbtc, weth) — but keep WOO, etc.
  if (sym.startsWith("w") && sym.length > 1 && !sym.startsWith("woo"))
    return true; // BUG FIX: was `return false`, should be `return true`
  return false;
}

// ── localStorage cache helpers ──

function loadCache(key: string): CoinsCache | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CoinsCache;
  } catch {
    return null;
  }
}

function saveCache(key: string, data: CoinListItem[]): void {
  try {
    const cache: CoinsCache = { data, fetchedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(cache));
  } catch {
    // localStorage might be full or disabled
  }
}

/** Returns cached volume coins if fresh (within 1 hour) AND has enough coins */
export function getCachedVolumeCoins(): {
  data: CoinListItem[];
  isStale: boolean;
} | null {
  const cache = loadCache(VOLUME_CACHE_KEY);
  // Invalidate cache if it has fewer than MIN_VALID_COINS — it was likely
  // saved from a partial/failed fetch.
  if (!cache || cache.data.length < MIN_VALID_COINS) return null;
  const isStale = Date.now() - cache.fetchedAt > CACHE_TTL;
  return { data: cache.data, isStale };
}

/** Returns cached coins if they exist and have enough entries */
export function getCachedCoins(): {
  data: CoinListItem[];
  isStale: boolean;
} | null {
  const cache = loadCache(CACHE_KEY);
  if (!cache || cache.data.length < MIN_VALID_COINS) return null;
  const isStale = Date.now() - cache.fetchedAt > CACHE_TTL;
  return { data: cache.data, isStale };
}

// ── Fetch with retry + backoff ──

async function fetchWithRetry(
  url: string,
  retries = 3,
  baseDelay = 2000,
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429 && attempt < retries) {
        const delay = baseDelay * 2 ** attempt;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return res;
    } catch (err) {
      if (attempt < retries) {
        const delay = baseDelay * 2 ** attempt;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Max retries exceeded");
}

/**
 * Fetch the top 25 non-stablecoin coins by 24h trading volume from CoinGecko.
 * Fetches a larger set (top 80 by volume) to ensure we get 25 after filtering.
 * Results are cached for 1 hour.
 * Cache is ignored if it contains fewer than 20 coins (was saved from a bad fetch).
 */
export async function fetchTopByVolume(limit = 25): Promise<CoinListItem[]> {
  // Try cache first — only use if fresh AND has enough coins
  const cached = getCachedVolumeCoins();
  if (cached && !cached.isStale) {
    return cached.data.slice(0, limit);
  }

  // Fetch top 80 by volume to get enough after filtering stablecoins
  const url = `${BASE}/coins/markets?vs_currency=usd&order=volume_desc&per_page=80&page=1&sparkline=false&price_change_percentage=24h`;
  const res = await fetchWithRetry(url, 3, 2000);
  if (!res.ok) {
    // On error, return stale cache if available and has enough coins
    if (cached) return cached.data.slice(0, limit);
    throw new Error(`CoinGecko error ${res.status}`);
  }

  const data: any[] = await res.json();
  const coins: CoinListItem[] = data
    .filter((c) => !isStablecoin(c.id, c.symbol))
    .slice(0, limit)
    .map((c, idx) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      currentPrice: c.current_price ?? 0,
      priceChange24h: c.price_change_percentage_24h ?? 0,
      marketCapRank: c.market_cap_rank ?? idx + 1,
      volume24h: c.total_volume ?? 0,
    }));

  // Only save to cache if we got a meaningful result
  if (coins.length >= MIN_VALID_COINS) {
    saveCache(VOLUME_CACHE_KEY, coins);
  }
  return coins;
}

export async function fetchTopCoins(perPage = 200): Promise<CoinListItem[]> {
  const url = `${BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${perPage}&page=1&sparkline=false`;
  const res = await fetchWithRetry(url);
  if (!res.ok) throw new Error(`CoinGecko error ${res.status}`);
  const data: any[] = await res.json();
  const coins = data
    .filter((c) => !isStablecoin(c.id, c.symbol))
    .map((c, idx) => ({
      id: c.id,
      symbol: c.symbol,
      name: c.name,
      currentPrice: c.current_price ?? 0,
      priceChange24h: c.price_change_percentage_24h ?? 0,
      marketCapRank: c.market_cap_rank ?? idx + 1,
    }));
  saveCache(CACHE_KEY, coins);
  return coins;
}

/**
 * Fetch 4h OHLCV candles from CoinGecko.
 *
 * CoinGecko /ohlc endpoint:
 *   - days=1    → 30-min candles
 *   - days=7-30 → 4h candles (native)
 *   - days=90+  → daily candles
 *
 * Strategy: use days=30 to get native 4h candles (up to 180 candles = 30 days).
 * Volume is fetched from market_chart?interval=daily and distributed evenly
 * across the 4h candles of each day (6 candles per day).
 *
 * Returns OHLCVPoint[] sorted oldest → newest.
 */
export async function fetchOHLCWithVolume(
  coinId: string,
  _days: 1 | 7 | 14 | 30 | 90 | 180 | 365 = 30,
): Promise<OHLCVPoint[]> {
  // days=30 gives native 4h candles from CoinGecko (most reliable)
  const ohlcDays = 30;

  try {
    // Fetch OHLC and volume in parallel
    const [ohlcRes, volRes] = await Promise.all([
      fetchWithRetry(
        `${BASE}/coins/${coinId}/ohlc?vs_currency=usd&days=${ohlcDays}`,
        2,
        1000,
      ),
      fetchWithRetry(
        `${BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${ohlcDays}&interval=daily`,
        2,
        1000,
      ),
    ]);

    if (!ohlcRes.ok) {
      console.warn(
        `[CoinGecko] OHLC fetch failed for ${coinId}: ${ohlcRes.status}`,
      );
      return [];
    }

    const ohlcRaw: number[][] = await ohlcRes.json();

    // Build daily volume map (day-start-ts -> total_volume)
    const volMap = new Map<number, number>();
    if (volRes.ok) {
      try {
        const volData: { total_volumes: number[][] } = await volRes.json();
        for (const [ts, vol] of volData.total_volumes) {
          const dayTs = Math.floor(ts / 86400000) * 86400000;
          volMap.set(dayTs, vol);
        }
      } catch {
        // volume fetch failed — use synthetic volume (non-blocking)
      }
    }

    if (!ohlcRaw || ohlcRaw.length === 0) return [];

    // CoinGecko OHLC format: [timestamp_ms, open, high, low, close]
    // For days=30: returns 4h candles (~180 points)
    const points: OHLCVPoint[] = ohlcRaw
      .filter((c) => c.length >= 5 && c[4] > 0)
      .map(([ts, open, high, low, close]) => {
        const dayTs = Math.floor(ts / 86400000) * 86400000;
        const dayVol = volMap.get(dayTs) ?? 0;
        const candleVol = dayVol > 0 ? dayVol / 6 : 1;

        return {
          timestamp: ts,
          open,
          high,
          low,
          close,
          volume: candleVol,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    return points;
  } catch (err) {
    console.warn(`[CoinGecko] fetchOHLCWithVolume error for ${coinId}:`, err);
    return [];
  }
}

/**
 * Fetch daily OHLC candles for HTF bias calculation.
 */
export async function fetchDailyOHLC(coinId: string): Promise<OHLCVPoint[]> {
  try {
    const res = await fetchWithRetry(
      `${BASE}/coins/${coinId}/ohlc?vs_currency=usd&days=90`,
      2,
      1000,
    );
    if (!res.ok) return [];
    const raw: number[][] = await res.json();
    if (!raw || raw.length === 0) return [];
    return raw
      .filter((c) => c.length >= 5 && c[4] > 0)
      .map(([ts, open, high, low, close]) => ({
        timestamp: ts,
        open,
        high,
        low,
        close,
        volume: 0,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  } catch {
    return [];
  }
}
