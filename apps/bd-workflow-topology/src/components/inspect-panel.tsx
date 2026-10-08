import { useEffect, useRef } from "react";
import { Play, RotateCw, Square } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LANE_BY_ID, NODE_BY_ID } from "@/data/workflow";
import { formatClock, formatMetric } from "@/lib/mock";
import { STATUS_META } from "@/lib/status";
import { useWorkflowStore } from "@/store/workflow-store";

export function InspectPanel() {
  const selectedId = useWorkflowStore((s) => s.selectedId);
  const select = useWorkflowStore((s) => s.select);
  const status = useWorkflowStore((s) => (s.selectedId ? s.statuses[s.selectedId] : null));
  const metrics = useWorkflowStore((s) => (s.selectedId ? s.metrics[s.selectedId] : null));
  const logs = useWorkflowStore((s) => (s.selectedId ? s.nodeLogs[s.selectedId] : null));
  const stopNode = useWorkflowStore((s) => s.stopNode);
  const startNode = useWorkflowStore((s) => s.startNode);
  const restartNode = useWorkflowStore((s) => s.restartNode);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const logCount = logs?.length ?? 0;
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [logCount, selectedId]);

  const spec = selectedId ? NODE_BY_ID[selectedId] : null;
  const lane = spec ? LANE_BY_ID[spec.lane] : null;
  const meta = status ? STATUS_META[status] : null;
  const stopped = status === "stopped";
  const restarting = status === "restarting";

  return (
    <Sheet open={selectedId !== null} onOpenChange={(open) => !open && select(null)}>
      <SheetContent side="right" className="w-96 sm:max-w-96">
        {spec && lane && meta && status && metrics && logs && (
          <>
            <SheetHeader>
              <SheetTitle className="flex flex-wrap items-center gap-2">
                {spec.name}
                <Badge variant="outline" className={cn("gap-1.5", meta.text)}>
                  <span className={cn("size-1.5 rounded-full", meta.dot)} />
                  {meta.label}
                </Badge>
              </SheetTitle>
              <SheetDescription>{spec.description}</SheetDescription>
            </SheetHeader>

            <div className="flex gap-2 px-4">
              {stopped ? (
                <Button size="sm" className="flex-1" onClick={() => startNode(spec.id)}>
                  <Play data-icon="inline-start" /> Start
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={restarting}
                    onClick={() => restartNode(spec.id)}
                  >
                    <RotateCw
                      data-icon="inline-start"
                      className={cn(restarting && "animate-spin")}
                    />
                    {restarting ? "Restarting" : "Restart"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => stopNode(spec.id)}
                  >
                    <Square data-icon="inline-start" /> Stop
                  </Button>
                </>
              )}
            </div>

            <Separator />

            <div className="flex flex-wrap items-center gap-2 px-4 text-xs">
              <span className="text-muted-foreground">Lane</span>
              <Badge
                variant="outline"
                className="text-[10px]"
                style={{ borderColor: `${lane.color}66`, color: lane.color }}
              >
                {lane.name}
              </Badge>
              <span className="ml-2 text-muted-foreground">Runs on</span>
              <Badge variant="secondary" className="text-[10px]">
                {spec.tool}
              </Badge>
            </div>

            <Separator />

            <div className="px-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Stats</span>
                <Badge
                  variant="outline"
                  className="border-amber-400/40 bg-amber-400/10 text-[10px] uppercase tracking-wider text-amber-300"
                >
                  Example data
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {spec.metrics.map((metric) => (
                  <div key={metric.key} className="rounded-lg border border-border bg-black/30 p-2.5">
                    <div className="font-mono text-base font-semibold">
                      {stopped ? "off" : formatMetric(metrics[metric.key])}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{metric.label}</div>
                  </div>
                ))}
                {spec.hoursSaved !== undefined && (
                  <div className="rounded-lg border border-border bg-black/30 p-2.5">
                    <div className="font-mono text-base font-semibold text-emerald-300">
                      {stopped ? "0" : `~${spec.hoursSaved}`}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Hours saved per month</div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
              <div className="mb-2 text-xs font-medium text-muted-foreground">Recent log lines</div>
              <ScrollArea className="min-h-0 flex-1 rounded-lg border border-border bg-black/40">
                <div className="space-y-1 p-3 font-mono text-[10px] leading-relaxed">
                  {logs.map((line, i) => (
                    <div key={`${line.ts}-${i}`} className="flex gap-2">
                      <span className="shrink-0 text-muted-foreground/60">
                        {formatClock(line.ts)}
                      </span>
                      <span
                        className={cn(
                          line.level === "error" && "text-red-400",
                          line.level === "warn" && "text-amber-400",
                          line.level === "info" && "text-foreground/75",
                        )}
                      >
                        {line.message}
                      </span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </ScrollArea>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
