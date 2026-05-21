import { pgTable, serial, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const exchangesTable = pgTable("exchanges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  makerFee: real("maker_fee").notNull().default(0.001),
  takerFee: real("taker_fee").notNull().default(0.001),
  isActive: boolean("is_active").notNull().default(true),
  websiteUrl: text("website_url").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExchangeSchema = createInsertSchema(exchangesTable).omit({ id: true, createdAt: true });
export type InsertExchange = z.infer<typeof insertExchangeSchema>;
export type Exchange = typeof exchangesTable.$inferSelect;
