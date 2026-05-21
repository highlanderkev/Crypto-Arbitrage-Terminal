import { Router, type IRouter } from "express";
import { db, exchangesTable } from "@workspace/db";
import { ListExchangesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/exchanges", async (req, res): Promise<void> => {
  const exchanges = await db.select().from(exchangesTable).orderBy(exchangesTable.name);
  res.json(ListExchangesResponse.parse(exchanges));
});

export default router;
