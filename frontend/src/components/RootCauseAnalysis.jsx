import { Link } from "react-router-dom";
import { useMemo } from "react";

/**
 * Honest diagnosis engine. Every finding here is derived from telemetry the
 * platform actually collected — check results, status codes, error messages,
 * SSL info, response-time history, incident state. It never claims to inspect
 * anything it can't reach (a customer's Nginx config, their database internals)
 * and it never offers a remediation button that can't really execute; it gives
 * an operator a prioritized, evidence-backed starting point.
 */

const SEV_ORDER = {
  critical: 0,
  warning: 1,
  info: 2,
  healthy: 3
};
function classifyHttpFailure(code, error) {
  if (error) {
    const e = error.toLowerCase();
    if (e.includes("timed out") || e.includes("timeout")) {
      return {
        diagnosis: "The endpoint accepted no response within the timeout — the host is unreachable, overloaded, or dropping connections.",
        suggestion: "Confirm the server/process is running and not saturated (CPU, memory, connection pool). Check upstream firewall and load-balancer health."
      };
    }
    if (e.includes("dns") || e.includes("name") || e.includes("resolve") || e.includes("getaddrinfo")) {
      return {
        diagnosis: "The hostname failed to resolve — a DNS problem, not an application problem.",
        suggestion: "Verify the domain's A/AAAA records and nameservers; check for a recent DNS change or expired domain."
      };
    }
    if (e.includes("certificate") || e.includes("ssl") || e.includes("tls")) {
      return {
        diagnosis: "The TLS handshake failed — an SSL/certificate issue is blocking the connection.",
        suggestion: "Inspect the certificate below for expiry, hostname mismatch, or an incomplete chain."
      };
    }
    if (e.includes("refused")) {
      return {
        diagnosis: "The connection was actively refused — nothing is listening on that port, or a firewall rejected it.",
        suggestion: "Confirm the service is running and bound to the expected port; review firewall/security-group rules."
      };
    }
    if (e.includes("expected text") || e.includes("keyword") || e.includes("not found on page")) {
      return {
        diagnosis: "The site responded, but the expected content was missing — likely a broken deploy, an error page, or changed markup.",
        suggestion: "Open the page and compare against the expected content; check the last deployment and application logs."
      };
    }
    if (e.includes("expected http")) {
      return {
        diagnosis: "The endpoint returned a different status code than required — the route or its behaviour changed.",
        suggestion: "Verify the endpoint still returns the expected code; check routing, auth, and recent application changes."
      };
    }
  }
  if (code != null) {
    if (code >= 500) {
      return {
        diagnosis: `The server returned ${code} — the application or a downstream dependency is failing server-side.`,
        suggestion: "Check application and web-server error logs, and the health of databases/upstream services the request depends on."
      };
    }
    if (code === 401 || code === 403) {
      return {
        diagnosis: `The server returned ${code} — the request was rejected as unauthorized or forbidden.`,
        suggestion: "Check auth configuration, expired tokens/keys, and any IP allow-lists or WAF rules."
      };
    }
    if (code === 404) {
      return {
        diagnosis: "The server returned 404 — the URL no longer exists at that path.",
        suggestion: "Confirm the route; a recent deploy or routing change may have moved or removed it."
      };
    }
    if (code === 429) {
      return {
        diagnosis: "The server returned 429 — requests are being rate-limited.",
        suggestion: "Reduce check frequency or review rate-limit / WAF thresholds for the monitoring source."
      };
    }
    if (code >= 400) {
      return {
        diagnosis: `The server returned ${code} — the request was rejected client-side.`,
        suggestion: "Review the endpoint configuration and recent changes."
      };
    }
  }
  return {
    diagnosis: "The check failed for an unspecified reason.",
    suggestion: "Review the latest result details and application logs."
  };
}
export function analyzeMonitor(monitor, history) {
  const findings = [];
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
        suggestion: monitor.viaHostAgentId ? "Confirm the device is powered on and the port is open on its LAN — this check runs from the Kada Nigrani agent on that network, not the cloud, so internet routing/NAT isn't the cause here." : "Confirm the device/service is powered on and the port is open; check firewall rules and any NAT/port-forwarding in front of it. If this device was never meant to have a public port (a home router, office switch, etc.), the cloud may simply be unable to reach it at all — relay this check through a Kada Nigrani agent on the same network instead of checking from outside."
      });
    } else if (monitor.checkType === "PING") {
      findings.push({
        area: "Network reachability",
        severity: "critical",
        diagnosis: `${monitor.url} is not responding to ICMP ping.`,
        evidence: latest.errorMessage ?? "No ping response",
        suggestion: "Confirm the device is powered on and reachable on its LAN from the agent relaying this check; some devices/firewalls are configured to drop ICMP entirely even when otherwise healthy — if that's expected for this device, a TCP check against a known-open port may be a more reliable signal."
      });
    } else if (monitor.checkType === "DNS") {
      findings.push({
        area: "DNS",
        severity: "critical",
        diagnosis: `The ${monitor.dnsRecordType} record for ${monitor.url} is not resolving as expected.`,
        evidence: latest.errorMessage ?? "No matching record returned",
        suggestion: "Check the zone's records and nameservers; a recent DNS edit or propagation delay is the usual cause."
      });
    } else {
      const c = classifyHttpFailure(latest.statusCode, latest.errorMessage);
      findings.push({
        area: "Availability",
        severity: "critical",
        diagnosis: c.diagnosis,
        evidence: latest.errorMessage ?? (latest.statusCode != null ? `HTTP ${latest.statusCode}` : "No response"),
        suggestion: c.suggestion
      });
    }
  } else if (monitor.lastStatus === "UP") {
    findings.push({
      area: "Availability",
      severity: "healthy",
      diagnosis: "The endpoint is responding normally.",
      evidence: latest ? `Last check: ${latest.statusCode != null ? `HTTP ${latest.statusCode}, ` : ""}${latest.responseTimeMs ?? "—"} ms` : "Recent check passed",
      suggestion: "No action needed."
    });
  }

  // ── SSL certificate finding ──────────────────────────────────
  if (monitor.sslInfo && monitor.sslInfo.daysRemaining != null) {
    const d = monitor.sslInfo.daysRemaining;
    if (d <= 0) {
      findings.push({
        area: "SSL",
        severity: "critical",
        diagnosis: "The SSL certificate has expired.",
        evidence: `Expired ${Math.abs(d)} day(s) ago`,
        suggestion: "Renew and reinstall the certificate immediately; browsers are already rejecting the site."
      });
    } else if (d <= 14) {
      findings.push({
        area: "SSL",
        severity: "warning",
        diagnosis: "The SSL certificate is close to expiry.",
        evidence: `${d} day(s) remaining · issuer ${monitor.sslInfo.issuer ?? "unknown"}`,
        suggestion: "Schedule renewal now to avoid an outage; enable auto-renewal if available (e.g. Let's Encrypt)."
      });
    } else {
      findings.push({
        area: "SSL",
        severity: "healthy",
        diagnosis: "The SSL certificate is valid.",
        evidence: `${d} day(s) remaining`,
        suggestion: "No action needed."
      });
    }
  }

  // ── Security posture finding ─────────────────────────────────
  if (monitor.securitySnapshot) {
    const s = monitor.securitySnapshot.score;
    const missing = monitor.securitySnapshot.missingHeaders;
    if (s < 40) {
      findings.push({
        area: "Security headers",
        severity: "warning",
        diagnosis: `Weak security posture (${s}/100). Key protective headers are missing.`,
        evidence: missing.length ? `Missing: ${missing.slice(0, 4).join(", ")}` : "Several headers absent",
        suggestion: "Add the missing headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options) at the web server or CDN."
      });
    } else if (s < 70) {
      findings.push({
        area: "Security headers",
        severity: "info",
        diagnosis: `Moderate security posture (${s}/100).`,
        evidence: missing.length ? `Missing: ${missing.slice(0, 3).join(", ")}` : "Some headers absent",
        suggestion: "Add the remaining headers to reach a strong posture."
      });
    }
  }

  // ── Response-time trend finding (only when healthy/degrading) ─
  const timed = history.filter(h => h.responseTimeMs != null).map(h => h.responseTimeMs);
  if (!isDown && timed.length >= 6) {
    const recent = timed.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const older = timed.slice(-3).reduce((a, b) => a + b, 0) / 3;
    if (older > 0 && recent > older * 1.8 && recent > 800) {
      findings.push({
        area: "Performance",
        severity: "warning",
        diagnosis: "Response time is trending noticeably slower than earlier checks.",
        evidence: `Recent ~${Math.round(recent)} ms vs earlier ~${Math.round(older)} ms`,
        suggestion: "Investigate load, slow queries, or a saturated upstream before it becomes an outage."
      });
    }
  }

  // ── Ordering + headline ──────────────────────────────────────
  findings.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  const overall = findings[0]?.severity ?? "info";
  const primary = findings.find(f => f.severity === "critical") ?? findings.find(f => f.severity === "warning") ?? findings[0];
  let headline;
  if (!latest) headline = "Not enough data yet — the first check hasn't completed.";else if (overall === "critical") headline = primary?.diagnosis ?? "The monitor is failing.";else if (overall === "warning") headline = primary?.diagnosis ?? "The monitor is up, but something needs attention.";else headline = "All checks are healthy. No issues detected from the collected telemetry.";

  // Confidence: high when the failing check carries a specific error; medium otherwise.
  const confidence = isDown && latest?.errorMessage ? "high" : isDown ? "medium" : "high";
  return {
    headline,
    overall,
    confidence,
    findings
  };
}
// Maps a finding area to concrete, prioritized remediation guidance. Honest:
// "automatable" is only true where a real Kada Nigrani agent runbook exists;
// everything else is advisory for a human operator.
function remediationFor(area) {
  switch (area) {
    case "Network reachability":
      return [{
        action: "Confirm the service/device is running and the port is open",
        estTime: "1–5 min",
        risk: "Low",
        requiresApproval: false,
        automatable: false
      }, {
        action: "Reload the web server (Nginx/Apache) on the host",
        estTime: "~30 sec",
        risk: "Low",
        requiresApproval: true,
        automatable: true
      }, {
        action: "Restart the affected system service",
        estTime: "~1 min",
        risk: "Medium",
        requiresApproval: true,
        automatable: true
      }];
    case "DNS":
      return [{
        action: "Verify A/AAAA records and nameservers at your DNS provider",
        estTime: "2–10 min",
        risk: "Low",
        requiresApproval: false,
        automatable: false
      }, {
        action: "Flush the resolver cache on the affected host",
        estTime: "~10 sec",
        risk: "Low",
        requiresApproval: true,
        automatable: false
      }];
    case "Availability":
      return [{
        action: "Reload web-server configuration",
        estTime: "~30 sec",
        risk: "Low",
        requiresApproval: true,
        automatable: true
      }, {
        action: "Restart the web server (Nginx/Apache)",
        estTime: "~1 min",
        risk: "Medium",
        requiresApproval: true,
        automatable: true
      }, {
        action: "Check application & upstream/database health",
        estTime: "5–15 min",
        risk: "Low",
        requiresApproval: false,
        automatable: false
      }];
    case "SSL":
      return [{
        action: "Renew and reinstall the TLS certificate",
        estTime: "5–15 min",
        risk: "Low",
        requiresApproval: true,
        automatable: false
      }, {
        action: "Enable auto-renewal (e.g. Let's Encrypt / certbot)",
        estTime: "one-time",
        risk: "Low",
        requiresApproval: false,
        automatable: false
      }];
    case "Security headers":
      return [{
        action: "Add missing security headers at the web server or CDN",
        estTime: "10–20 min",
        risk: "Low",
        requiresApproval: false,
        automatable: false
      }];
    case "Performance":
      return [{
        action: "Investigate slow queries / saturated upstream",
        estTime: "10–30 min",
        risk: "Low",
        requiresApproval: false,
        automatable: false
      }, {
        action: "Clear temporary files / rotate logs on the host",
        estTime: "~1 min",
        risk: "Low",
        requiresApproval: true,
        automatable: true
      }];
    default:
      return [];
  }
}
// Same honest-diagnosis discipline, applied to host agents instead of
// website/API monitors — every finding comes from telemetry the agent
// actually reported (CPU/mem/disk %, last report time), not guessed.
export function analyzeHost(host) {
  const findings = [];

  if (!host.lastSeenAt) {
    findings.push({
      area: "Agent connectivity",
      severity: "warning",
      diagnosis: "No report has ever been received from this host.",
      evidence: "No data since the host was added",
      suggestion: "Confirm the install command ran on the host and the ingest key matches — a typo in the key or a firewall blocking outbound HTTPS are the usual causes."
    });
  } else if (!host.isOnline) {
    const staleMinutes = Math.max(0, Math.round((Date.now() - new Date(host.lastSeenAt).getTime()) / 60000));
    findings.push({
      area: "Agent connectivity",
      severity: "critical",
      diagnosis: `The agent stopped reporting ${staleMinutes} minute${staleMinutes === 1 ? "" : "s"} ago.`,
      evidence: `Last report: ${new Date(host.lastSeenAt).toLocaleString()}`,
      suggestion: "Likely causes: the agent's cron job or process stopped, the host lost network egress to the ingest endpoint, the host was powered off or rebooted, or its ingest key was regenerated. Try a Ping runbook action first — if that doesn't respond either, the host itself needs a direct look."
    });
  } else {
    findings.push({
      area: "Agent connectivity",
      severity: "healthy",
      diagnosis: "The agent is reporting normally.",
      evidence: `Last report: ${new Date(host.lastSeenAt).toLocaleString()}`,
      suggestion: "No action needed."
    });
  }

  if (host.isOnline) {
    const resourceCheck = (label, value, area) => {
      if (value == null) return;
      if (value >= 90) {
        findings.push({
          area,
          severity: "critical",
          diagnosis: `${label} usage is critically high (${value.toFixed(0)}%).`,
          evidence: `${value.toFixed(0)}% at last report`,
          suggestion: area === "Disk" ? "Identify what's actually consuming space — large logs, old backups, unused Docker images. The agent's Clear Temp action only removes its own scratch files under /tmp, not a full fix on its own." : `Identify the top ${label.toLowerCase()}-consuming process on the host before deciding whether to restart the offending service or scale the host.`
        });
      } else if (value >= 70) {
        findings.push({
          area,
          severity: "warning",
          diagnosis: `${label} usage is elevated (${value.toFixed(0)}%).`,
          evidence: `${value.toFixed(0)}% at last report`,
          suggestion: "Worth investigating now, before it reaches critical."
        });
      }
    };
    resourceCheck("CPU", host.cpuPercent, "CPU");
    resourceCheck("Memory", host.memPercent, "Memory");
    resourceCheck("Disk", host.diskPercent, "Disk");
  }

  findings.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  const overall = findings[0]?.severity ?? "healthy";
  return { overall, findings };
}
// Remediation steps scoped to what a host agent can actually act on —
// "automatable" here only ever means a runbook action that's genuinely
// allowlisted (migration 0036: ping, clear_temp, restart_service, ...),
// same honesty rule as remediationFor() above.
function hostRemediationFor(area) {
  switch (area) {
    case "Agent connectivity":
      return [{
        action: "Run the Ping runbook action to confirm the agent is still alive",
        estTime: "~10 sec",
        risk: "Low",
        requiresApproval: true,
        automatable: true
      }, {
        action: "Check the agent's cron job / process directly on the host",
        estTime: "2–5 min",
        risk: "Low",
        requiresApproval: false,
        automatable: false
      }, {
        action: "Confirm outbound HTTPS to the ingest endpoint isn't blocked by a firewall",
        estTime: "2–5 min",
        risk: "Low",
        requiresApproval: false,
        automatable: false
      }];
    case "Disk":
      return [{
        action: "Clear the agent's own temp files",
        estTime: "~1 min",
        risk: "Low",
        requiresApproval: true,
        automatable: true
      }, {
        action: "Investigate and remove large logs, old backups, or unused Docker images",
        estTime: "10–30 min",
        risk: "Low",
        requiresApproval: false,
        automatable: false
      }];
    case "CPU":
    case "Memory":
      return [{
        action: "Identify the top resource-consuming process on the host",
        estTime: "5–10 min",
        risk: "Low",
        requiresApproval: false,
        automatable: false
      }, {
        action: "Restart the offending service",
        estTime: "~1 min",
        risk: "Medium",
        requiresApproval: true,
        automatable: true
      }];
    default:
      return [];
  }
}
const RISK_TEXT = {
  Low: "text-emerald-300 light:text-emerald-700",
  Medium: "text-amber-300 light:text-amber-700",
  High: "text-red-300 light:text-red-700"
};
const SEV_STYLE = {
  critical: {
    dot: "bg-red-400",
    text: "text-red-300 light:text-red-700",
    ring: "border-red-400/30 light:border-red-500/40 light:bg-red-50",
    label: "Critical"
  },
  warning: {
    dot: "bg-amber-400",
    text: "text-amber-300 light:text-amber-700",
    ring: "border-amber-400/30 light:border-amber-500/40 light:bg-amber-50",
    label: "Warning"
  },
  info: {
    dot: "bg-cyan-400",
    text: "text-cyan-300 light:text-cyan-700",
    ring: "border-cyan-400/30 light:border-cyan-500/40 light:bg-cyan-50",
    label: "Info"
  },
  healthy: {
    dot: "bg-emerald-400",
    text: "text-emerald-300 light:text-emerald-700",
    ring: "border-emerald-400/30 light:border-emerald-500/40 light:bg-emerald-50",
    label: "Healthy"
  }
};
export function RootCauseAnalysis({
  monitor,
  history
}) {
  const analysis = useMemo(() => analyzeMonitor(monitor, history), [monitor, history]);
  const top = SEV_STYLE[analysis.overall];
  return <section className="overflow-hidden rounded-2xl border border-white/10 light:border-slate-900/10 bg-neutral-900/60 light:bg-white" aria-label="Root cause analysis">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 light:border-slate-900/10 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-white light:text-slate-900">
          <svg className="h-4 w-4 text-cyan-300 light:text-cyan-600" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 3a9 9 0 100 18 9 9 0 000-18z" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          Root Cause Analysis
        </h2>
        <span className="text-[11px] text-white/40 light:text-slate-400">
          Confidence: <span className="text-white/70 light:text-slate-600">{analysis.confidence}</span> · from {history.length} checks
        </span>
      </div>

      {/* Headline diagnosis */}
      <div className={`flex items-start gap-3 border-b border-white/10 light:border-slate-900/10 px-4 py-4`}>
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${top.dot} ${analysis.overall !== "healthy" ? "[animation:pulse-glow_1.6s_ease-in-out_infinite]" : ""}`} />
        <div>
          <p className={`text-[11px] font-medium uppercase tracking-wide ${top.text}`}>{top.label} · Primary diagnosis</p>
          <p className="mt-1 text-sm leading-relaxed text-white/85 light:text-slate-700">{analysis.headline}</p>
        </div>
      </div>

      {/* Findings */}
      <ul className="divide-y divide-white/[0.06]">
        {analysis.findings.map((f, i) => {
        const st = SEV_STYLE[f.severity];
        return <li key={`${f.area}-${i}`} className="px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                <span className="text-sm font-medium text-white light:text-slate-900">{f.area}</span>
                <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.ring} ${st.text}`}>{st.label}</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-white/65 light:text-slate-600">{f.diagnosis}</p>
              <p className="mt-1 text-xs text-white/40 light:text-slate-400">
                <span className="text-white/55 light:text-slate-500">Evidence:</span> {f.evidence}
              </p>
              {f.severity !== "healthy" && <p className="mt-1 text-xs text-cyan-300/80 light:text-cyan-700">
                  <span className="text-white/55 light:text-slate-500">Recommended next step:</span> {f.suggestion}
                </p>}
            </li>;
      })}
      </ul>
      {/* Remediation for every actionable finding, not just the primary
          one — a monitor can be down AND have an expiring certificate at
          the same time, and both deserve their own "what to do" table. */}
      {(() => {
      const actionable = analysis.findings.filter(f => f.severity === "critical" || f.severity === "warning");
      if (actionable.length === 0) return null;
      return <div className="divide-y divide-white/10 light:divide-slate-900/10 border-t border-white/10 light:border-slate-900/10">
            {actionable.map((target, ti) => {
          const steps = remediationFor(target.area);
          if (steps.length === 0) return null;
          const st = SEV_STYLE[target.severity];
          return <div key={`${target.area}-${ti}`} className="px-4 py-4">
                  <p className="mb-2.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-white/45 light:text-slate-400">
                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                    Remediation · {target.area}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[520px] text-left text-xs">
                      <thead className="text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">
                        <tr>
                          <th className="pb-2 pr-3 font-medium">Action</th>
                          <th className="pb-2 pr-3 font-medium">Est. time</th>
                          <th className="pb-2 pr-3 font-medium">Risk</th>
                          <th className="pb-2 pr-3 font-medium">Approval</th>
                          <th className="pb-2 font-medium">Automation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06]">
                        {steps.map((s, i) => <tr key={i}>
                            <td className="py-2 pr-3 text-white/75 light:text-slate-600">{s.action}</td>
                            <td className="py-2 pr-3 text-white/50 light:text-slate-500">{s.estTime}</td>
                            <td className={`py-2 pr-3 ${RISK_TEXT[s.risk]}`}>{s.risk}</td>
                            <td className="py-2 pr-3 text-white/50 light:text-slate-500">{s.requiresApproval ? "Required" : "—"}</td>
                            <td className="py-2">
                              {s.automatable ? <Link to="/hosts" className="text-cyan-300 light:text-cyan-600 hover:underline">Open Server Agents →</Link> : <span className="text-white/30 light:text-slate-400">Manual</span>}
                            </td>
                          </tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>;
        })}
          </div>;
    })()}

      <p className="border-t border-white/10 light:border-slate-900/10 px-4 py-2.5 text-[11px] text-white/30 light:text-slate-400">
        Diagnosis is generated from collected check telemetry (status, errors, SSL, response times). A monitor isn't
        linked to a specific host agent, so “Open Server Agents” takes you to pick the right one yourself and run it
        from there (with approval and audit logging) — the rest are guidance. The platform never alters systems
        without an approved runbook.
      </p>
    </section>;
}

// Compact variant for a HostCard on the Hosts grid — same honest-diagnosis
// engine as above (analyzeHost), just fitted to a card instead of a full
// detail page. Only rendered when there's something to say (never for a
// clean, online, low-usage host — see the `hasIssue` gate at the call site).
export function HostDiagnosisPanel({ host, onOpenRunbooks }) {
  const analysis = useMemo(() => analyzeHost(host), [host]);
  const actionable = analysis.findings.filter(f => f.severity !== "healthy");
  if (actionable.length === 0) return null;
  return <div className="mt-3 space-y-2.5 rounded-xl border border-white/10 light:border-slate-900/10 bg-black/20 light:bg-slate-900/[0.03] p-3">
      {actionable.map((f, i) => {
      const st = SEV_STYLE[f.severity];
      const steps = hostRemediationFor(f.area);
      return <div key={`${f.area}-${i}`} className={i > 0 ? "border-t border-white/[0.06] pt-2.5" : ""}>
            <div className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
              <span className="text-xs font-medium text-white light:text-slate-900">{f.area}</span>
              <span className={`ml-auto rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${st.ring} ${st.text}`}>{st.label}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-white/60 light:text-slate-600">{f.diagnosis}</p>
            {steps.length > 0 && <ul className="mt-1.5 space-y-1">
                {steps.map((s, si) => <li key={si} className="flex items-center gap-1.5 text-[11px] text-white/50 light:text-slate-500">
                    <span className={`shrink-0 ${RISK_TEXT[s.risk]}`} aria-hidden>●</span>
                    <span className="flex-1">{s.action} <span className="text-white/30 light:text-slate-400">· {s.estTime}</span></span>
                    {s.automatable ? <button type="button" onClick={onOpenRunbooks} className="shrink-0 text-cyan-300 light:text-cyan-600 hover:underline">Run via agent →</button> : null}
                  </li>)}
              </ul>}
          </div>;
    })}
    </div>;
}