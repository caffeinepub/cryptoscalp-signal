/**
 * Persistent signal store backed by localStorage.
 *
 * A signal is stored when first detected and remains active until:
 *   1. 24 hours have passed since detection (MAX_SIGNAL_AGE_MS)
 *   2. The live price touches TP1 (+3%)
 *   3. The live price touches SL  (-2%)
 *
 * The store is keyed by coinId.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { SignalResult } from "../utils/indicators";

const STORAGE_KEY = "cryptoscalp_signals_v2";
const MAX_SIGNAL_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface PersistedSignal {
  coinId: string;
  signal: SignalResult;
  detectedAt: number;
  entryPrice: number;
  tp1: number;
  stopLoss: number;
  status: "active" | "tp_reached" | "sl_hit" | "expired";
}

type SignalStore = Record<string, PersistedSignal>;

function loadStore(): SignalStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SignalStore;
    // Remove already-expired signals on load
    const now = Date.now();
    const cleaned: SignalStore = {};
    for (const [id, entry] of Object.entries(parsed)) {
      if (
        entry.status === "active" &&
        now - entry.detectedAt < MAX_SIGNAL_AGE_MS
      ) {
        cleaned[id] = entry;
      }
    }
    return cleaned;
  } catch {
    return {};
  }
}

function saveStore(store: SignalStore) {
  try {
    // Only persist active signals
    const active: SignalStore = {};
    for (const [id, entry] of Object.entries(store)) {
      if (entry.status === "active") active[id] = entry;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
  } catch {
    // ignore storage errors
  }
}

export function usePersistedSignals() {
  const [store, setStoreState] = useState<SignalStore>(() => loadStore());
  const storeRef = useRef<SignalStore>(store);

  // Keep ref in sync for use in callbacks without stale closure
  useEffect(() => {
    storeRef.current = store;
  }, [store]);

  const setStore = useCallback(
    (updater: (prev: SignalStore) => SignalStore) => {
      setStoreState((prev) => {
        const next = updater(prev);
        saveStore(next);
        return next;
      });
    },
    [],
  );

  /**
   * Merge a fresh batch of signals from the analysis cycle.
   * - New signals are added with current timestamp.
   * - Existing active signals are kept (persistence!) even if the analysis
   *   no longer detects them — they are only removed by time/SL/TP.
   * - Signals that are still detected refresh their SignalResult metadata
   *   (score, etc.) but keep the original detectedAt + entryPrice.
   */
  const mergeFreshSignals = useCallback(
    (freshMap: Map<string, SignalResult>) => {
      setStore((prev) => {
        const next = { ...prev };
        const now = Date.now();

        // Add brand-new signals
        for (const [coinId, signal] of freshMap.entries()) {
          if (!next[coinId]) {
            // New signal — record it
            next[coinId] = {
              coinId,
              signal,
              detectedAt: signal.detectedAt ?? now,
              entryPrice: signal.entryPrice,
              tp1: signal.tp1,
              stopLoss: signal.stopLoss,
              status: "active",
            };
          } else if (next[coinId].status === "active") {
            // Already tracked — update metadata but preserve entry + timestamp
            next[coinId] = {
              ...next[coinId],
              signal: {
                ...signal,
                entryPrice: next[coinId].entryPrice,
                detectedAt: next[coinId].detectedAt,
                tp1: next[coinId].tp1,
                stopLoss: next[coinId].stopLoss,
              },
            };
          }
        }

        // Expire old signals (24h passed)
        for (const [coinId, entry] of Object.entries(next)) {
          if (
            entry.status === "active" &&
            now - entry.detectedAt >= MAX_SIGNAL_AGE_MS
          ) {
            delete next[coinId];
          }
        }

        return next;
      });
    },
    [setStore],
  );

  /**
   * Validate active signals against current live prices.
   * Called whenever live prices update.
   */
  const validateWithLivePrices = useCallback(
    (livePrices: Map<string, number>) => {
      setStore((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [coinId, entry] of Object.entries(next)) {
          if (entry.status !== "active") continue;
          const price = livePrices.get(coinId);
          if (price === undefined) continue;
          if (price >= entry.tp1) {
            delete next[coinId];
            changed = true;
          } else if (price <= entry.stopLoss) {
            delete next[coinId];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    },
    [setStore],
  );

  /**
   * Build a Map<coinId, SignalResult> from active persisted signals.
   * This is what the rest of the app consumes.
   */
  const activeSignalMap = useCallback((): Map<string, SignalResult> => {
    const map = new Map<string, SignalResult>();
    for (const [coinId, entry] of Object.entries(storeRef.current)) {
      if (entry.status === "active") {
        map.set(coinId, entry.signal);
      }
    }
    return map;
  }, []);

  return {
    store,
    mergeFreshSignals,
    validateWithLivePrices,
    activeSignalMap,
  };
}
