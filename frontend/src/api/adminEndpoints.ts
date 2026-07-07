import { supabase } from "./supabaseClient";
import { mapContentItem } from "./mappers";
import type {
  AdminContactMessage,
  AdminCustomer,
  AdminOrganization,
  AdminPlanLimit,
  AdminPlatformStats,
  AdminUser,
  AdminWaitlistSignup,
  ContactMessageStatus,
  ContentItem,
  Plan,
} from "./types";

export async function fetchAdminStats(): Promise<AdminPlatformStats> {
  const { data, error } = await supabase.rpc("admin_platform_stats");
  if (error) throw new Error(error.message);
  const row = (data as Record<string, number>[])[0];
  return {
    totalOrganizations: row?.total_organizations ?? 0,
    totalUsers: row?.total_users ?? 0,
    totalMonitors: row?.total_monitors ?? 0,
    totalOpenIncidents: row?.total_open_incidents ?? 0,
    totalWaitlistSignups: row?.total_waitlist_signups ?? 0,
    newContactMessages: row?.new_contact_messages ?? 0,
  };
}

export async function fetchAdminOrganizations(): Promise<AdminOrganization[]> {
  const { data, error } = await supabase.from("organizations").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    plan: row.plan as Plan,
    createdAt: row.created_at,
  }));
}

export async function updateOrganizationPlan(organizationId: string, plan: Plan): Promise<void> {
  const { error } = await supabase.rpc("admin_update_organization_plan", {
    p_organization_id: organizationId,
    p_plan: plan,
  });
  if (error) throw new Error(error.message);
}

export async function fetchAdminWaitlistSignups(): Promise<AdminWaitlistSignup[]> {
  const { data, error } = await supabase.from("waitlist_signups").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    product: row.product,
    note: row.note,
    createdAt: row.created_at,
  }));
}

export async function fetchAdminContactMessages(): Promise<AdminContactMessage[]> {
  const { data, error } = await supabase.from("contact_messages").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    topic: row.topic,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function updateContactMessageStatus(id: string, status: ContactMessageStatus): Promise<void> {
  const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setUserPlatformAdmin(userId: string, isAdmin: boolean): Promise<void> {
  const { error } = await supabase.rpc("admin_set_platform_admin", { p_user_id: userId, p_is_admin: isAdmin });
  if (error) throw new Error(error.message);
}

// supabase.functions.invoke surfaces non-2xx responses as an error whose body
// lives in error.context (a Response). Pull the function's own {error} message
// out of it so the admin sees "Password too short" instead of a generic 400.
async function invokeManageUsers(body: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke("admin-manage-users", { body });
  if (error) {
    let message = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = await ctx.json();
        if (parsed?.error) message = parsed.error;
      } catch {
        /* body wasn't JSON — keep the generic message */
      }
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
}

export async function adminCreateUser(input: {
  email: string;
  password: string;
  organizationName: string;
  fullName?: string;
  plan?: Plan;
}): Promise<void> {
  await invokeManageUsers({ action: "create", ...input });
}

// Uploads an image to the public-assets bucket (platform admins only, enforced
// by storage RLS) and returns its permanent public URL.
export async function uploadPublicImage(file: File, folder = "team"): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("public-assets").upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type || "image/png",
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("public-assets").getPublicUrl(path);
  return data.publicUrl;
}

export async function fetchAdminCustomers(): Promise<AdminCustomer[]> {
  const { data, error } = await supabase.rpc("admin_list_customers");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    organizationId: row.organization_id as string,
    name: row.name as string,
    plan: row.plan as Plan,
    adminEmail: (row.admin_email as string) ?? null,
    memberCount: Number(row.member_count),
    monitorsUsed: Number(row.monitors_used),
    maxMonitors: Number(row.max_monitors),
    hostsUsed: Number(row.hosts_used),
    maxHosts: Number(row.max_hosts),
    createdAt: row.created_at as string,
  }));
}

export async function adminDeleteUser(userId: string): Promise<void> {
  await invokeManageUsers({ action: "delete", userId });
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase.rpc("admin_list_all_users");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    userId: row.user_id as string,
    email: row.email as string,
    organizationName: row.organization_name as string | null,
    role: row.role as string | null,
    isPlatformAdmin: Boolean(row.is_platform_admin),
    createdAt: row.created_at as string,
  }));
}

export async function fetchAdminPlanLimits(): Promise<AdminPlanLimit[]> {
  const { data, error } = await supabase.from("plan_limits").select("*").order("plan");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    plan: row.plan as Plan,
    maxMonitors: row.max_monitors as number,
    maxAlertChannels: row.max_alert_channels as number,
    historyDays: row.history_days as number,
    maxHosts: (row.max_hosts as number) ?? 1,
  }));
}

export async function updatePlanLimit(input: AdminPlanLimit): Promise<void> {
  const { error } = await supabase
    .from("plan_limits")
    .update({
      max_monitors: input.maxMonitors,
      max_alert_channels: input.maxAlertChannels,
      history_days: input.historyDays,
      max_hosts: input.maxHosts,
    })
    .eq("plan", input.plan);
  if (error) throw new Error(error.message);
}

export async function fetchAllContentItems(pageSlug?: string): Promise<ContentItem[]> {
  let query = supabase.from("content_items").select("*").order("page_slug").order("section_key").order("sort_order");
  if (pageSlug) query = query.eq("page_slug", pageSlug);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapContentItem);
}

export async function createContentItem(input: {
  pageSlug: string;
  sectionKey: string;
  itemKey?: string | null;
  sortOrder: number;
  title: string;
  subtitle?: string | null;
  body?: string | null;
  status?: string | null;
  href?: string | null;
  metadata?: Record<string, unknown>;
  isPublished: boolean;
}): Promise<void> {
  const { error } = await supabase.from("content_items").insert({
    page_slug: input.pageSlug,
    section_key: input.sectionKey,
    item_key: input.itemKey,
    sort_order: input.sortOrder,
    title: input.title,
    subtitle: input.subtitle,
    body: input.body,
    status: input.status,
    href: input.href,
    metadata: input.metadata ?? {},
    is_published: input.isPublished,
  });
  if (error) throw new Error(error.message);
}

export async function updateContentItem(
  id: string,
  input: Partial<{
    sortOrder: number;
    title: string;
    subtitle: string | null;
    body: string | null;
    status: string | null;
    href: string | null;
    metadata: Record<string, unknown>;
    isPublished: boolean;
  }>,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder;
  if (input.title !== undefined) payload.title = input.title;
  if (input.subtitle !== undefined) payload.subtitle = input.subtitle;
  if (input.body !== undefined) payload.body = input.body;
  if (input.status !== undefined) payload.status = input.status;
  if (input.href !== undefined) payload.href = input.href;
  if (input.metadata !== undefined) payload.metadata = input.metadata;
  if (input.isPublished !== undefined) payload.is_published = input.isPublished;

  const { error } = await supabase.from("content_items").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteContentItem(id: string): Promise<void> {
  const { error } = await supabase.from("content_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
