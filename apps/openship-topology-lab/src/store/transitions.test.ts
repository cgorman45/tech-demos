import { beforeEach, describe, expect, test } from "bun:test";
import { CONNECTIONS, SERVICES, type Lifecycle } from "@/data/topology";
import { deriveStatuses, startLifecycle, stopLifecycle } from "@/store/transitions";
import { useTopologyStore } from "@/store/topology-store";

function allRunning(): Record<string, Lifecycle> {
  return Object.fromEntries(SERVICES.map((s) => [s.id, "running" as const]));
}

describe("deriveStatuses", () => {
  test("all services running yields no degraded statuses", () => {
    const statuses = deriveStatuses(allRunning(), CONNECTIONS);
    for (const spec of SERVICES) {
      expect(statuses[spec.id]).toBe("running");
    }
  });

  test("stopping a leaf dependency degrades its direct dependents", () => {
    const lifecycle = stopLifecycle(allRunning(), "redis");
    const statuses = deriveStatuses(lifecycle, CONNECTIONS);
    expect(statuses.redis).toBe("stopped");
    expect(statuses.api).toBe("degraded");
    // worker does not depend on redis
    expect(statuses.worker).toBe("running");
  });

  test("degradation propagates transitively through the graph", () => {
    // postgres is used by api and worker; web and cron consume api.
    const lifecycle = stopLifecycle(allRunning(), "postgres");
    const statuses = deriveStatuses(lifecycle, CONNECTIONS);
    expect(statuses.postgres).toBe("stopped");
    expect(statuses.api).toBe("degraded");
    expect(statuses.worker).toBe("degraded");
    expect(statuses.web).toBe("degraded");
    expect(statuses.cron).toBe("degraded");
    // queue, redis, storage have no dependency on postgres
    expect(statuses.queue).toBe("running");
    expect(statuses.redis).toBe("running");
    expect(statuses.storage).toBe("running");
  });

  test("starting the dependency again restores every dependent", () => {
    let lifecycle = stopLifecycle(allRunning(), "postgres");
    lifecycle = startLifecycle(lifecycle, "postgres");
    const statuses = deriveStatuses(lifecycle, CONNECTIONS);
    for (const spec of SERVICES) {
      expect(statuses[spec.id]).toBe("running");
    }
  });

  test("stopped services stay stopped even when their dependencies stop", () => {
    let lifecycle = stopLifecycle(allRunning(), "web");
    lifecycle = stopLifecycle(lifecycle, "api");
    const statuses = deriveStatuses(lifecycle, CONNECTIONS);
    expect(statuses.web).toBe("stopped");
    expect(statuses.api).toBe("stopped");
  });
});

describe("topology store actions", () => {
  beforeEach(() => {
    useTopologyStore.getState().resetScenario();
  });

  test("stopService propagates degraded to dependents", () => {
    useTopologyStore.getState().stopService("queue");
    const { statuses } = useTopologyStore.getState();
    expect(statuses.queue).toBe("stopped");
    expect(statuses.api).toBe("degraded");
    expect(statuses.worker).toBe("degraded");
    expect(statuses.web).toBe("degraded");
  });

  test("startService restores dependents to running", () => {
    const store = useTopologyStore.getState();
    store.stopService("queue");
    useTopologyStore.getState().startService("queue");
    const { statuses } = useTopologyStore.getState();
    for (const spec of SERVICES) {
      expect(statuses[spec.id]).toBe("running");
    }
  });

  test("stopService zeroes metrics and clears uptime", () => {
    useTopologyStore.getState().stopService("api");
    const { runtime } = useTopologyStore.getState();
    expect(runtime.api.cpu).toBe(0);
    expect(runtime.api.mem).toBe(0);
    expect(runtime.api.startedAt).toBeNull();
  });

  test("restartService goes restarting then returns to running", async () => {
    useTopologyStore.getState().restartService("api", 20);
    expect(useTopologyStore.getState().statuses.api).toBe("restarting");
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(useTopologyStore.getState().statuses.api).toBe("running");
    expect(useTopologyStore.getState().runtime.api.startedAt).not.toBeNull();
  });

  test("stopping during a restart wins over the restart completion", async () => {
    useTopologyStore.getState().restartService("api", 20);
    useTopologyStore.getState().stopService("api");
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(useTopologyStore.getState().statuses.api).toBe("stopped");
  });

  test("resetScenario returns everything to running", () => {
    const store = useTopologyStore.getState();
    store.stopService("postgres");
    store.stopService("web");
    useTopologyStore.getState().resetScenario();
    const { statuses } = useTopologyStore.getState();
    for (const spec of SERVICES) {
      expect(statuses[spec.id]).toBe("running");
    }
  });
});
