// PostgREST rows are loosely typed at the client boundary; these mappers are
// the single place that translates snake_case columns into the app's types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any

export function mapAsset(row) {
  // RLS can null an embedded asset (e.g. a platform admin viewing a foreign
  // org's monitor). Degrade to a placeholder instead of killing the page.
  if (!row) {
    return {
      id: "",
      type: "OTHER",
      name: "—",
      identifier: "",
      owner: null,
      tags: [],
      createdAt: new Date(0).toISOString(),
      monitor: null
    };
  }
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    identifier: row.identifier,
    owner: row.owner,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    monitor: row.monitor ? {
      id: row.monitor.id,
      lastStatus: row.monitor.last_status
    } : null
  };
}
export function mapSslInfo(row) {
  if (!row) return null;
  return {
    issuer: row.issuer,
    subject: row.subject,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    daysRemaining: row.days_remaining,
    protocol: row.protocol,
    isValid: row.is_valid,
    errorMessage: row.error_message
  };
}
export function mapSecuritySnapshot(row) {
  if (!row) return null;
  return {
    score: row.score,
    headers: row.headers ?? {},
    missingHeaders: row.missing_headers ?? [],
    cookieIssues: row.cookie_issues ?? [],
    serverHeaderLeak: row.server_header_leak,
    checkedAt: row.checked_at
  };
}
export function mapIncident(row) {
  return {
    id: row.id,
    status: row.status,
    startedAt: row.started_at,
    resolvedAt: row.resolved_at,
    cause: row.cause,
    monitor: row.monitor ? {
      id: row.monitor.id,
      name: row.monitor.name,
      url: row.monitor.url
    } : row.monitor
  };
}
export function mapMonitor(row) {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    interval: row.interval,
    isActive: row.is_active,
    checkType: row.check_type ?? "HTTP",
    expectedKeyword: row.expected_keyword,
    keywordMatchMode: row.keyword_match_mode ?? "CONTAINS",
    expectedStatusCode: row.expected_status_code,
    dnsRecordType: row.dns_record_type ?? "A",
    dnsExpectedValue: row.dns_expected_value,
    tcpPort: row.tcp_port,
    lastStatus: row.last_status,
    lastCheckedAt: row.last_checked_at,
    nextCheckAt: row.next_check_at,
    consecutiveFails: row.consecutive_fails,
    createdAt: row.created_at,
    asset: mapAsset(row.asset),
    sslInfo: mapSslInfo(row.sslInfo ?? row.ssl_info ?? null),
    securitySnapshot: mapSecuritySnapshot(row.securitySnapshot ?? (Array.isArray(row.security_snapshots) ? row.security_snapshots[0] ?? null : row.security_snapshots) ?? null),
    incidents: Array.isArray(row.incidents) ? row.incidents.map(mapIncident) : undefined
  };
}
export function mapCheckResult(row) {
  return {
    id: row.id,
    status: row.status,
    statusCode: row.status_code,
    responseTimeMs: row.response_time_ms,
    errorMessage: row.error_message,
    redirectChain: row.redirect_chain ?? [],
    checkedAt: row.checked_at
  };
}
export function mapAlertChannel(row) {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    isActive: row.is_active,
    config: row.config ?? {},
    createdAt: row.created_at
  };
}
export function mapContentItem(row) {
  return {
    id: row.id,
    pageSlug: row.page_slug,
    sectionKey: row.section_key,
    itemKey: row.item_key,
    sortOrder: row.sort_order,
    title: row.title,
    subtitle: row.subtitle,
    body: row.body,
    status: row.status,
    href: row.href,
    metadata: row.metadata ?? {},
    isPublished: row.is_published
  };
}