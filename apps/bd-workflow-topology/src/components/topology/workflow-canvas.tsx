import { useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useNodesState,
  type EdgeTypes,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  EDGES,
  KB_EDGE_BY_TARGET,
  KB_FED,
  LANE_BY_ID,
  NODES,
  NODE_BY_ID,
} from "@/data/workflow";
import { STATUS_MINIMAP } from "@/lib/status";
import { useWorkflowStore } from "@/store/workflow-store";
import { FIT_VIEW_OPTIONS, laneBands, layoutPositions } from "@/components/topology/layout";
import { LaneBandComponent, type LaneBandNode } from "@/components/topology/lane-band";
import {
  WorkflowNodeComponent,
  type WorkflowFlowNode,
} from "@/components/topology/workflow-node";
import { TokenEdgeComponent, type TokenFlowEdge } from "@/components/topology/token-edge";

const nodeTypes: NodeTypes = { step: WorkflowNodeComponent, lane: LaneBandComponent };
const edgeTypes: EdgeTypes = { token: TokenEdgeComponent };

type CanvasNode = WorkflowFlowNode | LaneBandNode;

function buildInitialNodes(): CanvasNode[] {
  const positions = layoutPositions();
  const bands: LaneBandNode[] = laneBands().map((band) => ({
    id: `lane-${band.laneId}`,
    type: "lane" as const,
    position: { x: band.x, y: band.y },
    data: { laneId: band.laneId, width: band.width, height: band.height },
    zIndex: -1,
    selectable: false,
    draggable: false,
    focusable: false,
  }));
  const steps: WorkflowFlowNode[] = NODES.map((spec) => ({
    id: spec.id,
    type: "step" as const,
    position: positions[spec.id],
    data: { nodeId: spec.id },
    zIndex: 1,
  }));
  return [...bands, ...steps];
}

export function WorkflowCanvas() {
  const [nodes, , onNodesChange] = useNodesState<CanvasNode>(
    useMemo(() => buildInitialNodes(), []),
  );

  const statuses = useWorkflowStore((s) => s.statuses);
  const run = useWorkflowStore((s) => s.run);
  const stepMs = useWorkflowStore((s) => s.stepMs);
  const select = useWorkflowStore((s) => s.select);

  const edges = useMemo<TokenFlowEdge[]>(() => {
    const kbEdgeId =
      run.status === "running" && run.activeNodeId !== null && KB_FED.has(run.activeNodeId)
        ? KB_EDGE_BY_TARGET[run.activeNodeId]
        : null;
    return EDGES.map((spec) => {
      const endpointDown =
        statuses[spec.source] === "stopped" || statuses[spec.target] === "stopped";
      const active =
        spec.id === run.activeEdgeId && (run.status === "running" || run.status === "done");
      return {
        id: spec.id,
        type: "token" as const,
        source: spec.source,
        target: spec.target,
        sourceHandle: spec.sourceHandle ?? "out",
        targetHandle: spec.targetHandle ?? "in",
        data: {
          active,
          kbPulse: spec.id === kbEdgeId && !endpointDown,
          color: LANE_BY_ID[NODE_BY_ID[spec.source].lane].color,
          dimmed: endpointDown,
          runKey: run.stepIndex,
          durationMs: stepMs > 0 ? Math.min(stepMs, 900) : 900,
        },
      };
    });
  }, [statuses, run, stepMs]);

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => {
          if (node.type === "step") select(node.id);
        }}
        onPaneClick={() => select(null)}
        colorMode="dark"
        fitView
        fitViewOptions={FIT_VIEW_OPTIONS}
        minZoom={0.25}
        maxZoom={2}
        nodesConnectable={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.1} color="#1e293b" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap
          position="bottom-right"
          style={{ width: 150, height: 92 }}
          bgColor="#070b14"
          maskColor="rgba(7, 11, 20, 0.7)"
          nodeStrokeWidth={4}
          nodeColor={(node) =>
            node.type === "lane" ? "transparent" : STATUS_MINIMAP[statuses[node.id]]
          }
        />
      </ReactFlow>
    </div>
  );
}
