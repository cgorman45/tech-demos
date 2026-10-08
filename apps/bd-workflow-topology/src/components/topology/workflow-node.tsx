import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import {
  ClipboardList,
  Coins,
  FileText,
  Landmark,
  Library,
  Mail,
  NotebookPen,
  Phone,
  PlayCircle,
  Presentation,
  Radar,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import {
  KB_FED,
  LANE_BY_ID,
  NODE_BY_ID,
  type IconKey,
} from "@/data/workflow";
import { formatMetric } from "@/lib/mock";
import { STATUS_META } from "@/lib/status";
import { nodeName, nodeSubtitle, useWorkflowStore } from "@/store/workflow-store";
import { KB_HEIGHT, KB_WIDTH, NODE_WIDTH } from "@/components/topology/layout";

export type WorkflowFlowNode = Node<{ nodeId: string }, "step">;

const ICONS: Record<IconKey, LucideIcon> = {
  radar: Radar,
  landmark: Landmark,
  coins: Coins,
  sparkles: Sparkles,
  library: Library,
  "file-text": FileText,
  presentation: Presentation,
  mail: Mail,
  sliders: SlidersHorizontal,
  clipboard: ClipboardList,
  notebook: NotebookPen,
  phone: Phone,
  trophy: Trophy,
};

function glowShadow(color: string, strength: "soft" | "strong"): string {
  if (strength === "strong") {
    return `0 0 0 1px ${color}aa, 0 0 34px -2px ${color}99, 0 8px 28px -10px rgba(0,0,0,0.8)`;
  }
  return `0 0 0 1px ${color}55, 0 0 22px -6px ${color}66, 0 8px 24px -12px rgba(0,0,0,0.8)`;
}

const AMBER = "#fbbf24";
const RED = "#f87171";

function WorkflowNodeInner({ data }: NodeProps<WorkflowFlowNode>) {
  const { nodeId } = data;
  const spec = NODE_BY_ID[nodeId];
  const lane = LANE_BY_ID[spec.lane];
  const status = useWorkflowStore((s) => s.statuses[nodeId]);
  const metrics = useWorkflowStore((s) => s.metrics[nodeId]);
  const isSelected = useWorkflowStore((s) => s.selectedId === nodeId);
  const isFiring = useWorkflowStore((s) => s.run.activeNodeId === nodeId);
  const isStalledHere = useWorkflowStore(
    (s) => s.run.status === "stalled" && s.run.activeNodeId === nodeId,
  );
  const kbPulse = useWorkflowStore(
    (s) =>
      nodeId === "kb" &&
      s.run.status === "running" &&
      s.run.activeNodeId !== null &&
      KB_FED.has(s.run.activeNodeId) &&
      s.statuses.kb === "running",
  );
  const editMode = useWorkflowStore((s) => s.editMode);
  const displayName = useWorkflowStore((s) => nodeName(s.edits, nodeId));
  const displaySubtitle = useWorkflowStore((s) => nodeSubtitle(s.edits, nodeId));

  const Icon = ICONS[spec.icon];
  const meta = STATUS_META[status];
  const stopped = status === "stopped";
  const degraded = status === "degraded";

  const glowColor = isStalledHere
    ? RED
    : degraded
      ? AMBER
      : stopped
        ? "#52525b"
        : lane.color;
  const highlighted = (isFiring && !isStalledHere) || kbPulse;
  const boxShadow = stopped
    ? "0 0 0 1px #3f3f46"
    : glowShadow(glowColor, highlighted || spec.emphasis ? "strong" : "soft");

  const width = spec.emphasis ? KB_WIDTH : NODE_WIDTH;

  return (
    <div
      className={cn(
        "relative cursor-pointer border bg-[#0b1322]/90 backdrop-blur transition-all duration-300",
        spec.pill ? "rounded-full px-5 py-3.5" : "rounded-xl px-3.5 py-3",
        spec.emphasis && "py-4",
        stopped && "opacity-55 saturate-0",
        status === "restarting" && "animate-pulse",
        isStalledHere && "animate-pulse",
        editMode && "cursor-grab border-dashed",
      )}
      style={{
        width,
        minHeight: spec.emphasis ? KB_HEIGHT : undefined,
        borderColor: isSelected ? "#fafafa" : `${glowColor}66`,
        boxShadow,
      }}
    >
      {highlighted && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -inset-1 animate-ping",
            spec.pill ? "rounded-full" : "rounded-xl",
          )}
          style={{ border: `2px solid ${lane.color}`, animationDuration: "1s" }}
        />
      )}

      <Handle id="in" type="target" position={Position.Left} className="!bg-zinc-500" />
      <Handle id="in-right" type="target" position={Position.Right} className="!bg-transparent !border-0" />
      <Handle id="out" type="source" position={Position.Right} className="!bg-zinc-500" />
      <Handle id="out-left" type="source" position={Position.Left} className="!bg-transparent !border-0" />

      <div className="flex items-center gap-2.5">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${lane.color}1f` }}
        >
          <Icon className="size-4" style={{ color: stopped ? "#71717a" : lane.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "line-clamp-2 font-medium leading-snug text-foreground",
              spec.emphasis ? "text-sm" : "text-[13px]",
            )}
            title={displayName}
          >
            {displayName}
          </div>
          {displaySubtitle && (
            <div className="truncate text-[10px] text-muted-foreground" title={displaySubtitle}>
              {displaySubtitle}
            </div>
          )}
        </div>
        <span className={cn("size-2 shrink-0 rounded-full", meta.dot)} title={meta.label} />
      </div>

      <div className="mt-2.5 flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
        {spec.metrics.map((metric) => (
          <span key={metric.key} className="truncate">
            {metric.label.toLowerCase()}{" "}
            <span className="text-foreground/85">
              {stopped ? "off" : formatMetric(metrics[metric.key])}
            </span>
          </span>
        ))}
        {spec.hoursSaved !== undefined && (
          <span className="ml-auto shrink-0" style={{ color: stopped ? undefined : lane.color }}>
            {stopped ? "0h saved" : `~${spec.hoursSaved}h saved`}
          </span>
        )}
      </div>

      {nodeId === "proposal" && !editMode && (
        <div
          className="mt-2 flex items-center gap-1.5 text-[10px] font-medium"
          style={{ color: lane.color }}
        >
          <PlayCircle className="size-3" /> Open drafting animation
        </div>
      )}
    </div>
  );
}

export const WorkflowNodeComponent = memo(WorkflowNodeInner);
