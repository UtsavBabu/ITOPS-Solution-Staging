import { supabase } from "./supabaseClient";
import { mapContentItem } from "./mappers";
export async function fetchAdminStats() {
  const {
    data,
    error
  } = await supabase.rpc("admin_platform_stats");
  if (error) throw new Error(error.message);
  const row = data[0];
  return {
    totalOrganizations: row?.total_organizations ?? 0,
    totalLicensedOrganizations: row?.total_licensed_organizations ?? 0,
    totalUsers: row?.total_users ?? 0,
    totalMonitors: row?.total_monitors ?? 0,
    totalMonitorsUp: row?.total_monitors_up ?? 0,
    totalMonitorsDown: row?.total_monitors_down ?? 0,
    totalOpenIncidents: row?.total_open_incidents ?? 0,
    totalHostAgents: row?.total_host_agents ?? 0,
    totalHostAgentsOnline: row?.total_host_agents_online ?? 0,
    totalSslExpiringSoon: row?.total_ssl_expiring_soon ?? 0,
    totalWaitlistSignups: row?.total_waitlist_signups ?? 0,
    newContactMessages: row?.new_contact_messages ?? 0
  };
}
export async function fetchProductAdoption() {
  const { data, error } = await supabase.rpc("admin_product_adoption");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    productKey: row.product_key,
    productName: row.product_name,
    organizationCount: row.organization_count
  }));
}
export async function fetchSecurityHighlights(limit = 8) {
  const { data, error } = await supabase.rpc("admin_security_highlights", { p_limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    monitorId: row.monitor_id,
    monitorName: row.monitor_name,
    daysRemaining: row.days_remaining,
    validTo: row.valid_to
  }));
}
export async function fetchAdminMonitors(status) {
  const { data, error } = await supabase.rpc("admin_list_monitors", { p_status: status ?? null });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    name: row.name,
    checkType: row.check_type,
    url: row.url,
    tcpPort: row.tcp_port,
    lastStatus: row.last_status,
    lastCheckedAt: row.last_checked_at,
    interval: row.interval
  }));
}
export async function fetchAdminOpenIncidents() {
  const { data, error } = await supabase.rpc("admin_list_open_incidents");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    monitorId: row.monitor_id,
    monitorName: row.monitor_name,
    cause: row.cause,
    startedAt: row.started_at
  }));
}
export async function fetchAdminHostAgents() {
  const { data, error } = await supabase.rpc("admin_list_host_agents");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    name: row.name,
    hostname: row.hostname,
    os: row.os,
    provider: row.provider,
    agentVersion: row.agent_version,
    lastSeenAt: row.last_seen_at,
    isOnline: Boolean(row.is_online)
  }));
}
export async function fetchAdminSslCertificates(expiringOnly = false) {
  const { data, error } = await supabase.rpc("admin_list_ssl_certificates", { p_expiring_only: expiringOnly });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    monitorId: row.monitor_id,
    monitorName: row.monitor_name,
    issuer: row.issuer,
    subject: row.subject,
    protocol: row.protocol,
    isValid: row.is_valid,
    errorMessage: row.error_message,
    daysRemaining: row.days_remaining,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    checkedAt: row.checked_at
  }));
}
export async function fetchAdminOrganizations() {
  const {
    data,
    error
  } = await supabase.from("organizations").select("*").order("created_at", {
    ascending: false
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    plan: row.plan,
    status: row.status ?? "active",
    createdAt: row.created_at
  }));
}
export async function updateOrganizationPlan(organizationId, plan) {
  const {
    error
  } = await supabase.rpc("admin_update_organization_plan", {
    p_organization_id: organizationId,
    p_plan: plan
  });
  if (error) throw new Error(error.message);
}
export async function renameOrganization(organizationId, name) {
  const {
    error
  } = await supabase.rpc("admin_rename_organization", {
    p_organization_id: organizationId,
    p_name: name
  });
  if (error) throw new Error(error.message);
}
export async function archiveOrganization(organizationId) {
  const {
    error
  } = await supabase.rpc("admin_archive_organization", {
    p_organization_id: organizationId
  });
  if (error) throw new Error(error.message);
}
export async function restoreOrganization(organizationId) {
  const {
    error
  } = await supabase.rpc("admin_restore_organization", {
    p_organization_id: organizationId
  });
  if (error) throw new Error(error.message);
}
export async function deleteOrganization(organizationId) {
  const {
    error
  } = await supabase.rpc("admin_delete_organization", {
    p_organization_id: organizationId
  });
  if (error) throw new Error(error.message);
}
export async function fetchOrganizationDetail(organizationId) {
  const {
    data,
    error
  } = await supabase.rpc("admin_get_organization_detail", {
    p_organization_id: organizationId
  });
  if (error) throw new Error(error.message);
  const row = data;
  return {
    organizationId: row.organizationId,
    name: row.name,
    plan: row.plan,
    status: row.status,
    createdAt: row.createdAt,
    members: row.members,
    monitorCount: row.monitorCount,
    assetCount: row.assetCount,
    hostCount: row.hostCount,
    openIncidentCount: row.openIncidentCount,
    recentIncidents: row.recentIncidents
  };
}
export async function fetchAdminWaitlistSignups() {
  const {
    data,
    error
  } = await supabase.from("waitlist_signups").select("*").order("created_at", {
    ascending: false
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    email: row.email,
    product: row.product,
    note: row.note,
    createdAt: row.created_at
  }));
}
export async function fetchAdminContactMessages() {
  const {
    data,
    error
  } = await supabase.from("contact_messages").select("*").order("created_at", {
    ascending: false
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    name: row.name,
    email: row.email,
    topic: row.topic,
    message: row.message,
    status: row.status,
    createdAt: row.created_at
  }));
}
export async function updateContactMessageStatus(id, status) {
  const {
    error
  } = await supabase.from("contact_messages").update({
    status
  }).eq("id", id);
  if (error) throw new Error(error.message);
}
export async function setUserPlatformAdmin(userId, isAdmin, role = "support") {
  const {
    error
  } = await supabase.rpc("admin_set_platform_admin", {
    p_user_id: userId,
    p_is_admin: isAdmin,
    p_role: role
  });
  if (error) throw new Error(error.message);
}

// supabase.functions.invoke surfaces non-2xx responses as an error whose body
// lives in error.context (a Response). Pull the function's own {error} message
// out of it so the admin sees "Password too short" instead of a generic 400.
async function invokeManageUsers(body) {
  const {
    data,
    error
  } = await supabase.functions.invoke("admin-manage-users", {
    body
  });
  if (error) {
    let message = error.message;
    const ctx = error.context;
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
  return data;
}
export async function adminCreateUser(input) {
  const data = await invokeManageUsers({
    action: "create",
    ...input
  });
  return { userId: data?.userId ?? null };
}

// Adds a person to an *existing* customer organization, instead of
// creating a brand-new one — via the same real invite-and-accept flow
// (/invite/:token) the organization's own Team & Plan page uses. Returns
// a real, shareable invite link rather than logging the person in
// directly, since the admin is provisioning access for someone else, not
// themselves.
export async function adminInviteUserToOrganization(organizationId, email, role) {
  const { data, error } = await supabase.rpc("admin_invite_user_to_organization", {
    p_organization_id: organizationId,
    p_email: email,
    p_role: role
  });
  if (error) throw new Error(error.message);
  const row = data?.[0];
  return { id: row?.id, inviteLink: row?.token ? `${window.location.origin}/invite/${row.token}` : null };
}

// Uploads an image to the public-assets bucket (platform admins only, enforced
// by storage RLS) and returns its permanent public URL.
export async function uploadPublicImage(file, folder = "team") {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const {
    error
  } = await supabase.storage.from("public-assets").upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type || "image/png"
  });
  if (error) throw new Error(error.message);
  const {
    data
  } = supabase.storage.from("public-assets").getPublicUrl(path);
  return data.publicUrl;
}
export async function fetchAdminCustomers() {
  const {
    data,
    error
  } = await supabase.rpc("admin_list_customers");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    organizationId: row.organization_id,
    name: row.name,
    plan: row.plan,
    status: row.status ?? "active",
    adminEmail: row.admin_email ?? null,
    memberCount: Number(row.member_count),
    monitorsUsed: Number(row.monitors_used),
    maxMonitors: Number(row.max_monitors),
    hostsUsed: Number(row.hosts_used),
    maxHosts: Number(row.max_hosts),
    createdAt: row.created_at
  }));
}
export async function adminDeleteUser(userId) {
  await invokeManageUsers({
    action: "delete",
    userId
  });
}
export async function adminResetPassword(userId, password) {
  await invokeManageUsers({
    action: "reset_password",
    userId,
    password
  });
}
export async function adminUpdateUserName(userId, fullName) {
  await invokeManageUsers({
    action: "update",
    userId,
    fullName
  });
}
export async function fetchAdminUsers() {
  const {
    data,
    error
  } = await supabase.rpc("admin_list_all_users");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name ?? null,
    organizationName: row.organization_name,
    role: row.role,
    isPlatformAdmin: Boolean(row.is_platform_admin),
    platformAdminRole: row.platform_admin_role ?? null,
    createdAt: row.created_at,
    hasMfa: Boolean(row.has_mfa)
  }));
}
export async function fetchAdminPlanLimits() {
  const {
    data,
    error
  } = await supabase.from("plan_limits").select("*").order("plan");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    plan: row.plan,
    maxMonitors: row.max_monitors,
    maxAlertChannels: row.max_alert_channels,
    historyDays: row.history_days,
    maxHosts: row.max_hosts ?? 1
  }));
}
export async function updatePlanLimit(input) {
  const {
    error
  } = await supabase.from("plan_limits").update({
    max_monitors: input.maxMonitors,
    max_alert_channels: input.maxAlertChannels,
    history_days: input.historyDays,
    max_hosts: input.maxHosts
  }).eq("plan", input.plan);
  if (error) throw new Error(error.message);
}
export async function fetchAllContentItems(pageSlug) {
  let query = supabase.from("content_items").select("*").order("page_slug").order("section_key").order("sort_order");
  if (pageSlug) query = query.eq("page_slug", pageSlug);
  const {
    data,
    error
  } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapContentItem);
}
export async function createContentItem(input) {
  const {
    error
  } = await supabase.from("content_items").insert({
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
    is_published: input.isPublished
  });
  if (error) throw new Error(error.message);
}
export async function updateContentItem(id, input) {
  const payload = {};
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder;
  if (input.title !== undefined) payload.title = input.title;
  if (input.subtitle !== undefined) payload.subtitle = input.subtitle;
  if (input.body !== undefined) payload.body = input.body;
  if (input.status !== undefined) payload.status = input.status;
  if (input.href !== undefined) payload.href = input.href;
  if (input.metadata !== undefined) payload.metadata = input.metadata;
  if (input.isPublished !== undefined) payload.is_published = input.isPublished;
  const {
    error
  } = await supabase.from("content_items").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}
export async function deleteContentItem(id) {
  const {
    error
  } = await supabase.from("content_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
export async function fetchAuditLog(limit, offset, search) {
  const {
    data,
    error
  } = await supabase.rpc("admin_list_audit_log", {
    p_limit: limit,
    p_offset: offset,
    p_search: search ?? null
  });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return {
    entries: rows.map(row => ({
      id: row.id,
      actorEmail: row.actor_email ?? null,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id ?? null,
      targetLabel: row.target_label ?? null,
      metadata: row.metadata ?? {},
      createdAt: row.created_at
    })),
    totalCount: rows.length > 0 ? Number(rows[0].total_count) : 0
  };
}
export async function fetchProducts() {
  const {
    data,
    error
  } = await supabase.rpc("admin_list_products");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    key: row.key,
    name: row.name,
    description: row.description ?? null,
    sortOrder: row.sort_order
  }));
}
export async function fetchOrgProducts(organizationId) {
  const {
    data,
    error
  } = await supabase.rpc("admin_list_org_products", {
    p_organization_id: organizationId
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    productKey: row.product_key,
    productName: row.product_name,
    status: row.status,
    grantedAt: row.granted_at ?? null
  }));
}
export async function setOrgProduct(organizationId, productKey, active) {
  const {
    error
  } = await supabase.rpc("admin_set_org_product", {
    p_organization_id: organizationId,
    p_product_key: productKey,
    p_active: active
  });
  if (error) throw new Error(error.message);
}

const PERMISSION_ACTIONS = ["view", "create", "edit", "delete", "configure", "export", "manage"];

export async function fetchPermissionModules() {
  const { data, error } = await supabase.from("permission_modules").select("*").order("scope").order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({ key: row.key, label: row.label, scope: row.scope, sortOrder: row.sort_order }));
}

export async function fetchRoles(scope) {
  const { data, error } = await supabase.rpc("admin_list_roles", { p_scope: scope ?? null });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    key: row.key,
    name: row.name,
    description: row.description,
    scope: row.scope,
    isSystem: row.is_system,
    organizationId: row.organization_id,
    createdAt: row.created_at
  }));
}

export async function fetchRolePermissions(roleKey) {
  const { data, error } = await supabase.rpc("admin_get_role_permissions", { p_role_key: roleKey });
  if (error) throw new Error(error.message);
  const byModule = new Map((data ?? []).map(row => [row.module_key, row]));
  return (moduleKey) => {
    const row = byModule.get(moduleKey);
    return {
      view: row?.can_view ?? false,
      create: row?.can_create ?? false,
      edit: row?.can_edit ?? false,
      delete: row?.can_delete ?? false,
      configure: row?.can_configure ?? false,
      export: row?.can_export ?? false,
      manage: row?.can_manage ?? false
    };
  };
}

export async function upsertRole({ key, name, description, scope, permissions }) {
  const permissionsPayload = Object.entries(permissions ?? {}).map(([moduleKey, actions]) => ({
    module_key: moduleKey,
    can_view: !!actions.view,
    can_create: !!actions.create,
    can_edit: !!actions.edit,
    can_delete: !!actions.delete,
    can_configure: !!actions.configure,
    can_export: !!actions.export,
    can_manage: !!actions.manage
  }));
  const { data, error } = await supabase.rpc("admin_upsert_role", {
    p_key: key,
    p_name: name,
    p_description: description ?? null,
    p_scope: scope,
    p_permissions: permissionsPayload
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteRole(key) {
  const { error } = await supabase.rpc("admin_delete_role", { p_key: key });
  if (error) throw new Error(error.message);
}

// Lets a super_admin/support/platform_administrator fix a customer's
// organization role directly from All Users, instead of requiring that
// customer's own org to have someone with team:manage.
export async function adminUpdateMemberRole(userId, role) {
  const { error } = await supabase.rpc("admin_update_member_role", { p_user_id: userId, p_role: role });
  if (error) throw new Error(error.message);
}

export async function fetchResellerApplications() {
  const { data, error } = await supabase.rpc("admin_list_reseller_applications");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    companyName: row.company_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone,
    message: row.message,
    status: row.status,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at
  }));
}

export async function reviewResellerApplication(id, status) {
  const { error } = await supabase.rpc("admin_review_reseller_application", { p_id: id, p_status: status });
  if (error) throw new Error(error.message);
}

export async function fetchAdminResellers() {
  const { data, error } = await supabase.rpc("admin_list_resellers");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    userId: row.user_id,
    email: row.email,
    fullName: row.full_name || null,
    grantedAt: row.granted_at,
    customerCount: Number(row.customer_count)
  }));
}

// ── CyberSachet course authoring ────────────────────────────────────────────

export async function adminFetchCybersachetCourses() {
  const { data, error } = await supabase.rpc("admin_list_cybersachet_courses");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    level: row.level,
    estimatedMinutes: row.estimated_minutes,
    published: row.published,
    sortOrder: row.sort_order,
    category: row.category,
    freeTier: row.free_tier,
    minPlan: row.min_plan ?? (row.free_tier ? "STARTER" : "PROFESSIONAL"),
    track: row.track ?? "security",
    lessonCount: Number(row.lesson_count),
    quizQuestionCount: Number(row.quiz_question_count),
    enrollmentCount: Number(row.enrollment_count)
  }));
}

export async function adminSaveCybersachetCourse(course) {
  const { data, error } = await supabase.rpc("admin_upsert_cybersachet_course", {
    p_id: course.id ?? null,
    p_slug: course.slug,
    p_title: course.title,
    p_description: course.description ?? null,
    p_level: course.level,
    p_estimated_minutes: course.estimatedMinutes,
    p_published: course.published,
    p_sort_order: course.sortOrder ?? 0,
    p_category: course.category ?? "security-awareness",
    p_min_plan: course.minPlan ?? "PROFESSIONAL",
    p_track: course.track ?? "security"
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function adminFetchAcademyDashboardStats() {
  const { data, error } = await supabase.rpc("admin_academy_dashboard_stats");
  if (error) throw new Error(error.message);
  const row = data?.[0] ?? {};
  return {
    totalStudents: Number(row.total_students ?? 0),
    totalOrganizations: Number(row.total_organizations ?? 0),
    activeCourses: Number(row.active_courses ?? 0),
    academyCourses: Number(row.academy_courses ?? 0),
    securityCourses: Number(row.security_courses ?? 0),
    certificatesIssued: Number(row.certificates_issued ?? 0),
    completedEnrollments: Number(row.completed_enrollments ?? 0),
    totalEnrollments: Number(row.total_enrollments ?? 0),
    avgQuizScore: row.avg_quiz_score != null ? Number(row.avg_quiz_score) : null,
    totalTrainingHours: Number(row.total_training_hours ?? 0)
  };
}

export async function adminFetchAcademyCourseStats() {
  const { data, error } = await supabase.rpc("admin_academy_course_stats");
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    courseId: row.course_id,
    title: row.title,
    track: row.track,
    enrollmentCount: Number(row.enrollment_count),
    completedCount: Number(row.completed_count),
    avgScore: row.avg_score != null ? Number(row.avg_score) : null
  }));
}

export async function adminFetchRecentAcademyCertificates(limit = 15) {
  const { data, error } = await supabase.rpc("admin_recent_academy_certificates", { p_limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    certificateNo: row.certificate_no,
    organizationName: row.organization_name,
    userEmail: row.user_email,
    courseTitle: row.course_title,
    levelCode: row.level_code,
    issuedAt: row.issued_at,
    revokedAt: row.revoked_at
  }));
}

export async function adminDeleteCybersachetCourse(id) {
  const { error } = await supabase.rpc("admin_delete_cybersachet_course", { p_id: id });
  if (error) throw new Error(error.message);
}

export async function adminFetchCybersachetModules(courseId) {
  const { data, error } = await supabase.rpc("admin_list_cybersachet_modules", { p_course_id: courseId });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({ id: row.id, courseId: row.course_id, title: row.title, sortOrder: row.sort_order, lessonCount: Number(row.lesson_count) }));
}
export async function adminSaveCybersachetModule(mod) {
  const { data, error } = await supabase.rpc("admin_upsert_cybersachet_module", {
    p_id: mod.id ?? null,
    p_course_id: mod.courseId,
    p_title: mod.title,
    p_sort_order: mod.sortOrder ?? 0
  });
  if (error) throw new Error(error.message);
  return data;
}
export async function adminDeleteCybersachetModule(id) {
  const { error } = await supabase.rpc("admin_delete_cybersachet_module", { p_id: id });
  if (error) throw new Error(error.message);
}

export async function adminFetchCybersachetLessons(courseId) {
  const { data, error } = await supabase.rpc("admin_list_cybersachet_lessons", { p_course_id: courseId });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    body: row.body,
    sortOrder: row.sort_order,
    moduleId: row.module_id,
    keyTakeaway: row.key_takeaway,
    checkQuestion: row.check_question,
    checkChoices: row.check_choices,
    checkCorrectIndex: row.check_correct_index
  }));
}

export async function adminSaveCybersachetLesson(lesson) {
  const { data, error } = await supabase.rpc("admin_upsert_cybersachet_lesson", {
    p_id: lesson.id ?? null,
    p_course_id: lesson.courseId,
    p_title: lesson.title,
    p_body: lesson.body ?? "",
    p_sort_order: lesson.sortOrder ?? 0,
    p_check_question: lesson.checkQuestion ?? null,
    p_check_choices: lesson.checkChoices ?? null,
    p_check_correct_index: lesson.checkCorrectIndex ?? null,
    p_module_id: lesson.moduleId ?? null,
    p_key_takeaway: lesson.keyTakeaway ?? null
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function adminDeleteCybersachetLesson(id) {
  const { error } = await supabase.rpc("admin_delete_cybersachet_lesson", { p_id: id });
  if (error) throw new Error(error.message);
}

export async function adminFetchCybersachetQuizQuestions(courseId) {
  const { data, error } = await supabase.rpc("admin_list_cybersachet_quiz_questions", { p_course_id: courseId });
  if (error) throw new Error(error.message);
  return (data ?? []).map(row => ({
    id: row.id,
    courseId: row.course_id,
    question: row.question,
    choices: row.choices,
    questionType: row.question_type,
    correctIndex: row.correct_index,
    correctIndexes: row.correct_indexes ?? null,
    correctOrder: row.correct_order ?? null,
    sortOrder: row.sort_order
  }));
}

export async function adminSaveCybersachetQuizQuestion(q) {
  const { data, error } = await supabase.rpc("admin_upsert_cybersachet_quiz_question", {
    p_id: q.id ?? null,
    p_course_id: q.courseId,
    p_question: q.question,
    p_choices: q.choices,
    p_sort_order: q.sortOrder ?? 0,
    p_question_type: q.questionType ?? "single",
    p_correct_index: q.questionType === "multiple" || q.questionType === "ordering" ? null : q.correctIndex,
    p_correct_indexes: q.questionType === "multiple" ? q.correctIndexes : null,
    p_correct_order: q.questionType === "ordering" ? q.correctOrder : null
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function adminDeleteCybersachetQuizQuestion(id) {
  const { error } = await supabase.rpc("admin_delete_cybersachet_quiz_question", { p_id: id });
  if (error) throw new Error(error.message);
}

export async function adminListCybersachetAssignments(organizationId) {
  const { data, error } = await supabase.rpc("admin_list_cybersachet_assignments", { p_organization_id: organizationId });
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
export async function adminAssignCybersachetCourse(organizationId, userId, courseId, dueAt) {
  const { error } = await supabase.rpc("admin_assign_cybersachet_course", { p_organization_id: organizationId, p_user_id: userId, p_course_id: courseId, p_due_at: dueAt ?? null });
  if (error) throw new Error(error.message);
}
export async function adminUnassignCybersachetCourse(organizationId, userId, courseId) {
  const { error } = await supabase.rpc("admin_unassign_cybersachet_course", { p_organization_id: organizationId, p_user_id: userId, p_course_id: courseId });
  if (error) throw new Error(error.message);
}

export { PERMISSION_ACTIONS };