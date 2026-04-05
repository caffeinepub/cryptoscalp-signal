// CryptoCompare REST API utilities — replaces Binance
// No API key required for public endpoints. No geo-restrictions.
// Prices/24h% use CoinGecko API with batched requests (no rate-limit issues).
// OHLCV uses CryptoCompare.

export interface CoinListEntry {
  id: string;
  symbol: string;
  name: string;
  ccSymbol: string; // CryptoCompare symbol (usually same as symbol)
  rank: number;
}

export interface CoinListItem {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
  priceChange24h: number;
  marketCapRank: number;
}

export interface OHLCVPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ── Fixed coin list ──
export const COIN_LIST: CoinListEntry[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", ccSymbol: "BTC", rank: 1 },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", ccSymbol: "ETH", rank: 2 },
  { id: "binancecoin", symbol: "BNB", name: "BNB", ccSymbol: "BNB", rank: 3 },
  { id: "ripple", symbol: "XRP", name: "XRP", ccSymbol: "XRP", rank: 4 },
  { id: "solana", symbol: "SOL", name: "Solana", ccSymbol: "SOL", rank: 5 },
  { id: "tron", symbol: "TRX", name: "TRON", ccSymbol: "TRX", rank: 6 },
  {
    id: "dogecoin",
    symbol: "DOGE",
    name: "Dogecoin",
    ccSymbol: "DOGE",
    rank: 7,
  },
  { id: "toncoin", symbol: "TON", name: "Toncoin", ccSymbol: "TON", rank: 8 },
  { id: "cardano", symbol: "ADA", name: "Cardano", ccSymbol: "ADA", rank: 9 },
  {
    id: "avalanche-2",
    symbol: "AVAX",
    name: "Avalanche",
    ccSymbol: "AVAX",
    rank: 10,
  },
  {
    id: "shiba-inu",
    symbol: "SHIB",
    name: "Shiba Inu",
    ccSymbol: "SHIB",
    rank: 11,
  },
  {
    id: "chainlink",
    symbol: "LINK",
    name: "Chainlink",
    ccSymbol: "LINK",
    rank: 12,
  },
  {
    id: "polkadot",
    symbol: "DOT",
    name: "Polkadot",
    ccSymbol: "DOT",
    rank: 13,
  },
  {
    id: "bitcoin-cash",
    symbol: "BCH",
    name: "Bitcoin Cash",
    ccSymbol: "BCH",
    rank: 14,
  },
  {
    id: "near",
    symbol: "NEAR",
    name: "NEAR Protocol",
    ccSymbol: "NEAR",
    rank: 15,
  },
  {
    id: "litecoin",
    symbol: "LTC",
    name: "Litecoin",
    ccSymbol: "LTC",
    rank: 16,
  },
  {
    id: "internet-computer",
    symbol: "ICP",
    name: "Internet Computer",
    ccSymbol: "ICP",
    rank: 17,
  },
  { id: "kaspa", symbol: "KAS", name: "Kaspa", ccSymbol: "KAS", rank: 18 },
  { id: "aptos", symbol: "APT", name: "Aptos", ccSymbol: "APT", rank: 19 },
  { id: "monero", symbol: "XMR", name: "Monero", ccSymbol: "XMR", rank: 20 },
  {
    id: "fetch-ai",
    symbol: "FET",
    name: "Artificial Superintelligence Alliance",
    ccSymbol: "FET",
    rank: 21,
  },
  {
    id: "ethereum-classic",
    symbol: "ETC",
    name: "Ethereum Classic",
    ccSymbol: "ETC",
    rank: 22,
  },
  { id: "stellar", symbol: "XLM", name: "Stellar", ccSymbol: "XLM", rank: 23 },
  {
    id: "hedera-hashgraph",
    symbol: "HBAR",
    name: "Hedera",
    ccSymbol: "HBAR",
    rank: 24,
  },
  {
    id: "render-token",
    symbol: "RENDER",
    name: "Render",
    ccSymbol: "RENDER",
    rank: 25,
  },
  {
    id: "immutable-x",
    symbol: "IMX",
    name: "Immutable",
    ccSymbol: "IMX",
    rank: 26,
  },
  { id: "cronos", symbol: "CRO", name: "Cronos", ccSymbol: "CRO", rank: 27 },
  {
    id: "filecoin",
    symbol: "FIL",
    name: "Filecoin",
    ccSymbol: "FIL",
    rank: 28,
  },
  { id: "cosmos", symbol: "ATOM", name: "Cosmos", ccSymbol: "ATOM", rank: 29 },
  { id: "mantle", symbol: "MNT", name: "Mantle", ccSymbol: "MNT", rank: 30 },
  { id: "vechain", symbol: "VET", name: "VeChain", ccSymbol: "VET", rank: 31 },
  {
    id: "arbitrum",
    symbol: "ARB",
    name: "Arbitrum",
    ccSymbol: "ARB",
    rank: 32,
  },
  {
    id: "injective-protocol",
    symbol: "INJ",
    name: "Injective",
    ccSymbol: "INJ",
    rank: 33,
  },
  { id: "optimism", symbol: "OP", name: "Optimism", ccSymbol: "OP", rank: 34 },
  { id: "fantom", symbol: "FTM", name: "Fantom", ccSymbol: "FTM", rank: 35 },
  {
    id: "the-graph",
    symbol: "GRT",
    name: "The Graph",
    ccSymbol: "GRT",
    rank: 36,
  },
  {
    id: "theta-token",
    symbol: "THETA",
    name: "Theta Network",
    ccSymbol: "THETA",
    rank: 37,
  },
  { id: "bonk", symbol: "BONK", name: "Bonk", ccSymbol: "BONK", rank: 38 },
  {
    id: "flare-networks",
    symbol: "FLR",
    name: "Flare",
    ccSymbol: "FLR",
    rank: 39,
  },
  { id: "sui", symbol: "SUI", name: "Sui", ccSymbol: "SUI", rank: 40 },
  { id: "gala", symbol: "GALA", name: "Gala", ccSymbol: "GALA", rank: 41 },
  { id: "sei-network", symbol: "SEI", name: "Sei", ccSymbol: "SEI", rank: 42 },
  {
    id: "celestia",
    symbol: "TIA",
    name: "Celestia",
    ccSymbol: "TIA",
    rank: 43,
  },
  {
    id: "algorand",
    symbol: "ALGO",
    name: "Algorand",
    ccSymbol: "ALGO",
    rank: 44,
  },
  { id: "flow", symbol: "FLOW", name: "Flow", ccSymbol: "FLOW", rank: 45 },
  { id: "aave", symbol: "AAVE", name: "Aave", ccSymbol: "AAVE", rank: 46 },
  {
    id: "quant-network",
    symbol: "QNT",
    name: "Quant",
    ccSymbol: "QNT",
    rank: 47,
  },
  {
    id: "pendle",
    symbol: "PENDLE",
    name: "Pendle",
    ccSymbol: "PENDLE",
    rank: 48,
  },
  { id: "chiliz", symbol: "CHZ", name: "Chiliz", ccSymbol: "CHZ", rank: 49 },
  {
    id: "axie-infinity",
    symbol: "AXS",
    name: "Axie Infinity",
    ccSymbol: "AXS",
    rank: 50,
  },
  { id: "helium", symbol: "HNT", name: "Helium", ccSymbol: "HNT", rank: 51 },
  { id: "dydx", symbol: "DYDX", name: "dYdX", ccSymbol: "DYDX", rank: 52 },
  {
    id: "elrond",
    symbol: "EGLD",
    name: "MultiversX",
    ccSymbol: "EGLD",
    rank: 53,
  },
  { id: "ronin", symbol: "RON", name: "Ronin", ccSymbol: "RON", rank: 54 },
  {
    id: "decentraland",
    symbol: "MANA",
    name: "Decentraland",
    ccSymbol: "MANA",
    rank: 55,
  },
  { id: "tezos", symbol: "XTZ", name: "Tezos", ccSymbol: "XTZ", rank: 56 },
  {
    id: "the-sandbox",
    symbol: "SAND",
    name: "The Sandbox",
    ccSymbol: "SAND",
    rank: 57,
  },
  {
    id: "synthetix-network-token",
    symbol: "SNX",
    name: "Synthetix",
    ccSymbol: "SNX",
    rank: 58,
  },
  {
    id: "conflux-token",
    symbol: "CFX",
    name: "Conflux",
    ccSymbol: "CFX",
    rank: 59,
  },
  { id: "eos", symbol: "EOS", name: "EOS", ccSymbol: "EOS", rank: 60 },
  { id: "iota", symbol: "IOTA", name: "IOTA", ccSymbol: "MIOTA", rank: 61 },
  { id: "zcash", symbol: "ZEC", name: "Zcash", ccSymbol: "ZEC", rank: 62 },
  { id: "neo", symbol: "NEO", name: "Neo", ccSymbol: "NEO", rank: 63 },
  { id: "kava", symbol: "KAVA", name: "Kava", ccSymbol: "KAVA", rank: 64 },
  {
    id: "pancakeswap-token",
    symbol: "CAKE",
    name: "PancakeSwap",
    ccSymbol: "CAKE",
    rank: 65,
  },
  {
    id: "mina-protocol",
    symbol: "MINA",
    name: "Mina",
    ccSymbol: "MINA",
    rank: 66,
  },
  {
    id: "oasis-network",
    symbol: "ROSE",
    name: "Oasis Network",
    ccSymbol: "ROSE",
    rank: 67,
  },
  { id: "waves", symbol: "WAVES", name: "Waves", ccSymbol: "WAVES", rank: 68 },
  { id: "apecoin", symbol: "APE", name: "ApeCoin", ccSymbol: "APE", rank: 69 },
  { id: "1inch", symbol: "1INCH", name: "1inch", ccSymbol: "1INCH", rank: 70 },
  {
    id: "curve-dao-token",
    symbol: "CRV",
    name: "Curve DAO Token",
    ccSymbol: "CRV",
    rank: 71,
  },
  {
    id: "enjincoin",
    symbol: "ENJ",
    name: "Enjin Coin",
    ccSymbol: "ENJ",
    rank: 72,
  },
  { id: "zilliqa", symbol: "ZIL", name: "Zilliqa", ccSymbol: "ZIL", rank: 73 },
  {
    id: "basic-attention-token",
    symbol: "BAT",
    name: "Basic Attention Token",
    ccSymbol: "BAT",
    rank: 74,
  },
  { id: "iotex", symbol: "IOTX", name: "IoTeX", ccSymbol: "IOTX", rank: 75 },
  { id: "stepn", symbol: "GMT", name: "STEPN", ccSymbol: "GMT", rank: 76 },
  {
    id: "compound-governance-token",
    symbol: "COMP",
    name: "Compound",
    ccSymbol: "COMP",
    rank: 77,
  },
  { id: "dash", symbol: "DASH", name: "Dash", ccSymbol: "DASH", rank: 78 },
  {
    id: "loopring",
    symbol: "LRC",
    name: "Loopring",
    ccSymbol: "LRC",
    rank: 79,
  },
  { id: "harmony", symbol: "ONE", name: "Harmony", ccSymbol: "ONE", rank: 80 },
  { id: "0x", symbol: "ZRX", name: "0x", ccSymbol: "ZRX", rank: 81 },
  { id: "ankr", symbol: "ANKR", name: "Ankr", ccSymbol: "ANKR", rank: 82 },
  {
    id: "livepeer",
    symbol: "LPT",
    name: "Livepeer",
    ccSymbol: "LPT",
    rank: 83,
  },
  {
    id: "ocean-protocol",
    symbol: "OCEAN",
    name: "Ocean Protocol",
    ccSymbol: "OCEAN",
    rank: 84,
  },
  { id: "kusama", symbol: "KSM", name: "Kusama", ccSymbol: "KSM", rank: 85 },
  {
    id: "ravencoin",
    symbol: "RVN",
    name: "Ravencoin",
    ccSymbol: "RVN",
    rank: 86,
  },
  {
    id: "yearn-finance",
    symbol: "YFI",
    name: "yearn.finance",
    ccSymbol: "YFI",
    rank: 87,
  },
  { id: "celo", symbol: "CELO", name: "Celo", ccSymbol: "CELO", rank: 88 },
  { id: "holotoken", symbol: "HOT", name: "Holo", ccSymbol: "HOT", rank: 89 },
  { id: "skale", symbol: "SKL", name: "SKALE", ccSymbol: "SKL", rank: 90 },
  {
    id: "mask-network",
    symbol: "MASK",
    name: "Mask Network",
    ccSymbol: "MASK",
    rank: 91,
  },
  { id: "qtum", symbol: "QTUM", name: "Qtum", ccSymbol: "QTUM", rank: 92 },
  { id: "siacoin", symbol: "SC", name: "Siacoin", ccSymbol: "SC", rank: 93 },
  {
    id: "audius",
    symbol: "AUDIO",
    name: "Audius",
    ccSymbol: "AUDIO",
    rank: 94,
  },
  { id: "storj", symbol: "STORJ", name: "Storj", ccSymbol: "STORJ", rank: 95 },
  { id: "nem", symbol: "XEM", name: "NEM", ccSymbol: "XEM", rank: 96 },
  { id: "decred", symbol: "DCR", name: "Decred", ccSymbol: "DCR", rank: 97 },
  { id: "icon", symbol: "ICX", name: "ICON", ccSymbol: "ICX", rank: 98 },
  {
    id: "ontology",
    symbol: "ONT",
    name: "Ontology",
    ccSymbol: "ONT",
    rank: 99,
  },
  {
    id: "band-protocol",
    symbol: "BAND",
    name: "Band Protocol",
    ccSymbol: "BAND",
    rank: 100,
  },
  {
    id: "balancer",
    symbol: "BAL",
    name: "Balancer",
    ccSymbol: "BAL",
    rank: 101,
  },
  {
    id: "numeraire",
    symbol: "NMR",
    name: "Numeraire",
    ccSymbol: "NMR",
    rank: 102,
  },
  {
    id: "jito-staked-sol",
    symbol: "JTO",
    name: "Jito",
    ccSymbol: "JTO",
    rank: 103,
  },
  {
    id: "pyth-network",
    symbol: "PYTH",
    name: "Pyth Network",
    ccSymbol: "PYTH",
    rank: 104,
  },
  {
    id: "ondo-finance",
    symbol: "ONDO",
    name: "Ondo",
    ccSymbol: "ONDO",
    rank: 105,
  },
  {
    id: "moonbeam",
    symbol: "GLMR",
    name: "Moonbeam",
    ccSymbol: "GLMR",
    rank: 106,
  },
  { id: "chromia", symbol: "CHR", name: "Chromia", ccSymbol: "CHR", rank: 107 },
  {
    id: "origin-protocol",
    symbol: "OGN",
    name: "Origin Protocol",
    ccSymbol: "OGN",
    rank: 108,
  },
  {
    id: "reserve-rights-token",
    symbol: "RSR",
    name: "Reserve Rights",
    ccSymbol: "RSR",
    rank: 109,
  },
];

// ── Stablecoin filter ──
const STABLECOIN_SYMBOLS = new Set([
  "usdt",
  "usdc",
  "dai",
  "busd",
  "tusd",
  "fdusd",
  "usdp",
  "usdd",
  "frax",
  "nusd",
  "gusd",
  "husd",
  "susd",
  "cusd",
  "musd",
]);

export function isStablecoin(_id: string, symbol: string): boolean {
  return STABLECOIN_SYMBOLS.has(symbol.toLowerCase());
}

// ── Get CC symbol for a coin ID ──
export function getCCSymbol(coinId: string): string | null {
  const entry = COIN_LIST.find((c) => c.id === coinId);
  return entry ? entry.ccSymbol : null;
}

const CC_BASE = "https://min-api.cryptocompare.com/data";
const CG_BASE = "https://api.coingecko.com/api/v3";

const BATCH_SIZE = 30;
const BATCH_DELAY_MS = 500;

// ── Fetch current prices for ALL coins using CoinGecko API ──
// Uses batched requests (30 IDs per call) with delays to avoid rate limits.
export async function fetchCoinList(): Promise<CoinListItem[]> {
  const coins = COIN_LIST.filter((c) => !isStablecoin(c.id, c.symbol));

  // Build a map for quick lookup
  const resultMap = new Map<string, { price: number; change24h: number }>();

  // Split into batches of BATCH_SIZE
  for (let i = 0; i < coins.length; i += BATCH_SIZE) {
    const batch = coins.slice(i, i + BATCH_SIZE);
    const ids = batch.map((c) => c.id).join(",");
    const url = `${CG_BASE}/coins/markets?vs_currency=usd&ids=${ids}&per_page=${BATCH_SIZE}&page=1&sparkline=false`;

    let success = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url);
        if (res.status === 429) {
          // Rate limited — wait longer and retry
          await new Promise((r) => setTimeout(r, 2000 * attempt));
          continue;
        }
        if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
        const data = (await res.json()) as Array<{
          id: string;
          current_price: number;
          price_change_percentage_24h: number;
        }>;
        for (const item of data) {
          resultMap.set(item.id, {
            price: item.current_price ?? 0,
            change24h: item.price_change_percentage_24h ?? 0,
          });
        }
        success = true;
        break;
      } catch {
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    }

    if (!success) {
      // Batch failed: coins in this batch will show 0 — acceptable fallback
      console.warn(
        `CoinGecko batch ${i / BATCH_SIZE + 1} failed after 3 attempts`,
      );
    }

    // Delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < coins.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  return coins.map((coin) => {
    const data = resultMap.get(coin.id);
    return {
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      currentPrice: data?.price ?? 0,
      priceChange24h: data?.change24h ?? 0,
      marketCapRank: coin.rank,
    };
  });
}

// ── Fetch 4h OHLCV candles (90 days = 540 candles at 4h) ──
// CryptoCompare: /data/v2/histohour with aggregate=4
export async function fetchOHLCWithVolume(
  coinId: string,
  _days = 90,
): Promise<OHLCVPoint[]> {
  const sym = getCCSymbol(coinId);
  if (!sym) return [];

  // 540 x 4h candles = 90 days
  const url = `${CC_BASE}/v2/histohour?fsym=${sym}&tsym=USD&limit=540&aggregate=4`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CC histohour error: ${res.status}`);
    const json = (await res.json()) as {
      Data?: {
        Data?: Array<{
          time: number;
          open: number;
          high: number;
          low: number;
          close: number;
          volumefrom: number;
        }>;
      };
    };
    const data = json.Data?.Data ?? [];
    return data.map((c) => ({
      timestamp: c.time * 1000,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volumefrom,
    }));
  } catch {
    return [];
  }
}

// ── Fetch daily OHLCV candles (30 days) ──
export async function fetchDailyOHLC(coinId: string): Promise<OHLCVPoint[]> {
  const sym = getCCSymbol(coinId);
  if (!sym) return [];

  const url = `${CC_BASE}/v2/histoday?fsym=${sym}&tsym=USD&limit=30`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CC histoday error: ${res.status}`);
    const json = (await res.json()) as {
      Data?: {
        Data?: Array<{
          time: number;
          open: number;
          high: number;
          low: number;
          close: number;
          volumefrom: number;
        }>;
      };
    };
    const data = json.Data?.Data ?? [];
    return data.map((c) => ({
      timestamp: c.time * 1000,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volumefrom,
    }));
  } catch {
    return [];
  }
}

// ── Fetch live price for a single coin (for polling fallback) ──
export async function fetchLivePrice(coinId: string): Promise<number | null> {
  const sym = getCCSymbol(coinId);
  if (!sym) return null;
  try {
    const res = await fetch(`${CC_BASE}/price?fsym=${sym}&tsyms=USD`);
    if (!res.ok) return null;
    const json = (await res.json()) as { USD?: number };
    return json.USD ?? null;
  } catch {
    return null;
  }
}
