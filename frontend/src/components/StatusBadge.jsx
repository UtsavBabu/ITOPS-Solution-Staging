const STYLES = {
  UP: "bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700",
  DOWN: "bg-red-400/10 light:bg-red-100 text-red-300 light:text-red-700",
  ERROR: "bg-amber-400/10 light:bg-amber-100 text-amber-300 light:text-amber-700",
  UNKNOWN: "bg-white/10 text-white/60 light:text-slate-500"
};
const DOT_STYLES = {
  UP: "bg-emerald-400",
  DOWN: "bg-red-400",
  ERROR: "bg-amber-400",
  UNKNOWN: "bg-white/40"
};

// DOWN pings faster/brighter than UP — a live status radiates like a slow
// heartbeat sweep, a fault radiates like an active alarm.
const PING_STYLES = {
  UP: "bg-emerald-400/70",
  DOWN: "bg-red-400/70 [animation-duration:1.1s]",
  ERROR: "bg-amber-400/70 [animation-duration:1.4s]",
  UNKNOWN: ""
};
export function StatusBadge({
  status
}) {
  const key = status ?? "UNKNOWN";
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[key]}`}>
      <span className="relative grid h-1.5 w-1.5 shrink-0 place-items-center" aria-hidden>
        {key !== "UNKNOWN" && <span className={`absolute h-1.5 w-1.5 rounded-full animate-sonar ${PING_STYLES[key]}`} />}
        <span className={`relative h-1.5 w-1.5 rounded-full ${DOT_STYLES[key]}`} />
      </span>
      {key}
    </span>;
}