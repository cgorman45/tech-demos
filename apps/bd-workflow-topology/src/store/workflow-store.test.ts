import { beforeEach, describe, expect, test } from "bun:test";
import { COMPLETION_TICKS, NODES, NODE_BY_ID, RUN_PATH } from "@/data/workflow";
import { nodeName, useWorkflowStore } from "@/store/workflow-store";

function store() {
  return useWorkflowStore.getState();
}

beforeEach(() => {
  store().resetLayout();
  store().resetScenario();
  useWorkflowStore.setState({ stepMs: 0 });
});

describe("lifecycle actions", () => {
  test("stopNode propagates degraded downstream and startNode restores", () => {
    store().stopNode("kb");
    let statuses = store().statuses;
    expect(statuses.kb).toBe("stopped");
    expect(statuses.proposal).toBe("degraded");
    expect(statuses.won).toBe("degraded");

    store().startNode("kb");
    statuses = store().statuses;
    for (const node of NODES) {
      expect(statuses[node.id]).toBe("running");
    }
  });

  test("restartNode goes restarting then returns to running", async () => {
    store().restartNode("proposal", 20);
    expect(store().statuses.proposal).toBe("restarting");
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(store().statuses.proposal).toBe("running");
  });

  test("stopping during a restart wins over the restart completion", async () => {
    store().restartNode("proposal", 20);
    store().stopNode("proposal");
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(store().statuses.proposal).toBe("stopped");
  });
});

describe("run a lead", () => {
  test("advanceRun visits RUN_PATH in order with one run log entry per step", () => {
    store().runLead();
    // runLead fires the first step itself.
    expect(store().run.status).toBe("running");
    expect(store().run.activeNodeId).toBe("scanner");

    for (let i = 1; i < RUN_PATH.length; i++) {
      store().advanceRun();
    }

    const state = store();
    expect(state.run.status).toBe("done");
    const runEntries = state.activity.filter((e) => e.kind === "run");
    expect(runEntries.map((e) => e.nodeId)).toEqual([...RUN_PATH]);
  });

  test("completion increments counters exactly once and adds hours saved", () => {
    const before = store();
    const beforeMetrics = before.metrics;
    const beforeHours = before.hoursSavedTotal;

    store().runLead();
    for (let i = 1; i < RUN_PATH.length; i++) {
      store().advanceRun();
    }
    // Extra calls after done are no-ops.
    store().advanceRun();
    store().advanceRun();

    const after = store();
    for (const tick of COMPLETION_TICKS) {
      expect(after.metrics[tick.nodeId][tick.key]).toBe(
        beforeMetrics[tick.nodeId][tick.key] + 1,
      );
    }
    expect(after.hoursSavedTotal).toBeGreaterThan(beforeHours);
  });

  test("run stalls at proposal when kb is stopped and counters do not change", () => {
    const beforeMetrics = store().metrics;
    store().stopNode("kb");
    store().runLead();
    // scanner fired; advance through lead, then proposal should stall.
    store().advanceRun();
    store().advanceRun();

    const state = store();
    expect(state.run.status).toBe("stalled");
    expect(state.run.activeNodeId).toBe("proposal");
    const stall = state.activity.findLast((e) => e.kind === "stall");
    expect(stall?.lines[0]).toContain("Proposal drafting");
    expect(stall?.lines[0]).toContain("Alex's knowledge base");
    for (const tick of COMPLETION_TICKS) {
      expect(state.metrics[tick.nodeId][tick.key]).toBe(
        beforeMetrics[tick.nodeId][tick.key],
      );
    }
  });

  test("runLead while a run is in progress is a no-op", () => {
    store().runLead();
    const midRun = store().run;
    store().runLead();
    expect(store().run).toEqual(midRun);
  });
});

describe("resetScenario", () => {
  test("restores lifecycle, metrics, logs, and run state after changes", () => {
    store().stopNode("kb");
    store().stopNode("scanner");
    store().runLead();
    store().advanceRun();
    store().restartNode("granola", 5_000);

    store().resetScenario();

    const state = store();
    for (const node of NODES) {
      expect(state.statuses[node.id]).toBe("running");
    }
    expect(state.run.status).toBe("idle");
    expect(state.run.activeNodeId).toBeNull();
    expect(state.activity).toHaveLength(1);
    for (const node of NODES) {
      for (const metric of node.metrics) {
        expect(state.metrics[node.id][metric.key]).toBe(metric.seed);
      }
    }
    expect(state.selectedId).toBeNull();
  });

  test("keeps saved edits so they survive a scenario reset", () => {
    store().renameNode("kb", { name: "Shared proposal library" });
    store().resetScenario();
    expect(nodeName(store().edits, "kb")).toBe("Shared proposal library");
  });

  test("clears a pending restart timer", async () => {
    store().restartNode("granola", 20);
    store().resetScenario();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(store().statuses.granola).toBe("running");
    expect(store().nodeLogs.granola.every((l) => l.message !== "Restart complete. Back online.")).toBe(true);
  });
});

describe("edit mode", () => {
  test("renameNode changes the name used by new log lines", () => {
    store().renameNode("kb", { name: "Shared proposal library" });
    store().stopNode("kb");

    const stopEntry = store().activity.findLast((e) => e.kind === "lifecycle");
    expect(stopEntry?.title).toBe("Shared proposal library");
    expect(stopEntry?.lines[0]).toContain("Shared proposal library stopped");

    store().renameNode("proposal", { name: "Draft studio" });
    store().runLead();
    store().advanceRun();
    store().advanceRun();

    const stall = store().activity.findLast((e) => e.kind === "stall");
    expect(store().run.status).toBe("stalled");
    expect(stall?.lines[0]).toBe(
      "Lead stalled at Draft studio: Shared proposal library is offline.",
    );
  });

  test("renaming back to the default or to an empty name clears the override", () => {
    store().renameNode("kb", { name: "Shared proposal library" });
    store().renameNode("kb", { name: NODE_BY_ID.kb.name });
    expect(store().edits.kb?.name).toBeUndefined();

    store().renameNode("kb", { name: "   " });
    expect(nodeName(store().edits, "kb")).toBe(NODE_BY_ID.kb.name);
  });

  test("setMetricValue updates the live metric and survives a scenario reset", () => {
    store().setMetricValue("scanner", "rfpsFlagged", 99);
    expect(store().metrics.scanner.rfpsFlagged).toBe(99);
    store().resetScenario();
    expect(store().metrics.scanner.rfpsFlagged).toBe(99);
  });

  test("resetLayout clears renames, subtitles, positions, and edited metrics", () => {
    store().renameNode("kb", { name: "Shared proposal library", subtitle: "All of it" });
    store().setNodePosition("kb", { x: 1, y: 2 });
    store().setMetricValue("scanner", "rfpsFlagged", 99);
    const versionBefore = store().layoutVersion;

    store().resetLayout();

    const state = store();
    expect(state.edits).toEqual({});
    expect(nodeName(state.edits, "kb")).toBe(NODE_BY_ID.kb.name);
    expect(state.metrics.scanner.rfpsFlagged).toBe(
      NODE_BY_ID.scanner.metrics[0].seed,
    );
    expect(state.layoutVersion).toBe(versionBefore + 1);
  });
});
