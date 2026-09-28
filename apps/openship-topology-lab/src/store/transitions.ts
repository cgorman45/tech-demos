import type { ConnectionSpec, Lifecycle, ServiceStatus } from "@/data/topology";

/**
 * Derive the visible status of every service from its lifecycle plus the
 * dependency graph: a running service becomes `degraded` when any of its
 * dependencies (direct or transitive) is stopped or itself degraded.
 */
export function deriveStatuses(
  lifecycle: Record<string, Lifecycle>,
  connections: ConnectionSpec[],
): Record<string, ServiceStatus> {
  const statuses: Record<string, ServiceStatus> = { ...lifecycle };

  // Fixpoint iteration; the graph is tiny so this is plenty fast.
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of connections) {
      const dep = statuses[edge.target];
      const consumer = statuses[edge.source];
      const depDown = dep === "stopped" || dep === "degraded";
      if (consumer === "running" && depDown) {
        statuses[edge.source] = "degraded";
        changed = true;
      }
    }
  }
  return statuses;
}

export function stopLifecycle(
  lifecycle: Record<string, Lifecycle>,
  id: string,
): Record<string, Lifecycle> {
  return { ...lifecycle, [id]: "stopped" };
}

export function startLifecycle(
  lifecycle: Record<string, Lifecycle>,
  id: string,
): Record<string, Lifecycle> {
  return { ...lifecycle, [id]: "running" };
}

export function beginRestartLifecycle(
  lifecycle: Record<string, Lifecycle>,
  id: string,
): Record<string, Lifecycle> {
  return { ...lifecycle, [id]: "restarting" };
}
