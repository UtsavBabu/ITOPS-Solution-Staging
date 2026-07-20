import { StatusBadge } from "./StatusBadge";

function formatTtl(seconds) {
  if (seconds == null) return "—";
  if (seconds >= 86400 && seconds % 86400 === 0) return `${seconds / 86400}d`;
  if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600}h`;
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60}m`;
  return `${seconds}s`;
}

function signatureOf(answers) {
  if (!answers || answers.length === 0) return null;
  return answers.map(a => a.data).sort().join(", ");
}

// Walks the check history (newest first) and returns only the points where
// the resolved value set actually changed from the check right before it —
// real signal for "did this record change," not every identical poll.
function changeEvents(history) {
  if (!history || history.length === 0) return [];
  const events = [];
  for (let i = 0; i < history.length; i++) {
    const current = signatureOf(history[i].dnsAnswers);
    const previous = i + 1 < history.length ? signatureOf(history[i + 1].dnsAnswers) : undefined;
    if (current !== undefined && current !== previous) {
      events.push({ checkedAt: history[i].checkedAt, signature: current });
    }
  }
  return events;
}

// The "MXToolbox-style" result set: the record type actually queried, the
// real values a public resolver returned for it (not just pass/fail), and
// their TTLs. Reused on both the DNS Monitoring list and the monitor detail
// page so a resolved value looks the same wherever it's shown.
export function DnsRecordsPanel({ monitor, latestCheck, history }) {
  const recordType = monitor.dnsRecordType ?? "A";
  const answers = latestCheck?.dnsAnswers ?? null;
  const expected = (monitor.dnsExpectedValue ?? "").trim();
  const events = history ? changeEvents(history) : [];

  return <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-xs font-medium text-cyan-300 light:bg-cyan-100 light:text-cyan-700">
          {recordType}
        </span>
        <span className="font-mono text-white/70 light:text-slate-600">{monitor.url}</span>
        {latestCheck && <StatusBadge status={latestCheck.status} />}
      </div>

      {!latestCheck ? <p className="text-sm text-white/45 light:text-slate-400">Not checked yet — results appear here once the scheduler runs.</p> : answers && answers.length > 0 ? <div className="overflow-x-auto rounded-lg border border-white/10 light:border-slate-900/10">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
              <tr>
                <th className="px-3 py-2">Resolved value</th>
                <th className="px-3 py-2">TTL</th>
                {expected && <th className="px-3 py-2">Match</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {answers.map((a, i) => <tr key={`${a.data}-${i}`}>
                  <td className="px-3 py-2 font-mono text-white/85 light:text-slate-800">{a.data}</td>
                  <td className="px-3 py-2 text-white/50 light:text-slate-500">{formatTtl(a.ttl)} ({a.ttl}s)</td>
                  {expected && <td className="px-3 py-2">
                      {a.data.includes(expected) ? <span className="text-emerald-300 light:text-emerald-600">✓ matches</span> : <span className="text-white/30 light:text-slate-400">—</span>}
                    </td>}
                </tr>)}
            </tbody>
          </table>
        </div> : latestCheck.status === "UP" ? <p className="text-sm text-white/45 light:text-slate-400">
          Resolves, but detailed record data wasn't captured for this check — it'll appear starting with the next run.
        </p> : <p className="text-sm text-amber-300/90">{latestCheck.errorMessage ?? `No ${recordType} record found for ${monitor.url}.`}</p>}

      {expected && <p className="text-xs text-white/40 light:text-slate-400">Expected value must include: <span className="font-mono text-white/70 light:text-slate-600">{expected}</span></p>}

      {history && <div>
          <p className="text-xs font-medium uppercase tracking-wide text-white/40 light:text-slate-400">
            Change history {events.length > 0 && `(${events.length})`}
          </p>
          {events.length === 0 ? <p className="mt-1 text-xs text-white/40 light:text-slate-400">
              {history.length === 0 ? "No history yet." : `No changes across the last ${history.length} check${history.length === 1 ? "" : "s"} — stable.`}
            </p> : <ul className="mt-1.5 space-y-1 text-xs">
              {events.slice(0, 8).map((e, i) => <li key={e.checkedAt} className="flex items-start gap-2">
                  <span className="mt-0.5 text-white/30 light:text-slate-400 shrink-0">{new Date(e.checkedAt).toLocaleString()}</span>
                  <span className={`font-mono ${i === 0 ? "text-white/80 light:text-slate-700" : "text-white/40 light:text-slate-400"}`}>
                    {e.signature ?? "no record found"}
                  </span>
                </li>)}
            </ul>}
        </div>}
    </div>;
}
