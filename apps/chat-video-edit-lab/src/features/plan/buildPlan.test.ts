import { describe, expect, test } from "bun:test";
import { buildPlan, outputToSource } from "./buildPlan";
import type { Step } from "./steps";
import { stepId } from "./steps";

function mk<T extends Partial<Step> & { type: Step["type"] }>(partial: T): Step {
  return { id: stepId(), enabled: true, ...partial } as unknown as Step;
}

const SRC = 15;

describe("buildPlan", () => {
  test("no steps keeps full duration", () => {
    const plan = buildPlan(SRC, []);
    expect(plan.duration).toBeCloseTo(15);
    expect(plan.segments).toHaveLength(1);
  });

  test("trim first 3 seconds", () => {
    const plan = buildPlan(SRC, [mk({ type: "trim", mode: "start", seconds: 3, from: 0, to: 0 })]);
    expect(plan.duration).toBeCloseTo(12);
    const seg = plan.segments[0];
    expect(seg.kind === "video" && seg.srcFrom).toBeCloseTo(3);
  });

  test("trim last 2 seconds", () => {
    const plan = buildPlan(SRC, [mk({ type: "trim", mode: "end", seconds: 2, from: 0, to: 0 })]);
    expect(plan.duration).toBeCloseTo(13);
  });

  test("keep 4 to 12", () => {
    const plan = buildPlan(SRC, [mk({ type: "trim", mode: "keep", seconds: 0, from: 4, to: 12 })]);
    expect(plan.duration).toBeCloseTo(8);
    const seg = plan.segments[0];
    expect(seg.kind === "video" && seg.srcFrom).toBeCloseTo(4);
  });

  test("cut range removes the middle span", () => {
    const plan = buildPlan(SRC, [mk({ type: "cutRange", from: 5, to: 8 })]);
    expect(plan.duration).toBeCloseTo(12);
    expect(plan.segments).toHaveLength(2);
    const second = plan.segments[1];
    expect(second.kind === "video" && second.srcFrom).toBeCloseTo(8);
  });

  test("speed 2x on middle third shortens only that third", () => {
    const plan = buildPlan(SRC, [
      mk({ type: "speed", factor: 2, range: { kind: "third", which: "middle" } }),
    ]);
    expect(plan.duration).toBeCloseTo(5 + 2.5 + 5);
    expect(plan.segments).toHaveLength(3);
    const mid = plan.segments[1];
    expect(mid.kind === "video" && mid.rate).toBeCloseTo(2);
  });

  test("title card adds its duration at the start", () => {
    const plan = buildPlan(SRC, [
      mk({ type: "titleCard", text: "Q3 Pipeline", seconds: 2, position: "start" }),
    ]);
    expect(plan.duration).toBeCloseTo(17);
    expect(plan.segments[0].kind).toBe("title");
  });

  test("disabled steps change nothing", () => {
    const step = mk({ type: "trim", mode: "start", seconds: 3, from: 0, to: 0 });
    const plan = buildPlan(SRC, [{ ...step, enabled: false }]);
    expect(plan.duration).toBeCloseTo(15);
  });

  test("ranges resolve against the timeline after previous steps", () => {
    // After trimming the first 3s, output is 12s; "remove 5 to 8" removes
    // output seconds 5..8, which is source 8..11.
    const plan = buildPlan(SRC, [
      mk({ type: "trim", mode: "start", seconds: 3, from: 0, to: 0 }),
      mk({ type: "cutRange", from: 5, to: 8 }),
    ]);
    expect(plan.duration).toBeCloseTo(9);
    const second = plan.segments[1];
    expect(second.kind === "video" && second.srcFrom).toBeCloseTo(11);
  });

  test("reorder changes the result", () => {
    const speed = mk({ type: "speed", factor: 2, range: { kind: "third", which: "middle" } });
    const trimStep = mk({ type: "trim", mode: "start", seconds: 3, from: 0, to: 0 });
    const a = buildPlan(SRC, [speed, trimStep]);
    const b = buildPlan(SRC, [trimStep, speed]);
    // speed first: 15s becomes 12.5s, then trim 3s: 9.5s.
    expect(a.duration).toBeCloseTo(9.5);
    // trim first: 12s remain, middle third (4s) at 2x saves 2s: 10s.
    expect(b.duration).toBeCloseTo(10);
    expect(a.duration).not.toBeCloseTo(b.duration);
  });

  test("captions anchored to footage move when a later trim runs", () => {
    const plan = buildPlan(SRC, [
      mk({ type: "captions", segments: [{ from: 5, to: 8, text: "Hello" }] }),
      mk({ type: "trim", mode: "start", seconds: 3, from: 0, to: 0 }),
    ]);
    expect(plan.overlays).toHaveLength(1);
    expect(plan.overlays[0].from).toBeCloseTo(2);
    expect(plan.overlays[0].to).toBeCloseTo(5);
  });

  test("fade, mute, filter collect into the plan", () => {
    const plan = buildPlan(SRC, [
      mk({ type: "fade", direction: "out", seconds: 1 }),
      mk({ type: "mute" }),
      mk({ type: "filter", filter: "grayscale", amount: 1 }),
    ]);
    expect(plan.fadeOut).toBe(1);
    expect(plan.muted).toBe(true);
    expect(plan.filter).toContain("grayscale");
  });
});

describe("time mapping across speed changes", () => {
  test("output time maps to source time through mixed rates", () => {
    // 0..5 at 1x, 5..10 src at 2x (2.5s out), 10..15 at 1x.
    const plan = buildPlan(SRC, [
      mk({ type: "speed", factor: 2, range: { kind: "span", from: 5, to: 10 } }),
    ]);
    expect(plan.duration).toBeCloseTo(12.5);
    expect(outputToSource(plan, 2).srcTime).toBeCloseTo(2);
    expect(outputToSource(plan, 6).srcTime).toBeCloseTo(7); // 5 + 1*2
    expect(outputToSource(plan, 7.4).srcTime).toBeCloseTo(9.8);
    expect(outputToSource(plan, 8).srcTime).toBeCloseTo(10.5); // past the fast span
    expect(outputToSource(plan, 6).rate).toBeCloseTo(2);
  });

  test("title card time maps to the title segment", () => {
    const plan = buildPlan(SRC, [
      mk({ type: "titleCard", text: "Hi", seconds: 2, position: "start" }),
    ]);
    const atTitle = outputToSource(plan, 1);
    expect(atTitle.kind).toBe("title");
    const after = outputToSource(plan, 3);
    expect(after.kind).toBe("video");
    expect(after.srcTime).toBeCloseTo(1);
  });
});
