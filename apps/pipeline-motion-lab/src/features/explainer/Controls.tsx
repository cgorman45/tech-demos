import { Maximize, Pause, Play, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  SCENE_COUNT,
  SCENE_DURATION,
  SPEEDS,
  sceneIndexAt,
} from "./timeline";
import { usePipelineStore } from "@/store/usePipelineStore";
import { cn } from "@/lib/utils";

interface ControlsProps {
  onPresent: () => void;
  onClose: () => void;
}

export function Controls({ onPresent, onClose }: ControlsProps) {
  const clock = usePipelineStore((state) => state.clock);
  const playing = usePipelineStore((state) => state.playing);
  const speed = usePipelineStore((state) => state.speed);
  const setPlaying = usePipelineStore((state) => state.setPlaying);
  const setSpeed = usePipelineStore((state) => state.setSpeed);
  const seekScene = usePipelineStore((state) => state.seekScene);
  const restart = usePipelineStore((state) => state.restart);

  const activeScene = sceneIndexAt(clock);

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setPlaying(!playing)}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause /> : <Play />}
        {playing ? "Pause" : "Play"}
      </Button>
      <Button size="sm" variant="outline" onClick={restart}>
        <RotateCcw />
        Restart
      </Button>

      <div className="flex items-center gap-1" role="group" aria-label="Speed">
        {SPEEDS.map((value) => (
          <Button
            key={value}
            size="sm"
            variant={speed === value ? "default" : "ghost"}
            className="px-2 tabular-nums"
            onClick={() => setSpeed(value)}
          >
            {value}x
          </Button>
        ))}
      </div>

      <div
        className="flex min-w-40 flex-1 items-center gap-1"
        role="group"
        aria-label="Scenes"
      >
        {Array.from({ length: SCENE_COUNT }, (_, index) => {
          const sceneFill = Math.min(
            1,
            Math.max(0, (clock - index * SCENE_DURATION) / SCENE_DURATION),
          );
          return (
            <button
              key={index}
              type="button"
              aria-label={`Scene ${index + 1}`}
              onClick={() => seekScene(index)}
              className={cn(
                "h-2 flex-1 overflow-hidden rounded-full bg-border/70 transition-colors",
                index === activeScene && "ring-1 ring-ring/60",
              )}
            >
              <span
                className="block h-full bg-sky-400"
                style={{ width: `${sceneFill * 100}%` }}
              />
            </button>
          );
        })}
      </div>

      <Button size="sm" variant="outline" onClick={onPresent}>
        <Maximize />
        Present
      </Button>
      <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close">
        <X />
        Close
      </Button>
    </div>
  );
}
