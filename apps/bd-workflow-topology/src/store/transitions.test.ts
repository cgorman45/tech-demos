import { describe, expect, test } from "bun:test";
import { EDGES, NODES, type Lifecycle } from "@/data/workflow";
import {
  deriveStatuses,
  findStoppedUpstream,
  startLifecycle,
  stopLifecycle,
} from "@/store/transitions";

function allRunning(): Record<string, Lifecycle> {
  return Object.fromEntries(NODES.map((n) => [n.id, "running" as const]));
}

describe("deriveStatuses", () => {
  test("all nodes running yields no degraded statuses", () => {
    const statuses = deriveStatuses(allRunning(), EDGES);
    for (const node of NODES) {
      expect(statuses[node.id]).toBe("running");
    }
  });

  test("stopping kb degrades every step that reads from it, directly or downstream", () => {
    const lifecycle = stopLifecycle(allRunning(), "kb");
    const statuses = deriveStatuses(lifecycle, EDGES);
    expect(statuses.kb).toBe("stopped");
    for (const id of ["proposal", "deck", "emails", "rosie", "granola", "calls", "won"]) {
      expect(statuses[id]).toBe("degraded");
    }
    for (const id of ["scanner", "council", "grants", "lead", "tone"]) {
      expect(statuses[id]).toBe("running");
    }
  });

  test("starting kb again restores every downstream step", () => {
    let lifecycle = stopLifecycle(allRunning(), "kb");
    lifecycle = startLifecycle(lifecycle, "kb");
    const statuses = deriveStatuses(lifecycle, EDGES);
    for (const node of NODES) {
      expect(statuses[node.id]).toBe("running");
    }
  });

  test("stopping tone degrades emails and won only", () => {
    const lifecycle = stopLifecycle(allRunning(), "tone");
    const statuses = deriveStatuses(lifecycle, EDGES);
    expect(statuses.tone).toBe("stopped");
    expect(statuses.emails).toBe("degraded");
    expect(statuses.won).toBe("degraded");
    for (const id of [
      "scanner",
      "council",
      "grants",
      "lead",
      "kb",
      "proposal",
      "deck",
      "rosie",
      "granola",
      "calls",
    ]) {
      expect(statuses[id]).toBe("running");
    }
  });

  test("stopping scanner degrades lead and everything downstream of it", () => {
    const lifecycle = stopLifecycle(allRunning(), "scanner");
    const statuses = deriveStatuses(lifecycle, EDGES);
    expect(statuses.scanner).toBe("stopped");
    for (const id of [
      "lead",
      "proposal",
      "deck",
      "rosie",
      "granola",
      "calls",
      "emails",
      "won",
    ]) {
      expect(statuses[id]).toBe("degraded");
    }
    for (const id of ["council", "grants", "kb", "tone"]) {
      expect(statuses[id]).toBe("running");
    }
  });

  test("stopped nodes stay stopped even when their upstream stops", () => {
    let lifecycle = stopLifecycle(allRunning(), "proposal");
    lifecycle = stopLifecycle(lifecycle, "kb");
    const statuses = deriveStatuses(lifecycle, EDGES);
    expect(statuses.kb).toBe("stopped");
    expect(statuses.proposal).toBe("stopped");
  });
});

describe("findStoppedUpstream", () => {
  test("names the stopped source behind a degraded step", () => {
    const lifecycle = stopLifecycle(allRunning(), "kb");
    expect(findStoppedUpstream("proposal", lifecycle, EDGES)).toBe("kb");
    expect(findStoppedUpstream("won", lifecycle, EDGES)).toBe("kb");
  });

  test("returns null when nothing upstream is stopped", () => {
    expect(findStoppedUpstream("proposal", allRunning(), EDGES)).toBeNull();
  });
});
