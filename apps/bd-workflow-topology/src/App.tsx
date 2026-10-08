import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { ActivityLog } from "@/components/activity-log";
import { DraftingOverlay } from "@/components/drafting/drafting-overlay";
import { InspectPanel } from "@/components/inspect-panel";
import { TopBar } from "@/components/top-bar";
import { WorkflowCanvas } from "@/components/topology/workflow-canvas";
import { useWorkflowStore } from "@/store/workflow-store";

export default function App() {
  // Deep link straight into the drafting animation. #drafting plays it,
  // #drafting=12 opens it paused at 12 seconds.
  useEffect(() => {
    if (window.location.hash.startsWith("#drafting")) {
      useWorkflowStore.getState().openDrafting();
    }
  }, []);

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
        <DraftingOverlay />
      </div>
    </ReactFlowProvider>
  );
}
