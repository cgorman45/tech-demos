/**
 * Timeline for the Proposal drafting drill-down animation.
 * All times are seconds at 1x speed. The scene derives every visual state
 * from the current time, so pausing, speed changes, and stage jumps are
 * just operations on a single clock value.
 */

export interface DraftingStage {
  id: string;
  label: string;
  start: number;
  end: number;
}

export const DRAFTING_STAGES: DraftingStage[] = [
  { id: "intake", label: "Intake", start: 0, end: 3 },
  { id: "kb", label: "Knowledge base", start: 3, end: 8 },
  { id: "draft", label: "Draft", start: 8, end: 19 },
  { id: "sections", label: "Sections", start: 19, end: 25 },
  { id: "review", label: "Review", start: 25, end: 35 },
  { id: "submit", label: "Submit", start: 35, end: 39 },
];

export const DRAFTING_TOTAL = DRAFTING_STAGES[DRAFTING_STAGES.length - 1].end;

export function activeStageIndex(t: number): number {
  for (let i = DRAFTING_STAGES.length - 1; i >= 0; i--) {
    if (t >= DRAFTING_STAGES[i].start) return i;
  }
  return 0;
}

/** Linear progress of t through [start, end], clamped to 0..1. */
export function seg(t: number, start: number, end: number): number {
  if (end <= start) return t >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (t - start) / (end - start)));
}

/** Ease-in-out cubic, used for the gliding pill. */
export function easeInOut(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}
