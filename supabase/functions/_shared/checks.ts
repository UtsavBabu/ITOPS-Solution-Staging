// `fetch`/`AbortController`/`performance` are native to Deno and behave the
// same as Node. Certificate inspection (below) is the one exception — see
// the comment on runSslCheck.
export type CheckStatus = "UP" | "DOWN" | "ERROR";

export interface DnsAnswer {
  data: string;
  ttl: number;
}

export interface HttpCheckResult {
  status: CheckStatus;
  statusCode?: number;
  responseTimeMs?: number;
  errorMessage?: string;
  redirectChain: string[];
  headers: Record<string, string>;
  setCookies: string[];
  body?: string;
  dnsAnswers?: DnsAnswer[];
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;
const USER_AGENT = "ITOpsMonitor/1.0 (+https://itops-monitor.local)";

// Cap how much of a response body we read for keyword matching, so a giant
// download can't exhaust the function's memory. 512 KB is plenty of HTML.
const MAX_BODY_BYTES = 512 * 1024;

export async function runHttpCheck(
  targetUrl: string,
  timeoutMs: number,
  options: { readBody?: boolean } = {},
): Promise<HttpCheckResult> {
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

      const location = response.headers.get("location");
      if (REDIRECT_STATUSES.has(response.status) && location) {
        clearTimeout(timer);
        await response.body?.cancel();
        redirectChain.push(currentUrl);
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      let body: string | undefined;
      if (options.readBody) {
        body = await readBoundedBody(response);
      } else {
        await response.body?.cancel();
      }
      clearTimeout(timer);

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
        body,
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

async function readBoundedBody(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (total < MAX_BODY_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        total += value.byteLength;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const merged = new Uint8Array(Math.min(total, MAX_BODY_BYTES));
  let offset = 0;
  for (const chunk of chunks) {
    const remaining = merged.length - offset;
    if (remaining <= 0) break;
    const slice = chunk.subarray(0, remaining);
    merged.set(slice, offset);
    offset += slice.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

// ---------------------------------------------------------------------------
// Advanced check types — all built on fetch / DNS-over-HTTPS, the primitives
// proven to work in the Supabase Edge Runtime.
// ---------------------------------------------------------------------------

export interface MonitorCheckConfig {
  checkType: "HTTP" | "KEYWORD" | "STATUS_CODE" | "DNS" | "TCP";
  expectedKeyword?: string | null;
  keywordMatchMode?: "CONTAINS" | "NOT_CONTAINS" | null;
  expectedStatusCode?: number | null;
  dnsRecordType?: string | null;
  dnsExpectedValue?: string | null;
  tcpPort?: number | null;
}

// Runs the right check for a monitor's configured type and returns a result
// shaped like an HTTP check (so the existing persistence path is unchanged).
export async function runMonitorCheck(
  target: string,
  timeoutMs: number,
  config: MonitorCheckConfig,
): Promise<HttpCheckResult> {
  switch (config.checkType) {
    case "KEYWORD":
      return runKeywordCheck(target, timeoutMs, config);
    case "STATUS_CODE":
      return runStatusCodeCheck(target, timeoutMs, config);
    case "DNS":
      return runDnsCheck(target, timeoutMs, config);
    case "TCP":
      return runTcpCheck(target, timeoutMs, config);
    case "HTTP":
    default:
      return runHttpCheck(target, timeoutMs);
  }
}

// Nagios check_tcp equivalent: opens a TCP connection to host:port and
// measures the handshake latency. Covers routers, switches, firewalls, DNS
// servers, printers — any device with a reachable service port. (ICMP ping
// and SNMP need raw sockets this runtime doesn't expose.)
async function runTcpCheck(
  target: string,
  timeoutMs: number,
  config: MonitorCheckConfig,
): Promise<HttpCheckResult> {
  const hostname = target.replace(/^[a-z]+:\/\//, "").replace(/[/:].*$/, "").trim();
  const port = config.tcpPort ?? 0;
  if (!hostname || port < 1 || port > 65535) {
    return emptyResult("ERROR", 0, "TCP check misconfigured: hostname and port 1-65535 required");
  }

  const start = performance.now();
  let timer: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Connection timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    const conn = (await Promise.race([Deno.connect({ hostname, port }), timeout])) as Deno.TcpConn;
    const responseTimeMs = Math.round(performance.now() - start);
    try {
      conn.close();
    } catch {
      /* already closed */
    }
    return emptyResult("UP", responseTimeMs);
  } catch (err) {
    const responseTimeMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : "Connection failed";
    return emptyResult("DOWN", responseTimeMs, `TCP ${hostname}:${port} — ${message}`);
  } finally {
    clearTimeout(timer);
  }
}

// Fetches the page and asserts the body does (or does not) contain a keyword.
// A transport error or non-2xx/3xx response still fails the check first.
async function runKeywordCheck(
  target: string,
  timeoutMs: number,
  config: MonitorCheckConfig,
): Promise<HttpCheckResult> {
  const result = await runHttpCheck(target, timeoutMs, { readBody: true });
  if (result.status !== "UP") return result;

  const keyword = (config.expectedKeyword ?? "").trim();
  if (!keyword) return result; // nothing to assert

  const mode = config.keywordMatchMode ?? "CONTAINS";
  const present = (result.body ?? "").includes(keyword);
  const passed = mode === "CONTAINS" ? present : !present;

  if (!passed) {
    return {
      ...result,
      status: "DOWN",
      errorMessage:
        mode === "CONTAINS"
          ? `Expected text not found on page: "${keyword}"`
          : `Unexpected text found on page: "${keyword}"`,
    };
  }
  return result;
}

// Asserts the endpoint returns one specific status code (e.g. 200, 201, 401).
async function runStatusCodeCheck(
  target: string,
  timeoutMs: number,
  config: MonitorCheckConfig,
): Promise<HttpCheckResult> {
  const result = await runHttpCheck(target, timeoutMs);
  if (result.status === "ERROR") return result;

  const expected = config.expectedStatusCode;
  if (expected == null) return result;

  if (result.statusCode !== expected) {
    return {
      ...result,
      status: "DOWN",
      errorMessage: `Expected HTTP ${expected}, got ${result.statusCode}`,
    };
  }
  // The endpoint returned exactly what we asked for — that's UP even if it's
  // a 4xx (e.g. an auth endpoint that should return 401).
  return { ...result, status: "UP" };
}

interface DohAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

const DNS_TYPE_CODES: Record<string, number> = { A: 1, NS: 2, CNAME: 5, MX: 15, TXT: 16, AAAA: 28 };

// Resolves a hostname over DNS-over-HTTPS (Google's public resolver) and
// asserts a record of the requested type exists — optionally matching a value.
async function runDnsCheck(
  hostname: string,
  timeoutMs: number,
  config: MonitorCheckConfig,
): Promise<HttpCheckResult> {
  const recordType = (config.dnsRecordType ?? "A").toUpperCase();
  const cleanHost = hostname.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(cleanHost)}&type=${encodeURIComponent(recordType)}`,
      { headers: { Accept: "application/dns-json" }, signal: controller.signal },
    );
    clearTimeout(timer);
    const responseTimeMs = Math.round(performance.now() - start);

    if (!response.ok) {
      return emptyResult("ERROR", responseTimeMs, `DNS resolver responded with ${response.status}`);
    }

    const data = await response.json();
    // Status 0 = NOERROR. Answers filtered to the requested record type.
    const wantCode = DNS_TYPE_CODES[recordType];
    const answers: DohAnswer[] = Array.isArray(data.Answer) ? data.Answer : [];
    const matchingRecords = answers.filter((a) => a.type === wantCode);

    if (data.Status !== 0 || matchingRecords.length === 0) {
      return emptyResult(
        "DOWN",
        responseTimeMs,
        `No ${recordType} record found for ${cleanHost}`,
      );
    }

    const dnsAnswers: DnsAnswer[] = matchingRecords.map((a) => ({ data: a.data, ttl: a.TTL }));

    const expected = (config.dnsExpectedValue ?? "").trim();
    if (expected) {
      const found = matchingRecords.some((a) => a.data.includes(expected));
      if (!found) {
        return emptyResult(
          "DOWN",
          responseTimeMs,
          `${recordType} record does not match expected value "${expected}" (got: ${matchingRecords
            .map((a) => a.data)
            .join(", ")})`,
          dnsAnswers,
        );
      }
    }

    return emptyResult("UP", responseTimeMs, undefined, dnsAnswers);
  } catch (err) {
    clearTimeout(timer);
    const message =
      err instanceof Error ? (err.name === "AbortError" ? "DNS lookup timed out" : err.message) : "Unknown error";
    return emptyResult("ERROR", Math.round(performance.now() - start), message);
  }
}

function emptyResult(
  status: CheckStatus,
  responseTimeMs: number,
  errorMessage?: string,
  dnsAnswers?: DnsAnswer[],
): HttpCheckResult {
  return { status, responseTimeMs, errorMessage, redirectChain: [], headers: {}, setCookies: [], dnsAnswers };
}

export interface SslCheckResult {
  isValid: boolean;
  issuer?: string;
  subject?: string;
  validFrom?: Date;
  validTo?: Date;
  daysRemaining?: number;
  protocol?: string;
  errorMessage?: string;
}

const WHOISJSON_API_KEY = Deno.env.get("WHOISJSON_API_KEY");

// Supabase's Edge Runtime has no API surface for reading TLS certificate
// details: native Deno.TlsConn.handshake() only returns an ALPN protocol
// string, and the one API that *does* expose issuer/expiry (node:tls's
// getPeerCertificate()) isn't supported in this runtime — confirmed by
// testing against a real deployed function, not just docs. So this calls
// whoisjson.com's SSL Certificate API (free tier: 1,000 req/month) instead
// of opening a raw socket. Field names are best-effort from their public
// docs — not yet verified against a live response, since that needs an API
// key I don't have. Worth double-checking the first time this runs for real.
export async function runSslCheck(targetUrl: string, timeoutMs: number): Promise<SslCheckResult> {
  let hostname: string;
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== "https:") {
      return { isValid: false, errorMessage: "Not an HTTPS URL" };
    }
    hostname = parsed.hostname;
  } catch {
    return { isValid: false, errorMessage: "Invalid URL" };
  }

  if (!WHOISJSON_API_KEY) {
    return { isValid: false, errorMessage: "SSL check skipped: WHOISJSON_API_KEY not configured" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`https://whoisjson.com/api/v1/ssl-cert-check?domain=${encodeURIComponent(hostname)}`, {
      headers: { Authorization: `TOKEN=${WHOISJSON_API_KEY}` },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      return { isValid: false, errorMessage: `SSL check API responded with ${response.status}` };
    }

    const data = await response.json();
    const validTo = data.valid_to ? new Date(data.valid_to) : undefined;
    const validFrom = data.valid_from ? new Date(data.valid_from) : undefined;
    const daysRemaining = validTo ? Math.floor((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : undefined;
    const issuer = data.issuer ? [data.issuer.CN, data.issuer.O].filter(Boolean).join(", ") : undefined;
    const subject = data.details?.subject ?? data.subject;

    return {
      isValid: Boolean(data.valid),
      issuer,
      subject: typeof subject === "string" ? subject : undefined,
      validFrom,
      validTo,
      daysRemaining,
      protocol: data.protocol,
    };
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? (err.name === "AbortError" ? "SSL check timed out" : err.message) : "Unknown error";
    return { isValid: false, errorMessage: message };
  }
}

export interface HeaderCheckResult {
  score: number;
  missingHeaders: string[];
  cookieIssues: string[];
  serverHeaderLeak?: string;
  headers: Record<string, string>;
}

const SECURITY_HEADERS: Array<{ header: string; weight: number }> = [
  { header: "strict-transport-security", weight: 20 },
  { header: "content-security-policy", weight: 25 },
  { header: "x-frame-options", weight: 15 },
  { header: "x-content-type-options", weight: 15 },
  { header: "referrer-policy", weight: 15 },
  { header: "permissions-policy", weight: 10 },
];

export function analyzeHeaders(headers: Record<string, string>, setCookies: string[]): HeaderCheckResult {
  const lowerHeaders = Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]));

  let score = 0;
  const missingHeaders: string[] = [];
  for (const { header, weight } of SECURITY_HEADERS) {
    if (lowerHeaders[header]) {
      score += weight;
    } else {
      missingHeaders.push(header);
    }
  }

  const cookieIssues: string[] = [];
  for (const cookie of setCookies) {
    const lower = cookie.toLowerCase();
    const name = cookie.split("=")[0]?.trim() || "cookie";
    if (!lower.includes("secure")) cookieIssues.push(`${name}: missing Secure flag`);
    if (!lower.includes("httponly")) cookieIssues.push(`${name}: missing HttpOnly flag`);
    if (!lower.includes("samesite")) cookieIssues.push(`${name}: missing SameSite attribute`);
  }

  const serverHeader = lowerHeaders["server"];
  const serverHeaderLeak = serverHeader && /\d/.test(serverHeader) ? serverHeader : undefined;

  return { score, missingHeaders, cookieIssues, serverHeaderLeak, headers: lowerHeaders };
}
