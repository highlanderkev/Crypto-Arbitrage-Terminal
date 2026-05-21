import { Router, type IRouter } from "express";
import healthRouter from "./health";
import exchangesRouter from "./exchanges";
import pricesRouter from "./prices";
import arbitrageRouter from "./arbitrage";
import researchRouter from "./research";
import watchlistRouter from "./watchlist";
import openaiRouter from "./openai/index";

const router: IRouter = Router();

router.use(healthRouter);
router.use(exchangesRouter);
router.use(pricesRouter);
router.use(arbitrageRouter);
router.use(researchRouter);
router.use(watchlistRouter);
router.use(openaiRouter);

export default router;
