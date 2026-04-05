import { useQueries, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  fetchCoinList,
  fetchDailyOHLC,
  fetchOHLCWithVolume,
} from "../utils/binance";
import {
  type BacktestResult,
  type OHLCVCandle,
  type SignalResult,
  calcElizSignal,
  runBacktest,
} from "../utils/indicators";

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
export type { BacktestResult };

export interface CoinWithSignal extends CryptoCoin {
  signal?: Signal;
}

export interface TopCoinsResult {
  coins: CryptoCoin[];
  isFromCache: boolean;
}

// ── Fetch OHLCV with retry logic ──
async function fetchOHLCWithRetry(
  coinId: string,
  days: number,
  maxRetries = 3,
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await fetchOHLCWithVolume(coinId, days);
      if (result && result.length >= 15) return result;
      // Got empty/insufficient data — wait before retry
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    } catch {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 2000 * attempt));
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

// ── Top coins (market data only, no signals yet) ──
export function useTopCoins() {
  return useQuery<TopCoinsResult>({
    queryKey: ["topCoins"],
    queryFn: async () => {
      const coins = await fetchCoinList();
      return { coins, isFromCache: false };
    },
    staleTime: 5 * 60 * 1000,
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

// ── Batch signals for the whole coin list ──
// Processes coins in chunks of 15 with 200ms delays between chunks.
// Uses only 60 candles per coin (10 days of 4h data) for fast signal scanning.
// Daily bias is derived from the last 6 x 4h candles as a proxy.
export function useAllSignals(coinIds: string[]) {
  // Tracks the first detectedAt + frozen entryPrice for each coinId with an active signal
  const detectedAtMap = useRef<
    Map<string, { detectedAt: number; entryPrice: number }>
  >(new Map());
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);

  const query = useQuery<Map<string, Signal>>({
    queryKey: ["signal-batch-seq", coinIds.length],
    queryFn: async () => {
      const result = new Map<string, Signal>();
      progressRef.current = 0;
      setProgress(0);

      // Larger chunk size + shorter delay = ~4x faster than before
      const CHUNK = 15;
      const DELAY = 200; // 0.2 seconds between chunks

      for (let i = 0; i < coinIds.length; i += CHUNK) {
        const chunk = coinIds.slice(i, i + CHUNK);
        await Promise.all(
          chunk.map(async (id) => {
            try {
              // Fetch only 60 candles (10 days of 4h) — sufficient for signal detection
              // and ~9x less data than the previous 540-candle fetch.
              const candles4h = await fetchOHLCWithVolume(id, 30, 60);

              if (candles4h.length < 15) return; // not enough data, skip

              const prevData = detectedAtMap.current.get(id);
              // Pass empty dailyCandles — calcElizSignal uses last 6 x 4h as proxy
              const signal = calcElizSignal(
                candles4h,
                [],
                prevData?.detectedAt,
                prevData?.entryPrice,
              );
              if (signal?.hasSignal) {
                if (!detectedAtMap.current.has(id)) {
                  detectedAtMap.current.set(id, {
                    detectedAt: signal.detectedAt ?? Date.now(),
                    entryPrice: signal.entryPrice,
                  });
                }
                result.set(id, signal);
              } else {
                detectedAtMap.current.delete(id);
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
      return result;
    },
    staleTime: 5 * 60 * 1000,
    retry: 0,
    enabled: coinIds.length > 0,
  });

  return {
    data: query.data ?? new Map<string, Signal>(),
    isLoading: query.isLoading || query.isFetching,
    progress,
    total: coinIds.length,
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
