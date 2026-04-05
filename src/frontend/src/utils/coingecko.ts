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
  // Pattern-based: ends with usd, usd at start, or contains 'stable'
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
      // 429 = rate limit: wait and retry
      if (res.status === 429 && attempt < retries) {
        const delay = baseDelay * 2 ** attempt; // 2s, 4s, 8s
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
  // Save to cache on success
  saveCoinsCache(coins);
  return coins;
}

// CoinGecko OHLC endpoint returns [timestamp, open, high, low, close]
// We synthesize volume from the market_chart endpoint.
// For 4h candles: use days=90 with hourly interval, then group into 4h buckets.
export async function fetchOHLCWithVolume(
  coinId: string,
  _days: 1 | 7 | 14 | 30 | 90 | 180 | 365,
): Promise<OHLCVPoint[]> {
  // Always use 90 days for 4h candle generation
  const fetchDays = 90;

  const [ohlcRes, volRes] = await Promise.all([
    fetchWithRetry(
      `${BASE}/coins/${coinId}/ohlc?vs_currency=usd&days=${fetchDays}`,
    ),
    fetchWithRetry(
      `${BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${fetchDays}&interval=hourly`,
    ),
  ]);

  if (!ohlcRes.ok || !volRes.ok) throw new Error("CoinGecko fetch failed");

  const ohlcRaw: number[][] = await ohlcRes.json();
  const volData: { total_volumes: number[][] } = await volRes.json();

  // Build volume map (rounded to nearest hour)
  const volMap = new Map<number, number>();
  for (const [ts, vol] of volData.total_volumes) {
    const rounded = Math.round(ts / 3600000) * 3600000;
    volMap.set(rounded, vol);
  }

  // CoinGecko OHLC for 90 days returns 4h candles natively
  // Group into 4h buckets: aggregate OHLCV
  const hourlyPoints: OHLCVPoint[] = ohlcRaw.map(
    ([ts, open, high, low, close]) => {
      const rounded = Math.round(ts / 3600000) * 3600000;
      return {
        timestamp: ts,
        open,
        high,
        low,
        close,
        volume: volMap.get(rounded) ?? volMap.get(ts) ?? 0,
      };
    },
  );

  // CoinGecko already returns ~4h candles when days=90; return as-is
  return hourlyPoints;
}

/**
 * Fetch daily OHLC candles for HTF bias calculation.
 * CoinGecko /coins/{id}/ohlc?vs_currency=usd&days=30 returns daily candles.
 * Volume is not critical here; set to 0.
 */
export async function fetchDailyOHLC(coinId: string): Promise<OHLCVPoint[]> {
  const res = await fetchWithRetry(
    `${BASE}/coins/${coinId}/ohlc?vs_currency=usd&days=30`,
  );
  if (!res.ok) throw new Error(`CoinGecko daily OHLC error ${res.status}`);
  const raw: number[][] = await res.json();
  return raw.map(([ts, open, high, low, close]) => ({
    timestamp: ts,
    open,
    high,
    low,
    close,
    volume: 0,
  }));
}
