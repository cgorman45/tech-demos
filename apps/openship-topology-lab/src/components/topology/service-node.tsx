import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import {
  Clock,
  Cog,
  Database,
  Globe,
  HardDrive,
  Layers,
  Server,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";
import { CONNECTIONS, SERVICE_BY_ID, type ServiceKind } from "@/data/topology";
import { STATUS_META } from "@/lib/status";
import { useTopologyStore } from "@/store/topology-store";

export type ServiceNode = Node<{ serviceId: string }, "service">;

const KIND_ICONS: Record<ServiceKind, LucideIcon> = {
  web: Globe,
  api: Server,
  worker: Cog,
  cron: Clock,
  postgres: Database,
  redis: Zap,
  queue: Layers,
  storage: HardDrive,
};

function ServiceNodeInner({ data }: NodeProps<ServiceNode>) {
  const { serviceId } = data;
  const spec = SERVICE_BY_ID[serviceId];
  const status = useTopologyStore((s) => s.statuses[serviceId]);
  const cpu = useTopologyStore((s) => s.runtime[serviceId].cpu);
  const mem = useTopologyStore((s) => s.runtime[serviceId].mem);
  const isSelected = useTopologyStore((s) => s.selectedId === serviceId);
  const isEdgeEndpoint = useTopologyStore((s) => {
    if (s.hoveredEdgeId === null) return false;
    const conn = CONNECTIONS.find((c) => c.id === s.hoveredEdgeId);
    return conn !== undefined && (conn.source === serviceId || conn.target === serviceId);
  });

  const Icon = KIND_ICONS[spec.kind];
  const meta = STATUS_META[status];
  const stopped = status === "stopped";

  return (
    <div
      className={cn(
        "w-56 cursor-pointer rounded-xl border border-border bg-card px-3.5 py-3 shadow-md transition-all duration-200",
        stopped && "opacity-55 saturate-0",
        status === "restarting" && "animate-pulse",
        isSelected && "border-primary ring-2 ring-primary/40",
        isEdgeEndpoint && "border-sky-400 ring-2 ring-sky-400/50",
      )}
    >
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />

      <div className="flex items-center gap-2.5">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-foreground">{spec.name}</div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {spec.kind}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", meta.dot)} />
          <span className={cn("text-[10px] font-medium", meta.text)}>{meta.label}</span>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between font-mono text-[10px] text-muted-foreground">
        <span>
          cpu <span className="text-foreground/80">{stopped ? "—" : `${cpu.toFixed(0)}%`}</span>
        </span>
        <span>
          mem <span className="text-foreground/80">{stopped ? "—" : `${mem.toFixed(0)} MB`}</span>
        </span>
        <span>:{spec.port}</span>
      </div>
    </div>
  );
}

export const ServiceNodeComponent = memo(ServiceNodeInner);
