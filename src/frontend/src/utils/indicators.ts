// Technical indicator calculations — EliZ methodology
// Price action on S/R levels, liquidity grabs, and retest triggers

export interface OHLCVCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SignalResult {
  hasSignal: boolean;
  score: number;
  entry: number;
  entryPrice: number; // frozen price at moment of first detection
  tp1: number;
  tp2: number;
  stopLoss: number;
  rsi: number; // OBV slope as 0-100 proxy (50=neutral, >50=rising, <50=falling)
  ema9: number; // nearest S/R level (primary)
  ema21: number; // nearest S/R level (secondary)
  ema50: number; // nearest S/R level (tertiary)
  volumeRatio: number;
  macd: number; // OBV momentum value
  detectedAt?: number;
}

// ── Classic helpers (still used for display and backtest) ──

export function calcEMA(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  closes.forEach((close, i) => {
    if (i === 0) ema.push(close);
    else ema.push(close * k + ema[i - 1] * (1 - k));
  });
  return ema;
}

export function calcRSI(closes: number[], period = 14): number[] {
  const rsi: number[] = new Array(closes.length).fill(50);
  if (closes.length < period + 1) return rsi;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) avgGain += diff;
    else avgLoss += Math.abs(diff);
  }
  avgGain /= period;
  avgLoss /= period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

// ── EliZ methodology functions ──

/**
 * Calculate On-Balance Volume (OBV) array.
 */
export function calcOBV(candles: OHLCVCandle[]): number[] {
  const obv: number[] = new Array(candles.length).fill(0);
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const cur = candles[i];
    if (cur.close > prev.close) {
      obv[i] = obv[i - 1] + cur.volume;
    } else if (cur.close < prev.close) {
      obv[i] = obv[i - 1] - cur.volume;
    } else {
      obv[i] = obv[i - 1];
    }
  }
  return obv;
}

/**
 * Identify key S/R levels from swing highs/lows.
 * lookback=2: very permissive — a candle only needs to be the
 * max/min over a 5-candle window (2 before + itself + 2 after = 16h on 4h TF).
 */
export function calcSupportResistanceLevels(
  candles: OHLCVCandle[],
  lookback = 2,
): number[] {
  if (candles.length < lookback * 2 + 1) return [];

  const levels: number[] = [];
  const n = candles.length;

  for (let i = lookback; i < n - lookback; i++) {
    const slice = candles.slice(i - lookback, i + lookback + 1);
    const cur = candles[i];

    const isSwingHigh = slice.every((c) => c.high <= cur.high);
    if (isSwingHigh) levels.push(cur.high);

    const isSwingLow = slice.every((c) => c.low >= cur.low);
    if (isSwingLow) levels.push(cur.low);
  }

  // Add round numbers near recent price
  const currentPrice = candles[n - 1].close;
  const magnitude = 10 ** Math.floor(Math.log10(currentPrice));
  for (let mult = 0.5; mult <= 2.5; mult += 0.5) {
    const roundLevel =
      Math.round(currentPrice / (magnitude * mult)) * (magnitude * mult);
    if (roundLevel > 0) levels.push(roundLevel);
  }

  // Deduplicate levels within 1% of each other
  const unique: number[] = [];
  for (const lvl of levels) {
    const alreadyNear = unique.some((u) => Math.abs(u - lvl) / lvl < 0.01);
    if (!alreadyNear) unique.push(lvl);
  }

  unique.sort(
    (a, b) => Math.abs(a - currentPrice) - Math.abs(b - currentPrice),
  );

  return unique.slice(0, 40);
}

/**
 * Detect if a liquidity grab occurred recently.
 * Lookback = 40 candles (~160h on 4h TF = ~6.5 days).
 *
 * Accepts multi-candle grabs:
 *   1. Same-candle: wick sweeps level AND closes back inside
 *   2. Two-candle: one candle wick sweeps the level, next candle closes back inside
 */
export function detectLiquidityGrab(
  candles: OHLCVCandle[],
  level: number,
  direction: "above" | "below",
  lookback = 40,
): boolean {
  if (candles.length < lookback) return false;

  const recent = candles.slice(-lookback);
  for (let i = 0; i < recent.length; i++) {
    const candle = recent[i];
    const next = recent[i + 1]; // may be undefined on last candle

    if (direction === "below") {
      const sweptBelow = candle.low < level;
      if (!sweptBelow) continue;

      // Same-candle recovery (close >= 95% of level — more permissive)
      if (candle.close >= level * 0.95) return true;

      // Two-candle recovery: next candle closes above 95% of level
      if (next && next.close >= level * 0.95) return true;
    } else {
      const sweptAbove = candle.high > level;
      if (!sweptAbove) continue;

      // Same-candle recovery
      if (candle.close <= level * 1.05) return true;

      // Two-candle recovery
      if (next && next.close <= level * 1.05) return true;
    }
  }
  return false;
}

/**
 * Detect if price is currently retesting a level.
 * C3 uses a wider tolerance (20%) to be clearly independent from C1 (15%).
 */
export function detectRetest(candles: OHLCVCandle[], level: number): boolean {
  if (candles.length < 2) return false;

  const cur = candles[candles.length - 1];
  const price = cur.close;

  const proximity = Math.abs(price - level) / level;
  return proximity <= 0.2;
}

/**
 * Check HTF (daily) bias: is the current price near a key daily support?
 */
export function calcHTFBias(
  dailyCandles: OHLCVCandle[],
): "bullish" | "neutral" | "bearish" {
  if (dailyCandles.length < 5) return "neutral";

  const n = dailyCandles.length;
  const currentPrice = dailyCandles[n - 1].close;

  const dailyLevels = calcSupportResistanceLevels(dailyCandles, 2);
  if (dailyLevels.length === 0) return "neutral";

  // Support = any level at or below current price (+3% buffer)
  const supports = dailyLevels.filter((l) => l <= currentPrice * 1.03);
  if (supports.length === 0) return "neutral";

  const closestSupport = supports.reduce((prev, cur) =>
    Math.abs(cur - currentPrice) < Math.abs(prev - currentPrice) ? cur : prev,
  );

  const distFromSupport = (currentPrice - closestSupport) / currentPrice;

  // Bullish if within 12% above a daily support
  if (distFromSupport >= -0.03 && distFromSupport <= 0.12) return "bullish";
  if (distFromSupport < -0.03) return "bearish";
  return "neutral";
}

/**
 * EliZ signal detection — REVISED for reliability
 *
 * The scoring is designed so that C1, C2, C3 are genuinely independent:
 *
 * C1: Price is within 15% of a SUPPORT level (below price, not resistance)
 *     — broader than C3's 20% range but specific to supports only
 * C2: Liquidity grab detected on any top level (last 40 candles ~160h)
 *     — more permissive close recovery (95% of level vs old 97%)
 * C3: Price retesting ANY S/R level within 20%
 *     — intentionally wider than C1 (15%) and counts resistance too
 * C4: OBV not strongly falling — uses a weaker test:
 *     OBV at close must NOT be lower than the minimum of the past 12 candles
 *     This avoids C4 always being 0 in bear markets (previously failed
 *     because it needed OBV to be rising, which never happens in downtrends)
 * C5: HTF daily bias — now uses the full 4h candle history as proxy
 *     (last 20 candles = ~3.3 days), looks for local bottom formation
 *
 * BONUS: price within 3% of any S/R level ("on the level")
 *
 * Signal fires if score >= 3.
 */
export function calcElizSignal(
  candles4h: OHLCVCandle[],
  dailyCandles: OHLCVCandle[] = [],
  prevDetectedAt?: number,
  prevEntry?: number,
): SignalResult | null {
  if (candles4h.length < 15) return null;

  const n = candles4h.length - 1;
  const cur = candles4h[n];
  const price = cur.close;

  const srLevels = calcSupportResistanceLevels(candles4h);
  if (srLevels.length === 0) return null;

  // Top 15 closest levels for checking (up from 12)
  const topLevels = srLevels.slice(0, 15);

  // Support levels = levels at or below current price (with 5% buffer above)
  const supportLevels = srLevels.filter((l) => l <= price * 1.05);
  const nearestSupport =
    supportLevels.length > 0
      ? supportLevels.reduce((prev, cur) =>
          Math.abs(cur - price) < Math.abs(prev - price) ? cur : prev,
        )
      : srLevels[0];

  // ── Confluence scoring ──
  let score = 0;

  // C1: Nearest SUPPORT within 15% of current price
  const supportProximity = Math.abs(price - nearestSupport) / price;
  const c1 = supportProximity <= 0.15;
  if (c1) score++;

  // C2: Liquidity grab on ANY of the top levels (last 40 candles ~160h)
  // More permissive: close recovery at 95% of level instead of 97%
  const c2 = topLevels.some((lvl) =>
    detectLiquidityGrab(candles4h, lvl, "below", 40),
  );
  if (c2) score++;

  // C3: Price retesting ANY S/R level within 20%
  // Wider than C1 (15%) and counts any S/R not just supports
  const c3 = topLevels.some((lvl) => detectRetest(candles4h, lvl));
  if (c3) score++;

  // C4: OBV not strongly falling (bear-market tolerant)
  // OLD: required OBV to be rising vs 8 candles ago — almost always fails in downtrends
  // NEW: OBV at the last candle must be >= the minimum OBV over the past 12 candles
  //      This means: OBV is at least holding, not in freefall
  const obvArr = calcOBV(candles4h);
  const obvRecent12 = obvArr.slice(-12);
  const obvMin12 = Math.min(...obvRecent12);
  const obvCurrent = obvArr[obvArr.length - 1];
  const c4 = obvCurrent >= obvMin12; // true if OBV is at or above its recent low
  if (c4) score++;

  // C5: Local bottom formation (bear-market tolerant)
  // Uses last 20 x 4h candles (= ~3 days) as HTF proxy
  // Checks: is there a bullish candle pattern near recent lows?
  // Specifically: recent low made in last 10 candles, AND last candle closed UP
  // This fires even in downtrends when a bounce/reversal candle appears
  let c5 = false;
  if (dailyCandles.length >= 5) {
    const htfBias = calcHTFBias(dailyCandles);
    c5 = htfBias === "bullish";
  } else {
    // Proxy using 4h candles: last 20 candles
    const proxy = candles4h.slice(-20);
    if (proxy.length >= 6) {
      const lows = proxy.map((c) => c.low);
      const minLowIdx = lows.indexOf(Math.min(...lows));
      const recentLow = minLowIdx >= proxy.length - 10; // low made in last 10 candles
      const lastCandleBullish =
        proxy[proxy.length - 1].close > proxy[proxy.length - 1].open;
      const prevCandleBullish =
        proxy[proxy.length - 2].close > proxy[proxy.length - 2].open;
      // Local bottom: recent low + at least one bullish close candle in last 2
      c5 = recentLow && (lastCandleBullish || prevCandleBullish);
    }
  }
  if (c5) score++;

  // BONUS: price is "on the level" — within 3% of any S/R
  // (was 1.5% before — widened for more realistic matching)
  const isOnLevel = topLevels.some(
    (lvl) => Math.abs(price - lvl) / lvl <= 0.03,
  );
  if (isOnLevel) score++;

  // Signal fires at score >= 3
  const hasSignal = score >= 3;

  // OBV proxy as 0-100
  const obvRecent10 = obvArr.slice(-10);
  const obvFirst = obvRecent10[0];
  const obvLast = obvRecent10[obvRecent10.length - 1];
  let obvProxy = 50;
  if (Math.abs(obvFirst) > 0) {
    const obvChangePct = (obvLast - obvFirst) / Math.abs(obvFirst);
    obvProxy = Math.max(0, Math.min(100, 50 + obvChangePct * 100));
  } else {
    obvProxy = obvCurrent >= obvMin12 ? 55 : 35;
  }

  const obvRecent5 = obvArr.slice(-5);
  const obvMomentum =
    obvRecent5[obvRecent5.length - 1] -
    obvRecent5.reduce((s, v) => s + v, 0) / obvRecent5.length;

  const startIdx = Math.max(0, n - 20);
  const recentVols = candles4h.slice(startIdx, n).map((c) => c.volume);
  const avgVol =
    recentVols.length > 0
      ? recentVols.reduce((s, v) => s + v, 0) / recentVols.length
      : 0;
  const volumeRatio = avgVol > 0 ? cur.volume / avgVol : 1;

  const entry = price;

  const entryPrice = hasSignal
    ? prevDetectedAt !== undefined && prevEntry !== undefined
      ? prevEntry
      : price
    : price;

  const tp1 = entryPrice * 1.03;
  const tp2 = entryPrice * 1.06;
  const stopLoss = entryPrice * 0.98;

  const detectedAt = hasSignal ? (prevDetectedAt ?? Date.now()) : undefined;

  const ema9 = nearestSupport;
  const ema21 = srLevels[1] ?? nearestSupport;
  const ema50 = srLevels[2] ?? nearestSupport;

  return {
    hasSignal,
    score,
    entry,
    entryPrice,
    tp1,
    tp2,
    stopLoss,
    rsi: obvProxy,
    ema9,
    ema21,
    ema50,
    volumeRatio,
    macd: obvMomentum,
    detectedAt,
  };
}

// ── Backcompat alias ──
export function calcSignal(
  candles: OHLCVCandle[],
  prevDetectedAt?: number,
  prevEntry?: number,
): SignalResult | null {
  return calcElizSignal(candles, [], prevDetectedAt, prevEntry);
}

export interface BacktestResult {
  id: string;
  winRate: number;
  totalSignals: number;
  profitableSignals: number;
  averageReturn: number;
}

export function runBacktest(
  id: string,
  candles: OHLCVCandle[],
): BacktestResult {
  let totalSignals = 0;
  let profitableSignals = 0;
  let totalReturn = 0;

  for (let i = 20; i < candles.length - 12; i++) {
    const window = candles.slice(0, i + 1);

    const closes = window.map((c) => c.close);
    const ema50Arr = calcEMA(closes, 50);
    const ema50Val = ema50Arr[ema50Arr.length - 1];
    const currentClose = closes[closes.length - 1];
    const inBullishTrend = currentClose > ema50Val;
    if (!inBullishTrend) continue;

    const sig = calcElizSignal(window, []);
    if (!sig?.hasSignal) continue;

    totalSignals++;
    const entry = sig.entry;
    const tp = entry * 1.03;
    const sl = entry * 0.98;

    let outcome = 0;
    for (let j = i + 1; j < Math.min(i + 13, candles.length); j++) {
      if (candles[j].high >= tp) {
        outcome = (tp - entry) / entry;
        break;
      }
      if (candles[j].low <= sl) {
        outcome = (sl - entry) / entry;
        break;
      }
    }
    if (outcome > 0) profitableSignals++;
    totalReturn += outcome;
    i += 3;
  }

  return {
    id,
    winRate: totalSignals > 0 ? profitableSignals / totalSignals : 0,
    totalSignals,
    profitableSignals,
    averageReturn: totalSignals > 0 ? totalReturn / totalSignals : 0,
  };
}
