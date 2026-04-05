// CryptoCompare REST API utilities — replaces Binance
// No API key required for public endpoints. No geo-restrictions.

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
    id: "klay-token",
    symbol: "KLAY",
    name: "Klaytn",
    ccSymbol: "KLAY",
    rank: 55,
  },
  {
    id: "decentraland",
    symbol: "MANA",
    name: "Decentraland",
    ccSymbol: "MANA",
    rank: 56,
  },
  { id: "tezos", symbol: "XTZ", name: "Tezos", ccSymbol: "XTZ", rank: 57 },
  {
    id: "the-sandbox",
    symbol: "SAND",
    name: "The Sandbox",
    ccSymbol: "SAND",
    rank: 58,
  },
  {
    id: "synthetix-network-token",
    symbol: "SNX",
    name: "Synthetix",
    ccSymbol: "SNX",
    rank: 59,
  },
  {
    id: "conflux-token",
    symbol: "CFX",
    name: "Conflux",
    ccSymbol: "CFX",
    rank: 60,
  },
  { id: "eos", symbol: "EOS", name: "EOS", ccSymbol: "EOS", rank: 61 },
  { id: "iota", symbol: "IOTA", name: "IOTA", ccSymbol: "IOTA", rank: 62 },
  { id: "zcash", symbol: "ZEC", name: "Zcash", ccSymbol: "ZEC", rank: 63 },
  { id: "neo", symbol: "NEO", name: "Neo", ccSymbol: "NEO", rank: 64 },
  { id: "kava", symbol: "KAVA", name: "Kava", ccSymbol: "KAVA", rank: 65 },
  {
    id: "pancakeswap-token",
    symbol: "CAKE",
    name: "PancakeSwap",
    ccSymbol: "CAKE",
    rank: 66,
  },
  {
    id: "mina-protocol",
    symbol: "MINA",
    name: "Mina",
    ccSymbol: "MINA",
    rank: 67,
  },
  {
    id: "oasis-network",
    symbol: "ROSE",
    name: "Oasis Network",
    ccSymbol: "ROSE",
    rank: 68,
  },
  { id: "waves", symbol: "WAVES", name: "Waves", ccSymbol: "WAVES", rank: 69 },
  { id: "apecoin", symbol: "APE", name: "ApeCoin", ccSymbol: "APE", rank: 70 },
  { id: "1inch", symbol: "1INCH", name: "1inch", ccSymbol: "1INCH", rank: 71 },
  {
    id: "curve-dao-token",
    symbol: "CRV",
    name: "Curve DAO Token",
    ccSymbol: "CRV",
    rank: 72,
  },
  {
    id: "enjincoin",
    symbol: "ENJ",
    name: "Enjin Coin",
    ccSymbol: "ENJ",
    rank: 73,
  },
  { id: "zilliqa", symbol: "ZIL", name: "Zilliqa", ccSymbol: "ZIL", rank: 74 },
  {
    id: "basic-attention-token",
    symbol: "BAT",
    name: "Basic Attention Token",
    ccSymbol: "BAT",
    rank: 75,
  },
  { id: "iotex", symbol: "IOTX", name: "IoTeX", ccSymbol: "IOTX", rank: 76 },
  { id: "stepn", symbol: "GMT", name: "STEPN", ccSymbol: "GMT", rank: 77 },
  {
    id: "compound-governance-token",
    symbol: "COMP",
    name: "Compound",
    ccSymbol: "COMP",
    rank: 78,
  },
  { id: "dash", symbol: "DASH", name: "Dash", ccSymbol: "DASH", rank: 79 },
  {
    id: "loopring",
    symbol: "LRC",
    name: "Loopring",
    ccSymbol: "LRC",
    rank: 80,
  },
  { id: "harmony", symbol: "ONE", name: "Harmony", ccSymbol: "ONE", rank: 81 },
  { id: "0x", symbol: "ZRX", name: "0x", ccSymbol: "ZRX", rank: 82 },
  { id: "ankr", symbol: "ANKR", name: "Ankr", ccSymbol: "ANKR", rank: 83 },
  {
    id: "livepeer",
    symbol: "LPT",
    name: "Livepeer",
    ccSymbol: "LPT",
    rank: 84,
  },
  {
    id: "ocean-protocol",
    symbol: "OCEAN",
    name: "Ocean Protocol",
    ccSymbol: "OCEAN",
    rank: 85,
  },
  { id: "kusama", symbol: "KSM", name: "Kusama", ccSymbol: "KSM", rank: 86 },
  {
    id: "ravencoin",
    symbol: "RVN",
    name: "Ravencoin",
    ccSymbol: "RVN",
    rank: 87,
  },
  {
    id: "yearn-finance",
    symbol: "YFI",
    name: "yearn.finance",
    ccSymbol: "YFI",
    rank: 88,
  },
  { id: "celo", symbol: "CELO", name: "Celo", ccSymbol: "CELO", rank: 89 },
  { id: "holotoken", symbol: "HOT", name: "Holo", ccSymbol: "HOT", rank: 90 },
  { id: "skale", symbol: "SKL", name: "SKALE", ccSymbol: "SKL", rank: 91 },
  {
    id: "mask-network",
    symbol: "MASK",
    name: "Mask Network",
    ccSymbol: "MASK",
    rank: 92,
  },
  { id: "qtum", symbol: "QTUM", name: "Qtum", ccSymbol: "QTUM", rank: 93 },
  { id: "siacoin", symbol: "SC", name: "Siacoin", ccSymbol: "SC", rank: 94 },
  {
    id: "audius",
    symbol: "AUDIO",
    name: "Audius",
    ccSymbol: "AUDIO",
    rank: 95,
  },
  { id: "storj", symbol: "STORJ", name: "Storj", ccSymbol: "STORJ", rank: 96 },
  { id: "nem", symbol: "XEM", name: "NEM", ccSymbol: "XEM", rank: 97 },
  { id: "decred", symbol: "DCR", name: "Decred", ccSymbol: "DCR", rank: 98 },
  { id: "icon", symbol: "ICX", name: "ICON", ccSymbol: "ICX", rank: 99 },
  {
    id: "ontology",
    symbol: "ONT",
    name: "Ontology",
    ccSymbol: "ONT",
    rank: 100,
  },
  {
    id: "band-protocol",
    symbol: "BAND",
    name: "Band Protocol",
    ccSymbol: "BAND",
    rank: 101,
  },
  {
    id: "balancer",
    symbol: "BAL",
    name: "Balancer",
    ccSymbol: "BAL",
    rank: 102,
  },
  {
    id: "numeraire",
    symbol: "NMR",
    name: "Numeraire",
    ccSymbol: "NMR",
    rank: 103,
  },
  {
    id: "jito-staked-sol",
    symbol: "JTO",
    name: "Jito",
    ccSymbol: "JTO",
    rank: 104,
  },
  {
    id: "pyth-network",
    symbol: "PYTH",
    name: "Pyth Network",
    ccSymbol: "PYTH",
    rank: 105,
  },
  {
    id: "ondo-finance",
    symbol: "ONDO",
    name: "Ondo",
    ccSymbol: "ONDO",
    rank: 106,
  },
  {
    id: "moonbeam",
    symbol: "GLMR",
    name: "Moonbeam",
    ccSymbol: "GLMR",
    rank: 107,
  },
  { id: "chromia", symbol: "CHR", name: "Chromia", ccSymbol: "CHR", rank: 108 },
  {
    id: "origin-protocol",
    symbol: "OGN",
    name: "Origin Protocol",
    ccSymbol: "OGN",
    rank: 109,
  },
  {
    id: "reserve-rights-token",
    symbol: "RSR",
    name: "Reserve Rights",
    ccSymbol: "RSR",
    rank: 110,
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

// ── Helper: fetch with retry + exponential backoff ──
async function fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
  let lastError: Error = new Error("Unknown error");
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
    if (attempt < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  throw lastError;
}

// ── Fetch current prices for all coins in parallel batches of 30 ──
// Each batch retries up to 3 times with exponential backoff on failure.
export async function fetchCoinList(): Promise<CoinListItem[]> {
  const coins = COIN_LIST.filter((c) => !isStablecoin(c.id, c.symbol));
  const BATCH = 30;

  // Split into batches
  const batches: CoinListEntry[][] = [];
  for (let i = 0; i < coins.length; i += BATCH) {
    batches.push(coins.slice(i, i + BATCH));
  }

  // Fetch all batches in parallel, each with retry
  const batchResults = await Promise.all(
    batches.map(async (batch) => {
      const fsyms = batch.map((c) => c.ccSymbol).join(",");
      const url = `${CC_BASE}/pricemultifull?fsyms=${fsyms}&tsyms=USD`;
      try {
        const res = await fetchWithRetry(url, 3);
        const json = (await res.json()) as {
          RAW?: Record<
            string,
            { USD?: { PRICE: number; CHANGEPCT24HOUR: number } }
          >;
        };
        return batch.map((coin) => {
          const raw = json.RAW?.[coin.ccSymbol]?.USD;
          return {
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            currentPrice: raw?.PRICE ?? 0,
            priceChange24h: raw?.CHANGEPCT24HOUR ?? 0,
            marketCapRank: coin.rank,
          } as CoinListItem;
        });
      } catch {
        // All retries failed — return zeros for this batch
        return batch.map((coin) => ({
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          currentPrice: 0,
          priceChange24h: 0,
          marketCapRank: coin.rank,
        })) as CoinListItem[];
      }
    }),
  );

  return batchResults.flat();
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
