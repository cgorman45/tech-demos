import type { Corner, RangeSpec, Step } from "./steps";

/**
 * The source is never modified. Steps are applied in order to a working
 * timeline of segments. Ranges in a step (including words like "middle")
 * are resolved against the output timeline as it stands after all previous
 * steps. Overlays are anchored to source time when applied, so a later trim
 * or cut moves them with the footage instead of leaving them at a stale
 * output time.
 */

export interface VideoSegment {
  kind: "video";
  srcFrom: number;
  srcTo: number;
  rate: number;
}

export interface TitleSegment {
  kind: "title";
  stepId: string;
  text: string;
  dur: number;
}

export type Segment = VideoSegment | TitleSegment;

export function segmentOutDur(seg: Segment): number {
  return seg.kind === "video" ? (seg.srcTo - seg.srcFrom) / seg.rate : seg.dur;
}

type Anchor =
  | { kind: "src"; time: number }
  | { kind: "title"; stepId: string; offset: number };

interface AnchoredOverlay {
  kind: "caption" | "text";
  text: string;
  corner: Corner;
  from: Anchor;
  to: Anchor;
}

export interface ResolvedOverlay {
  kind: "caption" | "text";
  text: string;
  corner: Corner;
  from: number;
  to: number;
}

export interface Plan {
  segments: Segment[];
  overlays: ResolvedOverlay[];
  fadeIn: number;
  fadeOut: number;
  muted: boolean;
  filter: string;
  duration: number;
}

function timelineDuration(segments: Segment[]): number {
  return segments.reduce((acc, s) => acc + segmentOutDur(s), 0);
}

/** Split segments so that an output-time boundary falls exactly between segments. */
function splitAt(segments: Segment[], t: number): Segment[] {
  const out: Segment[] = [];
  let acc = 0;
  for (const seg of segments) {
    const dur = segmentOutDur(seg);
    if (t > acc && t < acc + dur - 1e-9) {
      const offset = t - acc;
      if (seg.kind === "video") {
        const srcSplit = seg.srcFrom + offset * seg.rate;
        out.push({ ...seg, srcTo: srcSplit });
        out.push({ ...seg, srcFrom: srcSplit });
      } else {
        out.push({ ...seg, dur: offset });
        out.push({ ...seg, dur: seg.dur - offset });
      }
    } else {
      out.push(seg);
    }
    acc += dur;
  }
  return out;
}

function removeOutputRange(segments: Segment[], from: number, to: number): Segment[] {
  const total = timelineDuration(segments);
  const a = Math.max(0, Math.min(from, total));
  const b = Math.max(a, Math.min(to, total));
  if (b - a < 1e-9) return segments;
  let segs = splitAt(splitAt(segments, a), b);
  const out: Segment[] = [];
  let acc = 0;
  for (const seg of segs) {
    const dur = segmentOutDur(seg);
    const mid = acc + dur / 2;
    if (!(mid > a && mid < b)) out.push(seg);
    acc += dur;
  }
  return out;
}

function applySpeed(segments: Segment[], from: number, to: number, factor: number): Segment[] {
  if (factor <= 0) return segments;
  let segs = splitAt(splitAt(segments, from), to);
  const out: Segment[] = [];
  let acc = 0;
  for (const seg of segs) {
    const dur = segmentOutDur(seg);
    const mid = acc + dur / 2;
    if (mid > from && mid < to) {
      if (seg.kind === "video") out.push({ ...seg, rate: seg.rate * factor });
      else out.push({ ...seg, dur: seg.dur / factor });
    } else {
      out.push(seg);
    }
    acc += dur;
  }
  return out;
}

function resolveRange(range: RangeSpec, duration: number): [number, number] {
  if (range.kind === "all") return [0, duration];
  if (range.kind === "third") {
    const third = duration / 3;
    if (range.which === "first") return [0, third];
    if (range.which === "middle") return [third, 2 * third];
    return [2 * third, duration];
  }
  return [Math.max(0, range.from), Math.min(duration, range.to)];
}

/** Map an output time on the given timeline to an anchor. */
function anchorAt(segments: Segment[], t: number): Anchor {
  let acc = 0;
  for (const seg of segments) {
    const dur = segmentOutDur(seg);
    if (t <= acc + dur || seg === segments[segments.length - 1]) {
      const offset = Math.max(0, Math.min(t - acc, dur));
      if (seg.kind === "video") return { kind: "src", time: seg.srcFrom + offset * seg.rate };
      return { kind: "title", stepId: seg.stepId, offset };
    }
    acc += dur;
  }
  return { kind: "src", time: 0 };
}

/** Map an anchor back to an output time on the final timeline. Null when the footage was cut. */
function resolveAnchor(segments: Segment[], anchor: Anchor): number | null {
  let acc = 0;
  for (const seg of segments) {
    const dur = segmentOutDur(seg);
    if (anchor.kind === "src" && seg.kind === "video") {
      if (anchor.time >= seg.srcFrom - 1e-9 && anchor.time <= seg.srcTo + 1e-9) {
        return acc + (anchor.time - seg.srcFrom) / seg.rate;
      }
    } else if (anchor.kind === "title" && seg.kind === "title" && seg.stepId === anchor.stepId) {
      return acc + Math.min(anchor.offset, dur);
    }
    acc += dur;
  }
  return null;
}

export function buildPlan(sourceDuration: number, steps: Step[]): Plan {
  let segments: Segment[] =
    sourceDuration > 0 ? [{ kind: "video", srcFrom: 0, srcTo: sourceDuration, rate: 1 }] : [];
  const anchored: AnchoredOverlay[] = [];
  let fadeIn = 0;
  let fadeOut = 0;
  let muted = false;
  const filters: string[] = [];

  for (const step of steps) {
    if (!step.enabled) continue;
    const duration = timelineDuration(segments);
    switch (step.type) {
      case "trim": {
        if (step.mode === "start") segments = removeOutputRange(segments, 0, step.seconds);
        else if (step.mode === "end")
          segments = removeOutputRange(segments, duration - step.seconds, duration);
        else {
          segments = removeOutputRange(segments, step.to, duration);
          segments = removeOutputRange(segments, 0, step.from);
        }
        break;
      }
      case "cutRange":
        segments = removeOutputRange(segments, step.from, step.to);
        break;
      case "speed": {
        const [a, b] = resolveRange(step.range, duration);
        segments = applySpeed(segments, a, b, step.factor);
        break;
      }
      case "titleCard": {
        const seg: TitleSegment = {
          kind: "title",
          stepId: step.id,
          text: step.text,
          dur: step.seconds,
        };
        if (step.position === "start") segments = [seg, ...segments];
        else segments = [...segments, seg];
        break;
      }
      case "captions": {
        for (const c of step.segments) {
          if (!c.text.trim()) continue;
          anchored.push({
            kind: "caption",
            text: c.text,
            corner: "bottom-left",
            from: anchorAt(segments, c.from),
            to: anchorAt(segments, c.to),
          });
        }
        break;
      }
      case "textOverlay":
        anchored.push({
          kind: "text",
          text: step.text,
          corner: step.corner,
          from: anchorAt(segments, step.from),
          to: anchorAt(segments, Math.min(step.to, duration)),
        });
        break;
      case "fade":
        if (step.direction === "in") fadeIn = step.seconds;
        else fadeOut = step.seconds;
        break;
      case "mute":
        muted = true;
        break;
      case "filter":
        if (step.filter === "grayscale") filters.push("grayscale(1)");
        else if (step.filter === "brightness") filters.push(`brightness(${step.amount})`);
        else filters.push(`contrast(${step.amount})`);
        break;
    }
  }

  const overlays: ResolvedOverlay[] = [];
  for (const o of anchored) {
    const from = resolveAnchor(segments, o.from);
    const to = resolveAnchor(segments, o.to);
    if (from === null || to === null || to - from < 0.05) continue;
    overlays.push({ kind: o.kind, text: o.text, corner: o.corner, from, to });
  }

  return {
    segments,
    overlays,
    fadeIn,
    fadeOut,
    muted,
    filter: filters.join(" "),
    duration: timelineDuration(segments),
  };
}

export interface FrameLookup {
  kind: "video" | "title";
  srcTime: number;
  rate: number;
  title?: TitleSegment;
}

/** Map an output time on the final plan to a source time (or title segment). */
export function outputToSource(plan: Plan, t: number): FrameLookup {
  let acc = 0;
  const clamped = Math.max(0, Math.min(t, plan.duration));
  for (const seg of plan.segments) {
    const dur = segmentOutDur(seg);
    if (clamped <= acc + dur || seg === plan.segments[plan.segments.length - 1]) {
      const offset = Math.max(0, Math.min(clamped - acc, dur));
      if (seg.kind === "video") {
        return {
          kind: "video",
          srcTime: Math.min(seg.srcFrom + offset * seg.rate, seg.srcTo),
          rate: seg.rate,
        };
      }
      return { kind: "title", srcTime: 0, rate: 1, title: seg };
    }
    acc += dur;
  }
  return { kind: "video", srcTime: 0, rate: 1 };
}

/** Fade multiplier at output time t: 1 fully visible, 0 black. */
export function fadeAlpha(plan: Plan, t: number): number {
  let a = 1;
  if (plan.fadeIn > 0 && t < plan.fadeIn) a = Math.min(a, t / plan.fadeIn);
  if (plan.fadeOut > 0 && t > plan.duration - plan.fadeOut) {
    a = Math.min(a, Math.max(0, (plan.duration - t) / plan.fadeOut));
  }
  return Math.max(0, Math.min(1, a));
}
