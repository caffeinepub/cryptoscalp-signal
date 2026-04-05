import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { BarChart2, ChevronDown, ChevronUp, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import type { CoinWithSignal } from "../hooks/useQueries";
import { formatPct, formatPrice, getCoinAvatarColor } from "../utils/format";

interface MarketTableProps {
  coins: CoinWithSignal[];
  isLoading: boolean;
  onViewChart: (coin: CoinWithSignal) => void;
  backtestMap?: Map<string, number>;
  livePriceMap?: Map<string, number>;
}

type SortKey = "rank" | "price" | "change" | "winrate";

export function MarketTable({
  coins,
  isLoading,
  onViewChart,
  backtestMap,
  livePriceMap,
}: MarketTableProps) {
  const [showSignalsOnly, setShowSignalsOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = coins
    .filter((c) => {
      if (showSignalsOnly && !c.signal?.hasSignal) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => {
      let va = 0;
      let vb = 0;
      if (sortKey === "rank") {
        va = Number(a.marketCapRank);
        vb = Number(b.marketCapRank);
      } else if (sortKey === "price") {
        va = a.currentPrice;
        vb = b.currentPrice;
      } else if (sortKey === "change") {
        va = a.priceChange24h;
        vb = b.priceChange24h;
      } else if (sortKey === "winrate") {
        va = backtestMap?.get(a.id) ?? -1;
        vb = backtestMap?.get(b.id) ?? -1;
      }
      return sortDir === "asc" ? va - vb : vb - va;
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 text-signal-green" />
    ) : (
      <ChevronDown className="w-3 h-3 text-signal-green" />
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome o simbolo..."
            className="pl-9 h-8 text-sm bg-card border-border focus:border-signal-green/50 font-mono placeholder:font-sans"
            data-ocid="market.search_input"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="signals-only"
            checked={showSignalsOnly}
            onCheckedChange={setShowSignalsOnly}
            className="data-[state=checked]:bg-signal-green"
            data-ocid="market.toggle"
          />
          <Label
            htmlFor="signals-only"
            className="text-xs text-muted-foreground cursor-pointer select-none"
          >
            Solo segnali
          </Label>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-card border-b border-border">
                <th
                  className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none w-12"
                  onClick={() => toggleSort("rank")}
                  onKeyDown={(e) => e.key === "Enter" && toggleSort("rank")}
                >
                  <div className="flex items-center gap-1">
                    #
                    <SortIcon col="rank" />
                  </div>
                </th>
                <th className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground w-40">
                  Moneta
                </th>
                <th
                  className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                  onClick={() => toggleSort("price")}
                  onKeyDown={(e) => e.key === "Enter" && toggleSort("price")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Prezzo <SortIcon col="price" />
                  </div>
                </th>
                <th
                  className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                  onClick={() => toggleSort("change")}
                  onKeyDown={(e) => e.key === "Enter" && toggleSort("change")}
                >
                  <div className="flex items-center justify-end gap-1">
                    24h <SortIcon col="change" />
                  </div>
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-muted-foreground">
                  Segnale
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-muted-foreground">
                  Confluenze
                </th>
                <th
                  className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none hidden md:table-cell"
                  onClick={() => toggleSort("winrate")}
                  onKeyDown={(e) => e.key === "Enter" && toggleSort("winrate")}
                >
                  <div className="flex items-center justify-end gap-1">
                    Win Rate <SortIcon col="winrate" />
                  </div>
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">
                  Entry
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-emerald-400/70">
                  TP1
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-red-400/70">
                  SL
                </th>
                <th className="text-right px-3 py-2.5 text-xs font-medium text-muted-foreground">
                  Grafico
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows />
              ) : (
                <AnimatePresence mode="popLayout">
                  {filtered.length === 0 ? (
                    <tr data-ocid="market.empty_state">
                      <td colSpan={11} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <BarChart2 className="w-8 h-8 opacity-30" />
                          <p className="text-sm">
                            {showSignalsOnly
                              ? "Nessun segnale LONG attivo al momento"
                              : search
                                ? "Nessun risultato trovato"
                                : "Nessun dato disponibile"}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filtered.map((coin, idx) => (
                      <CoinRow
                        key={coin.id}
                        coin={coin}
                        idx={idx + 1}
                        onViewChart={onViewChart}
                        winRate={backtestMap?.get(coin.id)}
                        livePrice={livePriceMap?.get(coin.id)}
                      />
                    ))
                  )}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground/60 text-right font-mono">
        {filtered.length} di {coins.length} monete
      </p>
    </div>
  );
}

function SkeletonRows() {
  const COLS = 10;
  const ROWS = [
    "sk1",
    "sk2",
    "sk3",
    "sk4",
    "sk5",
    "sk6",
    "sk7",
    "sk8",
    "sk9",
    "sk10",
  ];
  const CELLS = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9", "c10"];
  return (
    <>
      {ROWS.map((rk) => (
        <tr key={rk} className="border-b border-border">
          {CELLS.slice(0, COLS).map((ck) => (
            <td key={ck} className="px-3 py-3">
              <Skeleton className="h-4 w-full bg-muted/50" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function PctBadge({
  value,
  entry,
  type,
}: {
  value: number;
  entry: number;
  type: "tp" | "sl";
}) {
  const pct = ((value - entry) / entry) * 100;
  const label = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  return (
    <span
      className={`text-[10px] font-mono ml-1 px-1 py-0.5 rounded ${
        type === "tp"
          ? "text-emerald-400 bg-emerald-400/10"
          : "text-red-400 bg-red-400/10"
      }`}
    >
      {label}
    </span>
  );
}

/** Returns a human-readable "X fa" string for a given timestamp */
function formatSignalAge(detectedAt: number): string {
  const diffMs = Date.now() - detectedAt;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr >= 1) return `${diffHr}h fa`;
  if (diffMin >= 1) return `${diffMin}m fa`;
  return "adesso";
}

/** Score badge colored by confluence strength — labeled as "Confluenze EliZ" */
function ScoreBadge({ score }: { score: number }) {
  const colorClass =
    score >= 5
      ? "text-signal-green bg-signal-green/10 border-signal-green/30"
      : score >= 4
        ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/25"
        : score >= 3
          ? "text-orange-400 bg-orange-400/10 border-orange-400/30"
          : "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";

  return (
    <span
      title="Confluenze EliZ"
      className={`inline-flex items-center justify-center text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${colorClass}`}
    >
      {score}/5
    </span>
  );
}

/** Win rate badge colored by value */
function WinRateBadge({ winRate }: { winRate: number }) {
  const pct = winRate * 100;
  const colorClass =
    pct >= 60
      ? "text-signal-green"
      : pct >= 40
        ? "text-signal-yellow"
        : "text-signal-red";
  return (
    <span className={`font-mono text-xs ${colorClass}`}>{pct.toFixed(0)}%</span>
  );
}

function CoinRow({
  coin,
  idx,
  onViewChart,
  winRate,
  livePrice,
}: {
  coin: CoinWithSignal;
  idx: number;
  onViewChart: (coin: CoinWithSignal) => void;
  winRate?: number;
  livePrice?: number;
}) {
  const hasSignal = coin.signal?.hasSignal;
  const score = coin.signal?.score ?? 0;

  // Refresh signal age display every 60 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!hasSignal || !coin.signal?.detectedAt) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [hasSignal, coin.signal?.detectedAt]);

  // Current display price: live from Binance if available, else CoinGecko
  const displayPrice = livePrice ?? coin.currentPrice;
  const isLive = livePrice !== undefined;

  // Signal badge label + style based on score tier
  function getSignalBadge() {
    if (score >= 5) {
      return (
        <Badge className="bg-signal-green/15 text-signal-green border-signal-green/30 border signal-glow text-[10px] px-2 py-0.5 font-mono font-medium animate-pulse-signal">
          🟢 STRONG
        </Badge>
      );
    }
    if (score >= 4) {
      return (
        <Badge className="bg-signal-green/10 text-signal-green border-signal-green/20 border text-[10px] px-2 py-0.5 font-mono font-medium animate-pulse-signal">
          🟢 LONG
        </Badge>
      );
    }
    if (score >= 3) {
      return (
        <Badge className="bg-orange-400/15 text-orange-400 border-orange-400/30 border text-[10px] px-2 py-0.5 font-mono font-medium">
          🟡 LONG
        </Badge>
      );
    }
    // score === 2
    return (
      <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30 border text-[10px] px-2 py-0.5 font-mono font-medium">
        ⚡ WEAK
      </Badge>
    );
  }

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`border-b border-border transition-colors ${
        hasSignal ? "row-long-signal" : "hover:bg-accent/30"
      }`}
      data-ocid={`market.item.${idx}`}
    >
      {/* Rank */}
      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
        {Number(coin.marketCapRank)}
      </td>

      {/* Coin */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${getCoinAvatarColor(coin.symbol)}`}
          >
            {coin.symbol.slice(0, 3).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-foreground truncate max-w-[100px]">
              {coin.name}
            </div>
            <div className="text-[10px] text-muted-foreground font-mono">
              {coin.symbol.toUpperCase()}
            </div>
          </div>
        </div>
      </td>

      {/* Price -- live if available, else fetched */}
      <td className="px-3 py-2.5 text-right font-mono text-xs text-foreground">
        {isLive ? (
          <span className="flex items-center justify-end gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full bg-signal-green animate-pulse shrink-0"
              title="Live"
            />
            {formatPrice(displayPrice)}
          </span>
        ) : (
          formatPrice(displayPrice)
        )}
      </td>

      {/* 24h */}
      <td className="px-3 py-2.5 text-right font-mono text-xs">
        <span
          className={
            coin.priceChange24h >= 0 ? "text-signal-green" : "text-signal-red"
          }
        >
          {formatPct(coin.priceChange24h)}
        </span>
      </td>

      {/* Signal + Age */}
      <td className="px-3 py-2.5 text-center">
        {hasSignal ? (
          <div className="flex flex-col items-center gap-0.5">
            {getSignalBadge()}
            {coin.signal?.detectedAt && (
              <span className="text-[9px] text-muted-foreground/60 font-mono">
                {formatSignalAge(coin.signal.detectedAt)}
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground/40 text-xs font-mono">—</span>
        )}
      </td>

      {/* Confluenze EliZ */}
      <td className="px-3 py-2.5 text-center">
        {hasSignal && coin.signal ? (
          <ScoreBadge score={coin.signal.score} />
        ) : (
          <span className="text-muted-foreground/40 text-xs font-mono">—</span>
        )}
      </td>

      {/* Win Rate */}
      <td className="px-3 py-2.5 text-right hidden md:table-cell">
        {hasSignal && winRate !== undefined ? (
          <WinRateBadge winRate={winRate} />
        ) : (
          <span className="text-muted-foreground/40 text-xs font-mono">—</span>
        )}
      </td>

      {/* Entry -- frozen at original signal detection price */}
      <td className="px-3 py-2.5 text-right font-mono text-xs">
        {hasSignal && coin.signal ? (
          <span
            className="text-signal-green"
            title="Prezzo al momento del segnale"
          >
            {formatPrice(coin.signal.entryPrice)}
          </span>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>

      {/* TP1 */}
      <td className="px-3 py-2.5 text-right font-mono text-xs">
        {hasSignal && coin.signal ? (
          <span className="inline-flex items-center justify-end gap-0.5 flex-wrap">
            <span className="text-emerald-400">
              {formatPrice(coin.signal.tp1)}
            </span>
            <PctBadge
              value={coin.signal.tp1}
              entry={coin.signal.entryPrice}
              type="tp"
            />
          </span>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>

      {/* SL */}
      <td className="px-3 py-2.5 text-right font-mono text-xs">
        {hasSignal && coin.signal ? (
          <span className="inline-flex items-center justify-end gap-0.5 flex-wrap">
            <span className="text-red-400">
              {formatPrice(coin.signal.stopLoss)}
            </span>
            <PctBadge
              value={coin.signal.stopLoss}
              entry={coin.signal.entryPrice}
              type="sl"
            />
          </span>
        ) : (
          <span className="text-muted-foreground/40">—</span>
        )}
      </td>

      {/* Action */}
      <td className="px-3 py-2.5 text-right">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-signal-green hover:bg-signal-green/10"
          onClick={() => onViewChart(coin)}
          data-ocid={`market.edit_button.${idx}`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
        </Button>
      </td>
    </motion.tr>
  );
}
