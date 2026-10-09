import { useEffect, useRef } from "react";
import { todayIso } from "@/data/example-data";
import { EditableLabel } from "@/features/labels/EditableLabel";
import { labelText } from "@/features/labels/labels";
import {
  byOpenStage,
  totalOpenValue,
  upcoming,
  weightedOpenValue,
  winRate,
  openRows,
} from "@/features/metrics/metrics";
import { usePipelineStore } from "@/store/usePipelineStore";
import { Controls } from "./Controls";
import {
  SceneBars,
  SceneTitle,
  SceneTotal,
  SceneUpcoming,
  SceneWinRate,
  VIEW_H,
  VIEW_W,
} from "./scenes/scenes";
import {
  SCENE_COUNT,
  advance,
  isFinished,
  sceneIndexAt,
  sceneProgressAt,
} from "./timeline";
import type { LabelKey } from "@/features/labels/labels";

// Computed once at load: the title card date for this session.
const DATE_TEXT = new Date().toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/**
 * Full-screen overlay that plays the six scene explainer. A requestAnimationFrame
 * loop advances the single store clock; every scene renders purely from it.
 */
export function Explainer() {
  const open = usePipelineStore((state) => state.explainerOpen);
  const clock = usePipelineStore((state) => state.clock);
  const rows = usePipelineStore((state) => state.rows);
  const labels = usePipelineStore((state) => state.labels);
  const playing = usePipelineStore((state) => state.playing);
  const closeExplainer = usePipelineStore((state) => state.closeExplainer);

  const containerRef = useRef<HTMLDivElement>(null);

  // Animation loop: advance the clock by real elapsed time times speed.
  useEffect(() => {
    if (!open || !playing) return;
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = (now - last) / 1000;
      last = now;
      const state = usePipelineStore.getState();
      const next = advance(state.clock, elapsed, state.speed);
      state.setClock(next);
      if (isFinished(next)) {
        state.setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open, playing]);

  // Keyboard: Space toggles play, arrows step scenes, Esc closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }
      const state = usePipelineStore.getState();
      if (event.key === " ") {
        event.preventDefault();
        if (isFinished(state.clock)) {
          state.restart();
        } else {
          state.setPlaying(!state.playing);
        }
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        state.seekScene(
          Math.min(SCENE_COUNT - 1, sceneIndexAt(state.clock) + 1),
        );
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        state.seekScene(Math.max(0, sceneIndexAt(state.clock) - 1));
      } else if (event.key === "Escape" && !document.fullscreenElement) {
        state.closeExplainer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const index = sceneIndexAt(clock);
  const progress = sceneProgressAt(clock);
  const today = todayIso();

  const rate = winRate(rows);
  const total = totalOpenValue(rows);
  const weighted = weightedOpenValue(rows);
  const buckets = byOpenStage(rows);
  const openCount = openRows(rows).length;
  const dueItems = upcoming(rows, today);

  const sceneLabelKey = `scene.${index + 1}` as LabelKey;

  const present = () => {
    void containerRef.current?.requestFullscreen?.();
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
        <p className="text-sm font-medium">
          Scene {index + 1} of {SCENE_COUNT}:{" "}
          <EditableLabel labelKey={sceneLabelKey} />
        </p>
        <p className="text-xs text-muted-foreground">
          Space: play or pause · Arrows: step scenes · Esc: exit
        </p>
      </div>

      <div className="grid-backdrop flex min-h-0 flex-1 items-center justify-center p-4">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          className="max-h-full w-full max-w-5xl"
          role="img"
          aria-label={labelText(labels, sceneLabelKey)}
        >
          {index === 0 && (
            <SceneTitle
              progress={progress}
              title={labelText(labels, "scene.1")}
              dateText={DATE_TEXT}
            />
          )}
          {index === 1 && (
            <SceneTotal progress={progress} total={total} openCount={openCount} />
          )}
          {index === 2 && (
            <SceneBars
              progress={progress}
              buckets={buckets}
              weighted={false}
              totalLabel={labelText(labels, "scene.3")}
              totalValue={total}
            />
          )}
          {index === 3 && (
            <SceneBars
              progress={progress}
              buckets={buckets}
              weighted={true}
              totalLabel={labelText(labels, "scene.4")}
              totalValue={weighted}
              fromValue={total}
            />
          )}
          {index === 4 && <SceneWinRate progress={progress} rate={rate} />}
          {index === 5 && (
            <SceneUpcoming
              progress={progress}
              items={dueItems}
              totalDueCount={dueItems.length}
            />
          )}
        </svg>
      </div>

      <div className="border-t border-border/60 bg-card/60">
        <Controls onPresent={present} onClose={closeExplainer} />
      </div>
    </div>
  );
}
