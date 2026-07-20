import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { createMonitor, deleteMonitor, fetchMonitors, listHostAgents } from "../api/endpoints";
import { StatusBadge } from "../components/StatusBadge";
import { Reveal, SpotlightCard } from "../components/Animated";
import { SkeletonRows } from "../components/Skeleton";
import { EmptyState, ErrorState } from "../components/EmptyState";
import { useConfirm } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
import { useRealtimeInvalidate } from "../hooks/useRealtimeInvalidate";
const EASE = [0.16, 1, 0.3, 1];
const INTERVAL_LABELS = {
  THIRTY_SECONDS: "30 seconds",
  ONE_MINUTE: "1 minute",
  FIVE_MINUTES: "5 minutes",
  FIFTEEN_MINUTES: "15 minutes"
};
const CHECK_TYPE_LABELS = {
  HTTP: "Uptime",
  KEYWORD: "Keyword",
  STATUS_CODE: "Status code",
  DNS: "DNS",
  TCP: "TCP port",
  PING: "ICMP ping"
};

// The two product surfaces of this page. Websites speak HTTP; network
// devices (routers, switches, firewalls, printers) are checked at the
// transport layer — TCP connects, or a real ICMP ping relayed through an
// installed agent (the cloud has no raw sockets, so ping only exists via an
// agent — there's no "ping from the cloud" fallback). DNS record monitoring
// lives on its own page (/dns) since it's a different kind of check with its
// own rich result display, not a device with a port.

const WEB_TYPES = ["HTTP", "KEYWORD", "STATUS_CODE"];
const NETWORK_TYPES = ["TCP", "PING"];
const WEB_CHECKS = [{
  value: "HTTP",
  label: "Website / API uptime",
  blurb: "Alerts when the URL returns an error or stops responding."
}, {
  value: "KEYWORD",
  label: "Keyword on page",
  blurb: "Alerts when expected text is missing (or unexpected text appears)."
}, {
  value: "STATUS_CODE",
  label: "Exact status code",
  blurb: "Alerts unless the endpoint returns one specific HTTP code."
}];
const NETWORK_CHECKS = [{
  value: "TCP",
  label: "Device / TCP port",
  blurb: "Connects to a port on the device and alerts when it stops accepting connections — like Nagios check_tcp."
}, {
  value: "PING",
  label: "ICMP ping (via agent)",
  blurb: "A real ping sent from an installed agent on the device's own network — measures reachability and latency without needing an open port. Requires picking an agent under \"Check via\" below."
}];
const PORT_PRESETS = [{
  label: "HTTPS · 443",
  port: 443
}, {
  label: "HTTP · 80",
  port: 80
}, {
  label: "SSH · 22",
  port: 22
}, {
  label: "DNS · 53",
  port: 53
}, {
  label: "RDP · 3389",
  port: 3389
}, {
  label: "MySQL · 3306",
  port: 3306
}];
// Named devices, not just raw ports — a home router or ISP fiber terminal
// (GPON ONT) is exactly what the generic TCP check already monitors, this
// just gets someone there without having to know which port to pick.
const DEVICE_PRESETS = [{
  label: "Home Router",
  name: "Home Router",
  port: 80,
  icon: "📶",
  blurb: "Checks your router's web admin port — if it stops responding, your whole network is likely down."
}, {
  label: "GPON / Fiber ONT",
  name: "Fiber ONT (GPON)",
  port: 80,
  icon: "🔌",
  blurb: "Checks your ISP's fiber terminal — catches a fiber/ISP outage before your router even notices."
}, {
  label: "Switch",
  name: "Network Switch",
  port: 22,
  icon: "🔀"
}, {
  label: "Firewall",
  name: "Firewall",
  port: 443,
  icon: "🛡️"
}, {
  label: "Network Printer",
  name: "Printer",
  port: 9100,
  icon: "🖨️"
}, {
  label: "NAS",
  name: "NAS",
  port: 445,
  icon: "💾"
}];
const REALTIME_TABLES = ["monitors", "incidents", "check_results"];
const REALTIME_KEYS = [["monitors"]];
const inputClass = "rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-slate-900/[0.03] px-3 py-2 text-sm text-white light:text-slate-900 placeholder:text-white/30 light:placeholder:text-slate-400 focus:border-white/40 focus:outline-none";
function targetLabel(monitor) {
  if (monitor.checkType === "TCP") return `${monitor.url}:${monitor.tcpPort ?? "?"}`;
  return monitor.url;
}
// Below `md`, the 6-column table forces horizontal scroll with the most
// important field (Status) buried three columns in — real "congested on
// mobile" the audit found. Cards stack the same data instead, Status right
// next to the name where it's actually useful at a glance.
function MonitorCards({ monitors, onDelete }) {
  return <div className="divide-y divide-white/10 light:divide-slate-900/8">
      {monitors.map((monitor, i) => <motion.div key={monitor.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.03, ease: EASE }} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <Link to={`/monitors/${monitor.id}`} className="font-medium text-white light:text-slate-900 hover:underline">
              {monitor.name}
            </Link>
            <StatusBadge status={monitor.lastStatus} />
          </div>
          <p className="mt-1 truncate text-xs text-white/50 light:text-slate-500">{targetLabel(monitor)}</p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/40 light:text-slate-400">
            <span className="rounded-full bg-white/10 px-2 py-0.5 font-medium text-white/70 light:text-slate-600">
              {CHECK_TYPE_LABELS[monitor.checkType]}
            </span>
            <span>Every {INTERVAL_LABELS[monitor.interval]}</span>
            <span>{monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleString() : "Pending first check"}</span>
          </div>
          <button onClick={() => onDelete(monitor)} className="mt-3 text-xs text-red-300 light:text-red-600 hover:underline">
            Delete
          </button>
        </motion.div>)}
    </div>;
}
function MonitorTable({
  monitors,
  onDelete
}) {
  return <table className="hidden w-full min-w-[640px] text-left text-sm md:table">
      <thead className="border-b border-white/10 light:border-slate-900/10 text-xs uppercase text-white/40 light:text-slate-400">
        <tr>
          <th className="px-4 py-2">Name</th>
          <th className="px-4 py-2">Type</th>
          <th className="px-4 py-2">Target</th>
          <th className="px-4 py-2">Status</th>
          <th className="px-4 py-2">Interval</th>
          <th className="px-4 py-2">Last Checked</th>
          <th className="px-4 py-2" />
        </tr>
      </thead>
      <tbody className="divide-y divide-white/10 light:divide-slate-900/8">
        {monitors.map((monitor, i) => <motion.tr key={monitor.id} initial={{
        opacity: 0,
        y: 6
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.3,
        delay: i * 0.03,
        ease: EASE
      }} className="transition-colors hover:bg-white/[0.02] light:hover:bg-slate-900/[0.02]">
            <td className="px-4 py-3 font-medium text-white light:text-slate-900">
              <Link to={`/monitors/${monitor.id}`} className="hover:underline">
                {monitor.name}
              </Link>
            </td>
            <td className="px-4 py-3">
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/70 light:text-slate-600">
                {CHECK_TYPE_LABELS[monitor.checkType]}
              </span>
            </td>
            <td className="px-4 py-3 text-white/50 light:text-slate-500">{targetLabel(monitor)}</td>
            <td className="px-4 py-3">
              <StatusBadge status={monitor.lastStatus} />
            </td>
            <td className="px-4 py-3 text-white/50 light:text-slate-500">{INTERVAL_LABELS[monitor.interval]}</td>
            <td className="px-4 py-3 text-white/50 light:text-slate-500">
              {monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleString() : "Pending first check"}
            </td>
            <td className="px-4 py-3 text-right">
              <button onClick={() => onDelete(monitor)} className="text-red-300 light:text-red-600 transition-colors hover:underline">
                Delete
              </button>
            </td>
          </motion.tr>)}
      </tbody>
    </table>;
}
// A monitor only stores the port it checks, not which device preset (if any)
// created it — so this is a best-effort icon from the port's well-known
// service, not a claim about the actual hardware. Falls back to a plain plug.
const PORT_ICONS = {
  80: "🌐",
  443: "🌐",
  22: "🖥️",
  3389: "🖥️",
  53: "📡",
  3306: "🗄️",
  445: "💾",
  9100: "🖨️"
};
function deviceIcon(monitor) {
  if (monitor.checkType === "PING") return "📡";
  return PORT_ICONS[monitor.tcpPort] ?? "🔌";
}
// Network devices get a card grid, not the website table — these are
// physical things you'd recognize by icon, not rows in an endpoint list.
function DeviceCards({ monitors, onDelete, hostAgents }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {monitors.map((monitor, i) => {
      const relayAgent = monitor.viaHostAgentId ? (hostAgents ?? []).find(a => a.id === monitor.viaHostAgentId) : null;
      return <motion.div key={monitor.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.03, ease: EASE }} className="rounded-xl border border-white/10 light:border-slate-900/10 bg-white/[0.02] light:bg-slate-900/[0.02] p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-400/10 text-base" aria-hidden>
                {deviceIcon(monitor)}
              </span>
              <div className="min-w-0">
                <Link to={`/monitors/${monitor.id}`} className="block truncate font-medium text-white light:text-slate-900 hover:underline">
                  {monitor.name}
                </Link>
                <p className="truncate font-mono text-xs text-white/45 light:text-slate-400">{targetLabel(monitor)}</p>
              </div>
            </div>
            <StatusBadge status={monitor.lastStatus} />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-white/40 light:text-slate-400">
            <span className="flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/70 light:text-slate-600">{CHECK_TYPE_LABELS[monitor.checkType]}</span>
              Every {INTERVAL_LABELS[monitor.interval]}
            </span>
            <button onClick={() => onDelete(monitor)} className="text-red-300 light:text-red-600 hover:underline">
              Delete
            </button>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-[11px] text-white/30 light:text-slate-400">
              {monitor.lastCheckedAt ? new Date(monitor.lastCheckedAt).toLocaleString() : "Pending first check"}
            </p>
            {monitor.viaHostAgentId && <span className="rounded-full bg-violet-400/10 px-2 py-0.5 text-[10px] font-medium text-violet-300 light:bg-violet-100 light:text-violet-700">
                via {relayAgent?.name ?? "agent"}
              </span>}
          </div>
        </motion.div>;
    })}
    </div>;
}
export default function Monitors({ mode = "web" }) {
  useRealtimeInvalidate(REALTIME_TABLES, REALTIME_KEYS);
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const toast = useToast();
  const {
    data: monitors,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery({
    queryKey: ["monitors"],
    queryFn: fetchMonitors,
    refetchInterval: 60_000
  });
  // `mode` (route-driven, via App.jsx's key={mode} on this route element) is
  // the single source of truth for which section this is — there is no
  // separate "tab" state to desync from it. Switching sections is a real
  // route navigation (the toggle below renders <Link>s), which remounts this
  // component fresh via the key, so checkType/name/url etc. always start
  // clean for the section actually being viewed.
  const [checkType, setCheckType] = useState(mode === "web" ? "HTTP" : "TCP");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [interval, setInterval] = useState("FIVE_MINUTES");
  const [expectedKeyword, setExpectedKeyword] = useState("");
  const [keywordMatchMode, setKeywordMatchMode] = useState("CONTAINS");
  const [expectedStatusCode, setExpectedStatusCode] = useState("200");
  const [tcpPort, setTcpPort] = useState("443");
  const [devicePreset, setDevicePreset] = useState(null);
  const [viaHostAgentId, setViaHostAgentId] = useState("");
  const [formError, setFormError] = useState(null);
  const isTcp = checkType === "TCP";
  const isPing = checkType === "PING";
  const activeChecks = mode === "web" ? WEB_CHECKS : NETWORK_CHECKS;
  const activeType = activeChecks.find(t => t.value === checkType) ?? activeChecks[0];
  // Only network devices can be relayed through an agent (a device on the
  // agent's own LAN the cloud can't reach directly), so this only needs to
  // fetch once you're actually on that page.
  const { data: hostAgents } = useQuery({
    queryKey: ["host-agents"],
    queryFn: listHostAgents,
    enabled: mode === "network",
    staleTime: 30_000
  });
  const {
    webMonitors,
    networkMonitors
  } = useMemo(() => {
    const all = monitors ?? [];
    return {
      webMonitors: all.filter(m => WEB_TYPES.includes(m.checkType)),
      networkMonitors: all.filter(m => NETWORK_TYPES.includes(m.checkType))
    };
  }, [monitors]);
  const createMutation = useMutation({
    mutationFn: () => createMonitor({
      name,
      url,
      interval,
      checkType,
      expectedKeyword: checkType === "KEYWORD" ? expectedKeyword : undefined,
      keywordMatchMode: checkType === "KEYWORD" ? keywordMatchMode : undefined,
      expectedStatusCode: checkType === "STATUS_CODE" ? Number(expectedStatusCode) : undefined,
      tcpPort: isTcp ? Number(tcpPort) : undefined,
      viaHostAgentId: (isTcp || isPing) && viaHostAgentId ? viaHostAgentId : undefined
    }),
    onSuccess: () => {
      setName("");
      setUrl("");
      setExpectedKeyword("");
      setDevicePreset(null);
      setViaHostAgentId("");
      queryClient.invalidateQueries({
        queryKey: ["monitors"]
      });
    },
    onError: err => {
      setFormError(err instanceof Error ? err.message : "Failed to create monitor");
    }
  });
  const deleteMutation = useMutation({
    mutationFn: id => deleteMonitor(id),
    onSuccess: () => queryClient.invalidateQueries({
      queryKey: ["monitors"]
    })
  });
  async function handleDelete(monitor) {
    const ok = await confirm({
      title: `Delete monitor "${monitor.name}"?`,
      description: "This stops all checks and removes its history. This cannot be undone.",
      confirmLabel: "Delete",
      danger: true
    });
    if (!ok) return;
    deleteMutation.mutate(monitor.id, {
      onSuccess: () => toast.success(`Deleted "${monitor.name}".`),
      onError: err => toast.error(err instanceof Error ? err.message : "Failed to delete monitor.")
    });
  }
  function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    createMutation.mutate();
  }
  const shownMonitors = mode === "web" ? webMonitors : networkMonitors;
  return <div className="space-y-6">
      <Reveal y={12} className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${mode === "web" ? "bg-blue-400/10 text-blue-300 light:bg-blue-100 light:text-blue-700" : "bg-cyan-400/10 text-cyan-300 light:bg-cyan-100 light:text-cyan-700"}`}>
            {mode === "web" ? "◈" : "◇"}
          </span>
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">{mode === "web" ? "Website & API Monitoring" : "Network Device Monitoring"}</h1>
            <p className="mt-1 text-sm text-white/45 light:text-slate-400">
              {mode === "web" ? "Uptime, keyword, and status-code checks for anything that speaks HTTP." : "Routers, GPON/fiber terminals, switches, firewalls, and printers — anything with a reachable port."}
            </p>
          </div>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${mode === "web" ? "bg-blue-400/10 text-blue-300 light:bg-blue-100 light:text-blue-700" : "bg-cyan-400/10 text-cyan-300 light:bg-cyan-100 light:text-cyan-700"}`}>
          {mode === "web" ? `${webMonitors.length} monitor${webMonitors.length === 1 ? "" : "s"}` : `${networkMonitors.length} device${networkMonitors.length === 1 ? "" : "s"}`}
        </span>
      </Reveal>

      {mode === "network" && <Reveal className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] light:bg-slate-900/[0.03] px-4 py-3">
          <p className="text-xs leading-relaxed text-white/50 light:text-slate-500">
            TCP connect checks with latency (Nagios <code className="text-white/70 light:text-slate-600">check_tcp</code> style) for home
            routers, GPON/fiber terminals (ONTs), switches, firewalls, and printers — from the cloud when the
            device's port is reachable from the internet, or relayed through the{" "}
            <Link to="/hosts" className="text-cyan-300 light:text-cyan-600 hover:underline">
              Kada Nigrani agent
            </Link>{" "}
            when it isn't. Need a device that has no open port at all? Pick "ICMP ping" as the check type — the
            agent sends a real ping instead. Watching a domain's DNS records instead of a device port? See{" "}
            <Link to="/dns" className="text-cyan-300 light:text-cyan-600 hover:underline">
              DNS Monitoring
            </Link>.
          </p>
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-amber-300/90">On the roadmap</p>
            <p className="mt-1 text-xs leading-relaxed text-white/55 light:text-slate-500">
              <span className="text-white/80 light:text-slate-700">SNMP</span> polling (interface traffic, CPU, memory, uptime) for deeper
              router/switch health — this needs a fundamentally different agent (SNMP's binary protocol isn't
              something a bash script can speak) rather than a raw-socket limitation. TCP relay and ICMP ping via
              the agent (above) are both real and work today.
            </p>
          </div>
        </Reveal>}

      <Reveal delay={0.05}>
      <form onSubmit={handleSubmit} className={`space-y-4 rounded-2xl border bg-neutral-900/60 light:bg-white p-5 ${mode === "web" ? "border-blue-400/15 light:border-blue-900/10" : "border-cyan-400/15 light:border-cyan-900/10"}`}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1.5 block text-white/70 light:text-slate-600">Check type</span>
            <select value={checkType} onChange={e => setCheckType(e.target.value)} className={`w-full ${inputClass}`}>
              {activeChecks.map(t => <option key={t.value} value={t.value}>
                  {t.label}
                </option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-white/70 light:text-slate-600">Name</span>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder={mode === "web" ? "Marketing site" : "Office router"} className={`w-full ${inputClass}`} />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-white/70 light:text-slate-600">{isTcp || isPing ? "Hostname / IP" : "URL"}</span>
            <input required type={isTcp || isPing ? "text" : "url"} value={url} onChange={e => setUrl(e.target.value)} placeholder={isTcp || isPing ? "gateway.example.com or 203.0.113.1" : "https://example.com"} className={`w-full ${inputClass}`} />
          </label>
          <label className="text-sm">
            <span className="mb-1.5 block text-white/70 light:text-slate-600">Check every</span>
            <select value={interval} onChange={e => setInterval(e.target.value)} className={`w-full ${inputClass}`}>
              {Object.entries(INTERVAL_LABELS).map(([value, label]) => <option key={value} value={value}>
                  {label}
                </option>)}
            </select>
          </label>
        </div>

        <p className="text-xs text-white/45 light:text-slate-400">{activeType.blurb}</p>

        {isTcp && <div className="space-y-4">
            <div className="space-y-2.5">
              <span className="block text-sm text-white/70 light:text-slate-600">Common devices</span>
              <div className="flex flex-wrap gap-2">
                {DEVICE_PRESETS.map(d => <button key={d.label} type="button" onClick={() => { setName(d.name); setTcpPort(String(d.port)); setDevicePreset(d); }} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-all ${devicePreset?.label === d.label ? "bg-cyan-400 text-black" : "border border-white/15 text-white/60 light:text-slate-500 hover:border-cyan-400/40 hover:text-white light:hover:text-slate-900"}`}>
                    <span aria-hidden>{d.icon}</span> {d.label}
                  </button>)}
              </div>
              {devicePreset?.blurb && <p className="text-xs leading-relaxed text-cyan-200/70">{devicePreset.blurb}</p>}
            </div>
            <div className="space-y-2.5">
              <span className="block text-sm text-white/70 light:text-slate-600">Port</span>
              <div className="flex flex-wrap items-center gap-2">
                {PORT_PRESETS.map(p => <button key={p.port} type="button" onClick={() => setTcpPort(String(p.port))} className={`rounded-full px-3 py-1.5 text-xs transition-all ${Number(tcpPort) === p.port ? "bg-white text-black" : "border border-white/15 text-white/60 light:text-slate-500 hover:border-white/30 hover:text-white light:hover:text-slate-900"}`}>
                    {p.label}
                  </button>)}
                <input required type="number" min={1} max={65535} value={tcpPort} onChange={e => setTcpPort(e.target.value)} aria-label="Custom port" className={`w-28 ${inputClass}`} />
              </div>
            </div>
          </div>}

        {(isTcp || isPing) && <div className="space-y-2.5">
              <span className="block text-sm text-white/70 light:text-slate-600">Check via</span>
              <select value={viaHostAgentId} onChange={e => setViaHostAgentId(e.target.value)} className={`w-full max-w-xs ${inputClass}`}>
                {isTcp && <option value="">Cloud (direct — device must have a public port)</option>}
                {isPing && <option value="">Select an agent…</option>}
                {(hostAgents ?? []).map(a => <option key={a.id} value={a.id}>
                    Agent: {a.name}{a.isOnline ? "" : " (offline)"}
                  </option>)}
              </select>
              {isPing && !viaHostAgentId ? <p className="text-xs leading-relaxed text-amber-300/90">
                  ICMP ping always runs via an agent — the cloud has no way to send a raw ping. Pick one above to
                  continue.{" "}
                  {(hostAgents ?? []).length === 0 && <Link to="/hosts" className="text-cyan-300 light:text-cyan-600 hover:underline">Add an agent →</Link>}
                </p> : !viaHostAgentId ? <p className="text-xs leading-relaxed text-white/45 light:text-slate-400">
                  Works when this device's port is reachable from the internet. Behind a home router/office
                  firewall? Install the Kada Nigrani agent on any machine on the <em>same network</em> as this
                  device, then pick it here — the agent checks it locally and reports back.{" "}
                  {(hostAgents ?? []).length === 0 && <Link to="/hosts" className="text-cyan-300 light:text-cyan-600 hover:underline">Add an agent →</Link>}
                </p> : <p className="text-xs leading-relaxed text-cyan-200/70">
                  Checked from that agent's network every {INTERVAL_LABELS[interval]}, not from the cloud — works
                  even if this device has no public port.
                </p>}
          </div>}

        {checkType === "KEYWORD" && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1.5 block text-white/70 light:text-slate-600">Page must…</span>
              <select value={keywordMatchMode} onChange={e => setKeywordMatchMode(e.target.value)} className={`w-full ${inputClass}`}>
                <option value="CONTAINS">Contain this text</option>
                <option value="NOT_CONTAINS">Not contain this text</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block text-white/70 light:text-slate-600">Text to look for</span>
              <input required value={expectedKeyword} onChange={e => setExpectedKeyword(e.target.value)} placeholder="Sign in" className={`w-full ${inputClass}`} />
            </label>
          </div>}

        {checkType === "STATUS_CODE" && <label className="block max-w-xs text-sm">
            <span className="mb-1.5 block text-white/70 light:text-slate-600">Expected HTTP status code</span>
            <input required type="number" min={100} max={599} value={expectedStatusCode} onChange={e => setExpectedStatusCode(e.target.value)} placeholder="200" className={`w-full ${inputClass}`} />
          </label>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={createMutation.isPending || (isPing && !viaHostAgentId)} className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-60">
            {createMutation.isPending ? "Adding…" : mode === "web" ? "Add Monitor" : "Add Device"}
          </button>
          {formError && <p className="text-sm text-red-300">{formError}</p>}
        </div>
      </form>
      </Reveal>

      <SpotlightCard className={mode === "web" ? "overflow-x-auto" : "p-4"} delay={0.1} scan tint={mode === "web" ? "blue" : "cyan"}>
        {isLoading ? <SkeletonRows count={4} /> : isError ? <ErrorState message={`Couldn't load monitors: ${error instanceof Error ? error.message : "unknown error"}`} onRetry={() => refetch()} /> : shownMonitors.length === 0 ? <EmptyState title={mode === "web" ? "No website monitors yet." : "No network devices yet."} description={mode === "web" ? "Add a check above to start monitoring." : "Add a router, switch, or any device with a reachable port above."} /> : mode === "web" ? <>
            <MonitorTable monitors={shownMonitors} onDelete={handleDelete} />
            <div className="md:hidden"><MonitorCards monitors={shownMonitors} onDelete={handleDelete} /></div>
          </> : <DeviceCards monitors={shownMonitors} onDelete={handleDelete} hostAgents={hostAgents} />}
      </SpotlightCard>
    </div>;
}