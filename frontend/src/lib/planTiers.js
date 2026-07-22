// The single source of truth for plan-tier ordering and comparison — was
// previously duplicated as a literal array in three places (api/endpoints.js,
// admin/AdminOverview.jsx, and inlined again in CyberSachetTraining.jsx/
// LearningPathCard.jsx), which is exactly the kind of drift risk where one
// copy gets a new tier added and the others silently don't.
export const PLAN_ORDER = ["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"];

// True if an org on `orgPlan` can access something gated at `minPlan` —
// mirrors the real server-side check (_org_course_allowed /
// _cybersachet_course_allowed) exactly, so a client-side "locked" badge
// never disagrees with what the RPC actually enforces.
export function isPlanAllowed(minPlan, orgPlan) {
  if (!minPlan) return true;
  return PLAN_ORDER.indexOf(orgPlan ?? "STARTER") >= PLAN_ORDER.indexOf(minPlan);
}
