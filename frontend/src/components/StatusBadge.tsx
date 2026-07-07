import type { CheckStatus } from "../api/types";

const STYLES: Record<CheckStatus | "UNKNOWN", string> = {
  UP: "bg-emerald-400/10 text-emerald-300",
  DOWN: "bg-red-400/10 text-red-300",
  ERROR: "bg-amber-400/10 text-amber-300",
  UNKNOWN: "bg-white/10 text-white/60",
};

export function StatusBadge({ status }: { status: CheckStatus | null | undefined }) {
  const key = status ?? "UNKNOWN";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[key]}`}>
      {key}
    </span>
  );
}
