import { describe, expect, test } from "bun:test";
import type { Card } from "@/lib/types";
import { IDLE_AGENT } from "@/lib/types";
import {
  AGENT_STEPS,
  EMPTY_SLOTS,
  prSummary,
  promoteQueued,
  releaseAgent,
  requestAgent,
  stepLogLine,
} from "@/store/agents";

describe("requestAgent", () => {
  test("starts while below the cap", () => {
    const result = requestAgent(EMPTY_SLOTS, "a", 3);
    expect(result.kind).toBe("started");
    if (result.kind === "started") {
      expect(result.slots.running).toEqual(["a"]);
      expect(result.slots.queue).toEqual([]);
    }
  });

  test("queues FIFO once the cap is reached", () => {
    const slots = { running: ["a", "b", "c"], queue: [] };
    const first = requestAgent(slots, "d", 3);
    expect(first.kind).toBe("queued");
    if (first.kind !== "queued") throw new Error("expected queued");
    const second = requestAgent(first.slots, "e", 3);
    expect(second.kind).toBe("queued");
    if (second.kind !== "queued") throw new Error("expected queued");
    expect(second.slots.queue).toEqual(["d", "e"]);
    expect(second.slots.running).toEqual(["a", "b", "c"]);
  });

  test("rejects an id that is already running", () => {
    const slots = { running: ["a"], queue: [] };
    expect(requestAgent(slots, "a", 3).kind).toBe("already-running");
  });

  test("rejects an id that is already queued", () => {
    const slots = { running: ["a", "b", "c"], queue: ["d"] };
    expect(requestAgent(slots, "d", 3).kind).toBe("already-queued");
  });

  test("respects a cap of 1", () => {
    const first = requestAgent(EMPTY_SLOTS, "a", 1);
    if (first.kind !== "started") throw new Error("expected started");
    const second = requestAgent(first.slots, "b", 1);
    expect(second.kind).toBe("queued");
  });
});

describe("releaseAgent", () => {
  test("frees the slot and promotes the oldest queued id", () => {
    const slots = { running: ["a", "b", "c"], queue: ["d", "e"] };
    const { slots: next, promoted } = releaseAgent(slots, "b", 3);
    expect(promoted).toEqual(["d"]);
    expect(next.running).toEqual(["a", "c", "d"]);
    expect(next.queue).toEqual(["e"]);
  });

  test("promotes several when the cap allows", () => {
    const slots = { running: ["a"], queue: ["b", "c", "d"] };
    const { slots: next, promoted } = releaseAgent(slots, "a", 3);
    expect(promoted).toEqual(["b", "c", "d"]);
    expect(next.running).toEqual(["b", "c", "d"]);
    expect(next.queue).toEqual([]);
  });

  test("also removes a queued id without promoting it", () => {
    const slots = { running: ["a", "b", "c"], queue: ["d", "e"] };
    const { slots: next, promoted } = releaseAgent(slots, "d", 3);
    expect(promoted).toEqual([]);
    expect(next.running).toEqual(["a", "b", "c"]);
    expect(next.queue).toEqual(["e"]);
  });
});

describe("promoteQueued", () => {
  test("fills new capacity FIFO after the cap rises", () => {
    const slots = { running: ["a"], queue: ["b", "c", "d"] };
    const { slots: next, promoted } = promoteQueued(slots, 3);
    expect(promoted).toEqual(["b", "c"]);
    expect(next.running).toEqual(["a", "b", "c"]);
    expect(next.queue).toEqual(["d"]);
  });

  test("does nothing when already at the cap", () => {
    const slots = { running: ["a", "b", "c"], queue: ["d"] };
    const { slots: next, promoted } = promoteQueued(slots, 3);
    expect(promoted).toEqual([]);
    expect(next).toEqual(slots);
  });
});

describe("agent output", () => {
  test("has one log line per step", () => {
    for (let i = 0; i < AGENT_STEPS.length; i++) {
      expect(stepLogLine(i, "Map").length).toBeGreaterThan(0);
    }
    expect(stepLogLine(0, "Map")).toContain("win-rates");
  });

  test("prSummary is labeled example and truncates long bodies", () => {
    const card: Card = {
      id: "x",
      ref: "00000000",
      handle: "maria.g",
      source: "text",
      sourceMeta: null,
      createdAt: 0,
      body: "word ".repeat(40),
      tags: [],
      category: "Map",
      status: "todo",
      notes: "",
      agent: { ...IDLE_AGENT },
    };
    const summary = prSummary(card);
    expect(summary).toContain("(example)");
    expect(summary).toContain("...");
    expect(summary.length).toBeLessThan(140);
  });
});
