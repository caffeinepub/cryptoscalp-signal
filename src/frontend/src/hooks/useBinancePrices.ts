// useBinancePrices — now polls CryptoCompare for live prices
// Binance WebSocket was replaced due to geo-restrictions on hosting infrastructure.
import { useEffect, useRef, useState } from "react";
import { COIN_LIST, fetchLivePrice } from "../utils/cryptocompare";

/**
 * Polls CryptoCompare for live prices of active signal coins.
 * Returns a map of coinId → live price, updated every 15 seconds.
 * Silent on errors — callers fall back to last known price.
 */
export function useBinancePrices(
  coinIds: string[],
  _symbolMap?: Map<string, string>,
): Map<string, number> {
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const coinIdsKey = coinIds.slice().sort().join(",");

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    const ids = coinIdsKey ? coinIdsKey.split(",").filter(Boolean) : [];
    if (ids.length === 0) {
      setPrices(new Map());
      return;
    }

    // Verify all ids exist in COIN_LIST
    const validIds = ids.filter((id) => COIN_LIST.some((c) => c.id === id));
    if (validIds.length === 0) return;

    async function pollPrices() {
      const entries = await Promise.all(
        validIds.map(async (id) => {
          const price = await fetchLivePrice(id);
          return price !== null ? ([id, price] as [string, number]) : null;
        }),
      );
      const next = new Map<string, number>();
      for (const entry of entries) {
        if (entry) next.set(entry[0], entry[1]);
      }
      if (next.size > 0) setPrices(next);
    }

    // Initial fetch
    pollPrices();

    // Poll every 15 seconds
    intervalRef.current = setInterval(pollPrices, 15_000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [coinIdsKey]);

  return prices;
}
