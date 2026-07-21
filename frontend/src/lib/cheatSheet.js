// Builds a real, downloadable text cheat sheet entirely from a course's own
// already-authored content (module/lesson titles, key takeaways, and any
// commands from its terminal-demo lab steps) — nothing invented here, just
// a compiled, offline-readable summary of what's already real.
export function buildCheatSheetText(course, modules, lessons, terminalDemosByTitle) {
  const lines = [];
  lines.push(course.title.toUpperCase() + " — CHEAT SHEET");
  lines.push("ITOps Solution · Moonsav ITOps Academy");
  lines.push("=".repeat(60));
  lines.push("");

  const byModule = new Map((modules ?? []).map(m => [m.id, m]));
  const grouped = new Map();
  for (const lesson of lessons ?? []) {
    const key = lesson.moduleId ?? "_";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(lesson);
  }

  for (const [moduleId, moduleLessons] of grouped) {
    const moduleTitle = byModule.get(moduleId)?.title ?? "Lessons";
    lines.push(moduleTitle.toUpperCase());
    lines.push("-".repeat(moduleTitle.length));
    for (const lesson of moduleLessons) {
      lines.push(`• ${lesson.title}`);
      if (lesson.keyTakeaway) lines.push(`  → ${lesson.keyTakeaway}`);
      const demos = terminalDemosByTitle?.[lesson.title];
      if (demos?.length) {
        for (const d of demos) lines.push(`  $ ${d.command}`);
      }
    }
    lines.push("");
  }

  if (course.capstone) {
    lines.push("CAPSTONE PROJECT: " + course.capstone.title);
    for (const req of course.capstone.requirements ?? []) lines.push(`  ☐ ${req}`);
    lines.push("");
  }

  return lines.join("\n");
}

export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
