import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown, TrendingUp, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CoinWithSignal, OHLCV, Signal } from "../hooks/useQueries";
import {
  formatAxisDate,
  formatPct,
  formatPrice,
  getCoinAvatarColor,
} from "../utils/format";

interface ChartModalProps {
  coin: CoinWithSignal | null;
  ohlcv: OHLCV[];
  signal: Signal | undefined;
  isLoading: boolean;
  onClose: () => void;
}

// Process OHLCV into chart data (last 30 days = ~720 candles)
function processChartData(ohlcv: OHLCV[], signal?: Signal) {
  const last720 = ohlcv.slice(-720);
  return last720.map((c) => ({
    time: Number(c.timestamp),
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
    // OBV proxy (rsi field) and OBV momentum (macd field)
    rsi: signal?.rsi ?? null,
    obvMomentum: signal?.macd ?? null,
    bullish: c.close >= c.open,
    candleSize: Math.abs(c.close - c.open),
    candleMid: Math.min(c.open, c.close),
  }));
}

function CustomCandleBar(props: any) {
  const { x, y, width, height, payload } = props;
  if (!payload || width <= 0) return null;
  const bullish = payload.bullish;
  const color = bullish ? "oklch(0.82 0.19 155)" : "oklch(0.62 0.22 25)";
  const wickX = x + width / 2;
  const bodyTop = y;
  const bodyBot = y + Math.max(height, 1);

  return (
    <g>
      <line
        x1={wickX}
        y1={bodyTop - 3}
        x2={wickX}
        y2={bodyBot + 3}
        stroke={color}
        strokeWidth={1}
        opacity={0.6}
      />
      <rect
        x={x + 1}
        y={bodyTop}
        width={Math.max(width - 2, 1)}
        height={Math.max(height, 1)}
        fill={color}
        opacity={0.85}
        rx={1}
      />
    </g>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-popover border border-border rounded p-2 text-xs font-mono shadow-terminal">
      <div className="text-muted-foreground mb-1">
        {new Date(d.time).toLocaleDateString("it-IT")}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <span className="text-muted-foreground">O:</span>
        <span>{formatPrice(d.open)}</span>
        <span className="text-muted-foreground">H:</span>
        <span className="text-signal-green">{formatPrice(d.high)}</span>
        <span className="text-muted-foreground">L:</span>
        <span className="text-signal-red">{formatPrice(d.low)}</span>
        <span className="text-muted-foreground">C:</span>
        <span className={d.bullish ? "text-signal-green" : "text-signal-red"}>
          {formatPrice(d.close)}
        </span>
        <span className="text-muted-foreground">Vol:</span>
        <span>{(d.volume / 1000).toFixed(1)}K</span>
      </div>
    </div>
  );
}

export function ChartModal({
  coin,
  ohlcv,
  signal,
  isLoading,
  onClose,
}: ChartModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!coin) return null;

  const chartData = processChartData(ohlcv, signal);
  const sig = signal ?? coin.signal;

  // Downsample for performance — show ~200 candles
  const displayData =
    chartData.length > 200
      ? chartData.filter((_, i) => i % Math.ceil(chartData.length / 200) === 0)
      : chartData;

  // EliZ indicator states derived from signal
  const grabDetected = (sig?.score ?? 0) >= 2;
  const retestConfirmed = (sig?.score ?? 0) >= 3;
  const obvRising = (sig?.macd ?? 0) > 0;
  const srLevel = sig?.ema9 ?? null;

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        data-ocid="chart.modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${getCoinAvatarColor(coin.symbol)}`}
            >
              {coin.symbol.slice(0, 3).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-base text-foreground">
                  {coin.name}
                </h2>
                <span className="text-muted-foreground font-mono text-xs">
                  {coin.symbol.toUpperCase()}
                </span>
                {sig?.hasSignal && (
                  <Badge className="bg-signal-green/15 text-signal-green border-signal-green/30 border signal-glow text-[10px] px-2 py-0.5 font-mono">
                    🟢 LONG
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="font-mono text-sm text-foreground">
                  {formatPrice(coin.currentPrice)}
                </span>
                <span
                  className={`font-mono text-xs ${
                    coin.priceChange24h >= 0
                      ? "text-signal-green"
                      : "text-signal-red"
                  }`}
                >
                  {coin.priceChange24h >= 0 ? (
                    <TrendingUp className="inline w-3 h-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="inline w-3 h-3 mr-0.5" />
                  )}
                  {formatPct(coin.priceChange24h)}
                </span>
              </div>
            </div>
          </div>

          {/* Signal levels */}
          {sig?.hasSignal && (
            <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
              <div className="text-center">
                <div className="text-muted-foreground text-[10px] mb-0.5">
                  ENTRY
                </div>
                <div className="text-signal-green">
                  {formatPrice(sig.entry)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground text-[10px] mb-0.5">
                  TP1
                </div>
                <div className="text-signal-green-dim">
                  {formatPrice(sig.tp1)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-muted-foreground text-[10px] mb-0.5">
                  SL
                </div>
                <div className="text-signal-red">
                  {formatPrice(sig.stopLoss)}
                </div>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-md hover:bg-muted"
            onClick={onClose}
            data-ocid="chart.close_button"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Chart body */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-4 h-full" data-ocid="chart.loading_state">
              <Skeleton className="h-64 w-full bg-muted/50" />
              <Skeleton className="h-24 w-full bg-muted/50" />
              <Skeleton className="h-24 w-full bg-muted/50" />
            </div>
          ) : displayData.length === 0 ? (
            <div
              className="flex items-center justify-center h-64 text-muted-foreground"
              data-ocid="chart.error_state"
            >
              Nessun dato disponibile per questo asset
            </div>
          ) : (
            <div className="space-y-4">
              {/* EliZ Indicator bar */}
              {sig && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* S/R Level */}
                  <div className="bg-card border border-border rounded p-2">
                    <div className="text-[10px] text-muted-foreground mb-0.5">
                      Livello S/R
                    </div>
                    <div className="text-xs font-mono font-medium text-signal-orange">
                      {srLevel !== null ? formatPrice(srLevel) : "—"}
                    </div>
                  </div>

                  {/* Liquidity Grab */}
                  <div className="bg-card border border-border rounded p-2">
                    <div className="text-[10px] text-muted-foreground mb-0.5">
                      Grab Liquidità
                    </div>
                    <div
                      className={`text-xs font-mono font-medium ${
                        grabDetected
                          ? "text-signal-green"
                          : "text-muted-foreground"
                      }`}
                    >
                      {grabDetected ? "✓ Rilevato" : "— Non rilevato"}
                    </div>
                  </div>

                  {/* Retest */}
                  <div className="bg-card border border-border rounded p-2">
                    <div className="text-[10px] text-muted-foreground mb-0.5">
                      Retest
                    </div>
                    <div
                      className={`text-xs font-mono font-medium ${
                        retestConfirmed
                          ? "text-signal-green"
                          : "text-muted-foreground"
                      }`}
                    >
                      {retestConfirmed ? "✓ Confermato" : "— In attesa"}
                    </div>
                  </div>

                  {/* OBV */}
                  <div className="bg-card border border-border rounded p-2">
                    <div className="text-[10px] text-muted-foreground mb-0.5">
                      OBV Volume
                    </div>
                    <div
                      className={`text-xs font-mono font-medium ${
                        obvRising ? "text-signal-green" : "text-signal-red"
                      }`}
                    >
                      {obvRising ? "↑ Rialzista" : "↓ Ribassista"}
                    </div>
                  </div>
                </div>
              )}

              {/* Price Chart with S/R Reference Lines */}
              <div>
                <p className="text-xs text-muted-foreground font-mono mb-2">
                  CANDELE OHLCV 4H + LIVELLI S/R
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart
                    data={displayData}
                    margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.22 0.012 250)"
                    />
                    <XAxis
                      dataKey="time"
                      tickFormatter={(v) => formatAxisDate(v)}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={60}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tickFormatter={(v) => formatPrice(v)}
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={70}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    {/* Candle body */}
                    <Bar dataKey="candleSize" shape={<CustomCandleBar />} />
                    {/* S/R Level reference lines */}
                    {sig?.ema9 ? (
                      <ReferenceLine
                        y={sig.ema9}
                        stroke="oklch(0.75 0.15 60)"
                        strokeDasharray="5 3"
                        strokeWidth={1.5}
                        label={{
                          value: "S/R",
                          fontSize: 10,
                          fill: "oklch(0.75 0.15 60)",
                          position: "right",
                        }}
                      />
                    ) : null}
                    {sig?.ema21 && sig.ema21 !== sig.ema9 ? (
                      <ReferenceLine
                        y={sig.ema21}
                        stroke="oklch(0.75 0.15 60 / 0.6)"
                        strokeDasharray="3 4"
                        strokeWidth={1}
                        label={{
                          value: "S/R2",
                          fontSize: 9,
                          fill: "oklch(0.75 0.15 60 / 0.7)",
                          position: "right",
                        }}
                      />
                    ) : null}
                    {/* Signal levels */}
                    {sig?.hasSignal ? (
                      <>
                        <ReferenceLine
                          y={sig.entry}
                          stroke="oklch(0.82 0.19 155)"
                          strokeDasharray="4 4"
                          strokeWidth={1}
                          label={{
                            value: "Entry",
                            fontSize: 10,
                            fill: "oklch(0.82 0.19 155)",
                          }}
                        />
                        <ReferenceLine
                          y={sig.tp1}
                          stroke="oklch(0.65 0.15 155)"
                          strokeDasharray="4 4"
                          strokeWidth={1}
                          label={{
                            value: "TP1",
                            fontSize: 10,
                            fill: "oklch(0.65 0.15 155)",
                          }}
                        />
                        <ReferenceLine
                          y={sig.stopLoss}
                          stroke="oklch(0.62 0.22 25)"
                          strokeDasharray="4 4"
                          strokeWidth={1}
                          label={{
                            value: "SL",
                            fontSize: 10,
                            fill: "oklch(0.62 0.22 25)",
                          }}
                        />
                      </>
                    ) : null}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Volume */}
              <div>
                <p className="text-xs text-muted-foreground font-mono mb-2">
                  VOLUME
                </p>
                <ResponsiveContainer width="100%" height={80}>
                  <ComposedChart
                    data={displayData}
                    margin={{ top: 2, right: 5, bottom: 2, left: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.22 0.012 250)"
                      vertical={false}
                    />
                    <XAxis dataKey="time" hide />
                    <YAxis
                      tick={{ fontSize: 9 }}
                      tickLine={false}
                      axisLine={false}
                      width={50}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                    />
                    <Bar dataKey="volume" fill="oklch(0.82 0.19 155 / 0.3)" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* OBV Proxy (0-100 display) */}
              {sig ? (
                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-2">
                    OBV PROXY (0–100)
                  </p>
                  <ResponsiveContainer width="100%" height={80}>
                    <ComposedChart
                      data={displayData}
                      margin={{ top: 2, right: 5, bottom: 2, left: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(0.22 0.012 250)"
                        vertical={false}
                      />
                      <XAxis dataKey="time" hide />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                        width={30}
                      />
                      <ReferenceLine
                        y={35}
                        stroke="oklch(0.82 0.19 155 / 0.5)"
                        strokeDasharray="3 3"
                      />
                      <ReferenceLine
                        y={65}
                        stroke="oklch(0.62 0.22 25 / 0.5)"
                        strokeDasharray="3 3"
                      />
                      <Line
                        type="monotone"
                        dataKey="rsi"
                        stroke="oklch(0.78 0.16 80)"
                        strokeWidth={1.5}
                        dot={false}
                        name="OBV"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : null}

              {/* OBV Momentum (replaces MACD) */}
              {sig ? (
                <div>
                  <p className="text-xs text-muted-foreground font-mono mb-2">
                    OBV (VOLUME TREND)
                  </p>
                  <ResponsiveContainer width="100%" height={80}>
                    <ComposedChart
                      data={displayData}
                      margin={{ top: 2, right: 5, bottom: 2, left: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(0.22 0.012 250)"
                        vertical={false}
                      />
                      <XAxis dataKey="time" hide />
                      <YAxis
                        tick={{ fontSize: 9 }}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <ReferenceLine y={0} stroke="oklch(0.55 0.01 220)" />
                      <Bar
                        dataKey="obvMomentum"
                        fill="oklch(0.82 0.19 155 / 0.5)"
                        name="OBV Momentum"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : null}

              <p className="text-[10px] text-muted-foreground/50 text-center font-mono">
                Timeframe 4H • Ultimi 90 giorni • Logica EliZ: S/R + Liquidity
                Grab + Retest + OBV • I dati storici non garantiscono
                performance future
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
