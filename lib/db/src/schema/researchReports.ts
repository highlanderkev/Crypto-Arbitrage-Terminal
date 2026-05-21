import { pgTable, serial, text, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const researchReportsTable = pgTable("research_reports", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id"),
  symbol: text("symbol").notNull(),
  buyExchange: text("buy_exchange"),
  sellExchange: text("sell_exchange"),
  spreadPct: real("spread_pct"),
  analysis: text("analysis").notNull(),
  confidence: text("confidence").notNull().default("medium"),
  recommendation: text("recommendation").notNull().default("monitor"),
  riskFactors: text("risk_factors").array().notNull().default([]),
  keyInsights: text("key_insights").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertResearchReportSchema = createInsertSchema(researchReportsTable).omit({ id: true, createdAt: true });
export type InsertResearchReport = z.infer<typeof insertResearchReportSchema>;
export type ResearchReport = typeof researchReportsTable.$inferSelect;
