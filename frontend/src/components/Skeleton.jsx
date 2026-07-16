/**
 * Shimmer-gradient loading placeholder. Replaces the mix of ad hoc
 * `animate-pulse` divs and bare "Loading…" text scattered across the app
 * with one consistent primitive.
 */
export function Skeleton({
  className = ""
}) {
  return <div className={`animate-shimmer rounded-lg bg-[linear-gradient(110deg,rgba(255,255,255,0.04)_8%,rgba(34,211,238,0.09)_18%,rgba(255,255,255,0.04)_33%)] bg-[length:200%_100%] ${className}`} />;
}

/** A stack of skeleton rows, for lists/tables while data loads. */
export function SkeletonRows({
  count = 3,
  className = "h-10"
}) {
  return <div className="space-y-2 p-4">
      {Array.from({
      length: count
    }).map((_, i) => <Skeleton key={i} className={className} />)}
    </div>;
}

/** A grid of skeleton stat tiles, matching StatCard/AdminStatCard dimensions. */
export function SkeletonStatGrid({
  count = 6
}) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      {Array.from({
      length: count
    }).map((_, i) => <Skeleton key={i} className="h-[92px] rounded-2xl" />)}
    </div>;
}