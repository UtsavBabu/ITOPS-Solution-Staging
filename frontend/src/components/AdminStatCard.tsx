export function AdminStatCard({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "warning" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-5">
      <p className="text-sm text-white/50">{label}</p>
      <p className={`mt-1 text-2xl font-medium tracking-tight ${tone === "warning" ? "text-amber-300" : "text-white"}`}>{value}</p>
    </div>
  );
}
