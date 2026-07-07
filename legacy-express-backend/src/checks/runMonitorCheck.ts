import { Monitor } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { runHttpCheck } from "./httpCheck";
import { runSslCheck } from "./sslCheck";
import { analyzeHeaders } from "./headersCheck";
import { dispatchAlert } from "../alerts/alertDispatcher";

const INTERVAL_MS: Record<Monitor["interval"], number> = {
  THIRTY_SECONDS: 30_000,
  ONE_MINUTE: 60_000,
  FIVE_MINUTES: 5 * 60_000,
  FIFTEEN_MINUTES: 15 * 60_000,
};

export async function executeMonitorCheck(monitor: Monitor): Promise<void> {
  const http = await runHttpCheck(monitor.url, config.checkTimeoutMs);

  await prisma.checkResult.create({
    data: {
      monitorId: monitor.id,
      status: http.status,
      statusCode: http.statusCode,
      responseTimeMs: http.responseTimeMs,
      errorMessage: http.errorMessage,
      redirectChain: http.redirectChain,
    },
  });

  if (monitor.url.startsWith("https://")) {
    const ssl = await runSslCheck(monitor.url, config.checkTimeoutMs);
    const existing = await prisma.sslInfo.findUnique({ where: { monitorId: monitor.id } });

    await prisma.sslInfo.upsert({
      where: { monitorId: monitor.id },
      create: {
        monitorId: monitor.id,
        issuer: ssl.issuer,
        subject: ssl.subject,
        validFrom: ssl.validFrom,
        validTo: ssl.validTo,
        daysRemaining: ssl.daysRemaining,
        protocol: ssl.protocol,
        isValid: ssl.isValid,
        errorMessage: ssl.errorMessage,
      },
      update: {
        issuer: ssl.issuer,
        subject: ssl.subject,
        validFrom: ssl.validFrom,
        validTo: ssl.validTo,
        daysRemaining: ssl.daysRemaining,
        protocol: ssl.protocol,
        isValid: ssl.isValid,
        errorMessage: ssl.errorMessage,
      },
    });

    await maybeAlertOnSsl(monitor, ssl.daysRemaining, existing?.lastAlertedAt ?? null);
  }

  if (http.status === "UP") {
    const security = analyzeHeaders(http.headers, http.setCookies);
    await prisma.securitySnapshot.upsert({
      where: { monitorId: monitor.id },
      create: {
        monitorId: monitor.id,
        score: security.score,
        headers: security.headers,
        missingHeaders: security.missingHeaders,
        cookieIssues: security.cookieIssues,
        serverHeaderLeak: security.serverHeaderLeak,
      },
      update: {
        score: security.score,
        headers: security.headers,
        missingHeaders: security.missingHeaders,
        cookieIssues: security.cookieIssues,
        serverHeaderLeak: security.serverHeaderLeak,
      },
    });
  }

  await reconcileIncidentState(monitor, http.status);

  const now = new Date();
  await prisma.monitor.update({
    where: { id: monitor.id },
    data: {
      lastCheckedAt: now,
      lastStatus: http.status,
      nextCheckAt: new Date(now.getTime() + INTERVAL_MS[monitor.interval]),
      consecutiveFails: http.status === "UP" ? 0 : monitor.consecutiveFails + 1,
    },
  });
}

async function reconcileIncidentState(monitor: Monitor, status: "UP" | "DOWN" | "ERROR") {
  const openIncident = await prisma.incident.findFirst({
    where: { monitorId: monitor.id, status: "OPEN" },
  });

  if (status !== "UP") {
    const willFailCount = monitor.consecutiveFails + 1;
    if (!openIncident && willFailCount >= config.failureThreshold) {
      await prisma.incident.create({
        data: { monitorId: monitor.id, cause: status === "ERROR" ? "Connection error" : "Non-2xx/3xx response" },
      });
      await dispatchAlert(monitor.organizationId, {
        type: "MONITOR_DOWN",
        monitor,
        message: `${monitor.name} (${monitor.url}) appears to be down.`,
      });
    }
    return;
  }

  if (openIncident) {
    await prisma.incident.update({
      where: { id: openIncident.id },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    await dispatchAlert(monitor.organizationId, {
      type: "MONITOR_UP",
      monitor,
      message: `${monitor.name} (${monitor.url}) has recovered.`,
    });
  }
}

async function maybeAlertOnSsl(monitor: Monitor, daysRemaining: number | undefined, lastAlertedAt: Date | null) {
  if (daysRemaining === undefined) return;

  const alreadyAlertedRecently = lastAlertedAt && Date.now() - lastAlertedAt.getTime() < 24 * 60 * 60 * 1000;
  if (alreadyAlertedRecently) return;

  if (daysRemaining <= 0) {
    await dispatchAlert(monitor.organizationId, {
      type: "SSL_EXPIRED",
      monitor,
      message: `SSL certificate for ${monitor.name} (${monitor.url}) has expired.`,
    });
    await prisma.sslInfo.update({ where: { monitorId: monitor.id }, data: { lastAlertedAt: new Date() } });
  } else if (daysRemaining <= config.sslExpiryWarningDays) {
    await dispatchAlert(monitor.organizationId, {
      type: "SSL_EXPIRING",
      monitor,
      message: `SSL certificate for ${monitor.name} (${monitor.url}) expires in ${daysRemaining} day(s).`,
    });
    await prisma.sslInfo.update({ where: { monitorId: monitor.id }, data: { lastAlertedAt: new Date() } });
  }
}
