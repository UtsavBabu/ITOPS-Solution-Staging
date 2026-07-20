// Invoked on a schedule (pg_cron -> pg_net, see supabase/migrations/0002_cron.sql).
// Finds monitors due for a check, runs them with bounded concurrency, and
// writes results/incidents/alerts using the service role key (bypasses RLS
// by design — this is a trusted backend job, not a user request).
import { createClient } from "npm:@supabase/supabase-js@2";
import { analyzeHeaders, runMonitorCheck, runSslCheck } from "../_shared/checks.ts";
import { dispatchAlert } from "../_shared/alerts.ts";
import { recordCheckResult } from "../_shared/monitorResults.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const CHECK_TIMEOUT_MS = Number(Deno.env.get("CHECK_TIMEOUT_MS") ?? "10000");
const CHECK_CONCURRENCY = Number(Deno.env.get("CHECK_CONCURRENCY") ?? "10");
const FAILURE_THRESHOLD = Number(Deno.env.get("FAILURE_THRESHOLD") ?? "2");
const SSL_EXPIRY_WARNING_DAYS = Number(Deno.env.get("SSL_EXPIRY_WARNING_DAYS") ?? "14");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// deno-lint-ignore no-explicit-any
async function executeMonitorCheck(monitor: any): Promise<void> {
  const http = await runMonitorCheck(monitor.url, CHECK_TIMEOUT_MS, {
    checkType: monitor.check_type ?? "HTTP",
    expectedKeyword: monitor.expected_keyword,
    keywordMatchMode: monitor.keyword_match_mode,
    expectedStatusCode: monitor.expected_status_code,
    dnsRecordType: monitor.dns_record_type,
    dnsExpectedValue: monitor.dns_expected_value,
    tcpPort: monitor.tcp_port,
  });

  // SSL + security-header analysis only make sense for HTTPS website checks,
  // not DNS lookups or raw TCP connects.
  const isHttpFamily = monitor.check_type !== "DNS" && monitor.check_type !== "TCP";

  if (isHttpFamily && monitor.url.startsWith("https://")) {
    const { data: existing } = await supabase
      .from("ssl_info")
      .select("checked_at, last_alerted_at")
      .eq("monitor_id", monitor.id)
      .maybeSingle();

    // SSL checks go through a metered third-party API (see runSslCheck) and
    // certs don't move day to day, so this runs at most once/24h per monitor
    // regardless of how often the uptime check itself fires.
    const dueForSslCheck =
      !existing?.checked_at || Date.now() - new Date(existing.checked_at).getTime() > 24 * 60 * 60 * 1000;

    if (dueForSslCheck) {
      const ssl = await runSslCheck(monitor.url, CHECK_TIMEOUT_MS);

      await supabase.from("ssl_info").upsert(
        {
          organization_id: monitor.organization_id,
          monitor_id: monitor.id,
          issuer: ssl.issuer,
          subject: ssl.subject,
          valid_from: ssl.validFrom?.toISOString(),
          valid_to: ssl.validTo?.toISOString(),
          days_remaining: ssl.daysRemaining,
          protocol: ssl.protocol,
          is_valid: ssl.isValid,
          error_message: ssl.errorMessage,
        },
        { onConflict: "monitor_id" },
      );

      await maybeAlertOnSsl(monitor, ssl.daysRemaining, existing?.last_alerted_at ?? null);
    }
  }

  if (isHttpFamily && http.status === "UP") {
    const security = analyzeHeaders(http.headers, http.setCookies);
    await supabase.from("security_snapshots").upsert(
      {
        organization_id: monitor.organization_id,
        monitor_id: monitor.id,
        score: security.score,
        headers: security.headers,
        missing_headers: security.missingHeaders,
        cookie_issues: security.cookieIssues,
        server_header_leak: security.serverHeaderLeak,
      },
      { onConflict: "monitor_id" },
    );
  }

  await recordCheckResult(supabase, monitor, {
    status: http.status,
    statusCode: http.statusCode,
    responseTimeMs: http.responseTimeMs,
    errorMessage: http.errorMessage,
    redirectChain: http.redirectChain,
    dnsAnswers: http.dnsAnswers,
  }, { failureThreshold: FAILURE_THRESHOLD });
}

async function maybeAlertOnSsl(
  // deno-lint-ignore no-explicit-any
  monitor: any,
  daysRemaining: number | undefined,
  lastAlertedAt: string | null,
): Promise<void> {
  if (daysRemaining === undefined) return;

  const alreadyAlertedRecently = lastAlertedAt && Date.now() - new Date(lastAlertedAt).getTime() < 24 * 60 * 60 * 1000;
  if (alreadyAlertedRecently) return;

  if (daysRemaining <= 0) {
    await dispatchAlert(supabase, monitor.organization_id, {
      type: "SSL_EXPIRED",
      monitor,
      message: `SSL certificate for ${monitor.name} (${monitor.url}) has expired.`,
    });
    await supabase.from("ssl_info").update({ last_alerted_at: new Date().toISOString() }).eq("monitor_id", monitor.id);
  } else if (daysRemaining <= SSL_EXPIRY_WARNING_DAYS) {
    await dispatchAlert(supabase, monitor.organization_id, {
      type: "SSL_EXPIRING",
      monitor,
      message: `SSL certificate for ${monitor.name} (${monitor.url}) expires in ${daysRemaining} day(s).`,
    });
    await supabase.from("ssl_info").update({ last_alerted_at: new Date().toISOString() }).eq("monitor_id", monitor.id);
  }
}

Deno.serve(async (req) => {
  // Two layers: the platform's own JWT gate (verify_jwt, left on — any
  // validly-signed project JWT gets past it, which is why pg_cron still sends
  // Authorization: Bearer <service_role key>) and this app-level check against
  // a secret we mint and control ourselves (CRON_SECRET), rather than trying
  // to byte-compare the caller's token against the auto-injected
  // SUPABASE_SERVICE_ROLE_KEY — which is Supabase's to manage/rotate, not ours
  // to assume the exact value of.
  const providedSecret = req.headers.get("X-Cron-Secret");
  if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Monitors relayed via a Kada Nigrani agent (via_host_agent_id set) are the
  // agent's job, not the cloud's — the whole point is that the cloud can't
  // reach them directly. The agent picks those up itself via agent-commands.
  const { data: dueMonitors, error } = await supabase
    .from("monitors")
    .select("*")
    .eq("is_active", true)
    .is("via_host_agent_id", null)
    .lte("next_check_at", new Date().toISOString())
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const queue = [...(dueMonitors ?? [])];
  async function worker() {
    while (queue.length > 0) {
      const monitor = queue.shift();
      if (!monitor) break;
      try {
        await executeMonitorCheck(monitor);
      } catch (err) {
        console.error(`Check failed for monitor ${monitor.id} (${monitor.url}):`, err);
      }
    }
  }
  await Promise.all(Array.from({ length: CHECK_CONCURRENCY }, worker));

  return new Response(JSON.stringify({ checked: dueMonitors?.length ?? 0 }), {
    headers: { "Content-Type": "application/json" },
  });
});
