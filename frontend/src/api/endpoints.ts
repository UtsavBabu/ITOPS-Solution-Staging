import { supabase } from "./supabaseClient";
import { mapAlertChannel, mapAsset, mapCheckResult, mapContentItem, mapIncident, mapMonitor } from "./mappers";
import type {
  AlertChannel,
  AlertChannelType,
  Asset,
  AssetType,
  CheckResult,
  ContactTopic,
  ContentItem,
  CreateMonitorInput,
  DashboardSummary,
  HostAgent,
  HostMetric,
  Incident,
  Monitor,
  MonitorInterval,
  OrganizationMember,
  Plan,
  PlanUsage,
  PublicStatusPage,
  StatusPageSettings,
  WaitlistProduct,
} from "./types";

export async function fetchContentItems(pageSlug: string, sectionKey?: string): Promise<ContentItem[]> {
  let query = supabase.from("content_items").select("*").eq("page_slug", pageSlug).order("sort_order", { ascending: true });
  if (sectionKey) query = query.eq("section_key", sectionKey);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapContentItem);
}

export interface PlanCatalogEntry {
  plan: Plan;
  maxMonitors: number;
  maxAlertChannels: number;
  historyDays: number;
  maxHosts: number;
}

export async function fetchPlanCatalog(): Promise<PlanCatalogEntry[]> {
  const { data, error } = await supabase.from("plan_limits").select("*");
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((row) => ({
      plan: row.plan as Plan,
      maxMonitors: row.max_monitors as number,
      maxAlertChannels: row.max_alert_channels as number,
      historyDays: row.history_days as number,
      maxHosts: (row.max_hosts as number) ?? 1,
    }))
    .sort((a, b) => PLAN_ORDER.indexOf(a.plan) - PLAN_ORDER.indexOf(b.plan));
}

const PLAN_ORDER: Plan[] = ["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"];

async function currentOrganizationId(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");

  // Resolved via the caller's membership row rather than a bare
  // `.from("organizations").single()` — a platform admin can see every
  // organization, which would otherwise make `.single()` ambiguous.
  const { data, error } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", session.user.id)
    .single();
  if (error || !data) throw new Error(error?.message ?? "No organization found for the current user");
  return data.organization_id as string;
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const { data, error } = await supabase.rpc("get_dashboard_summary");
  if (error) throw new Error(error.message);
  const row = (data as Record<string, number>[])[0];
  return {
    totalMonitors: row?.total_monitors ?? 0,
    upMonitors: row?.up_monitors ?? 0,
    downMonitors: row?.down_monitors ?? 0,
    openIncidents: row?.open_incidents ?? 0,
    totalAssets: row?.total_assets ?? 0,
    expiringSsl: row?.expiring_ssl ?? 0,
  };
}

const MONITOR_SELECT = "*, asset:assets(*), sslInfo:ssl_info(*), securitySnapshot:security_snapshots(*)";

export async function fetchMonitors(): Promise<Monitor[]> {
  const { data, error } = await supabase
    .from("monitors")
    .select(`${MONITOR_SELECT}, incidents(*)`)
    .eq("incidents.status", "OPEN")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMonitor);
}

export async function fetchMonitor(id: string): Promise<Monitor> {
  const { data, error } = await supabase
    .from("monitors")
    .select(`${MONITOR_SELECT}, incidents(*)`)
    .eq("id", id)
    .order("started_at", { referencedTable: "incidents", ascending: false })
    .limit(20, { referencedTable: "incidents" })
    .single();
  if (error) throw new Error(error.message);
  return mapMonitor(data);
}

export async function fetchMonitorHistory(id: string, limit = 100): Promise<CheckResult[]> {
  const { data, error } = await supabase
    .from("check_results")
    .select("*")
    .eq("monitor_id", id)
    .order("checked_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCheckResult);
}

export async function createMonitor(input: CreateMonitorInput): Promise<void> {
  const { error } = await supabase.rpc("create_monitor", {
    p_name: input.name,
    p_url: input.url,
    p_interval: input.interval,
    p_check_type: input.checkType,
    p_expected_keyword: input.expectedKeyword ?? null,
    p_keyword_match_mode: input.keywordMatchMode ?? "CONTAINS",
    p_expected_status_code: input.expectedStatusCode ?? null,
    p_dns_record_type: input.dnsRecordType ?? "A",
    p_dns_expected_value: input.dnsExpectedValue ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function updateMonitor(
  id: string,
  input: Partial<{ name: string; interval: MonitorInterval; isActive: boolean }>,
): Promise<void> {
  const { error } = await supabase
    .from("monitors")
    .update({ name: input.name, interval: input.interval, is_active: input.isActive })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteMonitor(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_monitor", { p_monitor_id: id });
  if (error) throw new Error(error.message);
}

export async function fetchAssets(): Promise<Asset[]> {
  const { data, error } = await supabase
    .from("assets")
    .select("*, monitor:monitors(id, last_status)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAsset);
}

export async function createAsset(input: {
  type: AssetType;
  name: string;
  identifier: string;
  owner?: string;
  tags: string[];
}): Promise<void> {
  const organizationId = await currentOrganizationId();
  const { error } = await supabase.from("assets").insert({
    organization_id: organizationId,
    type: input.type,
    name: input.name,
    identifier: input.identifier,
    owner: input.owner,
    tags: input.tags,
  });
  if (error) throw new Error(error.message);
}

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase.from("assets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchIncidents(status?: "OPEN" | "RESOLVED"): Promise<Incident[]> {
  let query = supabase
    .from("incidents")
    .select("*, monitor:monitors(id, name, url)")
    .order("started_at", { ascending: false })
    .limit(200);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapIncident);
}

export async function fetchAlertChannels(): Promise<AlertChannel[]> {
  const { data, error } = await supabase.from("alert_channels").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAlertChannel);
}

export async function createAlertChannel(input: {
  type: AlertChannelType;
  name: string;
  config: Record<string, string>;
}): Promise<void> {
  const { error } = await supabase.rpc("create_alert_channel", {
    p_type: input.type,
    p_name: input.name,
    p_config: input.config,
  });
  if (error) throw new Error(error.message);
}

export async function deleteAlertChannel(id: string): Promise<void> {
  const { error } = await supabase.from("alert_channels").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function testAlertChannel(id: string): Promise<void> {
  const { error } = await supabase.functions.invoke("test-alert-channel", { body: { channelId: id } });
  if (error) throw new Error(error.message);
}

export async function fetchPlanUsage(): Promise<PlanUsage> {
  const { data, error } = await supabase.rpc("get_plan_usage");
  if (error) throw new Error(error.message);
  const row = (data as Record<string, string | number>[])[0];
  if (!row) throw new Error("No organization found for the current user");
  return {
    plan: row.plan as PlanUsage["plan"],
    maxMonitors: Number(row.max_monitors),
    currentMonitors: Number(row.current_monitors),
    maxAlertChannels: Number(row.max_alert_channels),
    currentAlertChannels: Number(row.current_alert_channels),
    historyDays: Number(row.history_days),
  };
}

export async function fetchOrganizationMembers(): Promise<OrganizationMember[]> {
  const { data, error } = await supabase.rpc("list_organization_members");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, string>) => ({
    userId: row.user_id,
    email: row.email,
    role: row.role,
    joinedAt: row.joined_at,
  }));
}

export async function submitWaitlistSignup(input: { email: string; product: WaitlistProduct; note?: string }): Promise<void> {
  const { error } = await supabase.from("waitlist_signups").insert({
    email: input.email,
    product: input.product,
    note: input.note,
  });
  if (error) throw new Error(error.message);
}

export async function submitContactMessage(input: {
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
}): Promise<void> {
  const { error } = await supabase.from("contact_messages").insert({
    name: input.name,
    email: input.email,
    topic: input.topic,
    message: input.message,
  });
  if (error) throw new Error(error.message);
}

export async function fetchStatusPageSettings(): Promise<StatusPageSettings> {
  const organizationId = await currentOrganizationId();
  const { data, error } = await supabase
    .from("organizations")
    .select("status_page_enabled, status_page_slug, status_page_title")
    .eq("id", organizationId)
    .single();
  if (error) throw new Error(error.message);
  return {
    enabled: data.status_page_enabled ?? false,
    slug: data.status_page_slug ?? null,
    title: data.status_page_title ?? null,
  };
}

export async function updateStatusPageSettings(input: StatusPageSettings): Promise<void> {
  const { error } = await supabase.rpc("set_status_page", {
    p_enabled: input.enabled,
    p_slug: input.slug,
    p_title: input.title,
  });
  if (error) throw new Error(error.message);
}

// --- Kada Nigrani host agents -------------------------------------------------

export async function listHostAgents(): Promise<HostAgent[]> {
  const { data, error } = await supabase.rpc("list_host_agents");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    name: row.name as string,
    hostname: (row.hostname as string) ?? null,
    os: (row.os as string) ?? null,
    agentVersion: (row.agent_version as string) ?? null,
    ingestKey: row.ingest_key as string,
    lastSeenAt: (row.last_seen_at as string) ?? null,
    isOnline: Boolean(row.is_online),
    cpuPercent: row.cpu_percent as number | null,
    memPercent: row.mem_percent as number | null,
    diskPercent: row.disk_percent as number | null,
    uptimeSeconds: row.uptime_seconds as number | null,
    load1: row.load1 as number | null,
    processCount: row.process_count as number | null,
    createdAt: row.created_at as string,
  }));
}

export async function createHostAgent(input: { name: string; hostname?: string }): Promise<HostAgent> {
  const { data, error } = await supabase.rpc("create_host_agent", {
    p_name: input.name,
    p_hostname: input.hostname ?? null,
  });
  if (error) throw new Error(error.message);
  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    name: row.name as string,
    hostname: (row.hostname as string) ?? null,
    os: (row.os as string) ?? null,
    agentVersion: (row.agent_version as string) ?? null,
    ingestKey: row.ingest_key as string,
    lastSeenAt: (row.last_seen_at as string) ?? null,
    isOnline: false,
    cpuPercent: null,
    memPercent: null,
    diskPercent: null,
    uptimeSeconds: null,
    load1: null,
    processCount: null,
    createdAt: row.created_at as string,
  };
}

export async function deleteHostAgent(id: string): Promise<void> {
  const { error } = await supabase.rpc("delete_host_agent", { p_id: id });
  if (error) throw new Error(error.message);
}

export async function regenerateHostAgentKey(id: string): Promise<void> {
  const { error } = await supabase.rpc("regenerate_host_agent_key", { p_id: id });
  if (error) throw new Error(error.message);
}

export async function fetchHostMetrics(hostAgentId: string, limit = 60): Promise<HostMetric[]> {
  const { data, error } = await supabase
    .from("host_metrics")
    .select("*")
    .eq("host_agent_id", hostAgentId)
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    cpuPercent: row.cpu_percent as number | null,
    memPercent: row.mem_percent as number | null,
    memUsedMb: row.mem_used_mb as number | null,
    memTotalMb: row.mem_total_mb as number | null,
    diskPercent: row.disk_percent as number | null,
    diskUsedGb: row.disk_used_gb as number | null,
    diskTotalGb: row.disk_total_gb as number | null,
    uptimeSeconds: row.uptime_seconds as number | null,
    load1: row.load1 as number | null,
    load5: row.load5 as number | null,
    load15: row.load15 as number | null,
    processCount: row.process_count as number | null,
    recordedAt: row.recorded_at as string,
  }));
}

// Public — callable without auth (RPC is granted to anon). Returns null if the
// slug doesn't map to an enabled status page.
export async function fetchPublicStatusPage(slug: string): Promise<PublicStatusPage | null> {
  const { data, error } = await supabase.rpc("get_public_status_page", { p_slug: slug });
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as {
    organization_name: string;
    title: string;
    generated_at: string;
    services: Array<{ name: string; check_type: string; status: string; last_checked_at: string | null }>;
  };
  return {
    organizationName: row.organization_name,
    title: row.title,
    generatedAt: row.generated_at,
    services: (row.services ?? []).map((s) => ({
      name: s.name,
      checkType: s.check_type as PublicStatusPage["services"][number]["checkType"],
      status: s.status as PublicStatusPage["services"][number]["status"],
      lastCheckedAt: s.last_checked_at,
    })),
  };
}
