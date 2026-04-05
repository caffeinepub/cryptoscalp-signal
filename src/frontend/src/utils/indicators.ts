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
 * lookback=3 means a candle only needs to be the max/min over a 7-candle window
 * (3 before + itself + 3 after = 28h on 4h TF), which is more permissive and
 * closer to how EliZ manually draws levels.
 */
export function calcSupportResistanceLevels(
  candles: OHLCVCandle[],
  lookback = 3, // reduced from 5 → 3: more levels detected
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

  // Deduplicate levels within 0.5% of each other
  const unique: number[] = [];
  for (const lvl of levels) {
    const alreadyNear = unique.some((u) => Math.abs(u - lvl) / lvl < 0.005);
    if (!alreadyNear) unique.push(lvl);
  }

  unique.sort(
    (a, b) => Math.abs(a - currentPrice) - Math.abs(b - currentPrice),
  );

  return unique.slice(0, 30); // increased from 20 to 30
}

/**
 * Detect if a liquidity grab occurred recently.
 * Lookback = 10 candles (~40h on 4h TF).
 * Tolerances loosened: wick only needs to go 0.1% beyond level (was 0.1%),
 * and close just needs to be back inside within 1% (was 0.2%).
 */
export function detectLiquidityGrab(
  candles: OHLCVCandle[],
  level: number,
  direction: "above" | "below",
  lookback = 10,
): boolean {
  if (candles.length < lookback) return false;

  const recent = candles.slice(-lookback);
  for (const candle of recent) {
    if (direction === "below") {
      // Wick swept below level (at least 0.1% below)
      const sweptBelow = candle.low < level * 0.999;
      // Close recovered back above (within 1% above level is ok)
      const closedAbove = candle.close > level * 0.99;
      if (sweptBelow && closedAbove) return true;
    } else {
      const sweptAbove = candle.high > level * 1.001;
      const closedBelow = candle.close < level * 1.01;
      if (sweptAbove && closedBelow) return true;
    }
  }
  return false;
}

/**
 * Detect if price is currently retesting the grabbed level.
 * C3 is now independent from C1: proximity is checked against ALL S/R levels,
 * not just the "nearest" one, and the threshold is 3% (was 2.5%).
 * Also removed the bullish-candle requirement — price just needs to be near
 * the level, since EliZ enters on the candle close at the level, bullish or not.
 */
export function detectRetest(candles: OHLCVCandle[], level: number): boolean {
  if (candles.length < 2) return false;

  const cur = candles[candles.length - 1];
  const price = cur.close;

  // Price within 3% of level (widened from 2.5%)
  const proximity = Math.abs(price - level) / level;
  if (proximity > 0.03) return false;

  // Price should be at or above the level (support holding)
  // Allow slightly below (0.5%) to account for wicks and spreads
  return cur.close >= level * 0.995;
}

/**
 * Check HTF (daily) bias: is the current price near a key daily support?
 * Uses lookback=3 to match the more permissive S/R detection above.
 */
export function calcHTFBias(
  dailyCandles: OHLCVCandle[],
): "bullish" | "neutral" | "bearish" {
  if (dailyCandles.length < 5) return "neutral";

  const n = dailyCandles.length;
  const currentPrice = dailyCandles[n - 1].close;

  const dailyLevels = calcSupportResistanceLevels(dailyCandles, 3);
  if (dailyLevels.length === 0) return "neutral";

  const supports = dailyLevels.filter((l) => l <= currentPrice * 1.01); // slightly above to catch breakouts sitting on level
  if (supports.length === 0) return "neutral";

  const closestSupport = supports.reduce((prev, cur) =>
    Math.abs(cur - currentPrice) < Math.abs(prev - currentPrice) ? cur : prev,
  );

  const distFromSupport = (currentPrice - closestSupport) / currentPrice;

  // Widened from 3% to 5% to give more LONG setups
  if (distFromSupport >= -0.01 && distFromSupport <= 0.05) return "bullish";
  if (distFromSupport < -0.01) return "bearish";
  return "neutral";
}

/**
 * EliZ signal detection.
 * Scores 5 confluences:
 * C1: Significant S/R level within 4% of current price (widened from 3%)
 * C2: Liquidity grab detected (last 10 candles ~40h), loosened tolerances
 * C3: Price retesting ANY S/R level within 3% (independent from C1)
 * C4: OBV rising (last 5 candles)
 * C5: HTF daily bias bullish (background filter only, not shown in UI)
 *
 * Signal fires if score >= 3.
 * C1 and C3 are now evaluated against the same level to avoid double-counting
 * but C3 tolerance is wider so it can fire even when C1 doesn't.
 */
export function calcElizSignal(
  candles4h: OHLCVCandle[],
  dailyCandles: OHLCVCandle[],
  prevDetectedAt?: number,
  prevEntry?: number,
): SignalResult | null {
  if (candles4h.length < 15) return null; // reduced from 20

  const n = candles4h.length - 1;
  const cur = candles4h[n];
  const price = cur.close;

  const srLevels = calcSupportResistanceLevels(candles4h);

  // Find the closest support level at or near current price
  // Include levels slightly above price (up to 2%) to catch coins sitting just below resistance-turned-support
  const supportLevels = srLevels.filter((l) => l <= price * 1.02);
  const nearestLevel =
    supportLevels.length > 0
      ? supportLevels.reduce((prev, cur) =>
          Math.abs(cur - price) < Math.abs(prev - price) ? cur : prev,
        )
      : (srLevels[0] ?? price);

  // ── Confluence scoring ──
  let score = 0;

  // C1: Significant S/R level within 4% of current price (widened from 3%)
  const levelProximity = Math.abs(price - nearestLevel) / price;
  const c1 = levelProximity <= 0.04;
  if (c1) score++;

  // C2: Liquidity grab detected on ANY of the top-5 nearest S/R levels
  // This prevents the signal from missing a grab because the "nearestLevel" is slightly off
  const topLevels = srLevels.slice(0, 5);
  const c2 = topLevels.some((lvl) =>
    detectLiquidityGrab(candles4h, lvl, "below", 10),
  );
  if (c2) score++;

  // C3: Retest on ANY of the top-5 nearest S/R levels (independent from C1)
  const c3 = topLevels.some((lvl) => detectRetest(candles4h, lvl));
  if (c3) score++;

  // C4: OBV rising (last 5 candles)
  const obvArr = calcOBV(candles4h);
  const obvRecent = obvArr.slice(-5);
  const obvStart = obvRecent[0];
  const obvEnd = obvRecent[obvRecent.length - 1];
  const c4 = obvEnd > obvStart;
  if (c4) score++;

  // C5: HTF daily bias bullish (background filter only, not shown in UI)
  const htfBias = calcHTFBias(dailyCandles);
  const c5 = htfBias === "bullish";
  if (c5) score++;

  const hasSignal = score >= 3;

  // OBV slope as 0-100 proxy
  let obvProxy = 50;
  if (obvArr.length >= 10) {
    const obvWindow = obvArr.slice(-10);
    const obvFirst = obvWindow[0];
    const obvLast = obvWindow[obvWindow.length - 1];
    if (Math.abs(obvFirst) > 0) {
      const obvChangePct = (obvLast - obvFirst) / Math.abs(obvFirst);
      obvProxy = Math.max(0, Math.min(100, 50 + obvChangePct * 100));
    } else {
      obvProxy = obvEnd > obvStart ? 65 : 35;
    }
  }

  const obvMomentum =
    obvEnd - obvRecent.reduce((s, v) => s + v, 0) / obvRecent.length;

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

  const ema9 = nearestLevel;
  const ema21 = srLevels[1] ?? nearestLevel;
  const ema50 = srLevels[2] ?? nearestLevel;

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
  return calcElizSignal(candles, candles, prevDetectedAt, prevEntry);
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

    const sig = calcElizSignal(window, window);
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
