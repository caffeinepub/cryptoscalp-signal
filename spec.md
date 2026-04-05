# CryptoScalp Signal

## Current State
The app uses EliZ-style signal logic with 5 confluences (C1: S/R level, C2: Liquidity grab, C3: Retest, C4: OBV rising, C5: HTF daily bias bullish). The Bias Daily (C5) is already computed silently in `calcElizSignal` via `calcHTFBias`, but it was previously shown as a visual card in the ChartModal. The dashboard table and signal badges show no explicit Bias Daily column.

## Requested Changes (Diff)

### Add
- Nothing new to add.

### Modify
- Ensure HTF daily bias (C5) is completely invisible in the UI: remove any remaining visual reference in ChartModal or elsewhere. It must only affect the confluence score silently in the background.
- Confirm signal threshold stays at score >= 3 (no 2/5 signals).

### Remove
- Any visible "Bias Daily" or "HTF Bias" labels/cards/indicators from the ChartModal overlay or any other UI component.

## Implementation Plan
1. Read ChartModal.tsx to check for any Bias Daily visual references.
2. Remove any bias-related visual display from ChartModal.
3. Validate the build.
