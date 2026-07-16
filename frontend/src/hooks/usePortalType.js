import { useQuery } from "@tanstack/react-query";
import { fetchMyPermissions } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";

// Every module a real org "operator" role (organization_administrator,
// it_manager, network_engineer, security_analyst, system_administrator,
// helpdesk, billing_manager, auditor, or a legacy ADMIN/MEMBER/READ_ONLY
// member) has at least view access to. A role with zero view grants across
// all of them — today, only the dynamic `read_only` system role — has
// nothing to operate; they're a pure end user, not staff running the org's
// console. This reads the exact same my_permissions() grid the sidebar nav
// already filters against (migration 0032) — it's not a second permission
// system, just a second consumer of the one that exists.
const OPERATIONAL_MODULES = ["monitors", "hosts", "assets", "incidents", "alert_channels", "team"];

/**
 * "Employee Portal" vs "Organization Console" for the customer-facing app.
 * Defaults to "console" while loading or on any un-migrated database (same
 * graceful-degradation rule every other RBAC consumer in this app follows)
 * — nobody loses access to something they could already reach because a
 * permissions query hasn't resolved yet.
 */
export function usePortalType() {
  const { organization } = useAuth();
  const { data: can, isLoading } = useQuery({
    queryKey: ["my-permissions", organization?.id],
    queryFn: () => fetchMyPermissions(organization?.id),
    enabled: !!organization?.id,
    retry: false,
    staleTime: 60_000
  });
  if (!organization?.id || isLoading || !can) return { portal: "console", isLoading: !!organization?.id && isLoading };
  const hasOperationalAccess = OPERATIONAL_MODULES.some(m => can("organization", m, "view"));
  return { portal: hasOperationalAccess ? "console" : "employee", isLoading: false };
}
