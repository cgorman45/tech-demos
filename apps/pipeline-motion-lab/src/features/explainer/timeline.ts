/**
 * One timeline clock drives the whole explainer. All animation reads the
 * clock, so pause, seek, and speed are exact and easy to test.
 */

export const SCENE_COUNT = 6;
export const SCENE_DURATION = 5; // seconds
export const TOTAL_DURATION = SCENE_COUNT * SCENE_DURATION;

export const SPEEDS = [0.5, 1, 1.5, 2] as const;
export type Speed = (typeof SPEEDS)[number];

export function clampTime(time: number): number {
  if (!Number.isFinite(time) || time < 0) return 0;
  return Math.min(time, TOTAL_DURATION);
}

/** Scene index (0 to 5) at a clock time. The end of the clip stays on 5. */
export function sceneIndexAt(time: number): number {
  const clamped = clampTime(time);
  return Math.min(SCENE_COUNT - 1, Math.floor(clamped / SCENE_DURATION));
}

/** Progress inside the current scene, 0 to 1. */
export function sceneProgressAt(time: number): number {
  const clamped = clampTime(time);
  const index = sceneIndexAt(clamped);
  return Math.min(1, (clamped - index * SCENE_DURATION) / SCENE_DURATION);
}

export function sceneStart(index: number): number {
  const bounded = Math.max(0, Math.min(SCENE_COUNT - 1, index));
  return bounded * SCENE_DURATION;
}

/** Advances the clock by real elapsed seconds at a playback speed. */
export function advance(time: number, elapsed: number, speed: Speed): number {
  return clampTime(time + elapsed * speed);
}

export function isFinished(time: number): boolean {
  return time >= TOTAL_DURATION;
}

/* Easing helpers shared by the scenes. */

export function easeOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return 1 - Math.pow(1 - clamped, 3);
}

export function easeInOutCubic(t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  return clamped < 0.5
    ? 4 * clamped * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 3) / 2;
}

/** Maps scene progress to a 0..1 ramp inside [from, to]. */
export function ramp(progress: number, from: number, to: number): number {
  if (to <= from) return progress >= to ? 1 : 0;
  return Math.min(1, Math.max(0, (progress - from) / (to - from)));
}
