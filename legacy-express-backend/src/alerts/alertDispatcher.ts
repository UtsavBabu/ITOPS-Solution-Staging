import { AlertChannel } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { sendEmailAlert } from "./channels/email";
import { sendSlackAlert } from "./channels/slack";
import { sendWebhookAlert } from "./channels/webhook";

export interface AlertEventMonitor {
  id: string;
  name: string;
  url: string;
}

export interface AlertEvent {
  type: "MONITOR_DOWN" | "MONITOR_UP" | "SSL_EXPIRING" | "SSL_EXPIRED";
  monitor: AlertEventMonitor;
  message: string;
}

export async function dispatchAlert(organizationId: string, event: AlertEvent): Promise<void> {
  const channels = await prisma.alertChannel.findMany({
    where: { organizationId, isActive: true },
  });

  await Promise.allSettled(channels.map((channel) => sendToChannel(channel, event)));
}

async function sendToChannel(channel: AlertChannel, event: AlertEvent): Promise<void> {
  try {
    switch (channel.type) {
      case "EMAIL":
        await sendEmailAlert(channel.config as { to: string }, event);
        break;
      case "SLACK":
        await sendSlackAlert(channel.config as { webhookUrl: string }, event);
        break;
      case "WEBHOOK":
        await sendWebhookAlert(channel.config as { url: string }, event);
        break;
    }
  } catch (err) {
    console.error(`Failed to send alert via channel ${channel.id} (${channel.type}):`, err);
  }
}
