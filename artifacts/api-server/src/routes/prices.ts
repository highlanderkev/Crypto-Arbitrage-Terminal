import { Router, type IRouter } from "express";
import { db, exchangesTable } from "@workspace/db";
import { GetPricesQueryParams, GetPricesResponse } from "@workspace/api-zod";
import { getExchangePrices } from "../lib/priceService";

const router: IRouter = Router();

router.get("/prices", async (req, res): Promise<void> => {
  const parsed = GetPricesQueryParams.safeParse(req.query);
  const symbolFilter = parsed.success ? parsed.data.symbol?.toUpperCase() : undefined;

  const [exchanges, multiPrices] = await Promise.all([
    db.select().from(exchangesTable),
    getExchangePrices(),
  ]);

  const prices = [];
  for (const exchange of exchanges) {
    const exchangeTickers = multiPrices[exchange.slug];
    if (!exchangeTickers) continue;

    const symbols = symbolFilter ? [symbolFilter] : Object.keys(exchangeTickers);

    for (const symbol of symbols) {
      const ticker = exchangeTickers[symbol];
      if (!ticker) continue;

      prices.push({
        exchange: exchange.slug,
        exchangeName: exchange.name,
        symbol,
        bid: ticker.bid,
        ask: ticker.ask,
        last: ticker.last,
        volume24h: ticker.volume24h,
        updatedAt: ticker.updatedAt,
      });
    }
  }

  res.json(GetPricesResponse.parse(prices));
});

export default router;
