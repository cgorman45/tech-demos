import { describe, expect, test } from "bun:test";
import {
  SCENE_DURATION,
  TOTAL_DURATION,
  advance,
  clampTime,
  isFinished,
  ramp,
  sceneIndexAt,
  sceneProgressAt,
  sceneStart,
} from "./timeline";

describe("scene index from time", () => {
  test("maps the clock to the right scene", () => {
    expect(sceneIndexAt(0)).toBe(0);
    expect(sceneIndexAt(4.99)).toBe(0);
    expect(sceneIndexAt(5)).toBe(1);
    expect(sceneIndexAt(17.5)).toBe(3);
    expect(sceneIndexAt(29.9)).toBe(5);
  });

  test("stays on the last scene at and past the end", () => {
    expect(sceneIndexAt(TOTAL_DURATION)).toBe(5);
    expect(sceneIndexAt(999)).toBe(5);
  });

  test("progress runs 0 to 1 inside each scene", () => {
    expect(sceneProgressAt(0)).toBe(0);
    expect(sceneProgressAt(2.5)).toBeCloseTo(0.5);
    expect(sceneProgressAt(5)).toBe(0);
    expect(sceneProgressAt(TOTAL_DURATION)).toBe(1);
  });
});

describe("speed scaling", () => {
  test("advance scales elapsed time by speed", () => {
    expect(advance(0, 1, 1)).toBe(1);
    expect(advance(0, 1, 2)).toBe(2);
    expect(advance(0, 1, 0.5)).toBe(0.5);
    expect(advance(10, 2, 1.5)).toBe(13);
  });

  test("advance clamps at the end of the clip", () => {
    expect(advance(TOTAL_DURATION - 1, 5, 2)).toBe(TOTAL_DURATION);
    expect(isFinished(advance(TOTAL_DURATION - 0.1, 1, 1))).toBe(true);
  });
});

describe("seek and restart", () => {
  test("sceneStart gives exact scene boundaries", () => {
    expect(sceneStart(0)).toBe(0);
    expect(sceneStart(3)).toBe(3 * SCENE_DURATION);
    expect(sceneStart(5)).toBe(25);
    expect(sceneStart(-1)).toBe(0);
    expect(sceneStart(99)).toBe(25);
  });

  test("clampTime keeps the clock in range", () => {
    expect(clampTime(-5)).toBe(0);
    expect(clampTime(12)).toBe(12);
    expect(clampTime(1e9)).toBe(TOTAL_DURATION);
    expect(clampTime(Number.NaN)).toBe(0);
  });
});

describe("ramp", () => {
  test("maps progress into a sub-window", () => {
    expect(ramp(0, 0.2, 0.8)).toBe(0);
    expect(ramp(0.5, 0.2, 0.8)).toBeCloseTo(0.5);
    expect(ramp(0.9, 0.2, 0.8)).toBe(1);
  });
});
