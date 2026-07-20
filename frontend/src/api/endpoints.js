import { supabase } from "./supabaseClient";
import { mapAlertChannel, mapAsset, mapCheckResult, mapContentItem, mapIncident, mapMonitor } from "./mappers";
export async function fetchContentItems(pageSlug, sectionKey) {
  let query = supabase.from("content_items").select("*").eq("page_slug", pageSlug).order("sort_order", {
    ascending: true
  });
  if (sectionKey) query = query.eq("section_key", sectionKey);
  const {
    data,
    error
  } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapContentItem);
}
export async function fetchPlanCatalog() {
  const {
    data,
    error
  } = await supabase.from("plan_limits").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    plan: row.plan,
    maxMonitors: row.max_monitors,
    maxAlertChannels: row.max_alert_channels,
    historyDays: row.history_days,
    maxHosts: row.max_hosts ?? 1
  })).sort((a, b) => PLAN_ORDER.indexOf(a.plan) - PLAN_ORDER.indexOf(b.plan));
}
const PLAN_ORDER = ["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"];
async function currentOrganizationId() {
  const {
    data: {
      session
    }
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  // Resolved via the caller's membership row rather than a bare
  // `.from("organizations").single()` — a platform admin can see every
  // organization, which would otherwise make `.single()` ambiguous.
  const {
    data,
    error
  } = await supabase.from("memberships").select("organization_id").eq("user_id", session.user.id).single();
  if (error || !data) throw new Error(error?.message ?? "No organization found for the current user");
  return data.organization_id;
}
export async function fetchDashboardSummary() {
  const {
    data,
    error
  } = await supabase.rpc("get_dashboard_summary");
  if (error) throw new Error(error.message);
  const row = data[0];
  return {
    totalMonitors: row?.total_monitors ?? 0,
    upMonitors: row?.up_monitors ?? 0,
    downMonitors: row?.down_monitors ?? 0,
    openIncidents: row?.open_incidents ?? 0,
    totalAssets: row?.total_assets ?? 0,
    expiringSsl: row?.expiring_ssl ?? 0
  };
}
const MONITOR_SELECT = "*, asset:assets(*), sslInfo:ssl_info(*), securitySnapshot:security_snapshots(*)";

// The customer panel is tenant-scoped on purpose: a platform admin's RLS can
// see every organization's monitors, but embedded assets/ssl/security rows
// stay null for foreign orgs (no admin policy there) and the panel is about
// YOUR org anyway — cross-org oversight lives in the admin panel.
export async function fetchMonitors() {
  const organizationId = await currentOrganizationId();
  const {
    data,
    error
  } = await supabase.from("monitors").select(`${MONITOR_SELECT}, incidents(*)`).eq("organization_id", organizationId).eq("incidents.status", "OPEN").order("created_at", {
    ascending: false
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMonitor);
}
const DNS_MONITOR_SELECT = "*, incidents(*), latestCheck:check_results(*)";

// DNS monitors don't have SSL/security/asset data (those are HTTP-only), so
// this uses a leaner select than fetchMonitors — but it does embed each
// monitor's most recent check_results row so the DNS page can show the
// actually-resolved records without a second round trip per monitor.
export async function fetchDnsMonitors() {
  const organizationId = await currentOrganizationId();
  const {
    data,
    error
  } = await supabase.from("monitors").select(DNS_MONITOR_SELECT).eq("organization_id", organizationId).eq("check_type", "DNS").eq("incidents.status", "OPEN").order("checked_at", {
    referencedTable: "check_results",
    ascending: false
  }).limit(1, {
    referencedTable: "check_results"
  }).order("created_at", {
    ascending: false
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    ...mapMonitor(row),
    latestCheck: Array.isArray(row.latestCheck) && row.latestCheck[0] ? mapCheckResult(row.latestCheck[0]) : null
  }));
}
export async function fetchMonitor(id) {
  const {
    data,
    error
  } = await supabase.from("monitors").select(`${MONITOR_SELECT}, incidents(*)`).eq("id", id).order("started_at", {
    referencedTable: "incidents",
    ascending: false
  }).limit(20, {
    referencedTable: "incidents"
  }).single();
  if (error) throw new Error(error.message);
  return mapMonitor(data);
}
export async function fetchMonitorHistory(id, limit = 100) {
  const {
    data,
    error
  } = await supabase.from("check_results").select("*").eq("monitor_id", id).order("checked_at", {
    ascending: false
  }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCheckResult);
}
export async function createMonitor(input) {
  const {
    error
  } = await supabase.rpc("create_monitor", {
    p_name: input.name,
    p_url: input.url,
    p_interval: input.interval,
    p_check_type: input.checkType,
    p_expected_keyword: input.expectedKeyword ?? null,
    p_keyword_match_mode: input.keywordMatchMode ?? "CONTAINS",
    p_expected_status_code: input.expectedStatusCode ?? null,
    p_dns_record_type: input.dnsRecordType ?? "A",
    p_dns_expected_value: input.dnsExpectedValue ?? null,
    p_tcp_port: input.tcpPort ?? null
  });
  if (error) throw new Error(error.message);
}
export async function updateMonitor(id, input) {
  const {
    error
  } = await supabase.from("monitors").update({
    name: input.name,
    interval: input.interval,
    is_active: input.isActive
  }).eq("id", id);
  if (error) throw new Error(error.message);
}
export async function createCheckoutSession(plan) {
  const {
    data,
    error
  } = await supabase.functions.invoke("create-checkout", {
    body: {
      plan
    }
  });
  if (error) throw new Error(error.message);
  const url = data?.url;
  if (!url) throw new Error("No checkout URL returned.");
  return url;
}
export async function deleteMonitor(id) {
  const {
    error
  } = await supabase.rpc("delete_monitor", {
    p_monitor_id: id
  });
  if (error) throw new Error(error.message);
}
export async function fetchAssets() {
  const organizationId = await currentOrganizationId();
  const {
    data,
    error
  } = await supabase.from("assets").select("*, monitor:monitors(id, last_status)").eq("organization_id", organizationId).order("created_at", {
    ascending: false
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAsset);
}
export async function createAsset(input) {
  const organizationId = await currentOrganizationId();
  const {
    error
  } = await supabase.from("assets").insert({
    organization_id: organizationId,
    type: input.type,
    name: input.name,
    identifier: input.identifier,
    owner: input.owner,
    tags: input.tags
  });
  if (error) throw new Error(error.message);
}
export async function deleteAsset(id) {
  const {
    error
  } = await supabase.from("assets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
export async function fetchIncidents(status) {
  const organizationId = await currentOrganizationId();
  let query = supabase.from("incidents").select("*, monitor:monitors(id, name, url)").eq("organization_id", organizationId).order("started_at", {
    ascending: false
  }).limit(200);
  if (status) query = query.eq("status", status);
  const {
    data,
    error
  } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapIncident);
}
export async function fetchAlertChannels() {
  const organizationId = await currentOrganizationId();
  const {
    data,
    error
  } = await supabase.from("alert_channels").select("*").eq("organization_id", organizationId).order("created_at", {
    ascending: false
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAlertChannel);
}
export async function createAlertChannel(input) {
  const {
    error
  } = await supabase.rpc("create_alert_channel", {
    p_type: input.type,
    p_name: input.name,
    p_config: input.config
  });
  if (error) throw new Error(error.message);
}
export async function deleteAlertChannel(id) {
  const {
    error
  } = await supabase.from("alert_channels").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
export async function testAlertChannel(id) {
  const {
    error
  } = await supabase.functions.invoke("test-alert-channel", {
    body: {
      channelId: id
    }
  });
  if (error) throw new Error(error.message);
}
export async function fetchPlanUsage() {
  const {
    data,
    error
  } = await supabase.rpc("get_plan_usage");
  if (error) throw new Error(error.message);
  const row = data[0];
  if (!row) throw new Error("No organization found for the current user");
  return {
    plan: row.plan,
    maxMonitors: Number(row.max_monitors),
    currentMonitors: Number(row.current_monitors),
    maxAlertChannels: Number(row.max_alert_channels),
    currentAlertChannels: Number(row.current_alert_channels),
    historyDays: Number(row.history_days),
    maxMembers: Number(row.max_members),
    currentMembers: Number(row.current_members)
  };
}
export async function fetchOrganizationMembers() {
  const {
    data,
    error
  } = await supabase.rpc("list_organization_members");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    userId: row.user_id,
    email: row.email,
    role: row.role,
    joinedAt: row.joined_at,
    departmentId: row.department_id ?? null,
    departmentName: row.department_name ?? null,
    teamId: row.team_id ?? null,
    teamName: row.team_name ?? null,
    hasMfa: Boolean(row.has_mfa)
  }));
}

// ── Departments (Team & Plan) ───────────────────────────────────────────────

export async function fetchDepartments() {
  const { data, error } = await supabase.rpc("list_departments");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    managerUserId: row.manager_user_id ?? null,
    managerEmail: row.manager_email ?? null,
    memberCount: Number(row.member_count),
    archived: row.archived
  }));
}
export async function fetchDepartmentTrainingReport() {
  const { data, error } = await supabase.rpc("department_training_report");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    departmentId: row.department_id ?? null,
    departmentName: row.department_name,
    memberCount: Number(row.member_count),
    assignedCount: Number(row.assigned_count),
    completedCount: Number(row.completed_count),
    completionPct: row.completion_pct,
    avgScore: row.avg_score
  }));
}
export async function createDepartment(name) {
  const { data, error } = await supabase.rpc("create_department", { p_name: name });
  if (error) throw new Error(error.message);
  return data;
}
export async function renameDepartment(departmentId, name) {
  const { error } = await supabase.rpc("rename_department", { p_department_id: departmentId, p_name: name });
  if (error) throw new Error(error.message);
}
export async function archiveDepartment(departmentId) {
  const { error } = await supabase.rpc("archive_department", { p_department_id: departmentId });
  if (error) throw new Error(error.message);
}
export async function restoreDepartment(departmentId) {
  const { error } = await supabase.rpc("restore_department", { p_department_id: departmentId });
  if (error) throw new Error(error.message);
}
export async function deleteDepartment(departmentId) {
  const { error } = await supabase.rpc("delete_department", { p_department_id: departmentId });
  if (error) throw new Error(error.message);
}
export async function assignDepartmentManager(departmentId, userId) {
  const { error } = await supabase.rpc("assign_department_manager", { p_department_id: departmentId, p_user_id: userId ?? null });
  if (error) throw new Error(error.message);
}
export async function assignMemberDepartment(userId, departmentId) {
  const { error } = await supabase.rpc("assign_member_department", { p_user_id: userId, p_department_id: departmentId ?? null });
  if (error) throw new Error(error.message);
}

// ── Teams (within Departments) ──────────────────────────────────────────────

export async function fetchTeams(departmentId) {
  const { data, error } = await supabase.rpc("list_teams", { p_department_id: departmentId ?? null });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    departmentId: row.department_id,
    departmentName: row.department_name,
    name: row.name,
    leadUserId: row.lead_user_id ?? null,
    leadEmail: row.lead_email ?? null,
    memberCount: Number(row.member_count),
    archived: row.archived
  }));
}
export async function fetchTeamTrainingReport() {
  const { data, error } = await supabase.rpc("team_training_report");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    teamId: row.team_id,
    teamName: row.team_name,
    departmentName: row.department_name,
    memberCount: Number(row.member_count),
    assignedCount: Number(row.assigned_count),
    completedCount: Number(row.completed_count),
    completionPct: row.completion_pct,
    avgScore: row.avg_score
  }));
}
export async function createTeam(departmentId, name) {
  const { data, error } = await supabase.rpc("create_team", { p_department_id: departmentId, p_name: name });
  if (error) throw new Error(error.message);
  return data;
}
export async function renameTeam(teamId, name) {
  const { error } = await supabase.rpc("rename_team", { p_team_id: teamId, p_name: name });
  if (error) throw new Error(error.message);
}
export async function archiveTeam(teamId) {
  const { error } = await supabase.rpc("archive_team", { p_team_id: teamId });
  if (error) throw new Error(error.message);
}
export async function restoreTeam(teamId) {
  const { error } = await supabase.rpc("restore_team", { p_team_id: teamId });
  if (error) throw new Error(error.message);
}
export async function deleteTeam(teamId) {
  const { error } = await supabase.rpc("delete_team", { p_team_id: teamId });
  if (error) throw new Error(error.message);
}
export async function assignTeamLead(teamId, userId) {
  const { error } = await supabase.rpc("assign_team_lead", { p_team_id: teamId, p_user_id: userId ?? null });
  if (error) throw new Error(error.message);
}
export async function assignMemberTeam(userId, teamId) {
  const { error } = await supabase.rpc("assign_member_team", { p_user_id: userId, p_team_id: teamId ?? null });
  if (error) throw new Error(error.message);
}
export async function fetchOrgInvites() {
  const { data, error } = await supabase.rpc("list_org_invites");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    email: row.email,
    role: row.role,
    roleName: row.role_name,
    status: row.status,
    token: row.token,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    invitedByEmail: row.invited_by_email
  }));
}
export async function createOrgInvite(email, role) {
  const { data, error } = await supabase.rpc("create_org_invite", { p_email: email, p_role: role });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  return { id: row?.id, token: row?.token };
}
export async function revokeOrgInvite(inviteId) {
  const { error } = await supabase.rpc("revoke_org_invite", { p_invite_id: inviteId });
  if (error) throw new Error(error.message);
}
export async function sendOrgInviteEmail(inviteId) {
  const { data, error } = await supabase.functions.invoke("send-org-invite", { body: { inviteId } });
  if (error) throw new Error(error.message);
  return { sent: !!data?.sent, reason: data?.reason ?? null, inviteLink: data?.inviteLink };
}
export async function fetchInviteDetails(token) {
  const { data, error } = await supabase.rpc("get_invite_details", { p_token: token });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row || row.status === "not_found") return null;
  return {
    organizationName: row.organization_name,
    roleName: row.role_name,
    email: row.email,
    status: row.status
  };
}
export async function switchOrganizationViaInvite(token) {
  const { error } = await supabase.rpc("switch_organization_via_invite", { p_token: token });
  if (error) throw new Error(error.message);
}
export async function updateMemberRole(userId, role) {
  const { error } = await supabase.rpc("update_organization_member_role", { p_user_id: userId, p_role: role });
  if (error) throw new Error(error.message);
}
// ADMIN/MEMBER/READ_ONLY predate the named organization roles migration
// 0032 introduced (organization_administrator, it_manager, ...) and have
// been fully retired since migration 0055 — zero live memberships use them
// and new signups no longer get assigned them. Excluded here so they don't
// show up as confusing "(legacy)" duplicates next to their modern
// equivalent in every role picker; kept in the `roles` table itself only
// so any historical audit-log reference to them still resolves a name.
const RETIRED_ROLE_KEYS = ["ADMIN", "MEMBER", "READ_ONLY"];
export async function fetchOrgRoles() {
  // Reads the `roles` table directly rather than the admin_list_roles RPC
  // (which requires a platform-admin account) — system org roles have
  // organization_id = null, and the roles_select RLS policy (migration
  // 0032) already allows any authenticated user to read those.
  const { data, error } = await supabase
    .from("roles")
    .select("key, name, is_system")
    .eq("scope", "organization")
    .order("is_system", { ascending: false })
    .order("name");
  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter(row => !RETIRED_ROLE_KEYS.includes(row.key))
    .map(row => ({ key: row.key, name: row.name, isSystem: row.is_system }));
}
/**
 * Every module/action the current user's platform role (if any) and org
 * role (for `organizationId`) grant, as a `can(scope, module, action)`
 * checker. Used to gate nav items and in-page actions — the real boundary
 * is always the database RPC/RLS check, this just avoids showing a control
 * the user can't use.
 */
export async function fetchMyPermissions(organizationId) {
  const { data, error } = await supabase.rpc("my_permissions", { p_organization_id: organizationId ?? null });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return function can(scope, moduleKey, action) {
    const row = rows.find(r => r.scope === scope && r.module_key === moduleKey);
    if (!row) return false;
    const field = `can_${action}`;
    return !!row[field];
  };
}
export async function submitWaitlistSignup(input) {
  const {
    error
  } = await supabase.from("waitlist_signups").insert({
    email: input.email,
    product: input.product,
    note: input.note
  });
  if (error) throw new Error(error.message);
}
export async function submitContactMessage(input) {
  const {
    error
  } = await supabase.from("contact_messages").insert({
    name: input.name,
    email: input.email,
    topic: input.topic,
    message: input.message
  });
  if (error) throw new Error(error.message);
}
export async function submitResellerApplication(input) {
  const {
    error
  } = await supabase.from("reseller_applications").insert({
    company_name: input.companyName,
    contact_name: input.contactName,
    email: input.email,
    phone: input.phone || null,
    message: input.message || null
  });
  if (error) throw new Error(error.message);
}
export async function fetchStatusPageSettings() {
  const organizationId = await currentOrganizationId();
  const {
    data,
    error
  } = await supabase.from("organizations").select("status_page_enabled, status_page_slug, status_page_title").eq("id", organizationId).single();
  if (error) throw new Error(error.message);
  return {
    enabled: data.status_page_enabled ?? false,
    slug: data.status_page_slug ?? null,
    title: data.status_page_title ?? null
  };
}
export async function updateStatusPageSettings(input) {
  const {
    error
  } = await supabase.rpc("set_status_page", {
    p_enabled: input.enabled,
    p_slug: input.slug,
    p_title: input.title
  });
  if (error) throw new Error(error.message);
}

// --- Kada Nigrani host agents -------------------------------------------------

export async function listHostAgents() {
  const {
    data,
    error
  } = await supabase.rpc("list_host_agents");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    hostname: row.hostname ?? null,
    os: row.os ?? null,
    provider: row.provider ?? null,
    agentVersion: row.agent_version ?? null,
    ingestKey: row.ingest_key,
    lastSeenAt: row.last_seen_at ?? null,
    isOnline: Boolean(row.is_online),
    cpuPercent: row.cpu_percent,
    memPercent: row.mem_percent,
    diskPercent: row.disk_percent,
    uptimeSeconds: row.uptime_seconds,
    load1: row.load1,
    processCount: row.process_count,
    createdAt: row.created_at
  }));
}
export async function createHostAgent(input) {
  const {
    data,
    error
  } = await supabase.rpc("create_host_agent", {
    p_name: input.name,
    p_hostname: input.hostname ?? null,
    p_provider: input.provider ?? null
  });
  if (error) throw new Error(error.message);
  const row = data;
  return {
    id: row.id,
    name: row.name,
    hostname: row.hostname ?? null,
    os: row.os ?? null,
    provider: row.provider ?? null,
    agentVersion: row.agent_version ?? null,
    ingestKey: row.ingest_key,
    lastSeenAt: row.last_seen_at ?? null,
    isOnline: false,
    cpuPercent: null,
    memPercent: null,
    diskPercent: null,
    uptimeSeconds: null,
    load1: null,
    processCount: null,
    createdAt: row.created_at
  };
}
export async function fetchRunbookActions() {
  const {
    data,
    error
  } = await supabase.rpc("list_runbook_actions");
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => ({
    actionKey: r.action_key,
    label: r.label,
    description: r.description,
    risk: r.risk,
    needsArg: Boolean(r.needs_arg),
    argLabel: r.arg_label ?? null
  }));
}
export async function requestHostCommand(hostAgentId, actionKey, arg) {
  const {
    error
  } = await supabase.rpc("request_host_command", {
    p_host_agent_id: hostAgentId,
    p_action_key: actionKey,
    p_arg: arg ?? null
  });
  if (error) throw new Error(error.message);
}
export async function listHostCommands(hostAgentId) {
  const {
    data,
    error
  } = await supabase.rpc("list_host_commands", {
    p_host_agent_id: hostAgentId,
    p_limit: 20
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map(r => ({
    id: r.id,
    hostAgentId: r.host_agent_id,
    actionKey: r.action_key,
    arg: r.arg ?? null,
    status: r.status,
    exitCode: r.exit_code,
    output: r.output ?? null,
    createdAt: r.created_at,
    finishedAt: r.finished_at ?? null
  }));
}
export async function deleteHostAgent(id) {
  const {
    error
  } = await supabase.rpc("delete_host_agent", {
    p_id: id
  });
  if (error) throw new Error(error.message);
}
export async function regenerateHostAgentKey(id) {
  const {
    error
  } = await supabase.rpc("regenerate_host_agent_key", {
    p_id: id
  });
  if (error) throw new Error(error.message);
}
export async function fetchHostMetrics(hostAgentId, limit = 60) {
  const {
    data,
    error
  } = await supabase.from("host_metrics").select("*").eq("host_agent_id", hostAgentId).order("recorded_at", {
    ascending: false
  }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    cpuPercent: row.cpu_percent,
    memPercent: row.mem_percent,
    memUsedMb: row.mem_used_mb,
    memTotalMb: row.mem_total_mb,
    diskPercent: row.disk_percent,
    diskUsedGb: row.disk_used_gb,
    diskTotalGb: row.disk_total_gb,
    uptimeSeconds: row.uptime_seconds,
    load1: row.load1,
    load5: row.load5,
    load15: row.load15,
    processCount: row.process_count,
    recordedAt: row.recorded_at
  }));
}

// Public — callable without auth (RPC is granted to anon). Returns null if the
// slug doesn't map to an enabled status page.
export async function fetchPublicStatusPage(slug) {
  const {
    data,
    error
  } = await supabase.rpc("get_public_status_page", {
    p_slug: slug
  });
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data;
  return {
    organizationName: row.organization_name,
    title: row.title,
    generatedAt: row.generated_at,
    services: (row.services ?? []).map(s => ({
      name: s.name,
      checkType: s.check_type,
      status: s.status,
      lastCheckedAt: s.last_checked_at
    }))
  };
}

// ── CyberSachet — security awareness training ──────────────────────────────

export async function fetchCybersachetLicense() {
  const { data, error } = await supabase.rpc("my_cybersachet_license");
  if (error) throw new Error(error.message);
  return !!data;
}

export async function fetchCybersachetCourses() {
  const { data, error } = await supabase.rpc("list_cybersachet_courses");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    level: row.level,
    estimatedMinutes: row.estimated_minutes,
    category: row.category,
    freeTier: row.free_tier,
    lessonCount: Number(row.lesson_count),
    quizQuestionCount: Number(row.quiz_question_count)
  }));
}

export async function fetchCourseModules(courseId) {
  const { data, error } = await supabase.rpc("list_course_modules", { p_course_id: courseId });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({ id: row.id, title: row.title, sortOrder: row.sort_order }));
}

export async function fetchCourseLessons(courseId) {
  const { data, error } = await supabase.rpc("list_course_lessons", { p_course_id: courseId });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    body: row.body,
    keyTakeaway: row.key_takeaway,
    sortOrder: row.sort_order,
    check: row.check_question ? { question: row.check_question, choices: row.check_choices } : null
  }));
}

export async function fetchCourseQuiz(courseId) {
  const { data, error } = await supabase.rpc("list_course_quiz", { p_course_id: courseId });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    question: row.question,
    choices: row.choices,
    questionType: row.question_type,
    sortOrder: row.sort_order
  }));
}

export async function fetchMyEnrollments() {
  const { data, error } = await supabase.rpc("my_cybersachet_enrollments");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    enrollmentId: row.enrollment_id,
    courseId: row.course_id,
    courseTitle: row.course_title,
    courseSlug: row.course_slug,
    level: row.level,
    estimatedMinutes: row.estimated_minutes,
    enrolledAt: row.enrolled_at,
    completedAt: row.completed_at,
    quizScore: row.quiz_score,
    lessonCount: Number(row.lesson_count),
    completedLessonCount: Number(row.completed_lesson_count)
  }));
}

export async function fetchMyLessonProgress(courseId) {
  const { data, error } = await supabase.rpc("my_lesson_progress", { p_course_id: courseId });
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map(row => row.lesson_id));
}

export async function fetchMyCybersachetAssignments() {
  const { data, error } = await supabase.rpc("my_cybersachet_assignments");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({ courseId: row.course_id, assignedAt: row.assigned_at, dueAt: row.due_at ?? null }));
}

function mapCertificateRow(row) {
  return {
    certificateNo: row.certificate_no,
    levelCode: row.level_code,
    averageScore: row.average_score,
    courseCount: row.course_count,
    hoursTrained: Number(row.hours_trained),
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at ?? null,
    certificateHash: row.certificate_hash ?? null
  };
}
export async function fetchMyCertificate() {
  const { data, error } = await supabase.rpc("my_cybersachet_certificate");
  if (error) throw new Error(error.message);
  return data && data.length > 0 ? mapCertificateRow(data[0]) : null;
}
export async function issueCybersachetCertificate() {
  const { data, error } = await supabase.rpc("issue_cybersachet_certificate");
  if (error) throw new Error(error.message);
  return mapCertificateRow(data[0]);
}
function mapCourseCertificateRow(row) {
  return {
    certificateNo: row.certificate_no,
    courseTitle: row.course_title,
    averageScore: row.average_score,
    hoursTrained: Number(row.hours_trained),
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at ?? null,
    certificateHash: row.certificate_hash ?? null
  };
}
export async function fetchMyCourseCertificate(courseId) {
  const { data, error } = await supabase.rpc("my_course_certificate", { p_course_id: courseId });
  if (error) throw new Error(error.message);
  return data && data.length > 0 ? mapCourseCertificateRow(data[0]) : null;
}
export async function issueCourseCertificate(courseId) {
  const { data, error } = await supabase.rpc("issue_course_certificate", { p_course_id: courseId });
  if (error) throw new Error(error.message);
  return mapCourseCertificateRow(data[0]);
}
export async function verifyCertificate(certificateNo) {
  const { data, error } = await supabase.rpc("verify_certificate", { p_certificate_no: certificateNo });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return null;
  return {
    valid: row.valid,
    userName: row.user_name,
    organizationName: row.organization_name,
    levelCode: row.level_code,
    courseTitle: row.course_title ?? null,
    averageScore: row.average_score,
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    revoked: row.revoked,
    certificateHash: row.certificate_hash ?? null
  };
}

export async function fetchOrganizationCertificates() {
  const { data, error } = await supabase.rpc("list_organization_certificates");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    certificateNo: row.certificate_no,
    userId: row.user_id,
    holderEmail: row.holder_email,
    holderName: row.holder_name ?? null,
    levelCode: row.level_code,
    courseTitle: row.course_title ?? null,
    averageScore: row.average_score,
    hoursTrained: Number(row.hours_trained),
    issuedAt: row.issued_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at ?? null,
    certificateHash: row.certificate_hash ?? null
  }));
}
export async function revokeCertificate(certificateNo) {
  const { error } = await supabase.rpc("revoke_certificate", { p_certificate_no: certificateNo });
  if (error) throw new Error(error.message);
}
export async function restoreCertificate(certificateNo) {
  const { error } = await supabase.rpc("restore_certificate", { p_certificate_no: certificateNo });
  if (error) throw new Error(error.message);
}

export async function enrollInCourse(courseId) {
  const { data, error } = await supabase.rpc("enroll_in_course", { p_course_id: courseId });
  if (error) throw new Error(error.message);
  return data;
}

export async function checkLessonAnswer(lessonId, choiceIndex) {
  const { data, error } = await supabase.rpc("check_lesson_answer", { p_lesson_id: lessonId, p_choice_index: choiceIndex });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function submitCourseQuiz(courseId, answers) {
  const { data, error } = await supabase.rpc("submit_quiz", { p_course_id: courseId, p_answers: answers });
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchMyCybersachetStats() {
  const { data, error } = await supabase.rpc("my_cybersachet_stats");
  if (error) throw new Error(error.message);
  const row = data?.[0];
  if (!row) return { completedCourses: 0, inProgressCourses: 0, avgScore: null, hoursTrained: 0, streakDays: 0, badges: [] };
  return {
    completedCourses: row.completed_courses,
    inProgressCourses: row.in_progress_courses,
    avgScore: row.avg_score,
    hoursTrained: Number(row.hours_trained),
    streakDays: row.streak_days,
    badges: row.badges ?? []
  };
}

export async function fetchCybersachetLeaderboard() {
  const { data, error } = await supabase.rpc("cybersachet_leaderboard");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    userId: row.user_id,
    userEmail: row.user_email,
    completedCount: row.completed_count,
    avgScore: row.avg_score,
    hoursTrained: Number(row.hours_trained),
    rank: row.rank
  }));
}

// ── Organization-admin training management (Team page) ─────────────────────
// Same RPCs a Reports/assignment panel needs, scoped to the caller's own
// organization via has_org_permission('training', ...) — no organization_id
// parameter, so nobody can pass someone else's org.

export async function fetchOrgCybersachetAssignments() {
  const { data, error } = await supabase.rpc("list_org_cybersachet_assignments");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    userId: row.user_id,
    userEmail: row.user_email,
    courseId: row.course_id,
    courseTitle: row.course_title,
    assignedAt: row.assigned_at,
    dueAt: row.due_at ?? null,
    completedAt: row.completed_at ?? null,
    quizScore: row.quiz_score ?? null
  }));
}
export async function assignCybersachetCourseToMember(userId, courseId, dueAt) {
  const { error } = await supabase.rpc("assign_cybersachet_course", { p_user_id: userId, p_course_id: courseId, p_due_at: dueAt ?? null });
  if (error) throw new Error(error.message);
}
export async function unassignCybersachetCourseFromMember(userId, courseId) {
  const { error } = await supabase.rpc("unassign_cybersachet_course", { p_user_id: userId, p_course_id: courseId });
  if (error) throw new Error(error.message);
}
export async function resetCybersachetProgress(userId, courseId) {
  const { error } = await supabase.rpc("reset_cybersachet_progress", { p_user_id: userId, p_course_id: courseId });
  if (error) throw new Error(error.message);
}