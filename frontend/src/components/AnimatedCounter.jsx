import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";

/**
 * Tweens a numeric stat value from its previous displayed number to the new
 * one whenever it changes (e.g. on refetch). Non-numeric values (like the
 * "—" placeholder shown while loading) render as-is, un-animated.
 */
export function AnimatedCounter({
  value,
  duration = 0.8,
  // Opt-in only — the default stays "skip the tween on first mount" so
  // stats don't all count up from zero on every page load everywhere this
  // is used. Set true for a specific hero/summary spot (like the Dashboard
  // top metrics) that genuinely wants the count-up-on-load moment.
  animateOnMount = false
}) {
  const isNumber = typeof value === "number" && Number.isFinite(value);
  const [display, setDisplay] = useState(isNumber && !animateOnMount ? value : 0);
  const prevRef = useRef(isNumber && !animateOnMount ? value : 0);
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!isNumber) return;
    const target = value;
    if (!mountedRef.current) {
      mountedRef.current = true;
      if (!animateOnMount) {
        prevRef.current = target;
        setDisplay(target);
        return;
      }
    }
    const from = prevRef.current;
    const controls = animate(from, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: v => setDisplay(v)
    });
    prevRef.current = target;
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isNumber, duration]);
  if (!isNumber) return <>{value}</>;
  return <>{Math.round(display).toLocaleString()}</>;
}