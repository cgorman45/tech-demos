import { Maximize, Pencil, Play, RotateCcw, Undo2, Workflow } from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FIT_VIEW_OPTIONS } from "@/components/topology/layout";
import { formatMetric } from "@/lib/mock";
import { useWorkflowStore } from "@/store/workflow-store";

export function TopBar() {
  const runStatus = useWorkflowStore((s) => s.run.status);
  const hoursSavedTotal = useWorkflowStore((s) => s.hoursSavedTotal);
  const runLead = useWorkflowStore((s) => s.runLead);
  const resetScenario = useWorkflowStore((s) => s.resetScenario);
  const editMode = useWorkflowStore((s) => s.editMode);
  const toggleEditMode = useWorkflowStore((s) => s.toggleEditMode);
  const resetLayout = useWorkflowStore((s) => s.resetLayout);
  const { fitView } = useReactFlow();

  const running = runStatus === "running";

  return (
    <header className="flex items-center gap-4 border-b border-border bg-[#0a101d] px-5 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
          <Workflow className="size-4.5" />
        </div>
        <div>
          <h1 className="text-sm font-semibold leading-tight">Colton's BD Workflow</h1>
          <p className="text-[11px] leading-tight text-muted-foreground">
            How AI moves a lead from first signal to submitted proposal
          </p>
        </div>
      </div>

      <Badge
        variant="outline"
        className="border-amber-400/40 bg-amber-400/10 text-[10px] uppercase tracking-wider text-amber-300"
      >
        Example data
      </Badge>

      <div className="ml-auto hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
        <span>Hours saved this month</span>
        <span className="font-mono text-sm font-semibold text-emerald-300">
          {formatMetric(hoursSavedTotal)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={runLead} disabled={running}>
          <Play data-icon="inline-start" />
          {running ? "Running" : "Run a lead"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => fitView(FIT_VIEW_OPTIONS)}>
          <Maximize data-icon="inline-start" /> Fit view
        </Button>
        <Button size="sm" variant="outline" onClick={resetScenario}>
          <RotateCcw data-icon="inline-start" /> Reset scenario
        </Button>
        <Button
          size="sm"
          variant={editMode ? "default" : "outline"}
          aria-pressed={editMode}
          onClick={toggleEditMode}
        >
          <Pencil data-icon="inline-start" /> Edit mode
        </Button>
        {editMode && (
          <Button size="sm" variant="outline" onClick={resetLayout}>
            <Undo2 data-icon="inline-start" /> Reset layout
          </Button>
        )}
      </div>
    </header>
  );
}
