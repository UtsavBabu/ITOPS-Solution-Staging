import { CheckStatus } from "@prisma/client";

export interface HttpCheckResult {
  status: CheckStatus;
  statusCode?: number;
  responseTimeMs?: number;
  errorMessage?: string;
  redirectChain: string[];
  headers: Record<string, string>;
  setCookies: string[];
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;
const USER_AGENT = "ITOpsMonitor/1.0 (+https://itops-monitor.local)";

export async function runHttpCheck(targetUrl: string, timeoutMs: number): Promise<HttpCheckResult> {
  const redirectChain: string[] = [];
  let currentUrl = targetUrl;
  const start = performance.now();

  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: { "User-Agent": USER_AGENT },
      });
      clearTimeout(timer);

      const location = response.headers.get("location");
      if (REDIRECT_STATUSES.has(response.status) && location) {
        redirectChain.push(currentUrl);
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      const responseTimeMs = Math.round(performance.now() - start);
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      const setCookies =
        typeof (response.headers as { getSetCookie?: () => string[] }).getSetCookie === "function"
          ? (response.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
          : [];

      return {
        status: response.status < 400 ? "UP" : "DOWN",
        statusCode: response.status,
        responseTimeMs,
        redirectChain,
        headers,
        setCookies,
      };
    } catch (err) {
      clearTimeout(timer);
      const message =
        err instanceof Error ? (err.name === "AbortError" ? "Request timed out" : err.message) : "Unknown error";
      return { status: "ERROR", errorMessage: message, redirectChain, headers: {}, setCookies: [] };
    }
  }

  return { status: "ERROR", errorMessage: "Too many redirects", redirectChain, headers: {}, setCookies: [] };
}
