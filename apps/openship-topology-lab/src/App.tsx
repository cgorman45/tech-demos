import { useEffect } from "react";
import { RotateCcw, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopologyCanvas } from "@/components/topology/topology-canvas";
import { InspectPanel } from "@/components/inspect-panel";
import { SERVICES } from "@/data/topology";
import { useTopologyStore } from "@/store/topology-store";

const LEGEND = [
  { label: "running", className: "bg-emerald-400" },
  { label: "restarting", className: "bg-sky-400" },
  { label: "degraded", className: "bg-amber-400" },
  { label: "stopped", className: "bg-zinc-500" },
];

export default function App() {
  const tick = useTopologyStore((s) => s.tick);
  const resetScenario = useTopologyStore((s) => s.resetScenario);
  const statuses = useTopologyStore((s) => s.statuses);

  useEffect(() => {
    const interval = setInterval(tick, 1500);
    return () => clearInterval(interval);
  }, [tick]);

  const runningCount = SERVICES.filter((s) => statuses[s.id] === "running").length;

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex items-center gap-4 border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Ship className="size-4" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-tight">Openship Topology Lab</h1>
            <p className="text-[11px] leading-tight text-muted-foreground">
              mock service map · {runningCount}/{SERVICES.length} running
            </p>
          </div>
        </div>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          {LEGEND.map((item) => (
            <span
              key={item.label}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <span className={`size-2 rounded-full ${item.className}`} />
              {item.label}
            </span>
          ))}
        </div>

        <Button size="sm" variant="outline" onClick={resetScenario}>
          <RotateCcw data-icon="inline-start" /> Reset scenario
        </Button>
      </header>

      <main className="min-h-0 flex-1">
        <TopologyCanvas />
      </main>

      <InspectPanel />
    </div>
  );
}
