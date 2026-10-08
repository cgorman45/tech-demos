import { useEffect, useMemo, useRef, useState } from "react";
import { Gauge, Pause, Play, RotateCcw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BLUE, DraftingScene, GREEN, RED } from "@/components/drafting/drafting-scene";
import {
  activeStageIndex,
  DRAFTING_STAGES,
  DRAFTING_TOTAL,
} from "@/components/drafting/timeline";
import { useWorkflowStore } from "@/store/workflow-store";

const SPEEDS = [0.5, 1, 2] as const;

/**
 * The #drafting deep link can carry a clock value, e.g. #drafting=12 opens
 * the overlay paused at 12 seconds into the animation.
 */
function initialClock(reducedMotion: boolean): { t: number; paused: boolean } {
  if (typeof window !== "undefined") {
    const match = /^#drafting=(\d+(?:\.\d+)?)$/.exec(window.location.hash);
    if (match) {
      return { t: Math.min(DRAFTING_TOTAL, Number(match[1])), paused: true };
    }
  }
  return { t: reducedMotion ? DRAFTING_TOTAL : 0, paused: false };
}

export function DraftingOverlay() {
  const open = useWorkflowStore((s) => s.draftingOpen);
  if (!open) return null;
  return <DraftingOverlayContent />;
}

function DraftingOverlayContent() {
  const closeDrafting = useWorkflowStore((s) => s.closeDrafting);

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const initial = useMemo(() => initialClock(reducedMotion), [reducedMotion]);
  const tRef = useRef(initial.t);
  const [t, setT] = useState(initial.t);
  const pausedRef = useRef(initial.paused);
  const [paused, setPaused] = useState(initial.paused);
  const speedRef = useRef(1);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!pausedRef.current && tRef.current < DRAFTING_TOTAL) {
        tRef.current = Math.min(DRAFTING_TOTAL, tRef.current + dt * speedRef.current);
        setT(tRef.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrafting();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeDrafting]);

  const setClock = (value: number) => {
    tRef.current = value;
    setT(value);
  };

  const togglePause = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
  };

  const restart = () => {
    setClock(reducedMotion ? DRAFTING_TOTAL : 0);
    pausedRef.current = false;
    setPaused(false);
  };

  const pickSpeed = (value: number) => {
    speedRef.current = value;
    setSpeed(value);
  };

  const jumpTo = (index: number) => {
    const stage = DRAFTING_STAGES[index];
    // With reduced motion the clock never advances, so jump to the end of
    // the stage to show its finished state statically.
    setClock(reducedMotion ? stage.end : stage.start);
  };

  const stageIndex = activeStageIndex(t);
  const finished = t >= DRAFTING_TOTAL;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#070b14]"
      role="dialog"
      aria-modal="true"
      aria-label="How a proposal gets drafted"
      data-testid="drafting-overlay"
    >
      <header className="flex items-center gap-3 border-b border-border bg-[#0a101d] px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold leading-tight">How a proposal gets drafted</h2>
          <p className="text-[11px] leading-tight text-muted-foreground">
            Inside the Proposal drafting step, from intake to submitted
          </p>
        </div>
        <Badge
          variant="outline"
          className="border-amber-400/40 bg-amber-400/10 text-[10px] uppercase tracking-wider text-amber-300"
        >
          Example data
        </Badge>
        <Button
          size="icon-sm"
          variant="ghost"
          className="ml-auto"
          onClick={closeDrafting}
          aria-label="Close drafting animation"
        >
          <X />
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-2 px-5 py-2.5">
        {!reducedMotion && (
          <>
            <Button size="sm" variant="outline" onClick={togglePause} disabled={finished}>
              {paused ? <Play data-icon="inline-start" /> : <Pause data-icon="inline-start" />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button size="sm" variant="outline" onClick={restart}>
              <RotateCcw data-icon="inline-start" /> Restart
            </Button>
            <span className="ml-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Gauge className="size-3.5" /> Speed
            </span>
            <div className="flex items-center gap-1">
              {SPEEDS.map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={speed === value ? "default" : "outline"}
                  aria-pressed={speed === value}
                  onClick={() => pickSpeed(value)}
                >
                  {value}x
                </Button>
              ))}
            </div>
          </>
        )}
        {reducedMotion && (
          <span className="text-[11px] text-muted-foreground">
            Reduced motion is on, showing the finished flow. Use the steps below to view each stage.
          </span>
        )}

        <div className="ml-auto flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded-full" style={{ background: BLUE }} />
            in progress
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-0 w-5 border-t-2 border-dashed"
              style={{ borderColor: RED }}
            />
            sent back
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded-full" style={{ background: GREEN }} />
            approved
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-4">
        <DraftingScene t={t} />
      </div>

      <nav
        aria-label="Drafting stages"
        className="flex items-center justify-center gap-2 border-t border-border bg-[#0a101d] px-4 py-3"
      >
        {DRAFTING_STAGES.map((stage, index) => {
          const active = index === stageIndex;
          const done = t >= stage.end;
          return (
            <button
              key={stage.id}
              type="button"
              onClick={() => jumpTo(index)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                active
                  ? "border-indigo-400/60 bg-indigo-400/15 text-indigo-200"
                  : done
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                    : "border-border bg-transparent text-muted-foreground hover:border-indigo-400/40 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
                  active
                    ? "bg-indigo-400/30 text-indigo-100"
                    : done
                      ? "bg-emerald-400/20 text-emerald-200"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {index + 1}
              </span>
              {stage.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
