import { create } from "zustand";
import {
  CONNECTIONS,
  SERVICES,
  SERVICE_BY_ID,
  type Lifecycle,
  type ServiceStatus,
} from "@/data/topology";
import {
  beginRestartLifecycle,
  deriveStatuses,
  startLifecycle,
  stopLifecycle,
} from "@/store/transitions";
import {
  initialMetrics,
  makeLogs,
  randomRuntimeLog,
  tickMetric,
  type LogLine,
} from "@/lib/mock";

export const RESTART_MS = 2000;
const MAX_LOG_LINES = 60;

export interface ServiceRuntime {
  cpu: number;
  mem: number;
  startedAt: number | null;
  logs: LogLine[];
}

interface TopologyStore {
  lifecycle: Record<string, Lifecycle>;
  statuses: Record<string, ServiceStatus>;
  runtime: Record<string, ServiceRuntime>;
  selectedId: string | null;
  hoveredEdgeId: string | null;

  restartService: (id: string, durationMs?: number) => void;
  stopService: (id: string) => void;
  startService: (id: string) => void;
  resetScenario: () => void;
  tick: () => void;
  select: (id: string | null) => void;
  setHoveredEdge: (id: string | null) => void;
}

const restartTimers = new Map<string, ReturnType<typeof setTimeout>>();

function cancelRestartTimer(id: string) {
  const timer = restartTimers.get(id);
  if (timer !== undefined) {
    clearTimeout(timer);
    restartTimers.delete(id);
  }
}

function initialState() {
  const now = Date.now();
  const lifecycle: Record<string, Lifecycle> = {};
  const runtime: Record<string, ServiceRuntime> = {};
  for (const spec of SERVICES) {
    lifecycle[spec.id] = "running";
    runtime[spec.id] = {
      ...initialMetrics(spec.kind),
      // Stagger fake uptimes between ~2h and ~26h so the panel looks lived-in.
      startedAt: now - (2 + Math.random() * 24) * 3_600_000,
      logs: makeLogs(spec.kind, now),
    };
  }
  return {
    lifecycle,
    statuses: deriveStatuses(lifecycle, CONNECTIONS),
    runtime,
  };
}

function appendLog(runtime: ServiceRuntime, line: LogLine): ServiceRuntime {
  return { ...runtime, logs: [...runtime.logs, line].slice(-MAX_LOG_LINES) };
}

export const useTopologyStore = create<TopologyStore>()((set, get) => ({
  ...initialState(),
  selectedId: null,
  hoveredEdgeId: null,

  restartService: (id, durationMs = RESTART_MS) => {
    const state = get();
    if (state.lifecycle[id] === "restarting") return;
    cancelRestartTimer(id);

    const now = Date.now();
    const lifecycle = beginRestartLifecycle(state.lifecycle, id);
    set({
      lifecycle,
      statuses: deriveStatuses(lifecycle, CONNECTIONS),
      runtime: {
        ...state.runtime,
        [id]: appendLog(
          { ...state.runtime[id], startedAt: null },
          { ts: now, level: "warn", message: "received SIGTERM, restarting container" },
        ),
      },
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
          statuses: deriveStatuses(lifecycleAfter, CONNECTIONS),
          runtime: {
            ...current.runtime,
            [id]: appendLog(
              { ...current.runtime[id], startedAt: doneAt },
              {
                ts: doneAt,
                level: "info",
                message: `listening on :${SERVICE_BY_ID[id].port}`,
              },
            ),
          },
        });
      }, durationMs),
    );
  },

  stopService: (id) => {
    cancelRestartTimer(id);
    const state = get();
    const now = Date.now();
    const lifecycle = stopLifecycle(state.lifecycle, id);
    set({
      lifecycle,
      statuses: deriveStatuses(lifecycle, CONNECTIONS),
      runtime: {
        ...state.runtime,
        [id]: appendLog(
          { ...state.runtime[id], startedAt: null, cpu: 0, mem: 0 },
          { ts: now, level: "warn", message: "received SIGTERM, exited with code 0" },
        ),
      },
    });
  },

  startService: (id) => {
    cancelRestartTimer(id);
    const state = get();
    if (state.lifecycle[id] === "running") return;
    const now = Date.now();
    const lifecycle = startLifecycle(state.lifecycle, id);
    const spec = SERVICE_BY_ID[id];
    set({
      lifecycle,
      statuses: deriveStatuses(lifecycle, CONNECTIONS),
      runtime: {
        ...state.runtime,
        [id]: appendLog(
          { ...state.runtime[id], ...initialMetrics(spec.kind), startedAt: now },
          { ts: now, level: "info", message: `listening on :${spec.port}` },
        ),
      },
    });
  },

  resetScenario: () => {
    for (const id of restartTimers.keys()) cancelRestartTimer(id);
    set({ ...initialState(), selectedId: null, hoveredEdgeId: null });
  },

  tick: () => {
    const state = get();
    const now = Date.now();
    const runtime: Record<string, ServiceRuntime> = {};
    for (const spec of SERVICES) {
      const prev = state.runtime[spec.id];
      const status = state.statuses[spec.id];
      if (status === "stopped") {
        runtime[spec.id] = prev.cpu === 0 && prev.mem === 0
          ? prev
          : { ...prev, cpu: 0, mem: 0 };
        continue;
      }
      if (status === "restarting") {
        runtime[spec.id] = { ...prev, cpu: 1 + Math.random() * 3, mem: 32 };
        continue;
      }
      let next: ServiceRuntime = { ...prev, ...tickMetric(spec.kind, prev) };
      if (status === "degraded" && Math.random() < 0.4) {
        next = appendLog(next, {
          ts: now,
          level: "error",
          message: "upstream connection refused, retrying with backoff",
        });
      } else if (Math.random() < 0.35) {
        next = appendLog(next, randomRuntimeLog(spec.kind, now));
      }
      runtime[spec.id] = next;
    }
    set({ runtime });
  },

  select: (id) => set({ selectedId: id }),
  setHoveredEdge: (id) => set({ hoveredEdgeId: id }),
}));
