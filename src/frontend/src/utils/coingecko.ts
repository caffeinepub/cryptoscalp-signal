// CoinGecko API helpers (client-side fetch)

const BASE = "https://api.coingecko.com/api/v3";
const CACHE_KEY = "cryptoscalp_top_coins_cache";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export interface CoinListItem {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  priceChange24h: number;
  marketCapRank: number;
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
]);

export function isStablecoin(id: string, symbol: string): boolean {
  if (STABLE_IDS.has(id.toLowerCase())) return true;
  const sym = symbol.toLowerCase();
  if (STABLE_SYMBOLS.has(sym)) return true;
  if (sym.endsWith("usd") || sym.startsWith("usd")) return true;
  if (sym.endsWith("eur") && sym !== "eur") return true;
  return false;
}

// ── localStorage cache helpers ──

function loadCoinsCache(): CoinsCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CoinsCache;
  } catch {
    return null;
  }
}

function saveCoinsCache(data: CoinListItem[]): void {
  try {
    const cache: CoinsCache = { data, fetchedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // localStorage might be full or disabled
  }
}

/** Returns cached coins if they exist (regardless of age) */
export function getCachedCoins(): {
  data: CoinListItem[];
  isStale: boolean;
} | null {
  const cache = loadCoinsCache();
  if (!cache || cache.data.length === 0) return null;
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
  saveCoinsCache(coins);
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
  // days=90 would give daily candles — we always want 4h
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
          // Round to day boundary
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
      .filter((c) => c.length >= 5 && c[4] > 0) // require valid close
      .map(([ts, open, high, low, close]) => {
        const dayTs = Math.floor(ts / 86400000) * 86400000;
        const dayVol = volMap.get(dayTs) ?? 0;
        // Distribute daily volume across ~6 candles per day
        const candleVol = dayVol > 0 ? dayVol / 6 : 1;

        return {
          timestamp: ts,
          open,
          high,
          low,
          close,
          // Synthetic per-candle volume from daily total
          // Good enough for OBV slope direction (we only care about relative changes)
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
 * CoinGecko /coins/{id}/ohlc?vs_currency=usd&days=30 with large days returns daily.
 * Use days=90 to get daily candles explicitly.
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
