import { logger } from "./logger";

// Fallback prices used for local mocking (set USE_MOCK_PRICES=true to always use these)
export const MOCK_BASE_PRICES: Record<string, number> = {
  BTC: 67450,
  ETH: 3520,
  SOL: 172,
  BNB: 608,
  XRP: 0.612,
  ADA: 0.465,
  AVAX: 38.2,
  DOT: 7.85,
  MATIC: 0.892,
  LINK: 14.3,
  LTC: 84.5,
  DOGE: 0.162,
  UNI: 9.45,
  ATOM: 8.72,
  FIL: 5.61,
};

export interface ExchangeTicker {
  bid: number;
  ask: number;
  last: number;
  volume24h: number;
  updatedAt: string;
}

// Mapping: exchangeSlug -> symbol -> ExchangeTicker
export type MultiExchangePrices = Record<string, Record<string, ExchangeTicker>>;

// Simple in-memory cache
let cachedMultiPrices: MultiExchangePrices | null = null;
let multiPricesExpiresAt = 0;
const CACHE_TTL_MS = 10_000; // 10 seconds cache TTL

/**
 * Helper to generate simulated prices for an exchange based on base prices.
 * Used when live queries fail, to keep the system resilient and running.
 */
function generateFallbackPricesForExchange(
  basePrices: Record<string, number>,
  exchangeSlug: string
): Record<string, ExchangeTicker> {
  const EXCHANGE_BIAS: Record<string, number> = {
    binance: 0,
    coinbase: 0.0012,
    kraken: -0.0008,
    bybit: 0.0015,
    okx: -0.0005,
    kucoin: 0.0022,
    huobi: -0.0018,
  };

  const bias = EXCHANGE_BIAS[exchangeSlug] ?? 0;
  const result: Record<string, ExchangeTicker> = {};
  const nowStr = new Date().toISOString();

  for (const [symbol, basePrice] of Object.entries(basePrices)) {
    const noise = (Math.random() - 0.5) * 0.003;
    const spreadFactor = basePrice > 1000 ? 0.0005 : basePrice > 1 ? 0.001 : 0.005;

    const mid = basePrice * (1 + bias + noise);
    const half = mid * spreadFactor;

    result[symbol] = {
      bid: parseFloat((mid - half).toFixed(basePrice > 1 ? 2 : 6)),
      ask: parseFloat((mid + half).toFixed(basePrice > 1 ? 2 : 6)),
      last: parseFloat((mid + (Math.random() - 0.5) * half).toFixed(basePrice > 1 ? 2 : 6)),
      volume24h: parseFloat((basePrice * (Math.random() * 5000 + 1000)).toFixed(2)),
      updatedAt: nowStr,
    };
  }

  return result;
}

// ==========================================
// EXCHANGE API FETCHERS
// ==========================================

async function fetchBinancePrices(symbols: string[]): Promise<Record<string, ExchangeTicker>> {
  const response = await fetch("https://api.binance.com/api/v3/ticker/24hr", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Binance responded with status ${response.status}`);
  const data = (await response.json()) as Array<{
    symbol: string;
    bidPrice: string;
    askPrice: string;
    lastPrice: string;
    quoteVolume: string;
  }>;

  const result: Record<string, ExchangeTicker> = {};
  const symbolSet = new Set(symbols);
  const now = new Date().toISOString();

  for (const item of data) {
    if (!item.symbol.endsWith("USDT")) continue;
    const asset = item.symbol.slice(0, -4);
    if (!symbolSet.has(asset)) continue;

    const bid = parseFloat(item.bidPrice);
    const ask = parseFloat(item.askPrice);
    const last = parseFloat(item.lastPrice);
    const volume24h = parseFloat(item.quoteVolume);

    if (!isNaN(bid) && !isNaN(ask) && !isNaN(last)) {
      result[asset] = { bid, ask, last, volume24h: isNaN(volume24h) ? 0 : volume24h, updatedAt: now };
    }
  }
  return result;
}

async function fetchBybitPrices(symbols: string[]): Promise<Record<string, ExchangeTicker>> {
  const response = await fetch("https://api.bybit.com/v5/market/tickers?category=spot", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Bybit responded with status ${response.status}`);
  const json = (await response.json()) as {
    retCode: number;
    result: {
      list: Array<{
        symbol: string;
        bid1Price: string;
        ask1Price: string;
        lastPrice: string;
        turnover24h: string;
      }>;
    };
  };

  if (json.retCode !== 0) throw new Error(`Bybit API error code ${json.retCode}`);

  const result: Record<string, ExchangeTicker> = {};
  const symbolSet = new Set(symbols);
  const now = new Date().toISOString();

  for (const item of json.result.list) {
    if (!item.symbol.endsWith("USDT")) continue;
    const asset = item.symbol.slice(0, -4);
    if (!symbolSet.has(asset)) continue;

    const bid = parseFloat(item.bid1Price);
    const ask = parseFloat(item.ask1Price);
    const last = parseFloat(item.lastPrice);
    const volume24h = parseFloat(item.turnover24h);

    if (!isNaN(bid) && !isNaN(ask) && !isNaN(last)) {
      result[asset] = { bid, ask, last, volume24h: isNaN(volume24h) ? 0 : volume24h, updatedAt: now };
    }
  }
  return result;
}

async function fetchOkxPrices(symbols: string[]): Promise<Record<string, ExchangeTicker>> {
  const response = await fetch("https://www.okx.com/api/v5/market/tickers?instType=SPOT", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`OKX responded with status ${response.status}`);
  const json = (await response.json()) as {
    code: string;
    data: Array<{
      instId: string;
      bidPx: string;
      askPx: string;
      last: string;
      volVal24h: string;
    }>;
  };

  if (json.code !== "0") throw new Error(`OKX API error code ${json.code}`);

  const result: Record<string, ExchangeTicker> = {};
  const symbolSet = new Set(symbols);
  const now = new Date().toISOString();

  for (const item of json.data) {
    if (!item.instId.endsWith("-USDT")) continue;
    const asset = item.instId.slice(0, -5);
    if (!symbolSet.has(asset)) continue;

    const bid = parseFloat(item.bidPx);
    const ask = parseFloat(item.askPx);
    const last = parseFloat(item.last);
    const volume24h = parseFloat(item.volVal24h);

    if (!isNaN(bid) && !isNaN(ask) && !isNaN(last)) {
      result[asset] = { bid, ask, last, volume24h: isNaN(volume24h) ? 0 : volume24h, updatedAt: now };
    }
  }
  return result;
}

async function fetchKucoinPrices(symbols: string[]): Promise<Record<string, ExchangeTicker>> {
  const response = await fetch("https://api.kucoin.com/api/v1/market/allTickers", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`KuCoin responded with status ${response.status}`);
  const json = (await response.json()) as {
    code: string;
    data: {
      ticker: Array<{
        symbol: string;
        buy: string;
        sell: string;
        last: string;
        volValue: string;
      }>;
    };
  };

  if (json.code !== "200000") throw new Error(`KuCoin API error code ${json.code}`);

  const result: Record<string, ExchangeTicker> = {};
  const symbolSet = new Set(symbols);
  const now = new Date().toISOString();

  for (const item of json.data.ticker) {
    if (!item.symbol.endsWith("-USDT")) continue;
    const asset = item.symbol.slice(0, -5);
    if (!symbolSet.has(asset)) continue;

    const bid = parseFloat(item.buy);
    const ask = parseFloat(item.sell);
    const last = parseFloat(item.last);
    const volume24h = parseFloat(item.volValue);

    if (!isNaN(bid) && !isNaN(ask) && !isNaN(last)) {
      result[asset] = { bid, ask, last, volume24h: isNaN(volume24h) ? 0 : volume24h, updatedAt: now };
    }
  }
  return result;
}

async function fetchHuobiPrices(symbols: string[]): Promise<Record<string, ExchangeTicker>> {
  const response = await fetch("https://api.huobi.pro/market/tickers", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Huobi responded with status ${response.status}`);
  const json = (await response.json()) as {
    status: string;
    data: Array<{
      symbol: string;
      bid: number;
      ask: number;
      close: number;
      amount: number;
    }>;
  };

  if (json.status !== "ok") throw new Error(`Huobi API error status ${json.status}`);

  const result: Record<string, ExchangeTicker> = {};
  const symbolSet = new Set(symbols);
  const now = new Date().toISOString();

  for (const item of json.data) {
    if (!item.symbol.endsWith("usdt")) continue;
    const asset = item.symbol.slice(0, -4).toUpperCase();
    if (!symbolSet.has(asset)) continue;

    const bid = item.bid;
    const ask = item.ask;
    const last = item.close;
    const volume24h = item.amount;

    if (!isNaN(bid) && !isNaN(ask) && !isNaN(last)) {
      result[asset] = { bid, ask, last, volume24h: isNaN(volume24h) ? 0 : volume24h, updatedAt: now };
    }
  }
  return result;
}

async function fetchKrakenPrices(symbols: string[]): Promise<Record<string, ExchangeTicker>> {
  // Kraken returns an error if any requested asset is unknown. Skip assets like BNB and MATIC which are not listed on Kraken.
  const krakenUnsupported = new Set(["BNB", "MATIC"]);
  const krakenSymbols = symbols.filter((s) => !krakenUnsupported.has(s));
  const pairQuery = krakenSymbols.map((s) => (s === "BTC" ? "XBTUSD" : `${s}USD`)).join(",");
  const response = await fetch(`https://api.kraken.com/0/public/Ticker?pair=${pairQuery}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Kraken responded with status ${response.status}`);
  const json = (await response.json()) as {
    error: string[];
    result: Record<
      string,
      {
        a: string[];
        b: string[];
        c: string[];
        v: string[];
      }
    >;
  };

  if (json.error && json.error.length > 0) {
    throw new Error(`Kraken API error: ${json.error.join(", ")}`);
  }

  const result: Record<string, ExchangeTicker> = {};
  const now = new Date().toISOString();

  const krakenKeyToSymbol = (key: string): string => {
    if (key === "XXBTZUSD" || key === "XBTUSD") return "BTC";
    if (key === "XETHZUSD" || key === "ETHUSD") return "ETH";
    if (key === "XXRPZUSD" || key === "XRPUSD") return "XRP";
    if (key === "XLTCZUSD" || key === "LTCUSD") return "LTC";
    if (key === "XDGUSD" || key === "DOGEUSD") return "DOGE";
    if (key.endsWith("USD")) return key.slice(0, -3);
    return key;
  };

  for (const [key, item] of Object.entries(json.result)) {
    const symbol = krakenKeyToSymbol(key);
    const bid = parseFloat(item.b[0]);
    const ask = parseFloat(item.a[0]);
    const last = parseFloat(item.c[0]);
    const volume24hBase = parseFloat(item.v[1]);

    if (!isNaN(bid) && !isNaN(ask) && !isNaN(last)) {
      const volume24h = isNaN(volume24hBase) ? 0 : volume24hBase * last;
      result[symbol] = { bid, ask, last, volume24h, updatedAt: now };
    }
  }
  return result;
}

async function fetchCoinbasePrices(symbols: string[]): Promise<Record<string, ExchangeTicker>> {
  const result: Record<string, ExchangeTicker> = {};
  const now = new Date().toISOString();

  // Query Coinbase ticker endpoints in parallel
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const response = await fetch(`https://api.exchange.coinbase.com/products/${symbol}-USD/ticker`, {
          headers: {
            Accept: "application/json",
            "User-Agent": "Crypto-Arbitrage-Terminal/1.0.0",
          },
          signal: AbortSignal.timeout(3000),
        });
        if (!response.ok) {
          if (response.status === 404) return; // Pair not supported on Coinbase
          throw new Error(`Coinbase ${symbol} ticker responded with status ${response.status}`);
        }
        const data = (await response.json()) as {
          price: string;
          bid: string;
          ask: string;
          volume: string;
        };

        const bid = parseFloat(data.bid);
        const ask = parseFloat(data.ask);
        const last = parseFloat(data.price);
        const volume24hBase = parseFloat(data.volume);

        if (!isNaN(bid) && !isNaN(ask) && !isNaN(last)) {
          const volume24h = isNaN(volume24hBase) ? 0 : volume24hBase * last;
          result[symbol] = { bid, ask, last, volume24h, updatedAt: now };
        }
      } catch (err) {
        logger.warn({ symbol, err }, "Failed to fetch Coinbase ticker, skipping pair");
      }
    })
  );

  return result;
}

// ==========================================
// CENTRALIZED MULTI-EXCHANGE DATA RETRIEVAL
// ==========================================

export async function getExchangePrices(): Promise<MultiExchangePrices> {
  const now = Date.now();

  if (process.env["USE_MOCK_PRICES"] === "true") {
    // If mocking is active, immediately simulate prices based on mock bases
    const result: MultiExchangePrices = {};
    const exchanges = ["binance", "coinbase", "kraken", "bybit", "okx", "kucoin", "huobi"];
    for (const ex of exchanges) {
      result[ex] = generateFallbackPricesForExchange(MOCK_BASE_PRICES, ex);
    }
    return result;
  }

  // Return cached result if TTL has not expired
  if (cachedMultiPrices && now < multiPricesExpiresAt) {
    return cachedMultiPrices;
  }

  const symbols = Object.keys(MOCK_BASE_PRICES);
  const results: MultiExchangePrices = {};

  // Fetch Binance first to serve as reference values for any fallbacks
  let binancePrices: Record<string, ExchangeTicker> = {};
  try {
    binancePrices = await fetchBinancePrices(symbols);
    results["binance"] = binancePrices;
    logger.debug({ count: Object.keys(binancePrices).length }, "Refreshed live prices from Binance");
  } catch (err) {
    logger.warn({ err }, "Failed to fetch live prices from Binance");
  }

  // Populate reference base prices (live Binance price or mock fallback)
  const fallbackBasePrices: Record<string, number> = {};
  for (const s of symbols) {
    fallbackBasePrices[s] = binancePrices[s]?.last ?? MOCK_BASE_PRICES[s]!;
  }

  // Fill in Binance itself with simulated values if fetch failed completely
  if (Object.keys(binancePrices).length === 0) {
    results["binance"] = generateFallbackPricesForExchange(fallbackBasePrices, "binance");
  }

  const otherExchanges = [
    { slug: "coinbase", fetcher: fetchCoinbasePrices },
    { slug: "kraken", fetcher: fetchKrakenPrices },
    { slug: "bybit", fetcher: fetchBybitPrices },
    { slug: "okx", fetcher: fetchOkxPrices },
    { slug: "kucoin", fetcher: fetchKucoinPrices },
    { slug: "huobi", fetcher: fetchHuobiPrices },
  ];

  await Promise.all(
    otherExchanges.map(async ({ slug, fetcher }) => {
      try {
        const prices = await fetcher(symbols);
        if (Object.keys(prices).length > 0) {
          results[slug] = prices;
          logger.debug({ slug, count: Object.keys(prices).length }, `Refreshed live prices from ${slug}`);
        } else {
          throw new Error("Empty ticker data returned");
        }
      } catch (err) {
        logger.warn({ slug, err }, `Failed to fetch live prices from ${slug}, using simulation fallback`);
        results[slug] = generateFallbackPricesForExchange(fallbackBasePrices, slug);
      }
    })
  );

  cachedMultiPrices = results;
  multiPricesExpiresAt = now + CACHE_TTL_MS;
  return results;
}

/**
 * Returns base prices (in USD) for all tracked crypto symbols.
 * Keep this for backward compatibility or individual ticker dependencies.
 */
export async function getBasePrices(): Promise<Record<string, number>> {
  const multiPrices = await getExchangePrices();
  const binancePrices = multiPrices["binance"] || {};
  const basePrices: Record<string, number> = {};
  for (const [symbol, ticker] of Object.entries(binancePrices)) {
    basePrices[symbol] = ticker.last;
  }
  return basePrices;
}
