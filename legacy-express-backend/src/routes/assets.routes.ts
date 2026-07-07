import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { ApiError } from "../middleware/errorHandler";

export const assetsRouter = Router();
assetsRouter.use(requireAuth);

const assetTypeEnum = z.enum(["WEBSITE", "SERVER", "DATABASE", "OTHER"]);

assetsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const assets = await prisma.asset.findMany({
      where: { organizationId: req.auth!.organizationId },
      include: { monitor: { select: { id: true, lastStatus: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(assets);
  }),
);

const createAssetSchema = z.object({
  type: assetTypeEnum,
  name: z.string().min(1).max(200),
  identifier: z.string().min(1).max(300),
  owner: z.string().max(200).optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.unknown()).optional(),
});

assetsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createAssetSchema.parse(req.body);
    if (body.type === "WEBSITE") {
      throw new ApiError(400, "Website assets are created automatically via the Monitors API");
    }
    const asset = await prisma.asset.create({
      data: {
        ...body,
        organizationId: req.auth!.organizationId,
        metadata: body.metadata as Prisma.InputJsonValue | undefined,
      },
    });
    res.status(201).json(asset);
  }),
);

const updateAssetSchema = createAssetSchema.partial().omit({ type: true });

assetsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = updateAssetSchema.parse(req.body);
    const existing = await prisma.asset.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!existing) throw new ApiError(404, "Asset not found");

    const asset = await prisma.asset.update({
      where: { id: existing.id },
      data: { ...body, metadata: body.metadata as Prisma.InputJsonValue | undefined },
    });
    res.json(asset);
  }),
);

assetsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.asset.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
      include: { monitor: true },
    });
    if (!existing) throw new ApiError(404, "Asset not found");
    if (existing.monitor) {
      throw new ApiError(400, "Delete the associated monitor to remove this asset");
    }

    await prisma.asset.delete({ where: { id: existing.id } });
    res.status(204).send();
  }),
);
