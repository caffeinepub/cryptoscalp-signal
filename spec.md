# CryptoScalp Signal

## Current State
EliZ-methodology signal engine using 5 confluences (C1-C5) + bonus.
C2 (liquidity grab) is currently treated as a hard blocker in practice because
the other conditions rarely stack to 3 without it, especially in bear/ranging markets.
Result: zero signals across all 109 coins.

## Requested Changes (Diff)

### Add
- Nothing new.

### Modify
- `calcElizSignal` in `indicators.ts`:
  - Decouple C2 from being a de-facto requirement. Any 3 of the 6 scored items
    (C1, C2, C3, C4, C5, bonus) triggers the signal.
  - Widen C1 support proximity: 8% → 12% (keeps C1 and C3 clearly different)
  - Widen C3 retest tolerance: 12% → 18% (any S/R level)
  - Extend C2 grab lookback: 20 candles → 30 candles (~5 days of 4h)
  - No change to score threshold (still >= 3)

### Remove
- Nothing.

## Implementation Plan
1. Edit `src/frontend/src/utils/indicators.ts`:
   - C1: proximity threshold 0.08 → 0.12
   - C3: `detectRetest` tolerance 0.12 → 0.18
   - C2: grab lookback 20 → 30 candles
   - Keep score >= 3 as minimum signal threshold
   - No other logic changes
2. Validate and deploy.
