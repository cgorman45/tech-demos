import { create } from "zustand";
import {
  COMPLETION_TICKS,
  EDGES,
  HOURS_SAVED_PER_RUN,
  NODES,
  NODE_BY_ID,
  RUN_PATH,
  RUN_STEP_EDGES,
  SAMPLE_OUTPUT,
  type Lifecycle,
  type NodeStatus,
} from "@/data/workflow";
import {
  beginRestartLifecycle,
  deriveStatuses,
  findStoppedUpstream,
  startLifecycle,
  stopLifecycle,
} from "@/store/transitions";
import { makeNodeLogs, seedMetrics, type LogLine } from "@/lib/mock";

export const RESTART_MS = 1800;
export const DEFAULT_STEP_MS = 1000;
const MAX_NODE_LOG_LINES = 60;
const MAX_ACTIVITY_ENTRIES = 120;

export type RunStatus = "idle" | "running" | "stalled" | "done";

export interface RunState {
  status: RunStatus;
  stepIndex: number;
  activeNodeId: string | null;
  activeEdgeId: string | null;
}

export interface ActivityEntry {
  id: number;
  ts: number;
  /** Null for system lines like run start and completion. */
  nodeId: string | null;
  title: string;
  lines: string[];
  kind: "run" | "lifecycle" | "stall" | "done" | "system";
}

interface WorkflowStore {
  lifecycle: Record<string, Lifecycle>;
  statuses: Record<string, NodeStatus>;
  metrics: Record<string, Record<string, number>>;
  hoursSavedTotal: number;
  nodeLogs: Record<string, LogLine[]>;
  activity: ActivityEntry[];
  selectedId: string | null;
  run: RunState;
  /** Run step duration in ms. Tests set 0 and drive advanceRun directly. */
  stepMs: number;

  stopNode: (id: string) => void;
  startNode: (id: string) => void;
  restartNode: (id: string, durationMs?: number) => void;
  runLead: () => void;
  advanceRun: () => void;
  resetScenario: () => void;
  select: (id: string | null) => void;
}

const restartTimers = new Map<string, ReturnType<typeof setTimeout>>();
let runTimer: ReturnType<typeof setInterval> | null = null;
let activitySeq = 0;

function cancelRestartTimer(id: string) {
  const timer = restartTimers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    restartTimers.delete(id);
  }
}

function cancelRunTimer() {
  if (runTimer !== null) {
    clearInterval(runTimer);
    runTimer = null;
  }
}

const IDLE_RUN: RunState = {
  status: "idle",
  stepIndex: 0,
  activeNodeId: null,
  activeEdgeId: null,
};

function initialState() {
  const now = Date.now();
  const lifecycle: Record<string, Lifecycle> = {};
  for (const node of NODES) lifecycle[node.id] = "running";
  const hoursSavedTotal = NODES.reduce((sum, node) => sum + (node.hoursSaved ?? 0), 0);
  return {
    lifecycle,
    statuses: deriveStatuses(lifecycle, EDGES),
    metrics: seedMetrics(),
    hoursSavedTotal,
    nodeLogs: makeNodeLogs(now),
    activity: [
      {
        id: ++activitySeq,
        ts: now,
        nodeId: null,
        title: "Example data",
        lines: ["All numbers and output on this map are mock. Press Run a lead to watch a lead travel the workflow."],
        kind: "system" as const,
      },
    ],
    run: { ...IDLE_RUN },
  };
}

function appendNodeLog(
  nodeLogs: Record<string, LogLine[]>,
  id: string,
  line: LogLine,
): Record<string, LogLine[]> {
  return {
    ...nodeLogs,
    [id]: [...nodeLogs[id], line].slice(-MAX_NODE_LOG_LINES),
  };
}

function appendActivity(
  activity: ActivityEntry[],
  entry: Omit<ActivityEntry, "id">,
): ActivityEntry[] {
  return [...activity, { ...entry, id: ++activitySeq }].slice(-MAX_ACTIVITY_ENTRIES);
}

export const useWorkflowStore = create<WorkflowStore>()((set, get) => ({
  ...initialState(),
  selectedId: null,
  stepMs: DEFAULT_STEP_MS,

  stopNode: (id) => {
    cancelRestartTimer(id);
    const state = get();
    if (state.lifecycle[id] === "stopped") return;
    const now = Date.now();
    const lifecycle = stopLifecycle(state.lifecycle, id);
    const name = NODE_BY_ID[id].name;
    set({
      lifecycle,
      statuses: deriveStatuses(lifecycle, EDGES),
      nodeLogs: appendNodeLog(state.nodeLogs, id, {
        ts: now,
        level: "warn",
        message: "Stopped by Colton.",
      }),
      activity: appendActivity(state.activity, {
        ts: now,
        nodeId: id,
        title: name,
        lines: [`${name} stopped. Downstream steps now run degraded.`],
        kind: "lifecycle",
      }),
    });
  },

  startNode: (id) => {
    cancelRestartTimer(id);
    const state = get();
    if (state.lifecycle[id] === "running") return;
    const now = Date.now();
    const lifecycle = startLifecycle(state.lifecycle, id);
    const name = NODE_BY_ID[id].name;
    set({
      lifecycle,
      statuses: deriveStatuses(lifecycle, EDGES),
      nodeLogs: appendNodeLog(state.nodeLogs, id, {
        ts: now,
        level: "info",
        message: "Started. Back online.",
      }),
      activity: appendActivity(state.activity, {
        ts: now,
        nodeId: id,
        title: name,
        lines: [`${name} started.`],
        kind: "lifecycle",
      }),
    });
  },

  restartNode: (id, durationMs = RESTART_MS) => {
    const state = get();
    if (state.lifecycle[id] === "restarting") return;
    cancelRestartTimer(id);

    const now = Date.now();
    const lifecycle = beginRestartLifecycle(state.lifecycle, id);
    const name = NODE_BY_ID[id].name;
    set({
      lifecycle,
      statuses: deriveStatuses(lifecycle, EDGES),
      nodeLogs: appendNodeLog(state.nodeLogs, id, {
        ts: now,
        level: "warn",
        message: "Restarting.",
      }),
      activity: appendActivity(state.activity, {
        ts: now,
        nodeId: id,
        title: name,
        lines: [`${name} is restarting.`],
        kind: "lifecycle",
      }),
    });

    restartTimers.set(
      id,
      setTimeout(() => {
        restartTimers.delete(id);
        const current = get();
        if (current.lifecycle[id] !== "restarting") return;
        const doneAt = Date.now();
        const lifecycleAfter = startLifecycle(current.lifecycle, id);
        set({
          lifecycle: lifecycleAfter,
          statuses: deriveStatuses(lifecycleAfter, EDGES),
          nodeLogs: appendNodeLog(current.nodeLogs, id, {
            ts: doneAt,
            level: "info",
            message: "Restart complete. Back online.",
          }),
        });
      }, durationMs),
    );
  },

  runLead: () => {
    const state = get();
    if (state.run.status === "running") return;
    cancelRunTimer();
    const now = Date.now();
    set({
      run: { status: "running", stepIndex: 0, activeNodeId: null, activeEdgeId: null },
      activity: appendActivity(state.activity, {
        ts: now,
        nodeId: null,
        title: "Run started",
        lines: ["A new lead enters the workflow."],
        kind: "system",
      }),
    });
    get().advanceRun();
    const stepMs = get().stepMs;
    if (stepMs > 0 && get().run.status === "running") {
      runTimer = setInterval(() => {
        get().advanceRun();
        if (get().run.status !== "running") cancelRunTimer();
      }, stepMs);
    }
  },

  advanceRun: () => {
    const state = get();
    if (state.run.status !== "running") return;

    const nodeId = RUN_PATH[state.run.stepIndex];
    const node = NODE_BY_ID[nodeId];
    const now = Date.now();

    if (state.statuses[nodeId] !== "running") {
      cancelRunTimer();
      const culpritId =
        state.statuses[nodeId] === "stopped"
          ? nodeId
          : (findStoppedUpstream(nodeId, state.lifecycle, EDGES) ?? nodeId);
      const culprit = NODE_BY_ID[culpritId].name;
      const message =
        culpritId === nodeId
          ? `Lead stalled at ${node.name}: the step is stopped.`
          : `Lead stalled at ${node.name}: ${culprit} is offline.`;
      set({
        run: {
          status: "stalled",
          stepIndex: state.run.stepIndex,
          activeNodeId: nodeId,
          activeEdgeId: null,
        },
        nodeLogs: appendNodeLog(state.nodeLogs, nodeId, {
          ts: now,
          level: "error",
          message,
        }),
        activity: appendActivity(state.activity, {
          ts: now,
          nodeId,
          title: "Run stalled",
          lines: [message],
          kind: "stall",
        }),
      });
      return;
    }

    const isLast = state.run.stepIndex === RUN_PATH.length - 1;
    let activity = appendActivity(state.activity, {
      ts: now,
      nodeId,
      title: node.name,
      lines: SAMPLE_OUTPUT[nodeId],
      kind: "run",
    });
    let nodeLogs = appendNodeLog(state.nodeLogs, nodeId, {
      ts: now,
      level: "info",
      message: SAMPLE_OUTPUT[nodeId][0],
    });

    if (!isLast) {
      set({
        run: {
          status: "running",
          stepIndex: state.run.stepIndex + 1,
          activeNodeId: nodeId,
          activeEdgeId: RUN_STEP_EDGES[nodeId],
        },
        activity,
        nodeLogs,
      });
      return;
    }

    cancelRunTimer();
    const metrics = { ...state.metrics };
    for (const tick of COMPLETION_TICKS) {
      metrics[tick.nodeId] = {
        ...metrics[tick.nodeId],
        [tick.key]: metrics[tick.nodeId][tick.key] + 1,
      };
    }
    activity = appendActivity(activity, {
      ts: now,
      nodeId: null,
      title: "Run complete",
      lines: ["Lead submitted. Proposal and follow-up are out the door."],
      kind: "done",
    });
    set({
      run: {
        status: "done",
        stepIndex: state.run.stepIndex,
        activeNodeId: nodeId,
        activeEdgeId: RUN_STEP_EDGES[nodeId],
      },
      metrics,
      hoursSavedTotal: state.hoursSavedTotal + HOURS_SAVED_PER_RUN,
      activity,
      nodeLogs,
    });
  },

  resetScenario: () => {
    for (const id of restartTimers.keys()) cancelRestartTimer(id);
    cancelRunTimer();
    set({ ...initialState(), selectedId: null, stepMs: DEFAULT_STEP_MS });
  },

  select: (id) => set({ selectedId: id }),
}));
