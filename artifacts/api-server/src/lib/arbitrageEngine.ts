import { db, arbitrageOpportunitiesTable, exchangesTable } from "@workspace/db";
import { logger } from "./logger";
import { getExchangePrices } from "./priceService";
import { eq } from "drizzle-orm";

export async function scanArbitrageOpportunities(): Promise<void> {
  try {
    const [exchanges, multiPrices] = await Promise.all([
      db.select().from(exchangesTable),
      getExchangePrices(),
    ]);
    if (exchanges.length < 2) return;

    const TRADE_SIZE_USD = 10000;
    const newOpps = [];

    // Collect all unique symbols represented in the price feeds
    const symbols = new Set<string>();
    for (const exchangeSlug of Object.keys(multiPrices)) {
      for (const symbol of Object.keys(multiPrices[exchangeSlug] || {})) {
        symbols.add(symbol);
      }
    }

    for (const symbol of symbols) {
      // Collect prices for this symbol across all exchanges
      const exchangePrices = [];
      for (const ex of exchanges) {
        const ticker = multiPrices[ex.slug]?.[symbol];
        if (!ticker) continue;
        exchangePrices.push({
          exchange: ex.slug,
          exchangeName: ex.name,
          ask: ticker.ask,
          bid: ticker.bid,
          takerFee: ex.takerFee,
          last: ticker.last,
        });
      }

      if (exchangePrices.length < 2) continue;

      // Find arbitrage opportunities (where sell Bid > buy Ask)
      for (let i = 0; i < exchangePrices.length; i++) {
        for (let j = 0; j < exchangePrices.length; j++) {
          if (i === j) continue;
          const buyEx = exchangePrices[i];
          const sellEx = exchangePrices[j];

          const spreadPct = ((sellEx.bid - buyEx.ask) / buyEx.ask) * 100;
          if (spreadPct < 0.01) continue; // Skip tiny or negative spreads

          const buyFee = buyEx.takerFee * 100;
          const sellFee = sellEx.takerFee * 100;
          const netProfitPct = spreadPct - buyFee - sellFee;
          if (netProfitPct < 0) continue;

          const estimatedProfitUsd = (TRADE_SIZE_USD * netProfitPct) / 100;
          const precision = buyEx.last > 1 ? 2 : 6;

          newOpps.push({
            symbol,
            buyExchange: buyEx.exchange,
            buyExchangeName: buyEx.exchangeName,
            sellExchange: sellEx.exchange,
            sellExchangeName: sellEx.exchangeName,
            buyPrice: parseFloat(buyEx.ask.toFixed(precision)),
            sellPrice: parseFloat(sellEx.bid.toFixed(precision)),
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
