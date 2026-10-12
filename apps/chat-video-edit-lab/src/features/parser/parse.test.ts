import { describe, expect, test } from "bun:test";
import { parseFactor, parseSeconds } from "./numbers";
import { parseMessage, splitClauses } from "./parse";

const ctx = {
  exampleCaptions: [
    { from: 0.5, to: 3, text: "Scene one opens" },
    { from: 4, to: 7, text: "The counter keeps ticking" },
    { from: 8, to: 11, text: "Shapes drift across" },
    { from: 11.5, to: 14.5, text: "Scene four wraps up" },
  ],
};

describe("number parsing", () => {
  test("plain and decorated seconds", () => {
    expect(parseSeconds("3")).toBe(3);
    expect(parseSeconds("3s")).toBe(3);
    expect(parseSeconds("3 seconds")).toBe(3);
    expect(parseSeconds("1.5")).toBe(1.5);
    expect(parseSeconds("three")).toBe(3);
    expect(parseSeconds("0:03")).toBe(3);
    expect(parseSeconds("1:30")).toBe(90);
    expect(parseSeconds("nonsense")).toBeNull();
  });

  test("speed factors", () => {
    expect(parseFactor("1.5x")).toBe(1.5);
    expect(parseFactor("2x")).toBe(2);
    expect(parseFactor("half")).toBe(0.5);
    expect(parseFactor("double")).toBe(2);
  });
});

describe("clause splitting", () => {
  test("splits on commas, and, then, semicolons", () => {
    expect(splitClauses("fade in and fade out, then mute; brighten")).toEqual([
      "fade in",
      "fade out",
      "mute",
      "brighten",
    ]);
  });

  test("keeps black and white together", () => {
    expect(splitClauses("make it black and white and mute")).toEqual([
      "make it black and white",
      "mute",
    ]);
  });
});

describe("the spec sentence", () => {
  test("yields exactly 4 steps of the right types", () => {
    const { steps, unknown } = parseMessage(
      "cut first 3 seconds, add title card Q3 Pipeline, speed up middle, add captions",
      ctx,
    );
    expect(unknown).toHaveLength(0);
    expect(steps).toHaveLength(4);
    expect(steps[0]).toMatchObject({ type: "trim", mode: "start", seconds: 3 });
    expect(steps[1]).toMatchObject({ type: "titleCard", text: "Q3 Pipeline", seconds: 2 });
    expect(steps[2]).toMatchObject({
      type: "speed",
      factor: 2,
      range: { kind: "third", which: "middle" },
    });
    expect(steps[3]).toMatchObject({ type: "captions" });
    expect(steps[3].type === "captions" && steps[3].segments).toHaveLength(4);
  });
});

describe("individual rules", () => {
  test("trim variants", () => {
    expect(parseMessage("trim last 2s", ctx).steps[0]).toMatchObject({
      type: "trim",
      mode: "end",
      seconds: 2,
    });
    expect(parseMessage("cut the first three seconds", ctx).steps[0]).toMatchObject({
      type: "trim",
      mode: "start",
      seconds: 3,
    });
    expect(parseMessage("keep 0:04 to 0:12", ctx).steps[0]).toMatchObject({
      type: "trim",
      mode: "keep",
      from: 4,
      to: 12,
    });
  });

  test("cut range", () => {
    expect(parseMessage("remove 5s to 8s", ctx).steps[0]).toMatchObject({
      type: "cutRange",
      from: 5,
      to: 8,
    });
  });

  test("speed variants", () => {
    expect(parseMessage("slow down the end 0.5x", ctx).steps[0]).toMatchObject({
      type: "speed",
      factor: 0.5,
      range: { kind: "third", which: "last" },
    });
    expect(parseMessage("2x from 3 to 6", ctx).steps[0]).toMatchObject({
      type: "speed",
      factor: 2,
      range: { kind: "span", from: 3, to: 6 },
    });
    expect(parseMessage("half speed", ctx).steps[0]).toMatchObject({
      type: "speed",
      factor: 0.5,
      range: { kind: "all" },
    });
  });

  test("title and end card", () => {
    expect(parseMessage("end card Thanks for watching", ctx).steps[0]).toMatchObject({
      type: "titleCard",
      text: "Thanks for watching",
      position: "end",
    });
  });

  test("single caption line", () => {
    expect(parseMessage("caption 0 to 3: Hello", ctx).steps[0]).toMatchObject({
      type: "captions",
      segments: [{ from: 0, to: 3, text: "Hello" }],
    });
  });

  test("text overlay", () => {
    expect(parseMessage("put 'Draft' in the top right", ctx).steps[0]).toMatchObject({
      type: "textOverlay",
      text: "Draft",
      corner: "top-right",
    });
  });

  test("fade, mute, filters", () => {
    expect(parseMessage("fade out 1s", ctx).steps[0]).toMatchObject({
      type: "fade",
      direction: "out",
      seconds: 1,
    });
    expect(parseMessage("mute audio", ctx).steps[0]).toMatchObject({ type: "mute" });
    expect(parseMessage("make it black and white", ctx).steps[0]).toMatchObject({
      type: "filter",
      filter: "grayscale",
    });
    expect(parseMessage("brighten a little", ctx).steps[0]).toMatchObject({
      type: "filter",
      filter: "brightness",
    });
  });
});

describe("unknown clauses", () => {
  test("returns 2 to 3 clickable suggestions", () => {
    const { steps, unknown } = parseMessage("do a barrel roll", ctx);
    expect(steps).toHaveLength(0);
    expect(unknown).toHaveLength(1);
    expect(unknown[0].suggestions.length).toBeGreaterThanOrEqual(2);
    expect(unknown[0].suggestions.length).toBeLessThanOrEqual(3);
  });
});
