import { AlertEvent } from "../alertDispatcher";

export async function sendWebhookAlert(cfg: { url: string }, event: AlertEvent): Promise<void> {
  const response = await fetch(cfg.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: event.type,
      message: event.message,
      monitor: { id: event.monitor.id, name: event.monitor.name, url: event.monitor.url },
      timestamp: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook responded with ${response.status}`);
  }
}
