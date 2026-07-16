import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { fetchAdminSslCertificates } from "../../api/adminEndpoints";
import { Reveal, SpotlightCard } from "../../components/Animated";
import { SkeletonRows } from "../../components/Skeleton";
import { EmptyState, ErrorState } from "../../components/EmptyState";

const EASE = [0.16, 1, 0.3, 1];

function daysBadge(days, isValid) {
  if (!isValid) return "bg-red-400/10 light:bg-red-100 text-red-300 light:text-red-700";
  if (days == null) return "bg-white/10 text-white/50 light:text-slate-500";
  if (days <= 3) return "bg-red-400/10 light:bg-red-100 text-red-300 light:text-red-700";
  if (days <= 14) return "bg-amber-400/10 light:bg-amber-100 text-amber-300 light:text-amber-700";
  return "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700";
}

export default function AdminSslCerts() {
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [search, setSearch] = useState("");
  const { data: certs, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-ssl-certs", expiringOnly],
    queryFn: () => fetchAdminSslCertificates(expiringOnly),
    retry: false,
    refetchInterval: 60_000
  });
  const filtered = useMemo(() => {
    if (!search.trim()) return certs ?? [];
    const q = search.trim().toLowerCase();
    return (certs ?? []).filter(c => c.monitorName.toLowerCase().includes(q) || c.organizationName.toLowerCase().includes(q));
  }, [certs, search]);

  return <div className="space-y-6">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">SSL Certificates</h1>
        <p className="text-sm text-white/50 light:text-slate-500">Every certificate tracked across every organization's monitors.</p>
      </Reveal>

      <Reveal delay={0.05} className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by monitor or organization…" className="w-72 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-1.5 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-amber-400/40 focus:outline-none" />
        <button onClick={() => setExpiringOnly(v => !v)} className={`rounded-full px-3 py-1.5 text-sm transition-colors ${expiringOnly ? "bg-white text-black" : "border border-white/15 text-white/60 light:text-slate-500 hover:text-white light:hover:text-slate-900"}`}>
          Expiring within 14 days
        </button>
        <span className="ml-auto text-xs text-white/40 light:text-slate-400">{filtered.length} of {certs?.length ?? 0}</span>
      </Reveal>

      <SpotlightCard className="overflow-x-auto" delay={0.1} tint="amber" scan>
        {isLoading ? <SkeletonRows count={5} /> : isError ? <ErrorState message="Couldn't load certificates — migration 0035 may not be applied yet." onRetry={() => refetch()} /> : filtered.length === 0 ? <EmptyState title="No certificates match." /> : <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
              <tr>
                <th className="px-4 py-3">Monitor</th>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Issuer</th>
                <th className="px-4 py-3">Valid Until</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
              {filtered.map((c, i) => <motion.tr key={c.monitorId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i, 20) * 0.02, ease: EASE }}>
                  <td className="px-4 py-3 font-medium text-white light:text-slate-900">{c.monitorName}</td>
                  <td className="px-4 py-3 text-white/60 light:text-slate-500">{c.organizationName}</td>
                  <td className="px-4 py-3 text-white/50 light:text-slate-500">{c.issuer ?? "—"}</td>
                  <td className="px-4 py-3 text-white/50 light:text-slate-500">{c.validTo ? new Date(c.validTo).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${daysBadge(c.daysRemaining, c.isValid)}`}>
                      {!c.isValid ? "Invalid" : c.daysRemaining != null ? `${c.daysRemaining}d left` : "—"}
                    </span>
                  </td>
                </motion.tr>)}
            </tbody>
          </table>}
      </SpotlightCard>
    </div>;
}
