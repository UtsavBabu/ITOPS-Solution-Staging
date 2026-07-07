import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { fetchPublicStatusPage } from "../api/endpoints";
import type { CheckStatus } from "../api/types";
import { HeartbeatLineBackground } from "../components/PageBackgrounds";

const STATUS_META: Record<
  CheckStatus | "UNKNOWN",
  { label: string; dot: string; text: string }
> = {
  UP: { label: "Operational", dot: "bg-emerald-400", text: "text-emerald-300" },
  DOWN: { label: "Down", dot: "bg-red-400", text: "text-red-300" },
  ERROR: { label: "Error", dot: "bg-red-400", text: "text-red-300" },
  UNKNOWN: { label: "Pending", dot: "bg-white/40", text: "text-white/50" },
};

const CHECK_TYPE_LABELS: Record<string, string> = {
  HTTP: "Uptime",
  KEYWORD: "Keyword",
  STATUS_CODE: "Status code",
  DNS: "DNS",
};

export default function StatusPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-status-page", slug],
    queryFn: () => fetchPublicStatusPage(slug!),
    enabled: !!slug,
    refetchInterval: 30_000,
  });

  const fontStyle = { fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white/50" style={fontStyle}>
        Loading…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-white" style={fontStyle}>
        <div>
          <p className="text-xl font-medium">Status Page Not Found</p>
          <p className="mt-2 text-sm text-white/50">This status page doesn't exist or isn't published.</p>
        </div>
      </div>
    );
  }

  const services = data.services;
  const anyDown = services.some((s) => s.status === "DOWN" || s.status === "ERROR");
  const anyPending = services.some((s) => s.status === "UNKNOWN");
  const overall = anyDown
    ? { label: "Some systems are experiencing issues", dot: "bg-red-400", text: "text-red-300" }
    : services.length === 0 || anyPending
      ? { label: "Awaiting first checks", dot: "bg-white/40", text: "text-white/60" }
      : { label: "All systems operational", dot: "bg-emerald-400", text: "text-emerald-300" };

  return (
    <div className="min-h-screen bg-black text-white antialiased" style={fontStyle}>
      <div className="relative overflow-hidden border-b border-white/10">
        <HeartbeatLineBackground tint={anyDown ? "red" : "emerald"} />
        <div className="relative z-10 mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">{data.organizationName}</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight md:text-4xl">{data.title}</h1>
          <div className="mt-6 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-neutral-900/70 px-4 py-2 backdrop-blur">
            <span className={`h-2.5 w-2.5 rounded-full ${overall.dot}`} />
            <span className={`text-sm font-medium ${overall.text}`}>{overall.label}</span>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-6 py-12">
        {services.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-neutral-900/60 p-6 text-center text-sm text-white/50">
            No monitored services yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/60">
            <ul className="divide-y divide-white/10">
              {services.map((service) => {
                const meta = STATUS_META[service.status] ?? STATUS_META.UNKNOWN;
                return (
                  <li key={service.name} className="flex items-center justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{service.name}</p>
                      <p className="text-xs text-white/40">
                        {CHECK_TYPE_LABELS[service.checkType] ?? service.checkType} check
                        {service.lastCheckedAt ? ` · checked ${new Date(service.lastCheckedAt).toLocaleTimeString()}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                      <span className={`text-sm ${meta.text}`}>{meta.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-white/35">
          Last updated {new Date(data.generatedAt).toLocaleString()} · Updates automatically · Powered by ITOps Solution
        </p>
      </main>
    </div>
  );
}
