// useBinancePrices — polls CoinGecko for live prices of active coins.
// Uses the same data source as the rest of the app (no COIN_LIST dependency).
// Compatible with the dynamic top-25 coin universe from CoinGecko.
import { useEffect, useRef, useState } from "react";

const CG_BASE = "https://api.coingecko.com/api/v3";
const POLL_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Polls CoinGecko for live prices of all provided coinIds.
 * Returns a Map<coinId, livePrice>, updated every 30 seconds.
 * Falls back silently on errors — callers use last known price.
 */
export function useBinancePrices(
  coinIds: string[],
  _symbolMap?: Map<string, string>,
): Map<string, number> {
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const coinIdsKey = [...coinIds].sort().join(",");

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

    async function pollPrices() {
      try {
        const idsParam = ids.join(",");
        const url = `${CG_BASE}/simple/price?ids=${idsParam}&vs_currencies=usd`;
        const res = await fetch(url);
        if (!res.ok) return; // silent — keep last known prices

        const data: Record<string, { usd: number }> = await res.json();
        const next = new Map<string, number>();
        for (const id of ids) {
          const price = data[id]?.usd;
          if (price !== undefined && price > 0) {
            next.set(id, price);
          }
        }
        if (next.size > 0) setPrices(next);
      } catch {
        // silent — keep last known prices
      }
    }

    // Initial fetch immediately
    pollPrices();

    // Poll every 30 seconds
    intervalRef.current = setInterval(pollPrices, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [coinIdsKey]);

  return prices;
}
