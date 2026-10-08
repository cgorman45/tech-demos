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
import { clearEdits, loadEdits, saveEdits, type Edits, type NodeEdits } from "@/lib/edits";
import {
  DRAFTING_LABEL_DEFAULTS,
  clearDraftingLabels,
  loadDraftingLabels,
  saveDraftingLabels,
} from "@/components/drafting/labels";

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
  editMode: boolean;
  edits: Edits;
  /** Bumped by resetLayout so the canvas rebuilds node positions. */
  layoutVersion: number;
  /** Full-screen Proposal drafting drill-down. */
  draftingOpen: boolean;
  /** Label overrides for the drafting animation, keyed by label id. */
  draftingLabels: Record<string, string>;

  stopNode: (id: string) => void;
  startNode: (id: string) => void;
  restartNode: (id: string, durationMs?: number) => void;
  runLead: () => void;
  advanceRun: () => void;
  resetScenario: () => void;
  select: (id: string | null) => void;
  toggleEditMode: () => void;
  openDrafting: () => void;
  closeDrafting: () => void;
  renameNode: (id: string, patch: { name?: string; subtitle?: string }) => void;
  setNodePosition: (id: string, position: { x: number; y: number }) => void;
  setMetricValue: (id: string, key: string, value: number) => void;
  resetLayout: () => void;
  setDraftingLabel: (id: string, value: string) => void;
  resetDraftingLabels: () => void;
}

/** Current display name of a node, honoring Edit mode renames. */
export function nodeName(edits: Edits, id: string): string {
  return edits[id]?.name ?? NODE_BY_ID[id].name;
}

/** Current display subtitle of a node, honoring Edit mode renames. */
export function nodeSubtitle(edits: Edits, id: string): string | undefined {
  return edits[id]?.subtitle ?? NODE_BY_ID[id].subtitle;
}

function metricsWithEdits(edits: Edits): Record<string, Record<string, number>> {
  const metrics = seedMetrics();
  for (const [id, nodeEdits] of Object.entries(edits)) {
    if (nodeEdits.metrics === undefined || metrics[id] === undefined) continue;
    metrics[id] = { ...metrics[id], ...nodeEdits.metrics };
  }
  return metrics;
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

function initialState(edits: Edits) {
  const now = Date.now();
  const lifecycle: Record<string, Lifecycle> = {};
  for (const node of NODES) lifecycle[node.id] = "running";
  const hoursSavedTotal = NODES.reduce((sum, node) => sum + (node.hoursSaved ?? 0), 0);
  return {
    lifecycle,
    statuses: deriveStatuses(lifecycle, EDGES),
    metrics: metricsWithEdits(edits),
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

const persistedEdits = loadEdits();

export const useWorkflowStore = create<WorkflowStore>()((set, get) => ({
  ...initialState(persistedEdits),
  selectedId: null,
  stepMs: DEFAULT_STEP_MS,
  editMode: false,
  edits: persistedEdits,
  layoutVersion: 0,
  draftingOpen: false,
  draftingLabels: loadDraftingLabels(),

  stopNode: (id) => {
    cancelRestartTimer(id);
    const state = get();
    if (state.lifecycle[id] === "stopped") return;
    const now = Date.now();
    const lifecycle = stopLifecycle(state.lifecycle, id);
    const name = nodeName(state.edits, id);
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
    const name = nodeName(state.edits, id);
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
    const name = nodeName(state.edits, id);
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
    const currentName = nodeName(state.edits, nodeId);
    const now = Date.now();

    if (state.statuses[nodeId] !== "running") {
      cancelRunTimer();
      const culpritId =
        state.statuses[nodeId] === "stopped"
          ? nodeId
          : (findStoppedUpstream(nodeId, state.lifecycle, EDGES) ?? nodeId);
      const culprit = nodeName(state.edits, culpritId);
      const message =
        culpritId === nodeId
          ? `Lead stalled at ${currentName}: the step is stopped.`
          : `Lead stalled at ${currentName}: ${culprit} is offline.`;
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
      title: currentName,
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
    // Keeps Edit mode and saved edits; Reset layout clears those.
    set({
      ...initialState(get().edits),
      selectedId: null,
      stepMs: DEFAULT_STEP_MS,
      draftingOpen: false,
    });
  },

  select: (id) => set({ selectedId: id }),

  toggleEditMode: () => set({ editMode: !get().editMode }),

  openDrafting: () => set({ draftingOpen: true, selectedId: null }),

  closeDrafting: () => set({ draftingOpen: false }),

  renameNode: (id, patch) => {
    const state = get();
    const current: NodeEdits = state.edits[id] ?? {};
    const next: NodeEdits = { ...current };
    if (patch.name !== undefined) {
      if (patch.name.trim() === "" || patch.name === NODE_BY_ID[id].name) {
        delete next.name;
      } else {
        next.name = patch.name;
      }
    }
    if (patch.subtitle !== undefined) {
      if (patch.subtitle === (NODE_BY_ID[id].subtitle ?? "")) {
        delete next.subtitle;
      } else {
        next.subtitle = patch.subtitle;
      }
    }
    const edits = { ...state.edits, [id]: next };
    saveEdits(edits);
    set({ edits });
  },

  setNodePosition: (id, position) => {
    const state = get();
    const edits = { ...state.edits, [id]: { ...state.edits[id], position } };
    saveEdits(edits);
    set({ edits });
  },

  setMetricValue: (id, key, value) => {
    const state = get();
    const safe = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
    const edits = {
      ...state.edits,
      [id]: {
        ...state.edits[id],
        metrics: { ...state.edits[id]?.metrics, [key]: safe },
      },
    };
    saveEdits(edits);
    set({
      edits,
      metrics: { ...state.metrics, [id]: { ...state.metrics[id], [key]: safe } },
    });
  },

  resetLayout: () => {
    const state = get();
    clearEdits();
    // Revert edited metric values to their seeds without touching run counters.
    const metrics = { ...state.metrics };
    for (const [id, nodeEdits] of Object.entries(state.edits)) {
      if (nodeEdits.metrics === undefined) continue;
      const seeds = Object.fromEntries(NODE_BY_ID[id].metrics.map((m) => [m.key, m.seed]));
      metrics[id] = { ...metrics[id], ...seeds };
    }
    set({ edits: {}, metrics, layoutVersion: state.layoutVersion + 1 });
  },

  setDraftingLabel: (id, value) => {
    if (!(id in DRAFTING_LABEL_DEFAULTS)) return;
    const state = get();
    const next = { ...state.draftingLabels };
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === DRAFTING_LABEL_DEFAULTS[id]) {
      delete next[id];
    } else {
      next[id] = trimmed;
    }
    saveDraftingLabels(next);
    set({ draftingLabels: next });
  },

  resetDraftingLabels: () => {
    clearDraftingLabels();
    set({ draftingLabels: {} });
  },
}));
