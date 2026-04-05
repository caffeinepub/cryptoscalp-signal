import { useQueries, useQuery } from "@tanstack/react-query";
import { useRef } from "react";
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
      return fetchOHLCWithVolume(coinId, 30);
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
        fetchOHLCWithVolume(coinId, 30),
        fetchDailyOHLC(coinId),
      ]);
      return calcElizSignal(candles4h, dailyCandles) ?? undefined;
    },
    enabled: !!coinId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

// ── Batch signals for the whole coin list ──
// Fetches OHLCV + daily candles and computes EliZ signal for each coin concurrently.
// Preserves detectedAt timestamps and frozen entryPrice across refreshes using a stable ref map.
export function useAllSignals(coinIds: string[]) {
  // Tracks the first detectedAt + frozen entryPrice for each coinId with an active signal
  const detectedAtMap = useRef<
    Map<string, { detectedAt: number; entryPrice: number }>
  >(new Map());

  return useQueries({
    queries: coinIds.map((id) => ({
      queryKey: ["signal-batch", id],
      queryFn: async (): Promise<{ id: string; signal: Signal | null }> => {
        try {
          // Fetch 4h candles and daily candles concurrently
          const [candles4h, dailyCandles] = await Promise.all([
            fetchOHLCWithVolume(id, 30),
            fetchDailyOHLC(id),
          ]);

          // Pass previous detectedAt + entryPrice to preserve original signal detection data
          const prevData = detectedAtMap.current.get(id);
          const signal = calcElizSignal(
            candles4h,
            dailyCandles,
            prevData?.detectedAt,
            prevData?.entryPrice,
          );

          // Track first detection time and freeze entry price
          if (signal?.hasSignal) {
            if (!detectedAtMap.current.has(id)) {
              detectedAtMap.current.set(id, {
                detectedAt: signal.detectedAt ?? Date.now(),
                entryPrice: signal.entryPrice,
              });
            }
          } else {
            // Signal gone, clear tracking
            detectedAtMap.current.delete(id);
          }

          return { id, signal };
        } catch {
          return { id, signal: null };
        }
      },
      staleTime: 5 * 60 * 1000,
      retry: 1,
    })),
    combine: (results) => {
      const map = new Map<string, Signal>();
      for (const r of results) {
        if (r.status === "success" && r.data?.signal) {
          map.set(r.data.id, r.data.signal);
        }
      }
      return {
        data: map,
        isLoading: results.some((r) => r.status === "pending"),
        progress: results.filter((r) => r.status !== "pending").length,
        total: results.length,
      };
    },
  });
}

// ── Backtest for coins with active signals ──
export function useBacktestResults(coinIds: string[]) {
  return useQueries({
    queries: coinIds.map((id) => ({
      queryKey: ["backtest", id],
      queryFn: async (): Promise<BacktestResult> => {
        const candles = await fetchOHLCWithVolume(id, 90);
        return runBacktest(id, candles);
      },
      enabled: coinIds.length > 0,
      staleTime: 10 * 60 * 1000,
      retry: 1,
    })),
  });
}
