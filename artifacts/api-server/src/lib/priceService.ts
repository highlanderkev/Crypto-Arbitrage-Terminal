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

const BINANCE_TICKER_URL = "https://api.binance.com/api/v3/ticker/price";

// Symbols we care about, expressed as Binance USDT pairs
const TRACKED_SYMBOLS = Object.keys(MOCK_BASE_PRICES);
const BINANCE_SYMBOLS = new Set(TRACKED_SYMBOLS.map((s) => `${s}USDT`));

// Simple in-memory cache
let cachedPrices: Record<string, number> | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

async function fetchLivePrices(): Promise<Record<string, number>> {
  const response = await fetch(BINANCE_TICKER_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(5_000),
  });

  if (!response.ok) {
    throw new Error(`Binance ticker API responded with ${response.status}`);
  }

  const data = (await response.json()) as Array<{ symbol: string; price: string }>;

  const prices: Record<string, number> = {};
  for (const { symbol, price } of data) {
    if (!BINANCE_SYMBOLS.has(symbol)) continue;
    const asset = symbol.slice(0, -4); // strip "USDT"
    const parsed = parseFloat(price);
    if (!isNaN(parsed) && parsed > 0) {
      prices[asset] = parsed;
    }
  }

  // Fill in any symbols missing from the live response with mock fallbacks
  for (const symbol of TRACKED_SYMBOLS) {
    if (!(symbol in prices)) {
      prices[symbol] = MOCK_BASE_PRICES[symbol]!;
      logger.warn({ symbol }, "Live price missing for symbol, using mock fallback");
    }
  }

  return prices;
}

/**
 * Returns base prices (in USD) for all tracked crypto symbols.
 *
 * - When `USE_MOCK_PRICES=true` is set (recommended for local dev), returns
 *   the hardcoded mock prices immediately without any network call.
 * - Otherwise, fetches live prices from Binance and caches them for 60 s.
 *   Falls back to mock prices if the fetch fails.
 */
export async function getBasePrices(): Promise<Record<string, number>> {
  if (process.env["USE_MOCK_PRICES"] === "true") {
    return { ...MOCK_BASE_PRICES };
  }

  const now = Date.now();
  if (cachedPrices && now < cacheExpiresAt) {
    return cachedPrices;
  }

  try {
    const prices = await fetchLivePrices();
    cachedPrices = prices;
    cacheExpiresAt = now + CACHE_TTL_MS;
    logger.debug({ symbols: Object.keys(prices).length }, "Live prices refreshed from Binance");
    return prices;
  } catch (err) {
    logger.warn({ err }, "Failed to fetch live prices from Binance, using mock fallback");
    return cachedPrices ?? { ...MOCK_BASE_PRICES };
  }
}
