import { ReactFlowProvider } from "@xyflow/react";
import { ActivityLog } from "@/components/activity-log";
import { InspectPanel } from "@/components/inspect-panel";
import { TopBar } from "@/components/top-bar";
import { WorkflowCanvas } from "@/components/topology/workflow-canvas";

export default function App() {
  return (
    <ReactFlowProvider>
      <div className="flex h-dvh flex-col bg-background text-foreground">
        <TopBar />
        <main className="flex min-h-0 flex-1">
          <div className="relative min-w-0 flex-1 bg-[#070b14]">
            <WorkflowCanvas />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 55%, rgba(2, 4, 10, 0.55) 100%)",
              }}
            />
          </div>
          <ActivityLog />
        </main>
        <InspectPanel />
      </div>
    </ReactFlowProvider>
  );
}
