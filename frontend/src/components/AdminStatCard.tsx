import type { ReactNode } from "react";

const ICONS: Record<string, ReactNode> = {
  organizations: <path d="M4 5.5h16v5H4zM4 13.5h16v5H4zM7 8h.01M7 16h.01M11 8h4M11 16h2" />,
  users: <path d="M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M9 10a4 4 0 100-8 4 4 0 000 8zm10 10v-2a4 4 0 00-3-3.87M15 3.13a4 4 0 010 7.75" />,
  monitors: <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.5 2.4 3.8 5.6 3.8 9s-1.3 6.6-3.8 9m0-18C9.5 5.4 8.2 8.6 8.2 12s1.3 6.6 3.8 9M3.5 9h17M3.5 15h17" />,
  incidents: <path d="M12 9v4m0 4h.01M10.3 4.3l-8 14A1 1 0 003 20h18a1 1 0 00.9-1.5l-8-14a1 1 0 00-1.6 0z" />,
  waitlist: <path d="M12 3v10m0 0l-3.5-3.5M12 13l3.5-3.5M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />,
  messages: <path d="M4 5h16v11H7l-3 3z" />,
};

export function AdminStatCard({
  label,
  value,
  tone = "default",
  icon,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warning";
  icon?: keyof typeof ICONS;
}) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-neutral-900/60 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">{label}</p>
        {icon && ICONS[icon] && (
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone === "warning" ? "bg-amber-400/10 text-amber-300" : "bg-white/[0.04] text-white/40"}`}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              {ICONS[icon]}
            </svg>
          </span>
        )}
      </div>
      <p className={`mt-2 text-2xl font-medium tracking-tight ${tone === "warning" ? "text-amber-300" : "text-white"}`}>{value}</p>
    </div>
  );
}
