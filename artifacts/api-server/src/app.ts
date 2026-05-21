import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { scanArbitrageOpportunities } from "./lib/arbitrageEngine";
import { seedDatabase } from "./lib/seed";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", router);

// Seed DB and run initial scan on startup
seedDatabase()
  .then(() => scanArbitrageOpportunities())
  .catch((err) => logger.error({ err }, "Startup seed/scan failed"));
setInterval(() => {
  scanArbitrageOpportunities().catch((err) => logger.error({ err }, "Periodic arbitrage scan failed"));
}, 2 * 60 * 1000);

export default app;
