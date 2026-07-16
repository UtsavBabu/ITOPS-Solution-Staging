import { useEffect, useRef, useState } from "react";
import { animate } from "motion/react";

/**
 * Tweens a numeric stat value from its previous displayed number to the new
 * one whenever it changes (e.g. on refetch). Non-numeric values (like the
 * "—" placeholder shown while loading) render as-is, un-animated.
 */
export function AnimatedCounter({
  value,
  duration = 0.8
}) {
  const isNumber = typeof value === "number" && Number.isFinite(value);
  const [display, setDisplay] = useState(isNumber ? value : 0);
  const prevRef = useRef(isNumber ? value : 0);
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!isNumber) return;
    const target = value;
    // Skip the tween on first mount so stats don't all count up from zero
    // on every page load — only animate on genuine value changes.
    if (!mountedRef.current) {
      mountedRef.current = true;
      prevRef.current = target;
      setDisplay(target);
      return;
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