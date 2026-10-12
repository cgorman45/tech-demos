export type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export type RangeSpec =
  | { kind: "all" }
  | { kind: "third"; which: "first" | "middle" | "last" }
  | { kind: "span"; from: number; to: number };

export interface CaptionSegment {
  from: number;
  to: number;
  text: string;
}

interface StepBase {
  id: string;
  enabled: boolean;
}

export interface TrimStep extends StepBase {
  type: "trim";
  mode: "start" | "end" | "keep";
  seconds: number;
  from: number;
  to: number;
}

export interface CutRangeStep extends StepBase {
  type: "cutRange";
  from: number;
  to: number;
}

export interface SpeedStep extends StepBase {
  type: "speed";
  factor: number;
  range: RangeSpec;
}

export interface TitleCardStep extends StepBase {
  type: "titleCard";
  text: string;
  seconds: number;
  position: "start" | "end";
}

export interface CaptionsStep extends StepBase {
  type: "captions";
  segments: CaptionSegment[];
}

export interface TextOverlayStep extends StepBase {
  type: "textOverlay";
  text: string;
  from: number;
  to: number;
  corner: Corner;
}

export interface FadeStep extends StepBase {
  type: "fade";
  direction: "in" | "out";
  seconds: number;
}

export interface MuteStep extends StepBase {
  type: "mute";
}

export interface FilterStep extends StepBase {
  type: "filter";
  filter: "grayscale" | "brightness" | "contrast";
  amount: number;
}

export type Step =
  | TrimStep
  | CutRangeStep
  | SpeedStep
  | TitleCardStep
  | CaptionsStep
  | TextOverlayStep
  | FadeStep
  | MuteStep
  | FilterStep;

export type StepType = Step["type"];

let counter = 0;
export function stepId(): string {
  counter += 1;
  return `s${Date.now().toString(36)}${counter.toString(36)}`;
}

export function summarizeStep(step: Step): string {
  switch (step.type) {
    case "trim":
      if (step.mode === "keep") return `Keep ${fmt(step.from)} to ${fmt(step.to)}`;
      return `Trim ${step.mode === "start" ? "first" : "last"} ${step.seconds.toFixed(1)}s`;
    case "cutRange":
      return `Cut ${fmt(step.from)} to ${fmt(step.to)}`;
    case "speed":
      return `Speed ${step.factor}x ${describeRange(step.range)}`;
    case "titleCard":
      return `Title card '${step.text}' (${step.seconds}s, ${step.position})`;
    case "captions":
      return `Captions (${step.segments.length} ${step.segments.length === 1 ? "line" : "lines"})`;
    case "textOverlay":
      return `Text '${step.text}' ${step.corner.replace("-", " ")}`;
    case "fade":
      return `Fade ${step.direction} ${step.seconds.toFixed(1)}s`;
    case "mute":
      return "Mute audio";
    case "filter":
      if (step.filter === "grayscale") return "Black and white";
      return `${step.filter === "brightness" ? "Brightness" : "Contrast"} ${Math.round(step.amount * 100)}%`;
  }
}

export function describeRange(range: RangeSpec): string {
  if (range.kind === "all") return "everywhere";
  if (range.kind === "third") return `${range.which} third`;
  return `${fmt(range.from)} to ${fmt(range.to)}`;
}

export function fmt(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  const restStr = rest.toFixed(1).replace(/\.0$/, "");
  return m > 0 ? `${m}:${rest < 10 ? "0" : ""}${restStr}` : `${restStr}s`;
}

export const STEP_ICONS: Record<StepType, string> = {
  trim: "✂️",
  cutRange: "🪓",
  speed: "⏩",
  titleCard: "🎬",
  captions: "💬",
  textOverlay: "🏷️",
  fade: "🌓",
  mute: "🔇",
  filter: "🎨",
};
