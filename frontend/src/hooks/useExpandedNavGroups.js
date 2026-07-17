import { useEffect, useMemo, useState } from "react";

// Which group contains the current route, if any — used to auto-expand it
// so navigating never lands on a page whose own nav section is collapsed.
function findActiveGroupLabel(groups, pathname) {
  for (const group of groups) {
    for (const item of group.items) {
      const isActive = item.end ? pathname === item.to : pathname.startsWith(item.to);
      if (isActive) return group.label;
    }
  }
  return null;
}

/**
 * Collapsed-by-default sidebar groups, active section auto-expanded — the
 * same tree pattern Google Workspace/Azure-style admin consoles use so a
 * long flat list of nav items doesn't all stay visible at once. A group
 * with exactly one item is never collapsible (the caller should just render
 * it as a plain link); this hook only tracks the multi-item groups.
 */
export function useExpandedNavGroups(groups, pathname) {
  const activeLabel = useMemo(() => findActiveGroupLabel(groups, pathname), [groups, pathname]);
  const [expanded, setExpanded] = useState(() => new Set(activeLabel ? [activeLabel] : []));

  useEffect(() => {
    if (activeLabel) setExpanded(prev => (prev.has(activeLabel) ? prev : new Set(prev).add(activeLabel)));
  }, [activeLabel]);

  function toggle(label) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }

  return { expanded, toggle };
}
