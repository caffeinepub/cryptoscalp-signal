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
 * OBV rises when the close is higher than the previous close (bullish accumulation)
 * and falls when the close is lower (bearish distribution).
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
 * A swing high is a candle whose high is higher than both neighbors.
 * A swing low is a candle whose low is lower than both neighbors.
 * Returns price levels sorted by distance from current price (closest first).
 */
export function calcSupportResistanceLevels(
  candles: OHLCVCandle[],
  lookback = 5,
): number[] {
  if (candles.length < lookback * 2 + 1) return [];

  const levels: number[] = [];
  const n = candles.length;

  for (let i = lookback; i < n - lookback; i++) {
    const slice = candles.slice(i - lookback, i + lookback + 1);
    const cur = candles[i];

    // Check swing high
    const isSwingHigh = slice.every((c) => c.high <= cur.high);
    if (isSwingHigh) levels.push(cur.high);

    // Check swing low
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

  // Sort by proximity to current price
  unique.sort(
    (a, b) => Math.abs(a - currentPrice) - Math.abs(b - currentPrice),
  );

  return unique.slice(0, 20); // top 20 most relevant levels
}

/**
 * Detect if a liquidity grab occurred recently (last 5 candles).
 * A liquidity grab is: price sweeps beyond a level (above resistance or below support),
 * then closes back inside — the classic "stop hunt" EliZ watches for.
 *
 * direction 'above': price temporarily went above the level but closed back below it
 * direction 'below': price temporarily went below the level but closed back above it
 */
export function detectLiquidityGrab(
  candles: OHLCVCandle[],
  level: number,
  direction: "above" | "below",
  lookback = 5,
): boolean {
  if (candles.length < lookback) return false;

  const recent = candles.slice(-lookback);
  for (const candle of recent) {
    if (direction === "below") {
      // Price wick went below support but closed back above it
      const sweptBelow = candle.low < level * 0.999;
      const closedAbove = candle.close > level * 0.998;
      if (sweptBelow && closedAbove) return true;
    } else {
      // Price wick went above resistance but closed back below it
      const sweptAbove = candle.high > level * 1.001;
      const closedBelow = candle.close < level * 1.002;
      if (sweptAbove && closedBelow) return true;
    }
  }
  return false;
}

/**
 * Detect if price is currently retesting the grabbed level.
 * Retest: current price is within 1.5% of the level,
 * and the most recent candle is closing in the expected direction (bullish for long setups).
 */
export function detectRetest(candles: OHLCVCandle[], level: number): boolean {
  if (candles.length < 2) return false;

  const cur = candles[candles.length - 1];
  const price = cur.close;

  // Price must be within 1.5% of the level
  const proximity = Math.abs(price - level) / level;
  if (proximity > 0.015) return false;

  // For a LONG setup: candle should be bullish (close >= open) or at least
  // within 0.5% of the level from above (price bouncing up from support)
  const isBullishCandle = cur.close >= cur.open;
  const priceAboveLevel = cur.close >= level * 0.995;

  return isBullishCandle || priceAboveLevel;
}

/**
 * Check HTF (daily) bias: is the current price near a key daily support?
 * Returns 'bullish' if price is within 3% above a daily support level,
 * 'bearish' if price is below a daily support, 'neutral' otherwise.
 */
export function calcHTFBias(
  dailyCandles: OHLCVCandle[],
): "bullish" | "neutral" | "bearish" {
  if (dailyCandles.length < 5) return "neutral";

  const n = dailyCandles.length;
  const currentPrice = dailyCandles[n - 1].close;

  // Find significant daily lows (swing lows over last 30 days)
  const dailyLevels = calcSupportResistanceLevels(dailyCandles, 3);
  if (dailyLevels.length === 0) return "neutral";

  // Find support levels below current price
  const supports = dailyLevels.filter((l) => l <= currentPrice);
  if (supports.length === 0) return "neutral";

  // Closest support below current price
  const closestSupport = supports.reduce((prev, cur) =>
    Math.abs(cur - currentPrice) < Math.abs(prev - currentPrice) ? cur : prev,
  );

  const distFromSupport = (currentPrice - closestSupport) / currentPrice;

  // Within 3% above daily support = bullish bias
  if (distFromSupport >= 0 && distFromSupport <= 0.03) return "bullish";
  // Below key support = bearish
  if (distFromSupport < 0) return "bearish";
  return "neutral";
}

/**
 * EliZ signal detection.
 * Scores 5 confluences (EliZ methodology):
 * C1: Significant S/R level within 3% of current price
 * C2: Liquidity grab detected on that level (within last 5 candles)
 * C3: Retest confirmed (price touching level with close confirmation)
 * C4: OBV rising (bullish volume direction — last 5 candles trend)
 * C5: HTF daily bias is bullish (price near daily support)
 *
 * Signal fires if score >= 3. TP1 = +3%, SL = -2%.
 */
export function calcElizSignal(
  candles4h: OHLCVCandle[],
  dailyCandles: OHLCVCandle[],
  prevDetectedAt?: number,
  prevEntry?: number,
): SignalResult | null {
  if (candles4h.length < 20) return null;

  const n = candles4h.length - 1;
  const cur = candles4h[n];
  const price = cur.close;

  // Get key S/R levels
  const srLevels = calcSupportResistanceLevels(candles4h);

  // Find the closest support level below current price
  const supportLevels = srLevels.filter((l) => l <= price * 1.02); // within 2% above or any below
  const nearestLevel =
    supportLevels.length > 0
      ? supportLevels.reduce((prev, cur) =>
          Math.abs(cur - price) < Math.abs(prev - price) ? cur : prev,
        )
      : (srLevels[0] ?? price);

  // ── Confluence scoring ──
  let score = 0;

  // C1: Significant S/R level within 3% of current price
  const levelProximity = Math.abs(price - nearestLevel) / price;
  const c1 = levelProximity <= 0.03;
  if (c1) score++;

  // C2: Liquidity grab detected on that level
  const c2 = detectLiquidityGrab(candles4h, nearestLevel, "below", 5);
  if (c2) score++;

  // C3: Retest confirmed
  const c3 = detectRetest(candles4h, nearestLevel);
  if (c3) score++;

  // C4: OBV rising (last 5 candles)
  const obvArr = calcOBV(candles4h);
  const obvRecent = obvArr.slice(-5);
  const obvStart = obvRecent[0];
  const obvEnd = obvRecent[obvRecent.length - 1];
  const c4 = obvEnd > obvStart;
  if (c4) score++;

  // C5: HTF daily bias bullish
  const htfBias = calcHTFBias(dailyCandles);
  const c5 = htfBias === "bullish";
  if (c5) score++;

  // Only show signals with score >= 3 (no weak 2/5 signals)
  const hasSignal = score >= 3;

  // OBV slope as 0-100 proxy for the `rsi` field
  // 50 = neutral, > 50 = rising, < 50 = falling
  let obvProxy = 50;
  if (obvArr.length >= 10) {
    const obvWindow = obvArr.slice(-10);
    const obvFirst = obvWindow[0];
    const obvLast = obvWindow[obvWindow.length - 1];
    if (Math.abs(obvFirst) > 0) {
      const obvChangePct = (obvLast - obvFirst) / Math.abs(obvFirst);
      // Clamp to ±50% change → map to 0–100
      obvProxy = Math.max(0, Math.min(100, 50 + obvChangePct * 100));
    } else {
      obvProxy = obvEnd > obvStart ? 65 : 35;
    }
  }

  // OBV momentum (last value - average of last 5) — stored as `macd`
  const obvMomentum =
    obvEnd - obvRecent.reduce((s, v) => s + v, 0) / obvRecent.length;

  // Volume ratio vs 20-period average
  const startIdx = Math.max(0, n - 20);
  const recentVols = candles4h.slice(startIdx, n).map((c) => c.volume);
  const avgVol =
    recentVols.length > 0
      ? recentVols.reduce((s, v) => s + v, 0) / recentVols.length
      : 0;
  const volumeRatio = avgVol > 0 ? cur.volume / avgVol : 1;

  const entry = price;

  // Freeze entry price from original detection
  const entryPrice = hasSignal
    ? prevDetectedAt !== undefined && prevEntry !== undefined
      ? prevEntry
      : price
    : price;

  // TP1 = +3%, SL = -2%
  const tp1 = entryPrice * 1.03;
  const tp2 = entryPrice * 1.06; // kept for internal shape compatibility
  const stopLoss = entryPrice * 0.98;

  // Preserve original detectedAt if signal was already active
  const detectedAt = hasSignal ? (prevDetectedAt ?? Date.now()) : undefined;

  // Store S/R levels in ema9/ema21/ema50 fields for chart display
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

// ── Backcompat: calcSignal alias for any code still importing it ──
// Uses only 4h candles; daily bias skipped in backtest context
export function calcSignal(
  candles: OHLCVCandle[],
  prevDetectedAt?: number,
  prevEntry?: number,
): SignalResult | null {
  // Use the same candles as a rough daily proxy in backtest mode
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

    // EliZ HTF trend filter: only count signals when price is in a bullish structure.
    // Price must be above the 50-period EMA of closes (trend filter, EliZ-style).
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
    // EliZ targets: TP1 = +3%, SL = -2%
    const tp = entry * 1.03;
    const sl = entry * 0.98;

    // 48-hour evaluation window = 12 candles of 4h
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
