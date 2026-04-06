import { useQueries, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  fetchDailyOHLC,
  fetchOHLCWithVolume,
  fetchTopByVolume,
} from "../utils/coingecko";
import {
  type BacktestResult,
  type OHLCVCandle,
  type SignalResult,
  calcElizSignal,
  runBacktest,
} from "../utils/indicators";
import {
  type PersistedSignal,
  usePersistedSignals,
} from "./usePersistedSignals";

// Re-export types that the rest of the app uses
export type CryptoCoin = {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  priceChange24h: number;
  marketCapRank: number;
};

export type Signal = SignalResult;
export type OHLCV = OHLCVCandle;
export type { BacktestResult, PersistedSignal };

export interface CoinWithSignal extends CryptoCoin {
  signal?: Signal;
}

export interface TopCoinsResult {
  coins: CryptoCoin[];
  isFromCache: boolean;
}

// ── Hour bucket — changes every hour, triggers refresh ──
function hourBucket(): number {
  return Math.floor(Date.now() / (60 * 60 * 1000));
}

// ── Fetch OHLCV from CoinGecko with retry logic ──
async function fetchOHLCWithRetry(
  coinId: string,
  days: number,
  maxRetries = 3,
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fetchOHLCWithVolume(
        coinId,
        days as 1 | 7 | 14 | 30 | 90 | 180 | 365,
      );
      if (result && result.length >= 10) return result;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    } catch {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }
  return [];
}

async function fetchDailyWithRetry(coinId: string, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fetchDailyOHLC(coinId);
      if (result && result.length > 0) return result;
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    } catch {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }
  return [];
}

// ── Top 25 coins by 24h volume (dynamic, refreshes every hour) ──
export function useTopCoins() {
  return useQuery<TopCoinsResult>({
    queryKey: ["topCoins", hourBucket()],
    queryFn: async () => {
      const coins = await fetchTopByVolume(25);
      return { coins, isFromCache: false };
    },
    staleTime: 60 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    retry: 2,
  });
}

// ── OHLCV for a single coin (used in chart modal) ──
export function useCoinOHLCV(coinId: string | null) {
  return useQuery<OHLCV[]>({
    queryKey: ["ohlcv", coinId],
    queryFn: async () => {
      if (!coinId) return [];
      return fetchOHLCWithRetry(coinId, 30);
    },
    enabled: !!coinId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// ── Signal for a single coin (computed from OHLCV + daily candles) ──
export function useCoinSignal(coinId: string | null) {
  return useQuery<Signal | undefined>({
    queryKey: ["signal", coinId],
    queryFn: async () => {
      if (!coinId) return undefined;
      const [candles4h, dailyCandles] = await Promise.all([
        fetchOHLCWithRetry(coinId, 30),
        fetchDailyWithRetry(coinId),
      ]);
      return calcElizSignal(candles4h, dailyCandles) ?? undefined;
    },
    enabled: !!coinId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// ── Batch signals for the top 25 coins ──
// Signals are PERSISTED in localStorage for up to 24 hours.
// A signal remains visible until:
//   - 24h have passed since detection
//   - The live price touches TP1 (+2%) or SL (-2%)
//
// The queryKey includes both the coin list AND the hourBucket so a new
// analysis cycle starts whenever the coin list changes OR an hour passes.
export function useAllSignals(
  coinIds: string[],
  livePrices?: Map<string, number>,
) {
  const { mergeFreshSignals, validateWithLivePrices, activeSignalMap, store } =
    usePersistedSignals();

  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);

  // Validate signals against live prices on every price update
  const livePricesRef = useRef(livePrices);
  if (livePrices && livePrices !== livePricesRef.current) {
    livePricesRef.current = livePrices;
    if (livePrices.size > 0) {
      validateWithLivePrices(livePrices);
    }
  }

  const query = useQuery<Map<string, Signal>>({
    // Include both coinIds AND hourBucket in the key so the query re-runs
    // whenever the coin list changes (new hour, manual refresh, etc.)
    queryKey: ["signal-batch-cg", coinIds.join(","), hourBucket()],
    queryFn: async () => {
      const freshMap = new Map<string, Signal>();
      progressRef.current = 0;
      setProgress(0);

      // With 25 coins: 3 chunks of 10/10/5 = ~3s total
      const CHUNK = 10;
      const DELAY = 300;

      for (let i = 0; i < coinIds.length; i += CHUNK) {
        const chunk = coinIds.slice(i, i + CHUNK);
        await Promise.all(
          chunk.map(async (id) => {
            try {
              const candles4h = await fetchOHLCWithVolume(id, 90);
              if (candles4h.length < 10) return;
              const signal = calcElizSignal(candles4h, []);
              if (signal?.hasSignal) {
                freshMap.set(id, signal);
              }
            } catch {
              // skip failed coins silently
            }
          }),
        );
        progressRef.current = Math.min(i + CHUNK, coinIds.length);
        setProgress(progressRef.current);
        if (i + CHUNK < coinIds.length) {
          await new Promise((r) => setTimeout(r, DELAY));
        }
      }

      // Merge fresh detections into the persistent store
      mergeFreshSignals(freshMap);

      // Return all currently active persisted signals
      return activeSignalMap();
    },
    staleTime: 5 * 60 * 1000,
    retry: 0,
    enabled: coinIds.length > 0,
  });

  // Always serve from the persisted store (even between analysis cycles)
  const data = activeSignalMap();

  return {
    data,
    isLoading: query.isLoading || query.isFetching,
    progress,
    total: coinIds.length,
    store,
  };
}

// ── Backtest for coins with active signals ──
export function useBacktestResults(coinIds: string[]) {
  return useQueries({
    queries: coinIds.map((id) => ({
      queryKey: ["backtest", id],
      queryFn: async (): Promise<BacktestResult> => {
        const candles = await fetchOHLCWithRetry(id, 90);
        return runBacktest(id, candles);
      },
      enabled: coinIds.length > 0,
      staleTime: 10 * 60 * 1000,
      retry: 1,
    })),
  });
}
