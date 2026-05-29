import { db, arbitrageOpportunitiesTable, exchangesTable } from "@workspace/db";
import { logger } from "./logger";
import { getBasePrices } from "./priceService";
import { eq } from "drizzle-orm";

// Exchange-specific price biases
const EXCHANGE_BIASES: Record<string, number> = {
  binance: 0,
  coinbase: 0.0018,
  kraken: -0.0012,
  bybit: 0.0025,
  okx: -0.0008,
  kucoin: 0.0032,
  huobi: -0.0022,
};

function getAskPrice(basePrice: number, slug: string): number {
  const bias = EXCHANGE_BIASES[slug] ?? 0;
  const noise = (Math.random() - 0.5) * 0.004;
  const spreadFactor = basePrice > 1000 ? 0.0004 : 0.0008;
  const mid = basePrice * (1 + bias + noise);
  return mid * (1 + spreadFactor);
}

function getBidPrice(basePrice: number, slug: string): number {
  const bias = EXCHANGE_BIASES[slug] ?? 0;
  const noise = (Math.random() - 0.5) * 0.004;
  const spreadFactor = basePrice > 1000 ? 0.0004 : 0.0008;
  const mid = basePrice * (1 + bias + noise);
  return mid * (1 - spreadFactor);
}

export async function scanArbitrageOpportunities(): Promise<void> {
  try {
    const [exchanges, basePrices] = await Promise.all([
      db.select().from(exchangesTable),
      getBasePrices(),
    ]);
    if (exchanges.length < 2) return;

    const TRADE_SIZE_USD = 10000;
    const newOpps = [];

    for (const symbol of Object.keys(basePrices)) {
      const basePrice = basePrices[symbol];
      if (!basePrice) continue;

      // Compute ask/bid for each exchange
      const exchangePrices = exchanges.map((ex) => ({
        exchange: ex.slug,
        exchangeName: ex.name,
        ask: getAskPrice(basePrice, ex.slug),
        bid: getBidPrice(basePrice, ex.slug),
        takerFee: ex.takerFee,
      }));

      // Find best buy (lowest ask) and best sell (highest bid)
      for (let i = 0; i < exchangePrices.length; i++) {
        for (let j = 0; j < exchangePrices.length; j++) {
          if (i === j) continue;
          const buyEx = exchangePrices[i];
          const sellEx = exchangePrices[j];

          const spreadPct = ((sellEx.bid - buyEx.ask) / buyEx.ask) * 100;
          if (spreadPct < 0.1) continue; // Skip tiny spreads

          const buyFee = buyEx.takerFee * 100;
          const sellFee = sellEx.takerFee * 100;
          const netProfitPct = spreadPct - buyFee - sellFee;
          if (netProfitPct < 0) continue;

          const estimatedProfitUsd = (TRADE_SIZE_USD * netProfitPct) / 100;

          newOpps.push({
            symbol,
            buyExchange: buyEx.exchange,
            buyExchangeName: buyEx.exchangeName,
            sellExchange: sellEx.exchange,
            sellExchangeName: sellEx.exchangeName,
            buyPrice: parseFloat(buyEx.ask.toFixed(basePrice > 1 ? 2 : 6)),
            sellPrice: parseFloat(sellEx.bid.toFixed(basePrice > 1 ? 2 : 6)),
            spreadPct: parseFloat(spreadPct.toFixed(4)),
            estimatedProfitUsd: parseFloat(estimatedProfitUsd.toFixed(2)),
            buyFee: parseFloat(buyFee.toFixed(4)),
            sellFee: parseFloat(sellFee.toFixed(4)),
            netProfitPct: parseFloat(netProfitPct.toFixed(4)),
            status: "active",
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 min TTL
          });
        }
      }
    }

    if (newOpps.length === 0) return;

    // Expire old active opportunities
    await db
      .update(arbitrageOpportunitiesTable)
      .set({ status: "expired" })
      .where(eq(arbitrageOpportunitiesTable.status, "active"));

    // Insert top opportunities sorted by net profit
    const top = newOpps.sort((a, b) => b.netProfitPct - a.netProfitPct).slice(0, 30);
    await db.insert(arbitrageOpportunitiesTable).values(top);

    logger.info({ count: top.length }, "Arbitrage scan complete");
  } catch (err) {
    logger.error({ err }, "Arbitrage scan error");
  }
}
