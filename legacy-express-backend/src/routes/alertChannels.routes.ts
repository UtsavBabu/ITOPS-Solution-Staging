import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { ApiError } from "../middleware/errorHandler";
import { sendEmailAlert } from "../alerts/channels/email";
import { sendSlackAlert } from "../alerts/channels/slack";
import { sendWebhookAlert } from "../alerts/channels/webhook";

export const alertChannelsRouter = Router();
alertChannelsRouter.use(requireAuth);

const emailConfig = z.object({ to: z.string().email() });
const slackConfig = z.object({ webhookUrl: z.string().url() });
const webhookConfig = z.object({ url: z.string().url() });

const createChannelSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("EMAIL"), name: z.string().min(1), config: emailConfig }),
  z.object({ type: z.literal("SLACK"), name: z.string().min(1), config: slackConfig }),
  z.object({ type: z.literal("WEBHOOK"), name: z.string().min(1), config: webhookConfig }),
]);

alertChannelsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const channels = await prisma.alertChannel.findMany({
      where: { organizationId: req.auth!.organizationId },
      orderBy: { createdAt: "desc" },
    });
    res.json(channels);
  }),
);

alertChannelsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createChannelSchema.parse(req.body);
    const channel = await prisma.alertChannel.create({
      data: { ...body, organizationId: req.auth!.organizationId },
    });
    res.status(201).json(channel);
  }),
);

const updateChannelSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

alertChannelsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const body = updateChannelSchema.parse(req.body);
    const existing = await prisma.alertChannel.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!existing) throw new ApiError(404, "Alert channel not found");

    const channel = await prisma.alertChannel.update({ where: { id: existing.id }, data: body });
    res.json(channel);
  }),
);

alertChannelsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.alertChannel.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!existing) throw new ApiError(404, "Alert channel not found");

    await prisma.alertChannel.delete({ where: { id: existing.id } });
    res.status(204).send();
  }),
);

alertChannelsRouter.post(
  "/:id/test",
  asyncHandler(async (req, res) => {
    const channel = await prisma.alertChannel.findFirst({
      where: { id: req.params.id, organizationId: req.auth!.organizationId },
    });
    if (!channel) throw new ApiError(404, "Alert channel not found");

    const testEvent = {
      type: "MONITOR_DOWN" as const,
      monitor: { id: "test", name: "Test Monitor", url: "https://example.com" },
      message: "This is a test alert from ITOps Monitor.",
    };

    if (channel.type === "EMAIL") await sendEmailAlert(channel.config as { to: string }, testEvent);
    if (channel.type === "SLACK") await sendSlackAlert(channel.config as { webhookUrl: string }, testEvent);
    if (channel.type === "WEBHOOK") await sendWebhookAlert(channel.config as { url: string }, testEvent);

    res.json({ ok: true });
  }),
);
