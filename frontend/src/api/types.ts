export type MonitorInterval = "THIRTY_SECONDS" | "ONE_MINUTE" | "FIVE_MINUTES" | "FIFTEEN_MINUTES";
export type CheckStatus = "UP" | "DOWN" | "ERROR";
export type CheckType = "HTTP" | "KEYWORD" | "STATUS_CODE" | "DNS" | "TCP";
export type KeywordMatchMode = "CONTAINS" | "NOT_CONTAINS";
export type DnsRecordType = "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS";
export type IncidentStatus = "OPEN" | "RESOLVED";
export type AssetType = "WEBSITE" | "SERVER" | "DATABASE" | "NETWORK" | "OTHER";
export type AlertChannelType = "EMAIL" | "SLACK" | "WEBHOOK";
export type Plan = "STARTER" | "PROFESSIONAL" | "BUSINESS" | "ENTERPRISE";
export type WaitlistProduct = "cybersachet" | "infrastructure-monitor" | "devops-monitor" | "upgrade-request" | "newsletter";
export type ContactTopic = "sales" | "support" | "company" | "other";

export interface Organization {
  id: string;
  name: string;
}

export interface PlanUsage {
  plan: Plan;
  maxMonitors: number;
  currentMonitors: number;
  maxAlertChannels: number;
  currentAlertChannels: number;
  historyDays: number;
}

export interface OrganizationMember {
  userId: string;
  email: string;
  role: string;
  joinedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Asset {
  id: string;
  type: AssetType;
  name: string;
  identifier: string;
  owner?: string | null;
  tags: string[];
  createdAt: string;
  monitor?: { id: string; lastStatus: CheckStatus | null } | null;
}

export interface SslInfo {
  issuer?: string | null;
  subject?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
  daysRemaining?: number | null;
  protocol?: string | null;
  isValid: boolean;
  errorMessage?: string | null;
}

export interface SecuritySnapshot {
  score: number;
  headers: Record<string, string>;
  missingHeaders: string[];
  cookieIssues: string[];
  serverHeaderLeak?: string | null;
  checkedAt: string;
}

export interface Incident {
  id: string;
  status: IncidentStatus;
  startedAt: string;
  resolvedAt?: string | null;
  cause?: string | null;
  monitor: { id: string; name: string; url: string };
}

export interface Monitor {
  id: string;
  name: string;
  url: string;
  interval: MonitorInterval;
  isActive: boolean;
  checkType: CheckType;
  expectedKeyword?: string | null;
  keywordMatchMode: KeywordMatchMode;
  expectedStatusCode?: number | null;
  dnsRecordType: DnsRecordType;
  dnsExpectedValue?: string | null;
  tcpPort?: number | null;
  lastStatus: CheckStatus | null;
  lastCheckedAt?: string | null;
  nextCheckAt: string;
  consecutiveFails: number;
  createdAt: string;
  asset: Asset;
  sslInfo?: SslInfo | null;
  securitySnapshot?: SecuritySnapshot | null;
  incidents?: Incident[];
}

export interface CreateMonitorInput {
  name: string;
  url: string;
  interval: MonitorInterval;
  checkType: CheckType;
  expectedKeyword?: string;
  keywordMatchMode?: KeywordMatchMode;
  expectedStatusCode?: number;
  dnsRecordType?: DnsRecordType;
  dnsExpectedValue?: string;
  tcpPort?: number;
}

export interface StatusPageSettings {
  enabled: boolean;
  slug: string | null;
  title: string | null;
}

export interface PublicStatusService {
  name: string;
  checkType: CheckType;
  status: CheckStatus | "UNKNOWN";
  lastCheckedAt: string | null;
}

export interface PublicStatusPage {
  organizationName: string;
  title: string;
  generatedAt: string;
  services: PublicStatusService[];
}

export interface CheckResult {
  id: string;
  status: CheckStatus;
  statusCode?: number | null;
  responseTimeMs?: number | null;
  errorMessage?: string | null;
  redirectChain: string[];
  checkedAt: string;
}

export interface AlertChannel {
  id: string;
  type: AlertChannelType;
  name: string;
  isActive: boolean;
  config: Record<string, string>;
  createdAt: string;
}

export interface DashboardSummary {
  totalMonitors: number;
  upMonitors: number;
  downMonitors: number;
  openIncidents: number;
  totalAssets: number;
  expiringSsl: number;
}

export interface AdminPlatformStats {
  totalOrganizations: number;
  totalUsers: number;
  totalMonitors: number;
  totalOpenIncidents: number;
  totalWaitlistSignups: number;
  newContactMessages: number;
}

export interface AdminOrganization {
  id: string;
  name: string;
  plan: Plan;
  createdAt: string;
}

export interface AdminWaitlistSignup {
  id: string;
  email: string;
  product: WaitlistProduct;
  note?: string | null;
  createdAt: string;
}

export type ContactMessageStatus = "new" | "read" | "resolved";

export interface AdminContactMessage {
  id: string;
  name: string;
  email: string;
  topic: ContactTopic;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
}

export interface SolutionCapability {
  title: string;
  detail: string;
  status: "live" | "roadmap";
}

export interface ContentItem {
  id: string;
  pageSlug: string;
  sectionKey: string;
  itemKey: string | null;
  sortOrder: number;
  title: string;
  subtitle: string | null;
  body: string | null;
  status: string | null;
  href: string | null;
  metadata: Record<string, unknown>;
  isPublished: boolean;
}

export interface AdminUser {
  userId: string;
  email: string;
  organizationName: string | null;
  role: string | null;
  isPlatformAdmin: boolean;
  createdAt: string;
}

export interface AdminPlanLimit {
  plan: Plan;
  maxMonitors: number;
  maxAlertChannels: number;
  historyDays: number;
  maxHosts: number;
}

export interface AdminCustomer {
  organizationId: string;
  name: string;
  plan: Plan;
  adminEmail: string | null;
  memberCount: number;
  monitorsUsed: number;
  maxMonitors: number;
  hostsUsed: number;
  maxHosts: number;
  createdAt: string;
}

export interface HostAgent {
  id: string;
  name: string;
  hostname: string | null;
  os: string | null;
  agentVersion: string | null;
  ingestKey: string;
  lastSeenAt: string | null;
  isOnline: boolean;
  cpuPercent: number | null;
  memPercent: number | null;
  diskPercent: number | null;
  uptimeSeconds: number | null;
  load1: number | null;
  processCount: number | null;
  createdAt: string;
}

export interface RunbookAction {
  actionKey: string;
  label: string;
  description: string;
  risk: string;
  needsArg: boolean;
  argLabel: string | null;
}

export interface HostCommand {
  id: string;
  hostAgentId: string;
  actionKey: string;
  arg: string | null;
  status: "approved" | "running" | "success" | "failed" | "cancelled";
  exitCode: number | null;
  output: string | null;
  createdAt: string;
  finishedAt: string | null;
}

export interface HostMetric {
  cpuPercent: number | null;
  memPercent: number | null;
  memUsedMb: number | null;
  memTotalMb: number | null;
  diskPercent: number | null;
  diskUsedGb: number | null;
  diskTotalGb: number | null;
  uptimeSeconds: number | null;
  load1: number | null;
  load5: number | null;
  load15: number | null;
  processCount: number | null;
  recordedAt: string;
}
