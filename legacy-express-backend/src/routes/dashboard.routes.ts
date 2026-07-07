import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const organizationId = req.auth!.organizationId;

    const [totalMonitors, upMonitors, downMonitors, openIncidents, totalAssets, expiringSsl] = await Promise.all([
      prisma.monitor.count({ where: { organizationId } }),
      prisma.monitor.count({ where: { organizationId, lastStatus: "UP" } }),
      prisma.monitor.count({ where: { organizationId, lastStatus: { in: ["DOWN", "ERROR"] } } }),
      prisma.incident.count({ where: { status: "OPEN", monitor: { organizationId } } }),
      prisma.asset.count({ where: { organizationId } }),
      prisma.sslInfo.count({
        where: {
          monitor: { organizationId },
          daysRemaining: { lte: 14 },
        },
      }),
    ]);

    res.json({ totalMonitors, upMonitors, downMonitors, openIncidents, totalAssets, expiringSsl });
  }),
);
