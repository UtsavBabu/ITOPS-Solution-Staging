import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { ApiError } from "../middleware/errorHandler";

export const monitorsRouter = Router();
monitorsRouter.use(requireAuth);

const intervalEnum = z.enum(["THIRTY_SECONDS", "ONE_MINUTE", "FIVE_MINUTES", "FIFTEEN_MINUTES"]);

const createMonitorSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url(),
  interval: intervalEnum.default("FIVE_MINUTES"),
});

monitorsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const monitors = await prisma.monitor.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: { asset: true, sslInfo: true, securitySnapshot: true, incidents: { where: { status: "OPEN" } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(monitors);
  }),
);

monitorsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createMonitorSchema.parse(req.body);
    const organizationId = req.auth!.organizationId;

    const monitor = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.create({
        data: {
          organizationId,
          type: "WEBSITE",
          name: body.name,
          identifier: body.url,
        },
      });
      return tx.monitor.create({
        data: {
          organizationId,
          assetId: asset.id,
          name: body.name,
          url: body.url,
          interval: body.interval,
        },
        include: { asset: true },
      });
    });

    res.status(201).json(monitor);
  }),
);

monitorsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const monitor = await prisma.monitor.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      include: { asset: true, sslInfo: true, securitySnapshot: true, incidents: { orderBy: { startedAt: "desc" }, take: 20 } },
    });
    if (!monitor) throw new ApiError(404, "Monitor not found");
    res.json(monitor);
  }),
);

const updateMonitorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  interval: intervalEnum.optional(),
  isActive: z.boolean().optional(),
});

monitorsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = updateMonitorSchema.parse(req.body);
    const existing = await prisma.monitor.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!existing) throw new ApiError(404, "Monitor not found");

    const monitor = await prisma.monitor.update({ where: { id: existing.id }, data: body });
    res.json(monitor);
  }),
);

monitorsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.monitor.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!existing) throw new ApiError(404, "Monitor not found");

    await prisma.monitor.delete({ where: { id: existing.id } });
    await prisma.asset.delete({ where: { id: existing.assetId } }).catch(() => undefined);
    res.status(204).send();
  }),
);

monitorsRouter.get(
  "/:id/history",
  asyncHandler(async (req, res) => {
    const monitor = await prisma.monitor.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!monitor) throw new ApiError(404, "Monitor not found");

    const limit = Math.min(Number(req.query.limit ?? 100), 500);
    const history = await prisma.checkResult.findMany({
      where: { monitorId: monitor.id },
      orderBy: { checkedAt: "desc" },
      take: limit,
    });
    res.json(history);
  }),
);
