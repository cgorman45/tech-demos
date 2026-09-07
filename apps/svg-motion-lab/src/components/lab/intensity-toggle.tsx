"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIntensity, type IntensityLevel } from "@/lib/intensity";

const LEVELS: { value: IntensityLevel; label: string }[] = [
  { value: "off", label: "Off" },
  { value: "subtle", label: "Subtle" },
  { value: "playful", label: "Playful" },
];

export function IntensityToggle() {
  const { level, setLevel } = useIntensity();
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Intensity</span>
      <ToggleGroup
        type="single"
        variant="outline"
        spacing={0}
        value={level}
        onValueChange={(value) => {
          if (value) setLevel(value as IntensityLevel);
        }}
      >
        {LEVELS.map(({ value, label }) => (
          <ToggleGroupItem key={value} value={value} aria-label={`${label} intensity`}>
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
