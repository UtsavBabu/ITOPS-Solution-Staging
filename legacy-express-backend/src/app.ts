import express from "express";
import cors from "cors";
import { config } from "./config";
import { authRouter } from "./routes/auth.routes";
import { monitorsRouter } from "./routes/monitors.routes";
import { assetsRouter } from "./routes/assets.routes";
import { incidentsRouter } from "./routes/incidents.routes";
import { alertChannelsRouter } from "./routes/alertChannels.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRouter);
  app.use("/api/monitors", monitorsRouter);
  app.use("/api/assets", assetsRouter);
  app.use("/api/incidents", incidentsRouter);
  app.use("/api/alert-channels", alertChannelsRouter);
  app.use("/api/dashboard", dashboardRouter);

  app.use((_req, res) => res.status(404).json({ error: "Not found" }));
  app.use(errorHandler);

  return app;
}
