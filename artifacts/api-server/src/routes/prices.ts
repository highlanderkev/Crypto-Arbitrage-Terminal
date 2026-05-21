import { Router, type IRouter } from "express";
import { db, exchangesTable } from "@workspace/db";
import { GetPricesQueryParams, GetPricesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// Simulated base prices for major crypto pairs (in USD)
const BASE_PRICES: Record<string, number> = {
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

// Exchange-specific price biases (simulate different order books)
const EXCHANGE_BIAS: Record<string, number> = {
  binance: 0,
  coinbase: 0.0012,
  kraken: -0.0008,
  bybit: 0.0015,
  okx: -0.0005,
  kucoin: 0.0022,
  huobi: -0.0018,
};

function getSimulatedPrice(basePrice: number, exchangeSlug: string): { bid: number; ask: number; last: number; volume24h: number } {
  const bias = EXCHANGE_BIAS[exchangeSlug] ?? 0;
  // Add some random noise to simulate live price movement
  const noise = (Math.random() - 0.5) * 0.003;
  const spreadFactor = basePrice > 1000 ? 0.0005 : basePrice > 1 ? 0.001 : 0.005;

  const mid = basePrice * (1 + bias + noise);
  const half = mid * spreadFactor;

  return {
    bid: parseFloat((mid - half).toFixed(basePrice > 1 ? 2 : 6)),
    ask: parseFloat((mid + half).toFixed(basePrice > 1 ? 2 : 6)),
    last: parseFloat((mid + (Math.random() - 0.5) * half).toFixed(basePrice > 1 ? 2 : 6)),
    volume24h: parseFloat((basePrice * (Math.random() * 5000 + 1000)).toFixed(2)),
  };
}

router.get("/prices", async (req, res): Promise<void> => {
  const parsed = GetPricesQueryParams.safeParse(req.query);
  const symbolFilter = parsed.success ? parsed.data.symbol?.toUpperCase() : undefined;

  const exchanges = await db.select().from(exchangesTable).where(undefined);

  const symbols = symbolFilter ? [symbolFilter] : Object.keys(BASE_PRICES);
  const now = new Date();

  const prices = [];
  for (const exchange of exchanges) {
    for (const symbol of symbols) {
      const basePrice = BASE_PRICES[symbol];
      if (!basePrice) continue;
      const { bid, ask, last, volume24h } = getSimulatedPrice(basePrice, exchange.slug);
      prices.push({
        exchange: exchange.slug,
        exchangeName: exchange.name,
        symbol,
        bid,
        ask,
        last,
        volume24h,
        updatedAt: now.toISOString(),
      });
    }
  }

  res.json(GetPricesResponse.parse(prices));
});

export default router;
