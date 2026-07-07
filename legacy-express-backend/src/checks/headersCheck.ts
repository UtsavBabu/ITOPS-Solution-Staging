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
