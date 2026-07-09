import type { ReactNode } from "react";

const ICONS: Record<string, ReactNode> = {
  monitors: <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 0c2.5 2.4 3.8 5.6 3.8 9s-1.3 6.6-3.8 9m0-18C9.5 5.4 8.2 8.6 8.2 12s1.3 6.6 3.8 9M3.5 9h17M3.5 15h17" />,
  up: <path d="M5 13l4 4L19 7" />,
  down: <path d="M12 9v4m0 4h.01M10.3 4.3l-8 14A1 1 0 003 20h18a1 1 0 00.9-1.5l-8-14a1 1 0 00-1.6 0z" />,
  incidents: <path d="M12 3v2m0 14v2M5 12H3m18 0h-2M12 8a4 4 0 014 4c0 2.5 1 3.5 2 4H6c1-.5 2-1.5 2-4a4 4 0 014-4zm-1.5 10a1.5 1.5 0 003 0" />,
  assets: <path d="M4 5.5h16v5H4zM4 13.5h16v5H4zM7 8h.01M7 16h.01M11 8h4M11 16h2" />,
  ssl: <path d="M12 3l7 3v5c0 4.6-3 8.6-7 10-4-1.4-7-5.4-7-10V6l7-3zm-2.8 9.2l2 2 3.8-4" />,
};

export function StatCard({
  label,
  value,
  tone = "default",
  icon,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "danger" | "warning";
  icon?: keyof typeof ICONS;
}) {
  const toneClass = tone === "danger" ? "text-red-400" : tone === "warning" ? "text-amber-300" : "text-white";
  const iconTone = tone === "danger" ? "bg-red-400/10 text-red-300" : tone === "warning" ? "bg-amber-400/10 text-amber-300" : "bg-white/[0.04] text-white/40";

  return (
    <div className="group rounded-2xl border border-white/10 bg-neutral-900/60 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">{label}</p>
        {icon && ICONS[icon] && (
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${iconTone}`}>
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {ICONS[icon]}
            </svg>
          </span>
        )}
      </div>
      <p className={`mt-1 text-2xl font-medium tracking-tight ${toneClass}`}>{value}</p>
    </div>
  );
}
