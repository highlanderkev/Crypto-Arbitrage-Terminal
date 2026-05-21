import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const arbitrageOpportunitiesTable = pgTable("arbitrage_opportunities", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  buyExchange: text("buy_exchange").notNull(),
  buyExchangeName: text("buy_exchange_name").notNull(),
  sellExchange: text("sell_exchange").notNull(),
  sellExchangeName: text("sell_exchange_name").notNull(),
  buyPrice: real("buy_price").notNull(),
  sellPrice: real("sell_price").notNull(),
  spreadPct: real("spread_pct").notNull(),
  estimatedProfitUsd: real("estimated_profit_usd").notNull().default(0),
  buyFee: real("buy_fee").notNull().default(0),
  sellFee: real("sell_fee").notNull().default(0),
  netProfitPct: real("net_profit_pct").notNull().default(0),
  status: text("status").notNull().default("active"),
  detectedAt: timestamp("detected_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export const insertArbitrageOpportunitySchema = createInsertSchema(arbitrageOpportunitiesTable).omit({ id: true, detectedAt: true });
export type InsertArbitrageOpportunity = z.infer<typeof insertArbitrageOpportunitySchema>;
export type ArbitrageOpportunity = typeof arbitrageOpportunitiesTable.$inferSelect;
