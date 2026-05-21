import { Router, type IRouter } from "express";
import { db, arbitrageOpportunitiesTable } from "@workspace/db";
import {
  ListArbitrageOpportunitiesQueryParams,
  ListArbitrageOpportunitiesResponse,
  GetArbitrageOpportunityParams,
  GetArbitrageOpportunityResponse,
  GetArbitrageSummaryResponse,
  ListArbitrageHistoryQueryParams,
  ListArbitrageHistoryResponse,
} from "@workspace/api-zod";
import { eq, desc, and, gte, ne, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/arbitrage/opportunities", async (req, res): Promise<void> => {
  const parsed = ListArbitrageOpportunitiesQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  const conditions = [eq(arbitrageOpportunitiesTable.status, "active")];

  if (params.symbol) {
    conditions.push(eq(arbitrageOpportunitiesTable.symbol, params.symbol.toUpperCase()));
  }
  if (params.minSpread) {
    conditions.push(gte(arbitrageOpportunitiesTable.spreadPct, params.minSpread));
  }

  const limit = params.limit ?? 50;

  const opportunities = await db
    .select()
    .from(arbitrageOpportunitiesTable)
    .where(and(...conditions))
    .orderBy(desc(arbitrageOpportunitiesTable.netProfitPct))
    .limit(limit);

  res.json(ListArbitrageOpportunitiesResponse.parse(opportunities));
});

router.get("/arbitrage/opportunities/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetArbitrageOpportunityParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [opp] = await db
    .select()
    .from(arbitrageOpportunitiesTable)
    .where(eq(arbitrageOpportunitiesTable.id, params.data.id));

  if (!opp) {
    res.status(404).json({ error: "Opportunity not found" });
    return;
  }

  res.json(GetArbitrageOpportunityResponse.parse(opp));
});

router.get("/arbitrage/summary", async (req, res): Promise<void> => {
  const active = await db
    .select()
    .from(arbitrageOpportunitiesTable)
    .where(eq(arbitrageOpportunitiesTable.status, "active"))
    .orderBy(desc(arbitrageOpportunitiesTable.netProfitPct));

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(arbitrageOpportunitiesTable)
    .where(gte(arbitrageOpportunitiesTable.detectedAt, dayAgo));

  const best = active[0];
  const avgSpread =
    active.length > 0 ? active.reduce((sum, o) => sum + o.spreadPct, 0) / active.length : 0;

  // Top symbols
  const symbolMap: Record<string, { count: number; totalSpread: number }> = {};
  for (const opp of active) {
    if (!symbolMap[opp.symbol]) symbolMap[opp.symbol] = { count: 0, totalSpread: 0 };
    symbolMap[opp.symbol].count++;
    symbolMap[opp.symbol].totalSpread += opp.spreadPct;
  }
  const topSymbols = Object.entries(symbolMap)
    .map(([symbol, s]) => ({ symbol, count: s.count, avgSpreadPct: parseFloat((s.totalSpread / s.count).toFixed(4)) }))
    .sort((a, b) => b.avgSpreadPct - a.avgSpreadPct)
    .slice(0, 5);

  // Top exchange pairs
  const pairMap: Record<string, { count: number; totalSpread: number }> = {};
  for (const opp of active) {
    const key = `${opp.buyExchange}__${opp.sellExchange}`;
    if (!pairMap[key]) pairMap[key] = { count: 0, totalSpread: 0 };
    pairMap[key].count++;
    pairMap[key].totalSpread += opp.spreadPct;
  }
  const topExchangePairs = Object.entries(pairMap)
    .map(([key, p]) => {
      const [buyExchange, sellExchange] = key.split("__");
      return { buyExchange, sellExchange, count: p.count, avgSpreadPct: parseFloat((p.totalSpread / p.count).toFixed(4)) };
    })
    .sort((a, b) => b.avgSpreadPct - a.avgSpreadPct)
    .slice(0, 5);

  const summary = {
    totalActive: active.length,
    bestSpreadPct: best?.spreadPct ?? 0,
    bestNetProfitPct: best?.netProfitPct ?? 0,
    bestSymbol: best?.symbol ?? "",
    bestBuyExchange: best?.buyExchangeName ?? "",
    bestSellExchange: best?.sellExchangeName ?? "",
    avgSpreadPct: parseFloat(avgSpread.toFixed(4)),
    totalOpportunitiesLast24h: Number(recentCount[0]?.count ?? 0),
    topSymbols,
    topExchangePairs,
  };

  res.json(GetArbitrageSummaryResponse.parse(summary));
});

router.get("/arbitrage/history", async (req, res): Promise<void> => {
  const parsed = ListArbitrageHistoryQueryParams.safeParse(req.query);
  const params = parsed.success ? parsed.data : {};

  const conditions = [ne(arbitrageOpportunitiesTable.status, "active")];
  if (params.symbol) {
    conditions.push(eq(arbitrageOpportunitiesTable.symbol, params.symbol.toUpperCase()));
  }

  const limit = params.limit ?? 100;

  const history = await db
    .select()
    .from(arbitrageOpportunitiesTable)
    .where(and(...conditions))
    .orderBy(desc(arbitrageOpportunitiesTable.detectedAt))
    .limit(limit);

  res.json(ListArbitrageHistoryResponse.parse(history));
});

export default router;
