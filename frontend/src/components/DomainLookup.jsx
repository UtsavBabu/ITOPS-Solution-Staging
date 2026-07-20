import { useState } from "react";

// Same record types and type codes the backend DNS check already resolves
// against (supabase/functions/_shared/checks.ts) — kept in sync so a lookup
// here and a scheduled check there mean the same thing. CAA (257) is
// lookup-tool-only for now.
const LOOKUP_TYPES = ["A", "AAAA", "MX", "TXT", "NS", "CNAME", "CAA"];
const TYPE_CODES = { A: 1, NS: 2, CNAME: 5, MX: 15, TXT: 16, AAAA: 28, CAA: 257 };
const COMMON_DKIM_SELECTORS = ["default", "google", "selector1", "selector2", "k1", "mail"];

const RESOLVERS = {
  google: { label: "Google", url: (name, type) => `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}` },
  cloudflare: { label: "Cloudflare", url: (name, type) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}` }
};

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

async function rawLookup(name, type, resolverKey = "google") {
  const res = await fetch(RESOLVERS[resolverKey].url(name, type), { headers: { Accept: "application/dns-json" } });
  if (!res.ok) throw new Error(`Resolver responded with ${res.status}`);
  return res.json();
}

async function lookupOne(domain, type) {
  try {
    const data = await rawLookup(domain, type);
    const wantCode = TYPE_CODES[type];
    const answers = (Array.isArray(data.Answer) ? data.Answer : []).filter(a => a.type === wantCode).map(a => ({ data: a.data, ttl: a.TTL }));
    if (data.Status !== 0 || answers.length === 0) return { type, status: "none", ad: data.AD };
    return { type, status: "ok", answers, ad: data.AD };
  } catch (err) {
    return { type, status: "error", error: err instanceof Error ? err.message : "Lookup failed" };
  }
}

// TXT lookups at a fixed, well-known hostname prefix — used for DMARC/BIMI/
// DKIM, which don't live at the domain root the way SPF does.
async function lookupTxtAt(hostname) {
  try {
    const data = await rawLookup(hostname, "TXT");
    const answers = (Array.isArray(data.Answer) ? data.Answer : []).filter(a => a.type === 16).map(a => a.data);
    return answers[0] ?? null;
  } catch {
    return null;
  }
}

export function DomainLookup({ onMonitor }) {
  const [domain, setDomain] = useState("");
  const [dkimSelector, setDkimSelector] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [queriedDomain, setQueriedDomain] = useState(null);
  const [emailAuth, setEmailAuth] = useState(null);
  const [dnssec, setDnssec] = useState(null);
  const [propagation, setPropagation] = useState(null);

  async function runLookup(target, selector) {
    setIsLoading(true);
    setResults(null);
    setEmailAuth(null);
    setPropagation(null);

    const settled = await Promise.all(LOOKUP_TYPES.map(type => lookupOne(target, type)));
    setResults(settled);
    setQueriedDomain(target);

    const aRecord = settled.find(r => r.type === "A");
    setDnssec(aRecord?.ad ?? null);

    const spfRecord = settled.find(r => r.type === "TXT")?.answers?.find(a => a.data.toLowerCase().startsWith("v=spf1"));
    const selectorsToTry = selector.trim() ? [selector.trim()] : COMMON_DKIM_SELECTORS;
    const [dmarc, bimi, ...dkimAttempts] = await Promise.all([
      lookupTxtAt(`_dmarc.${target}`),
      lookupTxtAt(`default._bimi.${target}`),
      ...selectorsToTry.map(s => lookupTxtAt(`${s}._domainkey.${target}`))
    ]);
    const dkimFoundIndex = dkimAttempts.findIndex(v => v);
    setEmailAuth({
      spf: spfRecord?.data ?? null,
      dmarc,
      bimi,
      dkim: dkimFoundIndex >= 0 ? { selector: selectorsToTry[dkimFoundIndex], value: dkimAttempts[dkimFoundIndex] } : null,
      dkimTried: selector.trim() ? null : selectorsToTry
    });

    const [googleA, cloudflareA] = await Promise.allSettled([
      rawLookup(target, "A"),
      rawLookup(target, "A", "cloudflare")
    ]);
    const gAnswers = googleA.status === "fulfilled" ? (googleA.value.Answer ?? []).filter(a => a.type === 1).map(a => a.data).sort() : null;
    const cAnswers = cloudflareA.status === "fulfilled" ? (cloudflareA.value.Answer ?? []).filter(a => a.type === 1).map(a => a.data).sort() : null;
    setPropagation({
      google: gAnswers,
      cloudflare: cAnswers,
      consistent: gAnswers && cAnswers ? JSON.stringify(gAnswers) === JSON.stringify(cAnswers) : null
    });

    setIsLoading(false);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const target = cleanDomain(domain);
    if (!target) return;
    runLookup(target, dkimSelector);
  }

  return <div className="space-y-4 rounded-2xl border border-violet-400/15 light:border-violet-900/10 bg-neutral-900/60 light:bg-white p-5">
      <div>
        <h2 className="text-sm font-medium text-white light:text-slate-900">Domain Lookup</h2>
        <p className="mt-1 text-xs text-white/45 light:text-slate-400">
          Look up every common record a domain has — A, AAAA, MX, TXT, NS, CNAME, CAA — plus email authentication
          (SPF/DMARC/DKIM/BIMI), a DNSSEC signal, and cross-resolver propagation. One-time check, not a saved
          monitor.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <label className="flex-1 text-sm" style={{ minWidth: 220 }}>
          <span className="mb-1.5 block text-white/70 light:text-slate-600">Domain</span>
          <input required value={domain} onChange={e => setDomain(e.target.value)} placeholder="example.com" className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-white/40 focus:outline-none" />
        </label>
        <label className="text-sm" style={{ minWidth: 160 }}>
          <span className="mb-1.5 block text-white/70 light:text-slate-600">DKIM selector (optional)</span>
          <input value={dkimSelector} onChange={e => setDkimSelector(e.target.value)} placeholder="e.g. google" className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-white/40 focus:outline-none" />
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
                      {i === 0 && onMonitor && TYPE_CODES[r.type] !== 257 && <button type="button" onClick={() => onMonitor(queriedDomain, r.type)} className="text-xs text-cyan-300 light:text-cyan-600 hover:underline">
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

      {emailAuth && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 light:border-slate-900/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-white/40 light:text-slate-400">Email authentication</p>
            <dl className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <dt className="shrink-0 text-white/50 light:text-slate-500">SPF</dt>
                <dd className={`text-right font-mono ${emailAuth.spf ? "text-emerald-300" : "text-white/30 light:text-slate-400"}`}>{emailAuth.spf ?? "Not found"}</dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="shrink-0 text-white/50 light:text-slate-500">DMARC</dt>
                <dd className={`text-right font-mono ${emailAuth.dmarc ? "text-emerald-300" : "text-white/30 light:text-slate-400"}`}>{emailAuth.dmarc ?? "Not found"}</dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="shrink-0 text-white/50 light:text-slate-500">DKIM</dt>
                <dd className={`text-right font-mono ${emailAuth.dkim ? "text-emerald-300" : "text-white/30 light:text-slate-400"}`}>
                  {emailAuth.dkim ? `[${emailAuth.dkim.selector}] ${emailAuth.dkim.value}` : emailAuth.dkimTried ? `Not found (tried: ${emailAuth.dkimTried.join(", ")})` : "Not found for that selector"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="shrink-0 text-white/50 light:text-slate-500">BIMI</dt>
                <dd className={`text-right font-mono ${emailAuth.bimi ? "text-emerald-300" : "text-white/30 light:text-slate-400"}`}>{emailAuth.bimi ?? "Not found"}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-lg border border-white/10 light:border-slate-900/10 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-white/40 light:text-slate-400">DNSSEC &amp; propagation</p>
            <dl className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-white/50 light:text-slate-500">DNSSEC (resolver-validated)</dt>
                <dd className={dnssec ? "text-emerald-300" : "text-amber-300"}>{dnssec == null ? "Unknown" : dnssec ? "✓ Validated" : "Not validated"}</dd>
              </div>
              {propagation && <div className="flex items-center justify-between gap-2">
                  <dt className="text-white/50 light:text-slate-500">A record: Google vs. Cloudflare</dt>
                  <dd className={propagation.consistent ? "text-emerald-300" : "text-amber-300"}>
                    {propagation.consistent == null ? "Couldn't compare" : propagation.consistent ? "✓ Consistent" : "⚠ Differs"}
                  </dd>
                </div>}
              {propagation && propagation.consistent === false && <>
                  <p className="text-white/40 light:text-slate-400">Google: {(propagation.google ?? []).join(", ") || "—"}</p>
                  <p className="text-white/40 light:text-slate-400">Cloudflare: {(propagation.cloudflare ?? []).join(", ") || "—"}</p>
                </>}
            </dl>
          </div>
        </div>}
    </div>;
}
