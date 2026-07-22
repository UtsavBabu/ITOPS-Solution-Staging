import { describe, expect, it } from "vitest";
import { isPlanAllowed, PLAN_ORDER } from "./planTiers";

describe("isPlanAllowed", () => {
  it("allows any plan when minPlan is null/undefined — free content", () => {
    expect(isPlanAllowed(null, "STARTER")).toBe(true);
    expect(isPlanAllowed(undefined, "STARTER")).toBe(true);
  });

  it("allows an org exactly at the required tier", () => {
    expect(isPlanAllowed("PROFESSIONAL", "PROFESSIONAL")).toBe(true);
  });

  it("allows an org above the required tier", () => {
    expect(isPlanAllowed("STARTER", "ENTERPRISE")).toBe(true);
    expect(isPlanAllowed("PROFESSIONAL", "BUSINESS")).toBe(true);
  });

  it("blocks an org below the required tier", () => {
    expect(isPlanAllowed("BUSINESS", "STARTER")).toBe(false);
    expect(isPlanAllowed("ENTERPRISE", "PROFESSIONAL")).toBe(false);
  });

  it("treats a missing org plan as STARTER, the least-privileged default", () => {
    expect(isPlanAllowed("STARTER", undefined)).toBe(true);
    expect(isPlanAllowed("PROFESSIONAL", undefined)).toBe(false);
  });

  it("PLAN_ORDER is exactly the 4 real tiers, in ascending order", () => {
    expect(PLAN_ORDER).toEqual(["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"]);
  });
});
