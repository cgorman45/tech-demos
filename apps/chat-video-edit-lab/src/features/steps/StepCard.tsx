import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { CaptionSegment, Corner, RangeSpec, Step } from "@/features/plan/steps";
import { STEP_ICONS, summarizeStep } from "@/features/plan/steps";
import { useProjectStore } from "@/store/useProjectStore";

interface StepCardProps {
  step: Step;
}

function NumField({
  label,
  value,
  onChange,
  step = 0.5,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <label className="flex items-center gap-1 text-xs text-muted-foreground">
      {label}
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
        className="h-7 w-16 px-1.5 text-xs"
      />
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  wide,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  wide?: boolean;
}) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-1 text-xs text-muted-foreground">
      {label}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-7 px-1.5 text-xs ${wide ? "min-w-0 flex-1" : "w-28"}`}
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="flex items-center gap-1 text-xs text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-7 rounded-md border border-input bg-transparent px-1 text-xs text-foreground"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-background">
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function rangeKindOf(r: RangeSpec): "all" | "first" | "middle" | "last" | "span" {
  if (r.kind === "all") return "all";
  if (r.kind === "third") return r.which;
  return "span";
}

function StepParams({ step }: { step: Step }) {
  const updateStep = useProjectStore((s) => s.updateStep);
  const patch = (p: Partial<Step>) => updateStep(step.id, p);

  switch (step.type) {
    case "trim":
      return step.mode === "keep" ? (
        <>
          <NumField label="from" value={step.from} onChange={(v) => patch({ from: v })} />
          <NumField label="to" value={step.to} onChange={(v) => patch({ to: v })} />
        </>
      ) : (
        <>
          <SelectField
            label="edge"
            value={step.mode}
            options={["start", "end"] as const}
            onChange={(v) => patch({ mode: v })}
          />
          <NumField label="seconds" value={step.seconds} onChange={(v) => patch({ seconds: v })} />
        </>
      );
    case "cutRange":
      return (
        <>
          <NumField label="from" value={step.from} onChange={(v) => patch({ from: v })} />
          <NumField label="to" value={step.to} onChange={(v) => patch({ to: v })} />
        </>
      );
    case "speed": {
      const kind = rangeKindOf(step.range);
      return (
        <>
          <NumField
            label="factor"
            value={step.factor}
            step={0.25}
            min={0.25}
            onChange={(v) => patch({ factor: Math.max(0.1, v) })}
          />
          <SelectField
            label="range"
            value={kind}
            options={["all", "first", "middle", "last", "span"] as const}
            onChange={(v) => {
              if (v === "all") patch({ range: { kind: "all" } });
              else if (v === "span") patch({ range: { kind: "span", from: 0, to: 5 } });
              else patch({ range: { kind: "third", which: v } });
            }}
          />
          {step.range.kind === "span" && (
            <>
              <NumField
                label="from"
                value={step.range.from}
                onChange={(v) => patch({ range: { kind: "span", from: v, to: (step.range as { to: number }).to } })}
              />
              <NumField
                label="to"
                value={step.range.to}
                onChange={(v) => patch({ range: { kind: "span", from: (step.range as { from: number }).from, to: v } })}
              />
            </>
          )}
        </>
      );
    }
    case "titleCard":
      return (
        <>
          <TextField label="text" value={step.text} onChange={(v) => patch({ text: v })} wide />
          <NumField label="seconds" value={step.seconds} onChange={(v) => patch({ seconds: Math.max(0.5, v) })} />
          <SelectField
            label="at"
            value={step.position}
            options={["start", "end"] as const}
            onChange={(v) => patch({ position: v })}
          />
        </>
      );
    case "captions":
      return (
        <div className="flex w-full flex-col gap-1">
          {step.segments.map((seg, i) => (
            <div key={i} className="flex items-center gap-1">
              <NumField
                label="from"
                value={seg.from}
                onChange={(v) => {
                  const segments: CaptionSegment[] = step.segments.map((s, j) =>
                    j === i ? { ...s, from: v } : s,
                  );
                  patch({ segments });
                }}
              />
              <NumField
                label="to"
                value={seg.to}
                onChange={(v) => {
                  const segments: CaptionSegment[] = step.segments.map((s, j) =>
                    j === i ? { ...s, to: v } : s,
                  );
                  patch({ segments });
                }}
              />
              <Input
                value={seg.text}
                onChange={(e) => {
                  const segments: CaptionSegment[] = step.segments.map((s, j) =>
                    j === i ? { ...s, text: e.target.value } : s,
                  );
                  patch({ segments });
                }}
                className="h-7 min-w-0 flex-1 px-1.5 text-xs"
              />
            </div>
          ))}
          <Button
            size="sm"
            variant="ghost"
            className="h-6 self-start px-1.5 text-xs"
            onClick={() => {
              const last = step.segments[step.segments.length - 1];
              const from = last ? last.to + 0.5 : 0;
              patch({ segments: [...step.segments, { from, to: from + 2.5, text: "New caption" }] });
            }}
          >
            + line
          </Button>
        </div>
      );
    case "textOverlay":
      return (
        <>
          <TextField label="text" value={step.text} onChange={(v) => patch({ text: v })} />
          <NumField label="from" value={step.from} onChange={(v) => patch({ from: v })} />
          <NumField label="to" value={Math.min(step.to, 9999)} onChange={(v) => patch({ to: v })} />
          <SelectField
            label="corner"
            value={step.corner}
            options={["top-left", "top-right", "bottom-left", "bottom-right"] as const satisfies readonly Corner[]}
            onChange={(v) => patch({ corner: v })}
          />
        </>
      );
    case "fade":
      return (
        <>
          <SelectField
            label="dir"
            value={step.direction}
            options={["in", "out"] as const}
            onChange={(v) => patch({ direction: v })}
          />
          <NumField label="seconds" value={step.seconds} onChange={(v) => patch({ seconds: Math.max(0.1, v) })} />
        </>
      );
    case "mute":
      return null;
    case "filter":
      return (
        <>
          <SelectField
            label="filter"
            value={step.filter}
            options={["grayscale", "brightness", "contrast"] as const}
            onChange={(v) => patch({ filter: v, amount: v === "grayscale" ? 1 : 1.15 })}
          />
          {step.filter !== "grayscale" && (
            <NumField
              label="amount"
              value={step.amount}
              step={0.05}
              onChange={(v) => patch({ amount: Math.max(0.1, v) })}
            />
          )}
        </>
      );
  }
}

export function StepCard({ step }: StepCardProps) {
  const toggleStep = useProjectStore((s) => s.toggleStep);
  const removeStep = useProjectStore((s) => s.removeStep);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-md border border-border bg-card p-2 ${isDragging ? "z-10 opacity-80 shadow-lg" : ""} ${step.enabled ? "" : "opacity-50"}`}
    >
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab touch-none rounded px-1 py-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          ⠿
        </button>
        <span aria-hidden>{STEP_ICONS[step.type]}</span>
        <span className="min-w-0 flex-1 truncate text-sm" title={summarizeStep(step)}>
          {summarizeStep(step)}
        </span>
        <Switch
          checked={step.enabled}
          onCheckedChange={() => toggleStep(step.id)}
          aria-label="Step on or off"
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={() => removeStep(step.id)}
          aria-label="Delete step"
        >
          ✕
        </Button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 pl-6">
        <StepParams step={step} />
      </div>
    </div>
  );
}
