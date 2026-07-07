import nodemailer from "nodemailer";
import { config } from "../../config";
import { AlertEvent } from "../alertDispatcher";

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!config.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
}

export async function sendEmailAlert(cfg: { to: string }, event: AlertEvent): Promise<void> {
  const mailer = getTransporter();
  if (!mailer) {
    console.warn(`[email alert skipped: SMTP not configured] ${cfg.to}: ${event.message}`);
    return;
  }

  await mailer.sendMail({
    from: config.smtp.from,
    to: cfg.to,
    subject: `[ITOps Monitor] ${event.type.replace(/_/g, " ")} — ${event.monitor.name}`,
    text: event.message,
  });
}
