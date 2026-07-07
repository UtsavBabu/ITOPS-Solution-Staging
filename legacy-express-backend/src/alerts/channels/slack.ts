import { AlertEvent } from "../alertDispatcher";

export async function sendSlackAlert(cfg: { webhookUrl: string }, event: AlertEvent): Promise<void> {
  const emoji = event.type === "MONITOR_UP" ? ":white_check_mark:" : ":rotating_light:";
  const response = await fetch(cfg.webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: `${emoji} *${event.type.replace(/_/g, " ")}*\n${event.message}` }),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook responded with ${response.status}`);
  }
}
