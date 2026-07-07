import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MarketingNav } from "../components/MarketingNav";
import { MarketingFooter } from "../components/MarketingFooter";
import { fetchContentItems } from "../api/endpoints";
import { NetworkPulseBackground } from "../components/PageBackgrounds";
import { SpotlightCard } from "../components/Animated";
import { ProductIcon } from "../components/ProductIcon";
import type { SolutionCapability } from "../api/types";

const CARD_TINTS = ["cyan", "emerald", "blue", "violet", "amber"] as const;

type StatusFilter = "all" | "live" | "roadmap";

const FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All products" },
  { value: "live", label: "Live today" },
  { value: "roadmap", label: "On the roadmap" },
];

function SearchIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function Solutions() {
  const { data: solutions, isLoading } = useQuery({
    queryKey: ["content", "solutions", "solutions"],
    queryFn: () => fetchContentItems("solutions", "solutions"),
  });
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (solutions ?? []).filter((s) => {
      if (status !== "all" && s.status !== status) return false;
      if (!q) return true;
      const hay = `${s.title} ${s.subtitle ?? ""} ${s.body ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [solutions, query, status]);

  return (
    <div className="min-h-screen bg-black text-white antialiased" style={{ fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" }}>
      <MarketingNav />

      <main className="px-6 pb-24 pt-40 md:px-10">
        <div className="relative isolate mx-auto -mt-16 max-w-5xl overflow-hidden rounded-3xl pb-16 pt-16 text-center">
          <NetworkPulseBackground tint="blue" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-black" />
          <div className="relative z-10">
            <p className="text-xs font-medium uppercase tracking-[0.15em] text-white/45">Products</p>
            <h1 className="mt-4 text-4xl font-medium leading-[1.05] tracking-[-0.03em] md:text-6xl">
              Independent Products. <span className="text-gradient">One Platform.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60">
              Each ITOps Solution product stands on its own — adopt one for a single team or run them all from one
              dashboard. Live products work today under your package limits; roadmap products are shown honestly, not
              pretended.
            </p>
          </div>
        </div>

        {/* marketplace controls */}
        <div className="mx-auto mt-12 flex max-w-5xl flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <div className="group relative w-full max-w-xs">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35 transition-colors group-focus-within:text-cyan-300">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="h-11 w-full rounded-full border border-white/12 bg-black/40 pl-11 pr-4 text-sm text-white placeholder:text-white/35 transition-all focus:border-cyan-400/50 focus:shadow-[0_0_0_4px_rgba(34,211,238,0.14)] focus:outline-none"
            />
          </div>
          <div className="flex gap-2" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatus(f.value)}
                aria-pressed={status === f.value}
                className={`rounded-full px-4 py-2 text-sm transition-all ${
                  status === f.value
                    ? "bg-white text-black"
                    : "border border-white/12 text-white/60 hover:border-white/30 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
          {isLoading &&
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
            ))}

          {!isLoading && filtered.length === 0 && (
            <p className="col-span-full rounded-2xl border border-white/10 bg-neutral-900/50 p-8 text-center text-sm text-white/45">
              No products match “{query}”. Try a different term or clear the filters.
            </p>
          )}

          {filtered.map((solution, i) => {
            const capabilities = Array.isArray(solution.metadata.capabilities)
              ? (solution.metadata.capabilities as SolutionCapability[])
              : [];
            const liveCount = capabilities.filter((c) => c.status === "live").length;
            return (
              <Link key={solution.id} to={`/solutions/${solution.itemKey}`} className="block h-full">
                <SpotlightCard tint={CARD_TINTS[i % CARD_TINTS.length]} delay={i * 0.06} className="h-full">
                  <div className="flex h-full flex-col p-7">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <ProductIcon itemKey={solution.itemKey} />
                        <div>
                          <h2 className="text-lg font-semibold tracking-tight">{solution.title}</h2>
                          <p className="mt-0.5 text-xs text-white/45">{solution.subtitle}</p>
                        </div>
                      </div>
                      <span
                        className={`mt-1 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          solution.status === "live" ? "bg-emerald-400/10 text-emerald-300" : "bg-white/10 text-white/60"
                        }`}
                      >
                        {solution.status === "live" ? "Live" : "Roadmap"}
                      </span>
                    </div>
                    <p className="mt-4 flex-1 text-sm leading-relaxed text-white/55">{solution.body}</p>
                    <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                      <span className="text-xs text-white/40">
                        {liveCount > 0
                          ? `${liveCount} capabilit${liveCount === 1 ? "y" : "ies"} live`
                          : `${capabilities.length} planned capabilities`}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm text-white/70 transition-all group-hover:gap-2 group-hover:text-white">
                        View product <span aria-hidden>→</span>
                      </span>
                    </div>
                  </div>
                </SpotlightCard>
              </Link>
            );
          })}
        </div>

        <p className="mx-auto mt-12 max-w-5xl text-center text-sm text-white/40">
          Need a custom mix for your organization?{" "}
          <Link to="/pricing" className="font-medium text-cyan-300 hover:text-cyan-200">
            Compare packages
          </Link>{" "}
          or{" "}
          <Link to="/company" className="font-medium text-cyan-300 hover:text-cyan-200">
            talk to our team
          </Link>
          .
        </p>
      </main>

      <MarketingFooter />
    </div>
  );
}
