import { describe, expect, test } from "bun:test";
import {
  DRAFTING_STAGES,
  DRAFTING_TOTAL,
  activeStageIndex,
  easeInOut,
  seg,
} from "@/components/drafting/timeline";

describe("drafting timeline", () => {
  test("stages are contiguous from zero to the total duration", () => {
    expect(DRAFTING_STAGES[0].start).toBe(0);
    for (let i = 1; i < DRAFTING_STAGES.length; i++) {
      expect(DRAFTING_STAGES[i].start).toBe(DRAFTING_STAGES[i - 1].end);
    }
    expect(DRAFTING_STAGES[DRAFTING_STAGES.length - 1].end).toBe(DRAFTING_TOTAL);
    expect(DRAFTING_STAGES).toHaveLength(6);
  });

  test("activeStageIndex maps times to stages", () => {
    expect(activeStageIndex(0)).toBe(0);
    expect(activeStageIndex(DRAFTING_STAGES[2].start + 0.1)).toBe(2);
    expect(activeStageIndex(DRAFTING_TOTAL)).toBe(DRAFTING_STAGES.length - 1);
  });

  test("seg clamps and easeInOut hits both ends", () => {
    expect(seg(5, 10, 20)).toBe(0);
    expect(seg(15, 10, 20)).toBe(0.5);
    expect(seg(25, 10, 20)).toBe(1);
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
  });
});
