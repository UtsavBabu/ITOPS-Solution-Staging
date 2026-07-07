export function StatCard({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "danger" | "warning" }) {
  const toneClass = tone === "danger" ? "text-red-400" : tone === "warning" ? "text-amber-300" : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4">
      <p className="text-sm text-white/50">{label}</p>
      <p className={`mt-1 text-2xl font-medium tracking-tight ${toneClass}`}>{value}</p>
    </div>
  );
}
