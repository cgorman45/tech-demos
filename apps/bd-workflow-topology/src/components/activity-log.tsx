import { useEffect, useRef, useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { cn } from "cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LANE_BY_ID, NODE_BY_ID } from "@/data/workflow";
import { formatClock } from "@/lib/mock";
import { useWorkflowStore, type ActivityEntry } from "@/store/workflow-store";

function EntryChip({ entry }: { entry: ActivityEntry }) {
  if (entry.nodeId === null) {
    const tone =
      entry.kind === "done"
        ? "border-emerald-400/50 text-emerald-300"
        : entry.kind === "stall"
          ? "border-red-400/50 text-red-300"
          : "border-zinc-500/50 text-zinc-300";
    return (
      <Badge variant="outline" className={cn("shrink-0 text-[10px]", tone)}>
        {entry.title}
      </Badge>
    );
  }
  const lane = LANE_BY_ID[NODE_BY_ID[entry.nodeId].lane];
  return (
    <Badge
      variant="outline"
      className="shrink-0 text-[10px]"
      style={{ borderColor: `${lane.color}66`, color: lane.color }}
    >
      {entry.title}
    </Badge>
  );
}

function EntryBody({ entry }: { entry: ActivityEntry }) {
  if (entry.lines.length === 1) {
    return <p className="text-xs leading-relaxed text-foreground/85">{entry.lines[0]}</p>;
  }
  const isEmail = entry.nodeId === "emails" && entry.kind === "run";
  if (isEmail) {
    return (
      <blockquote className="space-y-0.5 border-l-2 border-violet-400/50 pl-2.5 text-xs italic leading-relaxed text-foreground/80">
        {entry.lines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </blockquote>
    );
  }
  return (
    <div className="text-xs leading-relaxed text-foreground/85">
      <p>{entry.lines[0]}</p>
      <ul className="mt-1 space-y-0.5 border-l-2 border-border pl-2.5 text-foreground/70">
        {entry.lines.slice(1).map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

export function ActivityLog() {
  const activity = useWorkflowStore((s) => s.activity);
  const runStatus = useWorkflowStore((s) => s.run.status);
  const [open, setOpen] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activity.length]);

  if (!open) {
    return (
      <div className="flex items-start border-l border-border bg-[#0a101d] p-2">
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label="Open activity log"
          onClick={() => setOpen(true)}
        >
          <PanelRightOpen />
        </Button>
      </div>
    );
  }

  return (
    <aside className="flex w-85 shrink-0 flex-col border-l border-border bg-[#0a101d]">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Activity log
        </span>
        {runStatus === "stalled" && (
          <Badge variant="outline" className="border-red-400/50 text-[10px] text-red-300">
            stalled
          </Badge>
        )}
        {runStatus === "done" && (
          <Badge variant="outline" className="border-emerald-400/50 text-[10px] text-emerald-300">
            done
          </Badge>
        )}
        <Button
          size="icon-sm"
          variant="ghost"
          className="ml-auto"
          aria-label="Collapse activity log"
          onClick={() => setOpen(false)}
        >
          <PanelRightClose />
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-3 p-3">
          {activity.map((entry) => (
            <div key={entry.id}>
              <div className="mb-1 flex items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground/70">
                  {formatClock(entry.ts)}
                </span>
                <EntryChip entry={entry} />
              </div>
              <EntryBody entry={entry} />
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </ScrollArea>
    </aside>
  );
}
