import { describe, expect, it } from "vitest";
import { xpLevel } from "./CyberSachetTheme";

describe("xpLevel", () => {
  it("labels 0 XP as Beginner, at the start of the bar", () => {
    const level = xpLevel(0);
    expect(level.label).toBe("Beginner");
    expect(level.pct).toBe(0);
  });

  it("stays Beginner just below the Intermediate threshold", () => {
    expect(xpLevel(499).label).toBe("Beginner");
  });

  it("crosses into Intermediate exactly at the threshold", () => {
    expect(xpLevel(500).label).toBe("Intermediate");
    expect(xpLevel(500).pct).toBe(0);
  });

  it("computes progress toward the next level as a fraction of that level's span", () => {
    // Intermediate spans 500-1500 (span 1000); 1000 XP is the midpoint.
    expect(xpLevel(1000).label).toBe("Intermediate");
    expect(xpLevel(1000).pct).toBe(50);
  });

  it("reaches Expert and never divides by zero for the open-ended top tier", () => {
    const level = xpLevel(10000);
    expect(level.label).toBe("Expert");
    expect(level.pct).toBe(100);
    expect(Number.isFinite(level.pct)).toBe(true);
  });
});
