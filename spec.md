# CryptoScalp Signal

## Current State

All price/market data (live prices, 24h%) is fetched from CryptoCompare via `fetchCoinList()` in `cryptocompare.ts`. This function uses `pricemultifull` endpoint split into 2 parallel batches. The issue is persistent: all coins show $0.00/+0.00% due to CryptoCompare's public API rate-limiting and batch size restrictions. OHLCV data (4h and daily candles) from CryptoCompare works correctly and is not affected.

`binance.ts` is a re-export shim pointing to `cryptocompare.ts`. `useQueries.ts` imports from `binance.ts`.

## Requested Changes (Diff)

### Add
- New `fetchCoinListFromCoinCap()` function in `cryptocompare.ts` that fetches live prices and 24h% from CoinCap API (api.coincap.io/v2/assets) — no API key required, no geo-restrictions, supports all coins by ID
- CoinCap ID mapping for all 109 coins in COIN_LIST (CoinCap uses slug-style IDs like "bitcoin", "ethereum", already available as `id` field)

### Modify
- Replace `fetchCoinList()` implementation to use CoinCap instead of CryptoCompare `pricemultifull`
- CoinCap `/v2/assets` endpoint supports up to 2000 assets in a single request — use `ids=bitcoin,ethereum,...` param with all coin IDs
- Keep all OHLCV functions (`fetchOHLCWithVolume`, `fetchDailyOHLC`, `fetchLivePrice`) on CryptoCompare — they work fine

### Remove
- `fetchPriceBatch()` helper (no longer needed)
- Parallel batch splitting logic for prices

## Implementation Plan

1. In `cryptocompare.ts`, replace `fetchPriceBatch` and the batch-split logic in `fetchCoinList` with a single CoinCap API call:
   - URL: `https://api.coincap.io/v2/assets?ids=bitcoin,ethereum,...&limit=200`
   - Response: `{ data: [{ id, symbol, priceUsd, changePercent24Hr }] }`
   - Map response by `id` field (matches existing COIN_LIST `id` values)
   - Retry up to 3 times on failure
   - Fallback: return coins with price=0 if all retries fail (graceful degradation)

2. No changes needed to `binance.ts`, `useQueries.ts`, or any other file — they all import through the same interface.
