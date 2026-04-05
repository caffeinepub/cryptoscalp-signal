import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import type { CoinWithSignal } from "../hooks/useQueries";
import { useBacktestResults } from "../hooks/useQueries";
import { getCoinAvatarColor } from "../utils/format";

interface BacktestTabProps {
  signalCoins: CoinWithSignal[];
}

export function BacktestTab({ signalCoins }: BacktestTabProps) {
  const coinIds = useMemo(() => signalCoins.map((c) => c.id), [signalCoins]);
  const results = useBacktestResults(coinIds);

  const loaded = results
    .filter((r) => r.status === "success" && r.data)
    .map((r) => r.data!)
    .sort((a, b) => b.winRate - a.winRate);

  const isLoading = results.some((r) => r.status === "pending");

  if (signalCoins.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground"
        data-ocid="backtest.empty_state"
      >
        <TrendingUp className="w-10 h-10 opacity-20" />
        <p className="text-sm">
          Nessun segnale LONG attivo — il backtest mostra solo le coin con
          segnali
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-3 rounded-md bg-card border border-border">
        <AlertCircle className="w-4 h-4 text-signal-yellow shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <span className="text-foreground font-medium">
            Backtest su 90 giorni precedenti
          </span>{" "}
          con la logica EliZ: livelli S/R significativi, liquidity grab
          rilevato, retest confermato, OBV in aumento, bias daily rialzista.
          <br />
          <span className="text-signal-yellow">
            ⚠ I risultati storici non garantiscono performance future.
          </span>
        </div>
      </div>

      {isLoading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
          data-ocid="backtest.loading_state"
        >
          {coinIds.map((id) => (
            <Skeleton key={id} className="h-36 bg-muted/50 rounded-md" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {loaded.map((result, idx) => {
            const coin = signalCoins.find((c) => c.id === result.id);
            if (!coin) return null;
            const wr = result.winRate * 100;
            const wrColor =
              wr >= 60
                ? "text-signal-green"
                : wr >= 40
                  ? "text-signal-yellow"
                  : "text-signal-red";
            const wrBg =
              wr >= 60
                ? "bg-signal-green/10 border-signal-green/20"
                : wr >= 40
                  ? "bg-signal-yellow/10 border-signal-yellow/20"
                  : "bg-signal-red/10 border-signal-red/20";

            return (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`rounded-md border p-4 space-y-3 ${wrBg}`}
                data-ocid={`backtest.item.${idx + 1}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${getCoinAvatarColor(coin.symbol)}`}
                  >
                    {coin.symbol.slice(0, 3).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {coin.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      {coin.symbol.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className={`text-3xl font-display font-bold ${wrColor}`}>
                    {wr.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Win Rate
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs font-mono font-medium text-foreground">
                      {result.totalSignals}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Segnali
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-mono font-medium text-signal-green">
                      {result.profitableSignals}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Profit.
                    </div>
                  </div>
                  <div>
                    <div
                      className={`text-xs font-mono font-medium ${
                        result.averageReturn >= 0
                          ? "text-signal-green"
                          : "text-signal-red"
                      }`}
                    >
                      {result.averageReturn >= 0 ? "+" : ""}
                      {(result.averageReturn * 100).toFixed(2)}%
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Avg Ret.
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
