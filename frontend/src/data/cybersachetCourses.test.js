import { describe, expect, it } from "vitest";
import { gradeAnswer } from "./cybersachetCourses";

// Quiz grading is the one piece of client-side logic that directly decides
// whether a learner passes a course and earns a certificate in local-preview
// mode — mirrors the real submit_quiz() RPC's semantics exactly, so these
// tests guard against exactly the kind of bug that would let someone pass
// (or unfairly fail) a course.
describe("gradeAnswer", () => {
  describe("single-choice questions", () => {
    const q = { questionType: "single", correctIndex: 2 };
    it("is correct only when the given index matches exactly", () => {
      expect(gradeAnswer(q, 2)).toBe(true);
      expect(gradeAnswer(q, 0)).toBe(false);
      expect(gradeAnswer(q, undefined)).toBe(false);
    });
  });

  describe("multiple-choice questions", () => {
    const q = { questionType: "multiple", correctIndexes: [0, 2, 3] };
    it("is correct when the same set is chosen, regardless of order", () => {
      expect(gradeAnswer(q, [0, 2, 3])).toBe(true);
      expect(gradeAnswer(q, [3, 0, 2])).toBe(true);
    });
    it("is wrong for a partial or extra selection", () => {
      expect(gradeAnswer(q, [0, 2])).toBe(false);
      expect(gradeAnswer(q, [0, 1, 2, 3])).toBe(false);
    });
    it("is wrong for an empty or missing answer", () => {
      expect(gradeAnswer(q, [])).toBe(false);
      expect(gradeAnswer(q, undefined)).toBe(false);
    });
  });

  describe("ordering questions", () => {
    const q = { questionType: "ordering", correctOrder: [2, 0, 1, 3] };
    it("is correct only when the exact sequence matches", () => {
      expect(gradeAnswer(q, [2, 0, 1, 3])).toBe(true);
    });
    it("is wrong when the same items are in a different order", () => {
      expect(gradeAnswer(q, [0, 2, 1, 3])).toBe(false);
    });
    it("is wrong for a missing answer", () => {
      expect(gradeAnswer(q, undefined)).toBe(false);
    });
  });
});
