import dagre from "@dagrejs/dagre";
import { CONNECTIONS, SERVICES } from "@/data/topology";

export const NODE_WIDTH = 224;
export const NODE_HEIGHT = 92;

/** Deterministic left-to-right auto-layout of the service graph. */
export function layoutPositions(): Record<string, { x: number; y: number }> {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: "LR", nodesep: 56, ranksep: 130, marginx: 24, marginy: 24 });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const spec of SERVICES) {
    graph.setNode(spec.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const conn of CONNECTIONS) {
    graph.setEdge(conn.source, conn.target);
  }

  dagre.layout(graph);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const spec of SERVICES) {
    const node = graph.node(spec.id);
    positions[spec.id] = {
      x: node.x - NODE_WIDTH / 2,
      y: node.y - NODE_HEIGHT / 2,
    };
  }
  return positions;
}
