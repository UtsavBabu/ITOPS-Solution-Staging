import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { PERMISSION_ACTIONS, deleteRole, fetchPermissionModules, fetchRolePermissions, fetchRoles, upsertRole } from "../../api/adminEndpoints";
import { Reveal, SpotlightCard } from "../../components/Animated";
import { SkeletonRows } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/EmptyState";
import { useConfirm } from "../../components/ConfirmDialog";
import { useToast } from "../../components/Toast";

const EASE = [0.16, 1, 0.3, 1];
const ACTION_LABEL = { view: "View", create: "Create", edit: "Edit", delete: "Delete", configure: "Configure", export: "Export", manage: "Manage" };
const EMPTY_ACTIONS = Object.fromEntries(PERMISSION_ACTIONS.map(a => [a, false]));
// Predate the named organization roles (organization_administrator, it_manager,
// ...) and have been fully retired since migration 0055 — no account holds
// one anymore, and new accounts can't be assigned one. Hidden by default so
// they don't read as duplicates of their modern equivalent; still viewable
// via "Show legacy roles" for historical reference.
const LEGACY_ROLE_KEYS = ["ADMIN", "MEMBER", "READ_ONLY"];

function slugify(name) {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function Checkbox({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      aria-pressed={checked}
      className={`grid h-5 w-5 place-items-center rounded border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${checked ? "border-cyan-400/60 bg-cyan-400/20 light:bg-cyan-100 text-cyan-300 light:text-cyan-700" : "border-white/15 light:border-slate-900/15 bg-black/30 light:bg-slate-900/[0.04] text-transparent hover:border-white/30"}`}
    >
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

function PermissionGrid({ modules, permissions, onChange, readOnly }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
          <tr>
            <th className="px-3 py-2">Module</th>
            {PERMISSION_ACTIONS.map(a => <th key={a} className="px-3 py-2 text-center">{ACTION_LABEL[a]}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
          {modules.map(m => {
            const row = permissions[m.key] ?? EMPTY_ACTIONS;
            return (
              <tr key={m.key}>
                <td className="px-3 py-2.5 font-medium text-white/80 light:text-slate-700">{m.label}</td>
                {PERMISSION_ACTIONS.map(action => (
                  <td key={action} className="px-3 py-2.5 text-center">
                    <div className="flex justify-center">
                      <Checkbox
                        checked={!!row[action]}
                        disabled={readOnly}
                        onChange={next => onChange(m.key, action, next)}
                      />
                    </div>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function RoleEditor({ role, modules, onClose, onSaved, cloneFrom }) {
  const toast = useToast();
  const isNew = !role;
  const [name, setName] = useState(role?.name ?? (cloneFrom ? `${cloneFrom.name} (Copy)` : ""));
  const [description, setDescription] = useState(role?.description ?? cloneFrom?.description ?? "");
  const [scope, setScope] = useState(role?.scope ?? cloneFrom?.scope ?? "organization");
  const [permissions, setPermissions] = useState({});
  const [loadingGrid, setLoadingGrid] = useState(true);

  const sourceKey = role?.key ?? cloneFrom?.key ?? null;

  useEffect(() => {
    let active = true;
    if (!sourceKey) {
      setPermissions({});
      setLoadingGrid(false);
      return;
    }
    setLoadingGrid(true);
    fetchRolePermissions(sourceKey).then(getFor => {
      if (!active) return;
      const next = {};
      for (const m of modules) next[m.key] = getFor(m.key);
      setPermissions(next);
      setLoadingGrid(false);
    });
    return () => { active = false; };
  }, [sourceKey, modules]);

  const scopedModules = useMemo(() => modules.filter(m => m.scope === scope), [modules, scope]);

  const saveMutation = useMutation({
    mutationFn: () => upsertRole({
      key: role?.key ?? slugify(name),
      name,
      description,
      scope,
      permissions
    }),
    onSuccess: () => {
      toast.success(`Saved "${name}".`);
      onSaved();
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to save role")
  });

  function setCell(moduleKey, action, value) {
    setPermissions(prev => ({ ...prev, [moduleKey]: { ...(prev[moduleKey] ?? EMPTY_ACTIONS), [action]: value } }));
  }

  function toggleRow(moduleKey, value) {
    setPermissions(prev => ({ ...prev, [moduleKey]: Object.fromEntries(PERMISSION_ACTIONS.map(a => [a, value])) }));
  }

  const nameLocked = !!role; // renaming/rescoping an existing role isn't supported (key is the stable identifier)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-[240px] space-y-3">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={nameLocked}
            placeholder="Role name"
            className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm font-medium text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-cyan-400/40 focus:outline-none disabled:opacity-60"
          />
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What this role is for (optional)"
            className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-xs text-white/70 light:text-slate-600 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-cyan-400/40 focus:outline-none"
          />
          {isNew && (
            <div className="flex items-center gap-2 text-xs text-white/50 light:text-slate-500">
              <span>Scope:</span>
              <select value={scope} onChange={e => setScope(e.target.value)} className="rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-2 py-1 text-white light:text-slate-900">
                <option value="platform">Platform (ITOps Solution admin)</option>
                <option value="organization">Organization (a customer's own team)</option>
              </select>
              <span className="text-white/30 light:text-slate-400">Key: {slugify(name) || "—"}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="rounded-full border border-white/15 light:border-slate-900/15 px-4 py-2 text-xs text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900">Cancel</button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !name.trim()}
            className="rounded-full bg-amber-400 px-4 py-2 text-xs font-medium text-black transition-colors hover:bg-amber-300 disabled:opacity-50"
          >
            {saveMutation.isPending ? "Saving…" : "Save role"}
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-white/10 light:border-slate-900/10 bg-black/20 light:bg-slate-900/[0.03] p-2">
        {loadingGrid ? <SkeletonRows count={4} /> : (
          <>
            <div className="mb-2 flex flex-wrap gap-2 px-2 pt-1">
              <span className="text-[11px] uppercase tracking-wide text-white/35 light:text-slate-400">Quick fill:</span>
              <button onClick={() => scopedModules.forEach(m => toggleRow(m.key, true))} className="text-[11px] text-cyan-300 light:text-cyan-600 hover:underline">Grant everything</button>
              <button onClick={() => scopedModules.forEach(m => toggleRow(m.key, false))} className="text-[11px] text-white/40 light:text-slate-400 hover:text-white/70 light:hover:text-slate-600">Clear all</button>
            </div>
            <PermissionGrid modules={scopedModules} permissions={permissions} onChange={setCell} />
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function AdminRoles() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const [scopeFilter, setScopeFilter] = useState("platform");
  const [selectedKey, setSelectedKey] = useState(null);
  const [creating, setCreating] = useState(null); // null | { cloneFrom }
  const [compareKeys, setCompareKeys] = useState([]);
  const [showLegacy, setShowLegacy] = useState(false);

  const { data: modules, isLoading: modulesLoading } = useQuery({ queryKey: ["permission-modules"], queryFn: fetchPermissionModules });
  const { data: rolesRaw, isLoading: rolesLoading, isError: rolesError, refetch: refetchRoles } = useQuery({ queryKey: ["admin-roles", scopeFilter], queryFn: () => fetchRoles(scopeFilter), retry: false });
  const legacyCount = (rolesRaw ?? []).filter(r => LEGACY_ROLE_KEYS.includes(r.key)).length;
  const roles = showLegacy ? rolesRaw : (rolesRaw ?? []).filter(r => !LEGACY_ROLE_KEYS.includes(r.key));

  const deleteMutation = useMutation({
    mutationFn: key => deleteRole(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
      setSelectedKey(null);
      toast.success("Role deleted.");
    },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to delete role")
  });

  async function handleDelete(role) {
    const ok = await confirm({ title: `Delete "${role.name}"?`, description: "Any accounts holding this role must be reassigned first.", confirmLabel: "Delete", danger: true });
    if (ok) deleteMutation.mutate(role.key);
  }

  function handleSaved() {
    queryClient.invalidateQueries({ queryKey: ["admin-roles"] });
    setCreating(null);
  }

  const selectedRole = roles?.find(r => r.key === selectedKey) ?? null;
  const compareRoles = (roles ?? []).filter(r => compareKeys.includes(r.key));

  return (
    <div className="space-y-6">
      <Reveal y={12} className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">Roles & Permissions</h1>
          <p className="text-sm text-white/50 light:text-slate-500">
            Every role is a real row — view, create, edit, delete, configure, export, and manage, per module. No code changes to add a role.
          </p>
          <p className="mt-1 text-xs text-white/35 light:text-slate-400">
            This page only defines what a role can do. To give a specific person a role, go to <Link to="/admin/users" className="underline hover:text-white/60 light:hover:text-slate-600">All Users</Link> (platform-wide) or a customer's own Team &amp; Plan page.
          </p>
        </div>
        <button
          onClick={() => { setCreating({ cloneFrom: selectedRole }); setSelectedKey(null); }}
          className="rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-300"
        >
          + New role
        </button>
      </Reveal>

      <Reveal delay={0.05} className="flex flex-wrap items-center gap-2">
        {["platform", "organization"].map(s => (
          <button
            key={s}
            onClick={() => { setScopeFilter(s); setSelectedKey(null); setCreating(null); }}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${scopeFilter === s ? "bg-white text-black" : "border border-white/15 text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900"}`}
          >
            {s === "platform" ? "Platform roles" : "Organization roles"}
            {roles && scopeFilter === s && <span className="ml-1.5 opacity-60">· {roles.length}</span>}
          </button>
        ))}
        {legacyCount > 0 && <button onClick={() => setShowLegacy(v => !v)} className="ml-2 text-xs text-white/40 light:text-slate-400 hover:text-white/70 light:hover:text-slate-600">
            {showLegacy ? "Hide" : "Show"} {legacyCount} legacy role{legacyCount === 1 ? "" : "s"}
          </button>}
      </Reveal>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <SpotlightCard className="overflow-hidden" delay={0.1} tint="amber">
          {rolesLoading ? <SkeletonRows count={5} /> : rolesError ? <ErrorState message="Couldn't load roles — the dynamic RBAC migration may not be applied yet." onRetry={() => refetchRoles()} /> : !roles || roles.length === 0 ? <EmptyState title="No roles yet." /> : (
            <ul className="divide-y divide-white/10 light:divide-slate-900/8">
              {roles.map((role, i) => (
                <motion.li
                  key={role.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                  className={`flex items-center justify-between gap-2 px-4 py-3 text-sm transition-colors ${selectedKey === role.key ? "bg-white/[0.06] light:bg-slate-900/[0.06]" : "hover:bg-white/[0.03] light:hover:bg-slate-900/[0.03]"}`}
                >
                  <button onClick={() => { setSelectedKey(role.key); setCreating(null); }} className="min-w-0 flex-1 text-left">
                    <p className="truncate font-medium text-white light:text-slate-900">{role.name}</p>
                    {role.description && <p className="mt-0.5 truncate text-[11px] text-white/40 light:text-slate-400">{role.description}</p>}
                    {role.isSystem && <span className="mt-1 inline-block text-[10px] uppercase tracking-wide text-white/35 light:text-slate-400">System</span>}
                  </button>
                  <input
                    type="checkbox"
                    aria-label={`Compare ${role.name}`}
                    checked={compareKeys.includes(role.key)}
                    onChange={e => setCompareKeys(prev => e.target.checked ? [...prev, role.key].slice(-2) : prev.filter(k => k !== role.key))}
                    className="h-3.5 w-3.5 shrink-0 accent-cyan-400"
                  />
                </motion.li>
              ))}
            </ul>
          )}
        </SpotlightCard>

        <SpotlightCard className="p-5" delay={0.14} tint="amber">
          {compareKeys.length === 2 ? (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-white light:text-slate-900">Comparing {compareRoles.map(r => r.name).join(" vs. ")}</p>
                <button onClick={() => setCompareKeys([])} className="text-xs text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900">Close compare</button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {compareRoles.map(r => (
                  <div key={r.key}>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-white/45 light:text-slate-400">{r.name}</p>
                    <CompareGrid roleKey={r.key} modules={(modules ?? []).filter(m => m.scope === r.scope)} />
                  </div>
                ))}
              </div>
            </div>
          ) : creating ? (
            !modulesLoading && <RoleEditor modules={modules ?? []} cloneFrom={creating.cloneFrom} onClose={() => setCreating(null)} onSaved={handleSaved} />
          ) : selectedRole ? (
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white light:text-slate-900">{selectedRole.name}</p>
                  {selectedRole.description && <p className="mt-0.5 text-xs text-white/45 light:text-slate-400">{selectedRole.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setCreating({ cloneFrom: selectedRole }); setSelectedKey(null); }} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 light:text-slate-600 hover:text-white light:hover:text-slate-900">
                    Clone
                  </button>
                  {!selectedRole.isSystem && (
                    <button onClick={() => handleDelete(selectedRole)} className="rounded-full border border-red-400/25 px-3 py-1.5 text-xs text-red-300 light:text-red-600 hover:bg-red-400/10">
                      Delete
                    </button>
                  )}
                </div>
              </div>
              {!modulesLoading && <RoleEditor role={selectedRole} modules={modules ?? []} onClose={() => setSelectedKey(null)} onSaved={handleSaved} />}
            </div>
          ) : (
            <EmptyState title="Select a role" description="Pick a role on the left to view or edit its permissions, or check two roles to compare them." />
          )}
        </SpotlightCard>
      </div>
    </div>
  );
}

function CompareGrid({ roleKey, modules }) {
  const { data: getFor, isLoading } = useQuery({ queryKey: ["role-permissions", roleKey], queryFn: () => fetchRolePermissions(roleKey) });
  if (isLoading || !getFor) return <SkeletonRows count={3} />;
  return (
    <div className="space-y-2 text-xs">
      {modules.map(m => {
        const row = getFor(m.key);
        const granted = PERMISSION_ACTIONS.filter(a => row[a]);
        return (
          <div key={m.key} className="rounded-lg border border-white/10 bg-white/[0.02] light:bg-slate-900/[0.02] px-3 py-2">
            <p className="font-medium text-white/80 light:text-slate-700">{m.label}</p>
            <p className="mt-0.5 text-white/40 light:text-slate-400">{granted.length ? granted.map(a => ACTION_LABEL[a]).join(", ") : "No access"}</p>
          </div>
        );
      })}
    </div>
  );
}
