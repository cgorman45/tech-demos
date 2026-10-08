import type { Lifecycle, NodeStatus, WorkflowEdgeSpec } from "@/data/workflow";

/**
 * Derive the visible status of every node from its lifecycle plus the flow
 * graph. Edges point upstream to downstream, so a running node becomes
 * `degraded` when any upstream source (direct or transitive) is stopped or
 * itself degraded.
 */
export function deriveStatuses(
  lifecycle: Record<string, Lifecycle>,
  edges: WorkflowEdgeSpec[],
): Record<string, NodeStatus> {
  const statuses: Record<string, NodeStatus> = { ...lifecycle };

  // Fixpoint iteration; the graph is tiny so this is plenty fast.
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      const upstream = statuses[edge.source];
      const downstream = statuses[edge.target];
      const upstreamDown = upstream === "stopped" || upstream === "degraded";
      if (downstream === "running" && upstreamDown) {
        statuses[edge.target] = "degraded";
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

/**
 * Find a stopped node upstream of `id` to explain a degraded status.
 * Walks sources breadth-first and returns the first stopped node found.
 */
export function findStoppedUpstream(
  id: string,
  lifecycle: Record<string, Lifecycle>,
  edges: WorkflowEdgeSpec[],
): string | null {
  const queue = [id];
  const seen = new Set<string>([id]);
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const edge of edges) {
      if (edge.target !== current || seen.has(edge.source)) continue;
      if (lifecycle[edge.source] === "stopped") return edge.source;
      seen.add(edge.source);
      queue.push(edge.source);
    }
  }
  return null;
}
