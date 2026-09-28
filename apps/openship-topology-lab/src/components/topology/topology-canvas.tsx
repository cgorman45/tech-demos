import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useNodesState,
  type Edge,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CONNECTIONS, SERVICES, type Protocol } from "@/data/topology";
import { useTopologyStore } from "@/store/topology-store";
import { layoutPositions } from "@/components/topology/layout";
import { ServiceNodeComponent, type ServiceNode } from "@/components/topology/service-node";
import { Button } from "@/components/ui/button";

const nodeTypes: NodeTypes = { service: ServiceNodeComponent };

const PROTOCOL_COLORS: Record<Protocol, string> = {
  http: "#38bdf8",
  tcp: "#a78bfa",
  "pub/sub": "#f472b6",
};

function buildInitialNodes(): ServiceNode[] {
  const positions = layoutPositions();
  return SERVICES.map((spec) => ({
    id: spec.id,
    type: "service" as const,
    position: positions[spec.id],
    data: { serviceId: spec.id },
  }));
}

export function TopologyCanvas() {
  const [nodes, , onNodesChange] = useNodesState<ServiceNode>(
    useMemo(() => buildInitialNodes(), []),
  );

  const statuses = useTopologyStore((s) => s.statuses);
  const hoveredEdgeId = useTopologyStore((s) => s.hoveredEdgeId);
  const select = useTopologyStore((s) => s.select);
  const setHoveredEdge = useTopologyStore((s) => s.setHoveredEdge);
  const startService = useTopologyStore((s) => s.startService);
  const resetScenario = useTopologyStore((s) => s.resetScenario);

  const allStopped = SERVICES.every((spec) => statuses[spec.id] === "stopped");

  const edges = useMemo<Edge[]>(
    () =>
      CONNECTIONS.map((conn) => {
        const endpointDown =
          statuses[conn.source] === "stopped" || statuses[conn.target] === "stopped";
        const hovered = hoveredEdgeId === conn.id;
        const color = PROTOCOL_COLORS[conn.protocol];
        return {
          id: conn.id,
          source: conn.source,
          target: conn.target,
          label: hovered ? conn.protocol : undefined,
          animated: !endpointDown && (hovered || conn.protocol === "pub/sub"),
          interactionWidth: 24,
          style: {
            stroke: color,
            strokeWidth: hovered ? 2.5 : 1.5,
            opacity: endpointDown ? 0.3 : hovered ? 1 : 0.65,
            strokeDasharray: endpointDown ? "6 4" : undefined,
            transition: "opacity 200ms, stroke-width 200ms",
          },
          labelStyle: { fill: "#fafafa", fontSize: 11, fontFamily: "monospace" },
          labelBgStyle: { fill: "#18181b", stroke: color, strokeWidth: 1 },
          labelBgPadding: [6, 3] as [number, number],
          labelBgBorderRadius: 5,
        };
      }),
    [statuses, hoveredEdgeId],
  );

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => select(node.id)}
        onPaneClick={() => select(null)}
        onEdgeMouseEnter={(_, edge) => setHoveredEdge(edge.id)}
        onEdgeMouseLeave={() => setHoveredEdge(null)}
        colorMode="dark"
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.2} />
        <Controls position="bottom-left" />
        <MiniMap
          position="bottom-right"
          pannable
          zoomable
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            switch (statuses[node.id]) {
              case "running":
                return "#34d399";
              case "restarting":
                return "#38bdf8";
              case "degraded":
                return "#fbbf24";
              default:
                return "#52525b";
            }
          }}
        />
      </ReactFlow>

      {allStopped && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-xl border border-border bg-card/95 px-8 py-6 text-center shadow-xl">
            <div className="text-sm font-medium text-foreground">All services are stopped</div>
            <div className="max-w-64 text-xs text-muted-foreground">
              The fleet is dark. Start a service from its inspect panel or reset the scenario.
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => startService("postgres")}>
                Start postgres
              </Button>
              <Button size="sm" onClick={resetScenario}>
                Reset scenario
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
