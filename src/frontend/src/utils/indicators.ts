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

// ── Classic helpers (still used for backtest) ──

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
 * Validate and clean OHLCV candles.
 * Filters out candles with zero/invalid close or volume.
 */
export function cleanCandles(candles: OHLCVCandle[]): OHLCVCandle[] {
  return candles.filter(
    (c) =>
      c.close > 0 &&
      c.open > 0 &&
      c.high > 0 &&
      c.low > 0 &&
      c.high >= c.low &&
      c.high >= c.close &&
      c.low <= c.close,
  );
}

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
 * Identify key S/R levels from swing highs/lows + period extremes.
 *
 * lookback=1: a candle only needs to be local max/min in a 3-candle window.
 * Also adds:
 *   - the highest high and lowest low of the last 10, 20, 42 candles
 *     (approx 2d, 4d, 1w of 4h data) — these are EliZ-style "key levels"
 *   - round numbers near the current price
 */
export function calcSupportResistanceLevels(
  candles: OHLCVCandle[],
  lookback = 1,
): number[] {
  if (candles.length < lookback * 2 + 1) return [];

  const levels: number[] = [];
  const n = candles.length;

  // ── Swing highs/lows (local extremes) ──
  for (let i = lookback; i < n - lookback; i++) {
    const slice = candles.slice(i - lookback, i + lookback + 1);
    const cur = candles[i];

    const isSwingHigh = slice.every((c) => c.high <= cur.high);
    if (isSwingHigh) levels.push(cur.high);

    const isSwingLow = slice.every((c) => c.low >= cur.low);
    if (isSwingLow) levels.push(cur.low);
  }

  // ── Period extremes: highest high / lowest low over key windows ──
  // These represent obvious structural levels EliZ would draw manually.
  const windows = [10, 20, 42, 90];
  for (const w of windows) {
    if (candles.length >= w) {
      const slice = candles.slice(-w);
      const periodHigh = Math.max(...slice.map((c) => c.high));
      const periodLow = Math.min(...slice.map((c) => c.low));
      levels.push(periodHigh);
      levels.push(periodLow);
    }
  }

  // ── Round numbers near recent price ──
  const currentPrice = candles[n - 1].close;
  const magnitude = 10 ** Math.floor(Math.log10(currentPrice));
  for (let mult = 0.5; mult <= 2.5; mult += 0.5) {
    const roundLevel =
      Math.round(currentPrice / (magnitude * mult)) * (magnitude * mult);
    if (roundLevel > 0) levels.push(roundLevel);
  }

  // ── Deduplicate levels within 1% of each other ──
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
 * Accepts multi-candle grabs (same-candle or next-candle recovery).
 */
export function detectLiquidityGrab(
  candles: OHLCVCandle[],
  level: number,
  direction: "above" | "below",
  lookback = 40,
): boolean {
  if (candles.length < 2) return false;

  const recent = candles.slice(-Math.min(lookback, candles.length));
  for (let i = 0; i < recent.length; i++) {
    const candle = recent[i];
    const next = recent[i + 1];

    if (direction === "below") {
      // Wick swept below level
      if (candle.low < level) {
        // Same-candle recovery: close >= 95% of level
        if (candle.close >= level * 0.95) return true;
        // Two-candle recovery: next candle closes above 95% of level
        if (next && next.close >= level * 0.95) return true;
      }
    } else {
      // Wick swept above level
      if (candle.high > level) {
        if (candle.close <= level * 1.05) return true;
        if (next && next.close <= level * 1.05) return true;
      }
    }
  }
  return false;
}

/**
 * Check HTF (daily) bias.
 */
export function calcHTFBias(
  dailyCandles: OHLCVCandle[],
): "bullish" | "neutral" | "bearish" {
  if (dailyCandles.length < 5) return "neutral";

  const n = dailyCandles.length;
  const currentPrice = dailyCandles[n - 1].close;

  const dailyLevels = calcSupportResistanceLevels(dailyCandles, 2);
  if (dailyLevels.length === 0) return "neutral";

  const supports = dailyLevels.filter((l) => l <= currentPrice * 1.03);
  if (supports.length === 0) return "neutral";

  const closestSupport = supports.reduce((prev, cur) =>
    Math.abs(cur - currentPrice) < Math.abs(prev - currentPrice) ? cur : prev,
  );

  const distFromSupport = (currentPrice - closestSupport) / currentPrice;

  if (distFromSupport >= -0.03 && distFromSupport <= 0.12) return "bullish";
  if (distFromSupport < -0.03) return "bearish";
  return "neutral";
}

/**
 * EliZ signal detection — 5 independent confluences.
 *
 * INPUT: candles are cleaned (no zero-close) before scoring.
 *
 * C1: Price within 10% of any S/R level
 *     — broad enough to fire for most coins near a level
 *
 * C2: OBV slope positive — avg(last 5 OBV values) > avg(prev 5 OBV values)
 *     — measures DIRECTION of volume momentum. ~50% in any market.
 *     — only calculated on candles with valid (non-zero) volume
 *
 * C3: Liquidity grab detected in last 40 candles on any nearby S/R level
 *     — fires when price swept a level and closed back above/below it
 *
 * C4: Price closed above the OPEN of the last candle (bullish close)
 *     OR last candle has a lower wick >= 50% of candle range (rejection wick)
 *     — genuinely independent from C1/C5. ~40-50% in bear markets.
 *
 * C5: At least one of the last 5 candles bounced from an S/R level
 *     (low touched within 3% of level AND closed above it)
 *     — decoupled from C1 by using a stricter touch definition
 *
 * BONUS: Price within 1.5% of any S/R level ("on the level")
 *
 * Signal fires at score >= 3.
 */
export function calcElizSignal(
  candles4hRaw: OHLCVCandle[],
  dailyCandles: OHLCVCandle[] = [],
  prevDetectedAt?: number,
  prevEntry?: number,
): SignalResult | null {
  // ── Clean candles: remove zero/invalid entries ──
  const candles4h = cleanCandles(candles4hRaw);

  if (candles4h.length < 15) return null;

  const price = candles4h[candles4h.length - 1].close;
  const curCandle = candles4h[candles4h.length - 1];
  const prevCandle = candles4h[candles4h.length - 2];

  const srLevels = calcSupportResistanceLevels(candles4h);
  if (srLevels.length === 0) return null;

  // Top 20 closest S/R levels for analysis
  const topLevels = srLevels.slice(0, 20);

  // Nearest support level (at or below price)
  const supportLevels = srLevels.filter((l) => l <= price * 1.05);
  const nearestSupport =
    supportLevels.length > 0
      ? supportLevels.reduce((a, b) =>
          Math.abs(b - price) < Math.abs(a - price) ? b : a,
        )
      : srLevels[0];

  let score = 0;

  // ── C1: Price within 10% of any S/R level ──
  const c1 = topLevels.some((lvl) => Math.abs(price - lvl) / price <= 0.1);
  if (c1) score++;

  // ── C2: OBV momentum — avg of last 5 vs avg of 5 before that ──
  // Only use candles where volume > 0 to avoid flat OBV from bad data
  const candlesWithVolume = candles4h.filter((c) => c.volume > 0);
  const obvArr = calcOBV(candlesWithVolume);
  let c2 = false;
  if (obvArr.length >= 10) {
    const last5 = obvArr.slice(-5);
    const prev5 = obvArr.slice(-10, -5);
    const avgLast5 = last5.reduce((s, v) => s + v, 0) / 5;
    const avgPrev5 = prev5.reduce((s, v) => s + v, 0) / 5;
    c2 = avgLast5 > avgPrev5;
  } else if (obvArr.length >= 4) {
    // Not enough candles for 10-window — use what we have
    const half = Math.floor(obvArr.length / 2);
    const recent = obvArr.slice(-half);
    const older = obvArr.slice(-half * 2, -half);
    const avgRecent = recent.reduce((s, v) => s + v, 0) / recent.length;
    const avgOlder = older.reduce((s, v) => s + v, 0) / older.length;
    c2 = avgRecent > avgOlder;
  }
  if (c2) score++;

  // ── C3: Liquidity grab on any nearby S/R level (last 40 candles) ──
  const c3 = topLevels.some((lvl) =>
    detectLiquidityGrab(candles4h, lvl, "below", 40),
  );
  if (c3) score++;

  // ── C4: Bullish close OR significant lower wick ──
  // Bullish close: last candle closed above its open
  const bullishClose = curCandle.close > curCandle.open;
  // Significant lower wick: lower wick >= 40% of total candle range
  // This catches hammer/pin-bar patterns even if close < open
  const candleRange = curCandle.high - curCandle.low;
  const lowerWick = Math.min(curCandle.open, curCandle.close) - curCandle.low;
  const hasRejectionWick = candleRange > 0 && lowerWick / candleRange >= 0.4;
  // Also check if prev candle was bullish (momentum from previous bar)
  const prevBullish = prevCandle ? prevCandle.close > prevCandle.open : false;
  const c4 = bullishClose || hasRejectionWick || prevBullish;
  if (c4) score++;

  // ── C5: Bounce from S/R in the last 5 candles ──
  // Stricter definition: low must be within 3% of a level AND close >= level * 0.99
  // Uses candles[-5:-1] (not including current candle) to avoid self-referencing
  const recent5 = candles4h.slice(-6, -1); // last 5 completed candles
  const c5 = recent5.some((candle) =>
    topLevels.some((lvl) => {
      const touchedLevel = candle.low <= lvl * 1.03 && candle.low >= lvl * 0.97;
      const closedAbove = candle.close >= lvl * 0.99;
      return touchedLevel && closedAbove;
    }),
  );
  if (c5) score++;

  // ── BONUS: price "on the level" within 1.5% ──
  const isOnLevel = topLevels.some(
    (lvl) => Math.abs(price - lvl) / price <= 0.015,
  );
  if (isOnLevel) score++;

  // ── HTF daily bias as bonus ──
  if (dailyCandles.length >= 5) {
    const htfBias = calcHTFBias(dailyCandles);
    if (htfBias === "bullish") score++;
  }

  const hasSignal = score >= 3;

  // ── Diagnostic log (temporary) ──
  if (hasSignal || score === 2) {
    console.log(
      `[EliZ] ${candles4h[0]?.timestamp ? "coin" : "unknown"} score=${score}/5+bonus | ` +
        `C1=${c1} C2=${c2} C3=${c3} C4=${c4} C5=${c5} bonus=${isOnLevel} ` +
        `price=${price.toFixed(4)} candles=${candles4h.length}`,
    );
  }

  // OBV display proxy (0-100)
  const obvLast = obvArr[obvArr.length - 1];
  const obvFirst = obvArr[Math.max(0, obvArr.length - 10)];
  let obvProxy = 50;
  if (Math.abs(obvFirst) > 0) {
    const pct = (obvLast - obvFirst) / Math.abs(obvFirst);
    obvProxy = Math.max(0, Math.min(100, 50 + pct * 100));
  } else {
    obvProxy = c2 ? 60 : 40;
  }

  const obvRecent5 = obvArr.slice(-5);
  const obvMomentum =
    obvRecent5[obvRecent5.length - 1] -
    obvRecent5.reduce((s, v) => s + v, 0) / obvRecent5.length;

  const startIdx = Math.max(0, candles4h.length - 21);
  const recentVols = candles4h.slice(startIdx, -1).map((c) => c.volume);
  const avgVol =
    recentVols.length > 0
      ? recentVols.reduce((s, v) => s + v, 0) / recentVols.length
      : 1;
  const volumeRatio = avgVol > 0 ? curCandle.volume / avgVol : 1;

  const entryPrice = hasSignal
    ? prevDetectedAt !== undefined && prevEntry !== undefined
      ? prevEntry
      : price
    : price;

  const tp1 = entryPrice * 1.03;
  const tp2 = entryPrice * 1.06;
  const stopLoss = entryPrice * 0.98;

  const detectedAt = hasSignal ? (prevDetectedAt ?? Date.now()) : undefined;

  return {
    hasSignal,
    score,
    entry: price,
    entryPrice,
    tp1,
    tp2,
    stopLoss,
    rsi: obvProxy,
    ema9: nearestSupport,
    ema21: srLevels[1] ?? nearestSupport,
    ema50: srLevels[2] ?? nearestSupport,
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

  // Clean candles before backtesting
  const cleanedCandles = cleanCandles(candles);

  for (let i = 20; i < cleanedCandles.length - 12; i++) {
    const window = cleanedCandles.slice(0, i + 1);

    const closes = window.map((c) => c.close);
    const ema50Arr = calcEMA(closes, Math.min(50, closes.length));
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
    for (let j = i + 1; j < Math.min(i + 13, cleanedCandles.length); j++) {
      if (cleanedCandles[j].high >= tp) {
        outcome = (tp - entry) / entry;
        break;
      }
      if (cleanedCandles[j].low <= sl) {
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
