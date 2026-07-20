import { useState } from "react";

// Same record types and type codes the backend DNS check already resolves
// against (supabase/functions/_shared/checks.ts) — kept in sync so a lookup
// here and a scheduled check there mean the same thing.
const LOOKUP_TYPES = ["A", "AAAA", "MX", "TXT", "NS", "CNAME"];
const TYPE_CODES = { A: 1, NS: 2, CNAME: 5, MX: 15, TXT: 16, AAAA: 28 };

function formatTtl(seconds) {
  if (seconds == null) return "—";
  if (seconds >= 86400 && seconds % 86400 === 0) return `${seconds / 86400}d`;
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

function cleanDomain(input) {
  return input.replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();
}

async function lookupOne(domain, type) {
  try {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`, {
      headers: { Accept: "application/dns-json" }
    });
    if (!res.ok) return { type, status: "error", error: `Resolver responded with ${res.status}` };
    const data = await res.json();
    const wantCode = TYPE_CODES[type];
    const answers = (Array.isArray(data.Answer) ? data.Answer : []).filter(a => a.type === wantCode).map(a => ({ data: a.data, ttl: a.TTL }));
    if (data.Status !== 0 || answers.length === 0) return { type, status: "none" };
    return { type, status: "ok", answers };
  } catch (err) {
    return { type, status: "error", error: err instanceof Error ? err.message : "Lookup failed" };
  }
}

// A one-shot "look up everything this domain has" tool, like MXToolbox's DNS
// lookup — separate from the scheduled monitors below. Queries every common
// record type in parallel directly against Google's public DoH resolver
// (the same one the scheduled DNS checks use), right from the browser —
// nothing here is persisted or counted against the plan's monitor limit.
export function DomainLookup({ onMonitor }) {
  const [domain, setDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [queriedDomain, setQueriedDomain] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    const target = cleanDomain(domain);
    if (!target) return;
    setIsLoading(true);
    setResults(null);
    const settled = await Promise.all(LOOKUP_TYPES.map(type => lookupOne(target, type)));
    setResults(settled);
    setQueriedDomain(target);
    setIsLoading(false);
  }

  return <div className="space-y-4 rounded-2xl border border-violet-400/15 light:border-violet-900/10 bg-neutral-900/60 light:bg-white p-5">
      <div>
        <h2 className="text-sm font-medium text-white light:text-slate-900">Domain Lookup</h2>
        <p className="mt-1 text-xs text-white/45 light:text-slate-400">
          Look up every common record a domain has, all at once — A, AAAA, MX, TXT, NS, and CNAME — like a public DNS
          lookup tool. This is a one-time check, not a saved monitor.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex-1 text-sm" style={{ minWidth: 220 }}>
          <span className="mb-1.5 block text-white/70 light:text-slate-600">Domain</span>
          <input required value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com" className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-white/40 focus:outline-none" />
        </label>
        <button type="submit" disabled={isLoading} className="rounded-full bg-violet-400 px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-violet-300 disabled:opacity-60">
          {isLoading ? "Looking up…" : "Look up"}
        </button>
      </form>

      {results && <div className="overflow-x-auto rounded-lg border border-white/10 light:border-slate-900/10">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
              <tr>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Resolved value</th>
                <th className="px-3 py-2">TTL</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {results.map(r => r.status === "ok" ? r.answers.map((a, i) => <tr key={`${r.type}-${i}`}>
                    <td className="px-3 py-2">
                      {i === 0 && <span className="rounded-full bg-violet-400/10 px-2 py-0.5 text-xs font-medium text-violet-300 light:bg-violet-100 light:text-violet-700">{r.type}</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-white/85 light:text-slate-800">{a.data}</td>
                    <td className="px-3 py-2 text-white/50 light:text-slate-500">{formatTtl(a.ttl)}</td>
                    <td className="px-3 py-2 text-right">
                      {i === 0 && onMonitor && <button type="button" onClick={() => onMonitor(queriedDomain, r.type)} className="text-xs text-cyan-300 light:text-cyan-600 hover:underline">
                          Monitor this →
                        </button>}
                    </td>
                  </tr>) : <tr key={r.type}>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-white/40 light:bg-slate-900/5 light:text-slate-400">{r.type}</span>
                    </td>
                    <td className="px-3 py-2 text-white/30 light:text-slate-400" colSpan={2}>
                      {r.status === "error" ? (r.error ?? "Lookup failed") : "No record found"}
                    </td>
                    <td />
                  </tr>)}
            </tbody>
          </table>
        </div>}
    </div>;
}
