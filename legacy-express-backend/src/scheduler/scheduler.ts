import cron from "node-cron";
import pLimit from "p-limit";
import { prisma } from "../lib/prisma";
import { config } from "../config";
import { executeMonitorCheck } from "../checks/runMonitorCheck";

let running = false;

async function runDueMonitors(): Promise<void> {
  if (running) return;
  running = true;

  try {
    const dueMonitors = await prisma.monitor.findMany({
      where: { isActive: true, nextCheckAt: { lte: new Date() } },
      take: 200,
    });

    if (dueMonitors.length === 0) return;

    const limit = pLimit(config.checkConcurrency);
    await Promise.allSettled(
      dueMonitors.map((monitor) =>
        limit(() =>
          executeMonitorCheck(monitor).catch((err) => {
            console.error(`Check failed for monitor ${monitor.id} (${monitor.url}):`, err);
          }),
        ),
      ),
    );
  } finally {
    running = false;
  }
}

export function startScheduler(): void {
  cron.schedule("*/10 * * * * *", () => {
    runDueMonitors().catch((err) => console.error("Scheduler tick failed:", err));
  });
  console.log("Monitor scheduler started (polling every 10s for due checks)");
}
