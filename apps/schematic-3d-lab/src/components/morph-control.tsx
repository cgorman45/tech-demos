"use client";

import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type MorphControlProps = {
  /** 0 = flat 2D schematic, 1 = fully extruded 3D view */
  value: number;
  onChange: (value: number) => void;
  className?: string;
};

/**
 * Scrubber that morphs a schematic between its 2D and 3D states.
 * Drop it next to any scene that accepts a 0..1 morph value.
 */
export function MorphControl({ value, onChange, className }: MorphControlProps) {
  return (
    <div className={cn("flex w-full items-center gap-4", className)}>
      <span
        className={cn(
          "font-mono text-xs tracking-widest transition-opacity",
          value < 0.5 ? "opacity-100" : "opacity-40",
        )}
      >
        2D
      </span>
      <Slider
        value={[Math.round(value * 100)]}
        onValueChange={([v]) => onChange(v / 100)}
        max={100}
        step={1}
        aria-label="Morph between 2D schematic and 3D view"
      />
      <span
        className={cn(
          "font-mono text-xs tracking-widest transition-opacity",
          value >= 0.5 ? "opacity-100" : "opacity-40",
        )}
      >
        3D
      </span>
    </div>
  );
}
