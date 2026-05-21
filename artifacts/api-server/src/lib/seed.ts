import { db, exchangesTable, watchlistTable, researchReportsTable } from "@workspace/db";
import { logger } from "./logger";
import { eq } from "drizzle-orm";

const EXCHANGES = [
  { name: "Binance", slug: "binance", makerFee: 0.001, takerFee: 0.001, isActive: true, websiteUrl: "https://binance.com" },
  { name: "Coinbase", slug: "coinbase", makerFee: 0.004, takerFee: 0.006, isActive: true, websiteUrl: "https://coinbase.com" },
  { name: "Kraken", slug: "kraken", makerFee: 0.0016, takerFee: 0.0026, isActive: true, websiteUrl: "https://kraken.com" },
  { name: "Bybit", slug: "bybit", makerFee: 0.001, takerFee: 0.001, isActive: true, websiteUrl: "https://bybit.com" },
  { name: "OKX", slug: "okx", makerFee: 0.0008, takerFee: 0.001, isActive: true, websiteUrl: "https://okx.com" },
  { name: "KuCoin", slug: "kucoin", makerFee: 0.001, takerFee: 0.001, isActive: true, websiteUrl: "https://kucoin.com" },
  { name: "Huobi", slug: "huobi", makerFee: 0.002, takerFee: 0.002, isActive: true, websiteUrl: "https://huobi.com" },
];

const WATCHLIST_DEFAULTS = ["BTC", "ETH", "SOL", "BNB", "XRP"];

export async function seedDatabase(): Promise<void> {
  try {
    // Seed exchanges if empty
    const existing = await db.select().from(exchangesTable);
    if (existing.length === 0) {
      await db.insert(exchangesTable).values(EXCHANGES);
      logger.info({ count: EXCHANGES.length }, "Seeded exchanges");
    }

    // Seed watchlist defaults if empty
    const existingWatchlist = await db.select().from(watchlistTable);
    if (existingWatchlist.length === 0) {
      await db.insert(watchlistTable).values(
        WATCHLIST_DEFAULTS.map((symbol) => ({ symbol, isActive: true })),
      );
      logger.info({ count: WATCHLIST_DEFAULTS.length }, "Seeded watchlist defaults");
    }

    // Seed a sample research report if none exist
    const existingReports = await db.select().from(researchReportsTable);
    if (existingReports.length === 0) {
      await db.insert(researchReportsTable).values([
        {
          opportunityId: null,
          symbol: "BTC",
          buyExchange: "binance",
          sellExchange: "coinbase",
          spreadPct: 0.32,
          analysis:
            "This Bitcoin arbitrage opportunity between Binance and Coinbase represents a 0.32% gross spread, which after accounting for taker fees on both platforms yields approximately 0.11% net. While seemingly modest, at scale this represents meaningful alpha. The primary execution risk lies in transfer times — moving BTC between exchanges typically requires 1-3 confirmations (10-30 minutes), during which the spread could narrow or reverse entirely. Optimal execution would require pre-funded accounts on both exchanges to enable simultaneous buy/sell execution. The spread is likely attributable to Coinbase's premium (well-documented in retail-heavy markets), driven by its higher fee structure, US regulatory compliance costs, and different liquidity pool composition. Volume depth analysis suggests the opportunity can absorb approximately $50,000-$100,000 before significant slippage. Monitoring over a rolling 24-hour window shows similar spreads persisting with 68% consistency, suggesting a structural rather than transient condition.",
          confidence: "medium",
          recommendation: "monitor",
          riskFactors: [
            "Transfer time risk: 10-30 min BTC confirmation window exposes position to spread reversal",
            "Liquidity depth limited to approximately $50k-$100k without significant slippage",
            "Coinbase premium may compress during institutional sell pressure",
            "Withdrawal limits on both exchanges may constrain position sizing",
          ],
          keyInsights: [
            "Coinbase premium is a well-documented structural feature, not a temporary anomaly",
            "Pre-funded dual-exchange accounts eliminate transfer risk entirely",
            "Net profit of ~0.11% requires minimum $10k position to be economically viable after flat fees",
            "Spread shows high persistence (68% over 24h), suggesting reliable monitoring opportunity",
          ],
        },
      ]);
      logger.info("Seeded sample research report");
    }
  } catch (err) {
    logger.error({ err }, "Seed error");
  }
}
