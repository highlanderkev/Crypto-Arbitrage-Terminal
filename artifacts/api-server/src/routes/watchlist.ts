import { Router, type IRouter } from "express";
import { db, watchlistTable } from "@workspace/db";
import {
  ListWatchlistResponse,
  AddToWatchlistBody,
  RemoveFromWatchlistParams,
} from "@workspace/api-zod";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/watchlist", async (_req, res): Promise<void> => {
  const items = await db
    .select()
    .from(watchlistTable)
    .orderBy(watchlistTable.createdAt);
  res.json(ListWatchlistResponse.parse(items));
});

router.post("/watchlist", async (req, res): Promise<void> => {
  const parsed = AddToWatchlistBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const symbol = parsed.data.symbol.toUpperCase();

  // Check for duplicate
  const existing = await db
    .select()
    .from(watchlistTable)
    .where(eq(watchlistTable.symbol, symbol));

  if (existing.length > 0) {
    res.status(409).json({ error: "Symbol already in watchlist" });
    return;
  }

  const [item] = await db
    .insert(watchlistTable)
    .values({ symbol, isActive: true })
    .returning();

  res.status(201).json(item);
});

router.delete("/watchlist/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = RemoveFromWatchlistParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(watchlistTable)
    .where(eq(watchlistTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Watchlist item not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
