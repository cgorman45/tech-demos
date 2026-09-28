import { useEffect, useRef, useState } from "react";
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
import { SERVICE_BY_ID } from "@/data/topology";
import { formatUptime } from "@/lib/mock";
import { STATUS_META } from "@/lib/status";
import { useTopologyStore } from "@/store/topology-store";

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);
  return now;
}

export function InspectPanel() {
  const selectedId = useTopologyStore((s) => s.selectedId);
  const select = useTopologyStore((s) => s.select);
  const status = useTopologyStore((s) => (s.selectedId ? s.statuses[s.selectedId] : null));
  const runtime = useTopologyStore((s) => (s.selectedId ? s.runtime[s.selectedId] : null));
  const restartService = useTopologyStore((s) => s.restartService);
  const stopService = useTopologyStore((s) => s.stopService);
  const startService = useTopologyStore((s) => s.startService);

  const now = useNow(selectedId !== null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const logCount = runtime?.logs.length ?? 0;
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [logCount, selectedId]);

  const spec = selectedId ? SERVICE_BY_ID[selectedId] : null;
  const meta = status ? STATUS_META[status] : null;
  const stopped = status === "stopped";
  const restarting = status === "restarting";

  return (
    <Sheet open={selectedId !== null} onOpenChange={(open) => !open && select(null)}>
      <SheetContent side="right" className="w-96 sm:max-w-96">
        {spec && runtime && meta && status && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2.5 font-mono">
                {spec.name}
                <Badge variant="outline" className={cn("gap-1.5 font-sans", meta.text)}>
                  <span className={cn("size-1.5 rounded-full", meta.dot)} />
                  {meta.label}
                </Badge>
              </SheetTitle>
              <SheetDescription>
                {spec.kind} service · mock container
              </SheetDescription>
            </SheetHeader>

            <div className="flex gap-2 px-4">
              {stopped ? (
                <Button size="sm" className="flex-1" onClick={() => startService(spec.id)}>
                  <Play data-icon="inline-start" /> Start
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    disabled={restarting}
                    onClick={() => restartService(spec.id)}
                  >
                    <RotateCw
                      data-icon="inline-start"
                      className={cn(restarting && "animate-spin")}
                    />
                    {restarting ? "Restarting…" : "Restart"}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => stopService(spec.id)}
                  >
                    <Square data-icon="inline-start" /> Stop
                  </Button>
                </>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-4 text-xs">
              <div className="text-muted-foreground">Image</div>
              <div className="truncate text-right font-mono" title={spec.image}>
                {spec.image}
              </div>
              <div className="text-muted-foreground">Port</div>
              <div className="text-right font-mono">{spec.port}</div>
              <div className="text-muted-foreground">Uptime</div>
              <div className="text-right font-mono">{formatUptime(runtime.startedAt, now)}</div>
              <div className="text-muted-foreground">CPU</div>
              <div className="text-right font-mono">
                {stopped ? "—" : `${runtime.cpu.toFixed(1)}%`}
              </div>
              <div className="text-muted-foreground">Memory</div>
              <div className="text-right font-mono">
                {stopped ? "—" : `${runtime.mem.toFixed(0)} MB`}
              </div>
            </div>

            <Separator />

            <div className="px-4">
              <div className="mb-2 text-xs font-medium text-muted-foreground">
                Environment ({spec.env.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {spec.env.map((name) => (
                  <Badge key={name} variant="secondary" className="font-mono text-[10px]">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
              <div className="mb-2 text-xs font-medium text-muted-foreground">Recent logs</div>
              <ScrollArea className="min-h-0 flex-1 rounded-lg border border-border bg-black/40">
                <div className="space-y-1 p-3 font-mono text-[10px] leading-relaxed">
                  {runtime.logs.map((line, i) => (
                    <div key={`${line.ts}-${i}`} className="flex gap-2">
                      <span className="shrink-0 text-muted-foreground/60">
                        {new Date(line.ts).toLocaleTimeString([], { hour12: false })}
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
