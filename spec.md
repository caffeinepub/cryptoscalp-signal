# CryptoScalp Signal

## Current State
Full EliZ-style crypto scalping dashboard using CoinGecko as exclusive data source.
- Top 25 coins by 24h volume (dynamic, refreshed hourly)
- Signal logic: 5 independent confluences (C1-C5) + bonus scoring
- Signals persist up to 24h or until TP1/SL is hit
- Backtest: 48h window, signals >= 3/5, EMA50 trend filter
- TP1: +3%, SL: -2%
- Dashboard live signals: score >= 3

## Requested Changes (Diff)

### Add
- Export constants TP1_PCT and SL_PCT in indicators.ts for single-source-of-truth

### Modify
- **TP1**: from +3% to **+2%** (both live signals and backtest)
- **Backtest minimum score**: from 3/5 to **4/5** (more selective, better quality)
- **Backtest evaluation window**: from 48h (12 candles) to **72h (18 candles)** (more time to reach TP)
- **Backtest HTF Bias filter**: now **mandatory** (price must be above EMA20 AND EMA50) instead of just a bonus
- **usePersistedSignals**: storage key bumped to v3 to clear old signals with +3% TP1
- **Dashboard live signals**: unchanged, still shows score >= 3

### Remove
- Nothing removed

## Implementation Plan
1. Add TP1_PCT=0.02 and SL_PCT=0.02 constants to indicators.ts
2. Update calcElizSignal: tp1 = entryPrice * (1 + TP1_PCT), stopLoss = entryPrice * (1 - SL_PCT)
3. Update runBacktest: BACKTEST_MIN_SCORE=4, EVAL_CANDLES=18, require EMA20 AND EMA50 bullish
4. Bump localStorage key to v3 in usePersistedSignals to invalidate stale signals
5. Validate and deploy
