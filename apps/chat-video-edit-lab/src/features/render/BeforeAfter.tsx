import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { buildPlan, type Plan } from "@/features/plan/buildPlan";
import type { FrameSource } from "@/features/media/frameSource";
import { PreviewPane, usePlayback } from "./Preview";
import { TimelineStrip } from "./TimelineStrip";

interface BeforeAfterProps {
  source: FrameSource;
  plan: Plan;
}

/**
 * Two preview modes: side by side (original left, edited right) and a single
 * A/B view where holding the B key (or the button) shows the original frame
 * for the same output time.
 */
export function BeforeAfter({ source, plan }: BeforeAfterProps) {
  const [mode, setMode] = useState<"side" | "ab">("side");
  const [showOriginal, setShowOriginal] = useState(false);

  const identityPlan = useMemo(() => buildPlan(source.duration, []), [source.duration]);
  const editedPlayback = usePlayback(plan.duration);
  const originalPlayback = usePlayback(identityPlan.duration);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "b" && !isTyping(e)) setShowOriginal(true);
    };
    const up = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "b") setShowOriginal(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const abRaw = mode === "ab" && showOriginal;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant={mode === "side" ? "default" : "outline"}
          onClick={() => setMode("side")}
        >
          Side by side
        </Button>
        <Button
          size="sm"
          variant={mode === "ab" ? "default" : "outline"}
          onClick={() => setMode("ab")}
        >
          A/B switch
        </Button>
        {mode === "ab" && (
          <Button
            size="sm"
            variant="secondary"
            onPointerDown={() => setShowOriginal(true)}
            onPointerUp={() => setShowOriginal(false)}
            onPointerLeave={() => setShowOriginal(false)}
          >
            {showOriginal ? "Showing original" : "Hold for original (B)"}
          </Button>
        )}
      </div>

      {mode === "side" ? (
        <div className="flex min-h-0 flex-1 gap-3">
          <PreviewPane
            label="Original"
            source={source}
            plan={identityPlan}
            playback={originalPlayback}
            raw
          />
          <PreviewPane
            label="Edited"
            source={source}
            plan={plan}
            playback={editedPlayback}
            audible
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <PreviewPane
            label={abRaw ? "Original (B held)" : "Edited"}
            source={source}
            plan={plan}
            playback={editedPlayback}
            raw={abRaw}
            audible
          />
        </div>
      )}

      <TimelineStrip plan={plan} time={editedPlayback.time} onSeek={editedPlayback.seek} />
    </div>
  );
}

function isTyping(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}
