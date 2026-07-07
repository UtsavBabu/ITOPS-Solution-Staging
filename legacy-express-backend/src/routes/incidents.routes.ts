import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

export const incidentsRouter = Router();
incidentsRouter.use(requireAuth);

const querySchema = z.object({
  status: z.enum(["OPEN", "RESOLVED"]).optional(),
});

incidentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const { status } = querySchema.parse(req.query);
    const incidents = await prisma.incident.findMany({
      where: {
        status,
        monitor: { organizationId: req.auth!.organizationId },
      },
      include: { monitor: { select: { id: true, name: true, url: true } } },
      orderBy: { startedAt: "desc" },
      take: 200,
    });
    res.json(incidents);
  }),
);
