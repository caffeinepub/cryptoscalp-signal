import { Toaster } from "@/components/ui/sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BacktestTab } from "./components/BacktestTab";
import { ChartModal } from "./components/ChartModal";
import { Header } from "./components/Header";
import { MarketTable } from "./components/MarketTable";
import { useBinancePrices } from "./hooks/useBinancePrices";
import { usePushNotifications } from "./hooks/usePushNotifications";
import {
  useAllSignals,
  useBacktestResults,
  useCoinOHLCV,
  useCoinSignal,
  useTopCoins,
} from "./hooks/useQueries";
import type { CoinWithSignal } from "./hooks/useQueries";

const REFRESH_INTERVAL = 5 * 60; // seconds

export default function App() {
  const queryClient = useQueryClient();
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedCoin, setSelectedCoin] = useState<CoinWithSignal | null>(null);
  const [activeTab, setActiveTab] = useState("market");

  const { sendNotification } = usePushNotifications();

  const prevSignalIds = useRef<Set<string> | null>(null);

  const {
    data: topCoinsResult,
    isLoading: coinsLoading,
    isFetching: coinsFetching,
  } = useTopCoins();

  const coins = topCoinsResult?.coins ?? [];
  const isFromCache = topCoinsResult?.isFromCache ?? false;

  // Use ALL coins for signals -- Binance has no rate limit
  const batchCoinIds = useMemo(() => coins.map((c) => c.id), [coins]);

  const {
    data: signalMap,
    isLoading: signalsLoading,
    progress,
    total,
  } = useAllSignals(batchCoinIds);

  // Chart modal data
  const { data: ohlcv = [], isLoading: ohlcvLoading } = useCoinOHLCV(
    selectedCoin?.id ?? null,
  );
  const { data: chartSignal, isLoading: signalLoading } = useCoinSignal(
    selectedCoin?.id ?? null,
  );

  // Merge coins + signals
  const coinsWithSignals = useMemo<CoinWithSignal[]>(() => {
    return coins.map((coin) => ({
      ...coin,
      signal: signalMap?.get(coin.id),
    }));
  }, [coins, signalMap]);

  const signalCoins = useMemo(
    () => coinsWithSignals.filter((c) => c.signal?.hasSignal),
    [coinsWithSignals],
  );

  // IDs for backtest (coins with active signals)
  const signalCoinIds = useMemo(
    () => signalCoins.map((c) => c.id),
    [signalCoins],
  );

  // Build symbolMap for Binance WebSocket (coinId → ticker symbol)
  const symbolMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of coins) m.set(c.id, c.symbol);
    return m;
  }, [coins]);

  // Live prices from Binance WebSocket (only for coins with active signals)
  const livePrices = useBinancePrices(signalCoinIds, symbolMap);

  // Run backtest for coins with active signals to display win rate in the dashboard
  const backtestResults = useBacktestResults(signalCoinIds);

  // Build backtestMap: coinId → winRate (0-1)
  const backtestMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of backtestResults) {
      if (r.status === "success" && r.data) {
        map.set(r.data.id, r.data.winRate);
      }
    }
    return map;
  }, [backtestResults]);

  // Detect NEW LONG signals and send push notifications
  useEffect(() => {
    if (coinsLoading || coinsWithSignals.length === 0) return;

    const currentSignalIds = new Set(
      coinsWithSignals.filter((c) => c.signal?.hasSignal).map((c) => c.id),
    );

    if (prevSignalIds.current === null) {
      prevSignalIds.current = currentSignalIds;
      return;
    }

    for (const coin of coinsWithSignals) {
      if (coin.signal?.hasSignal && !prevSignalIds.current.has(coin.id)) {
        sendNotification(
          "\uD83D\uDFE2 LONG Signal",
          `${coin.name} (${coin.symbol.toUpperCase()}) - Segnale LONG rilevato!`,
          coin.id,
        );
      }
    }

    prevSignalIds.current = currentSignalIds;
  }, [coinsWithSignals, coinsLoading, sendNotification]);

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          queryClient.invalidateQueries({ queryKey: ["topCoins"] });
          queryClient.invalidateQueries({ queryKey: ["signal-batch"] });
          setLastUpdated(new Date());
          toast.success("Dati aggiornati automaticamente", { duration: 2000 });
          return REFRESH_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [queryClient]);

  useEffect(() => {
    if (!coinsLoading && coins.length > 0) {
      setLastUpdated(new Date());
    }
  }, [coinsLoading, coins.length]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["topCoins"] });
    queryClient.invalidateQueries({ queryKey: ["signal-batch"] });
    setCountdown(REFRESH_INTERVAL);
    setLastUpdated(new Date());
    toast.success("Aggiornamento avviato...", { duration: 1500 });
  }, [queryClient]);

  const handleViewChart = useCallback((coin: CoinWithSignal) => {
    setSelectedCoin(coin);
  }, []);

  const handleCloseChart = useCallback(() => {
    setSelectedCoin(null);
  }, []);

  const isLoading = coinsLoading;
  const isRefreshing = coinsFetching && !coinsLoading;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Toaster
        theme="dark"
        toastOptions={{
          style: {
            background: "oklch(0.14 0.01 250)",
            border: "1px solid oklch(0.22 0.012 250)",
            color: "oklch(0.92 0.01 200)",
          },
        }}
      />

      <Header
        countdown={countdown}
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        signalCount={signalCoins.length}
        isFromCache={isFromCache}
      />

      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-4 py-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList className="bg-card border border-border h-8">
                <TabsTrigger
                  value="market"
                  className="text-xs h-6 px-3 data-[state=active]:bg-background data-[state=active]:text-foreground"
                  data-ocid="market.tab"
                >
                  📊 Mercato
                </TabsTrigger>
                <TabsTrigger
                  value="backtest"
                  className="text-xs h-6 px-3 data-[state=active]:bg-background data-[state=active]:text-foreground"
                  data-ocid="backtest.tab"
                >
                  🔬 Backtest
                  {signalCoins.length > 0 && (
                    <span className="ml-1.5 bg-signal-green/20 text-signal-green text-[9px] font-mono px-1.5 py-0.5 rounded-full">
                      {signalCoins.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                {isLoading ? (
                  <span className="animate-pulse">Caricamento monete...</span>
                ) : signalsLoading ? (
                  <span className="animate-pulse">
                    Analisi segnali {progress}/{total}...
                  </span>
                ) : (
                  <span>
                    {coins.length} monete • {signalCoins.length} segnali attivi
                  </span>
                )}
              </div>
            </div>

            <TabsContent value="market" className="mt-0">
              <MarketTable
                coins={coinsWithSignals}
                isLoading={isLoading}
                onViewChart={handleViewChart}
                backtestMap={backtestMap}
                livePriceMap={livePrices}
              />
            </TabsContent>

            <TabsContent value="backtest" className="mt-0">
              <BacktestTab signalCoins={signalCoins} />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 px-4 mt-auto">
        <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground/60 font-mono">
            ⚠ Solo a scopo informativo. Non è consulenza finanziaria.
          </p>
          <p className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-muted-foreground transition-colors"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </footer>

      {/* Chart Modal */}
      {selectedCoin && (
        <ChartModal
          coin={selectedCoin}
          ohlcv={ohlcv}
          signal={chartSignal}
          isLoading={ohlcvLoading || signalLoading}
          onClose={handleCloseChart}
        />
      )}
    </div>
  );
}
