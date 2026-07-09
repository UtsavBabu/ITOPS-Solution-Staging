import { useMemo } from "react";
import type { CheckResult, Monitor } from "../api/types";

/**
 * Honest diagnosis engine. Every finding here is derived from telemetry the
 * platform actually collected — check results, status codes, error messages,
 * SSL info, response-time history, incident state. It never claims to inspect
 * anything it can't reach (a customer's Nginx config, their database internals)
 * and it never offers a remediation button that can't really execute; it gives
 * an operator a prioritized, evidence-backed starting point.
 */

type Severity = "critical" | "warning" | "healthy" | "info";

interface Finding {
  area: string;
  severity: Severity;
  diagnosis: string;
  evidence: string;
  suggestion: string;
}

interface Analysis {
  headline: string;
  overall: Severity;
  confidence: "high" | "medium" | "low";
  findings: Finding[];
}

const SEV_ORDER: Record<Severity, number> = { critical: 0, warning: 1, info: 2, healthy: 3 };

function classifyHttpFailure(code: number | null | undefined, error: string | null | undefined): { diagnosis: string; suggestion: string } {
  if (error) {
    const e = error.toLowerCase();
    if (e.includes("timed out") || e.includes("timeout")) {
      return {
        diagnosis: "The endpoint accepted no response within the timeout — the host is unreachable, overloaded, or dropping connections.",
        suggestion: "Confirm the server/process is running and not saturated (CPU, memory, connection pool). Check upstream firewall and load-balancer health.",
      };
    }
    if (e.includes("dns") || e.includes("name") || e.includes("resolve") || e.includes("getaddrinfo")) {
      return {
        diagnosis: "The hostname failed to resolve — a DNS problem, not an application problem.",
        suggestion: "Verify the domain's A/AAAA records and nameservers; check for a recent DNS change or expired domain.",
      };
    }
    if (e.includes("certificate") || e.includes("ssl") || e.includes("tls")) {
      return {
        diagnosis: "The TLS handshake failed — an SSL/certificate issue is blocking the connection.",
        suggestion: "Inspect the certificate below for expiry, hostname mismatch, or an incomplete chain.",
      };
    }
    if (e.includes("refused")) {
      return {
        diagnosis: "The connection was actively refused — nothing is listening on that port, or a firewall rejected it.",
        suggestion: "Confirm the service is running and bound to the expected port; review firewall/security-group rules.",
      };
    }
    if (e.includes("expected text") || e.includes("keyword") || e.includes("not found on page")) {
      return {
        diagnosis: "The site responded, but the expected content was missing — likely a broken deploy, an error page, or changed markup.",
        suggestion: "Open the page and compare against the expected content; check the last deployment and application logs.",
      };
    }
    if (e.includes("expected http")) {
      return {
        diagnosis: "The endpoint returned a different status code than required — the route or its behaviour changed.",
        suggestion: "Verify the endpoint still returns the expected code; check routing, auth, and recent application changes.",
      };
    }
  }
  if (code != null) {
    if (code >= 500) {
      return {
        diagnosis: `The server returned ${code} — the application or a downstream dependency is failing server-side.`,
        suggestion: "Check application and web-server error logs, and the health of databases/upstream services the request depends on.",
      };
    }
    if (code === 401 || code === 403) {
      return {
        diagnosis: `The server returned ${code} — the request was rejected as unauthorized or forbidden.`,
        suggestion: "Check auth configuration, expired tokens/keys, and any IP allow-lists or WAF rules.",
      };
    }
    if (code === 404) {
      return {
        diagnosis: "The server returned 404 — the URL no longer exists at that path.",
        suggestion: "Confirm the route; a recent deploy or routing change may have moved or removed it.",
      };
    }
    if (code === 429) {
      return {
        diagnosis: "The server returned 429 — requests are being rate-limited.",
        suggestion: "Reduce check frequency or review rate-limit / WAF thresholds for the monitoring source.",
      };
    }
    if (code >= 400) {
      return { diagnosis: `The server returned ${code} — the request was rejected client-side.`, suggestion: "Review the endpoint configuration and recent changes." };
    }
  }
  return { diagnosis: "The check failed for an unspecified reason.", suggestion: "Review the latest result details and application logs." };
}

export function analyzeMonitor(monitor: Monitor, history: CheckResult[]): Analysis {
  const findings: Finding[] = [];
  const latest = history[0];
  const isDown = monitor.lastStatus === "DOWN" || monitor.lastStatus === "ERROR";

  // ── Primary availability finding ─────────────────────────────
  if (isDown && latest) {
    if (monitor.checkType === "TCP") {
      findings.push({
        area: "Network reachability",
        severity: "critical",
        diagnosis: `Port ${monitor.tcpPort ?? "?"} on ${monitor.url} is not accepting TCP connections.`,
        evidence: latest.errorMessage ?? "Connection failed",
        suggestion: "Confirm the device/service is powered on and the port is open; check firewall rules and any NAT/port-forwarding in front of it.",
      });
    } else if (monitor.checkType === "DNS") {
      findings.push({
        area: "DNS",
        severity: "critical",
        diagnosis: `The ${monitor.dnsRecordType} record for ${monitor.url} is not resolving as expected.`,
        evidence: latest.errorMessage ?? "No matching record returned",
        suggestion: "Check the zone's records and nameservers; a recent DNS edit or propagation delay is the usual cause.",
      });
    } else {
      const c = classifyHttpFailure(latest.statusCode, latest.errorMessage);
      findings.push({
        area: "Availability",
        severity: "critical",
        diagnosis: c.diagnosis,
        evidence: latest.errorMessage ?? (latest.statusCode != null ? `HTTP ${latest.statusCode}` : "No response"),
        suggestion: c.suggestion,
      });
    }
  } else if (monitor.lastStatus === "UP") {
    findings.push({
      area: "Availability",
      severity: "healthy",
      diagnosis: "The endpoint is responding normally.",
      evidence: latest ? `Last check: ${latest.statusCode != null ? `HTTP ${latest.statusCode}, ` : ""}${latest.responseTimeMs ?? "—"} ms` : "Recent check passed",
      suggestion: "No action needed.",
    });
  }

  // ── SSL certificate finding ──────────────────────────────────
  if (monitor.sslInfo && monitor.sslInfo.daysRemaining != null) {
    const d = monitor.sslInfo.daysRemaining;
    if (d <= 0) {
      findings.push({ area: "SSL", severity: "critical", diagnosis: "The SSL certificate has expired.", evidence: `Expired ${Math.abs(d)} day(s) ago`, suggestion: "Renew and reinstall the certificate immediately; browsers are already rejecting the site." });
    } else if (d <= 14) {
      findings.push({ area: "SSL", severity: "warning", diagnosis: "The SSL certificate is close to expiry.", evidence: `${d} day(s) remaining · issuer ${monitor.sslInfo.issuer ?? "unknown"}`, suggestion: "Schedule renewal now to avoid an outage; enable auto-renewal if available (e.g. Let's Encrypt)." });
    } else {
      findings.push({ area: "SSL", severity: "healthy", diagnosis: "The SSL certificate is valid.", evidence: `${d} day(s) remaining`, suggestion: "No action needed." });
    }
  }

  // ── Security posture finding ─────────────────────────────────
  if (monitor.securitySnapshot) {
    const s = monitor.securitySnapshot.score;
    const missing = monitor.securitySnapshot.missingHeaders;
    if (s < 40) {
      findings.push({ area: "Security headers", severity: "warning", diagnosis: `Weak security posture (${s}/100). Key protective headers are missing.`, evidence: missing.length ? `Missing: ${missing.slice(0, 4).join(", ")}` : "Several headers absent", suggestion: "Add the missing headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options) at the web server or CDN." });
    } else if (s < 70) {
      findings.push({ area: "Security headers", severity: "info", diagnosis: `Moderate security posture (${s}/100).`, evidence: missing.length ? `Missing: ${missing.slice(0, 3).join(", ")}` : "Some headers absent", suggestion: "Add the remaining headers to reach a strong posture." });
    }
  }

  // ── Response-time trend finding (only when healthy/degrading) ─
  const timed = history.filter((h) => h.responseTimeMs != null).map((h) => h.responseTimeMs as number);
  if (!isDown && timed.length >= 6) {
    const recent = timed.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const older = timed.slice(-3).reduce((a, b) => a + b, 0) / 3;
    if (older > 0 && recent > older * 1.8 && recent > 800) {
      findings.push({ area: "Performance", severity: "warning", diagnosis: "Response time is trending noticeably slower than earlier checks.", evidence: `Recent ~${Math.round(recent)} ms vs earlier ~${Math.round(older)} ms`, suggestion: "Investigate load, slow queries, or a saturated upstream before it becomes an outage." });
    }
  }

  // ── Ordering + headline ──────────────────────────────────────
  findings.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  const overall = findings[0]?.severity ?? "info";
  const primary = findings.find((f) => f.severity === "critical") ?? findings.find((f) => f.severity === "warning") ?? findings[0];

  let headline: string;
  if (!latest) headline = "Not enough data yet — the first check hasn't completed.";
  else if (overall === "critical") headline = primary?.diagnosis ?? "The monitor is failing.";
  else if (overall === "warning") headline = primary?.diagnosis ?? "The monitor is up, but something needs attention.";
  else headline = "All checks are healthy. No issues detected from the collected telemetry.";

  // Confidence: high when the failing check carries a specific error; medium otherwise.
  const confidence: Analysis["confidence"] =
    isDown && latest?.errorMessage ? "high" : isDown ? "medium" : "high";

  return { headline, overall, confidence, findings };
}

const SEV_STYLE: Record<Severity, { dot: string; text: string; ring: string; label: string }> = {
  critical: { dot: "bg-red-400", text: "text-red-300", ring: "border-red-400/30", label: "Critical" },
  warning: { dot: "bg-amber-400", text: "text-amber-300", ring: "border-amber-400/30", label: "Warning" },
  info: { dot: "bg-cyan-400", text: "text-cyan-300", ring: "border-cyan-400/30", label: "Info" },
  healthy: { dot: "bg-emerald-400", text: "text-emerald-300", ring: "border-emerald-400/30", label: "Healthy" },
};

export function RootCauseAnalysis({ monitor, history }: { monitor: Monitor; history: CheckResult[] }) {
  const analysis = useMemo(() => analyzeMonitor(monitor, history), [monitor, history]);
  const top = SEV_STYLE[analysis.overall];

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60" aria-label="Root cause analysis">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-white">
          <svg className="h-4 w-4 text-cyan-300" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 3a9 9 0 100 18 9 9 0 000-18z" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Root Cause Analysis
        </h2>
        <span className="text-[11px] text-white/40">
          Confidence: <span className="text-white/70">{analysis.confidence}</span> · from {history.length} checks
        </span>
      </div>

      {/* Headline diagnosis */}
      <div className={`flex items-start gap-3 border-b border-white/10 px-4 py-4`}>
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${top.dot} ${analysis.overall !== "healthy" ? "[animation:pulse-glow_1.6s_ease-in-out_infinite]" : ""}`} />
        <div>
          <p className={`text-[11px] font-medium uppercase tracking-wide ${top.text}`}>{top.label} · Primary diagnosis</p>
          <p className="mt-1 text-sm leading-relaxed text-white/85">{analysis.headline}</p>
        </div>
      </div>

      {/* Findings */}
      <ul className="divide-y divide-white/[0.06]">
        {analysis.findings.map((f, i) => {
          const st = SEV_STYLE[f.severity];
          return (
            <li key={`${f.area}-${i}`} className="px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                <span className="text-sm font-medium text-white">{f.area}</span>
                <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.ring} ${st.text}`}>{st.label}</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-white/65">{f.diagnosis}</p>
              <p className="mt-1 text-xs text-white/40">
                <span className="text-white/55">Evidence:</span> {f.evidence}
              </p>
              {f.severity !== "healthy" && (
                <p className="mt-1 text-xs text-cyan-300/80">
                  <span className="text-white/55">Recommended next step:</span> {f.suggestion}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <p className="border-t border-white/10 px-4 py-2.5 text-[11px] text-white/30">
        Diagnosis is generated from collected check telemetry (status, errors, SSL, response times). It highlights the
        most probable cause and a starting point — it does not alter your systems.
      </p>
    </section>
  );
}
