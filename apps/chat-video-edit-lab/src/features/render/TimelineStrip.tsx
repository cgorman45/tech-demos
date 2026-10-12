import { useCallback, useRef } from "react";
import type { Plan, Segment } from "@/features/plan/buildPlan";
import { segmentOutDur } from "@/features/plan/buildPlan";
import { fmt } from "@/features/plan/steps";

interface PositionedSegment {
  seg: Segment;
  dur: number;
  left: number;
  width: number;
}

function layoutSegments(plan: Plan, duration: number): PositionedSegment[] {
  const out: PositionedSegment[] = [];
  let acc = 0;
  for (const seg of plan.segments) {
    const dur = segmentOutDur(seg);
    out.push({ seg, dur, left: (acc / duration) * 100, width: (dur / duration) * 100 });
    acc += dur;
  }
  return out;
}

interface TimelineStripProps {
  plan: Plan;
  time: number;
  onSeek: (t: number) => void;
}

function rateColor(rate: number): string {
  if (rate > 1.01) return "#f59e0b";
  if (rate < 0.99) return "#38bdf8";
  return "#4ade80";
}

/** Output segments colored by speed, title cards, caption spans, a playhead. */
export function TimelineStrip({ plan, time, onSeek }: TimelineStripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const duration = Math.max(plan.duration, 0.001);

  const seekFromEvent = useCallback(
    (clientX: number) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      onSeek(frac * duration);
    },
    [duration, onSeek],
  );

  const segs = layoutSegments(plan, duration).map(({ seg, dur, left, width }, i) => {
    return (
      <div
        key={i}
        className="absolute top-0 h-full border-r border-black/50 last:border-r-0"
        style={{
          left: `${left}%`,
          width: `${width}%`,
          background: seg.kind === "title" ? "#a78bfa" : rateColor(seg.rate),
        }}
        title={
          seg.kind === "title"
            ? `Title card: ${seg.text} (${fmt(dur)})`
            : `${fmt(seg.srcFrom)} to ${fmt(seg.srcTo)} at ${seg.rate}x`
        }
      >
        {seg.kind === "title" && width > 4 && (
          <span className="absolute inset-0 flex items-center justify-center overflow-hidden px-1 text-[9px] font-semibold text-black/80">
            Title
          </span>
        )}
      </div>
    );
  });

  return (
    <div className="flex flex-col gap-1">
      <div
        ref={ref}
        className="relative h-9 cursor-pointer select-none overflow-hidden rounded-md bg-muted"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          seekFromEvent(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) seekFromEvent(e.clientX);
        }}
        role="slider"
        aria-label="Timeline"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={time}
        tabIndex={0}
      >
        {segs}
        {plan.overlays.map((o, i) => (
          <div
            key={`o${i}`}
            className="absolute bottom-0.5 h-1.5 rounded-full"
            style={{
              left: `${(o.from / duration) * 100}%`,
              width: `${Math.max(((o.to - o.from) / duration) * 100, 0.5)}%`,
              background: o.kind === "caption" ? "#f0f0f0" : "#fb7185",
            }}
            title={`${o.kind === "caption" ? "Caption" : "Text"}: ${o.text}`}
          />
        ))}
        <div
          className="pointer-events-none absolute top-0 h-full w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.9)]"
          style={{ left: `${(Math.min(time, duration) / duration) * 100}%` }}
        />
      </div>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-sm" style={{ background: "#4ade80" }} /> 1x
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-sm" style={{ background: "#f59e0b" }} /> faster
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-sm" style={{ background: "#38bdf8" }} /> slower
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-sm" style={{ background: "#a78bfa" }} /> title card
        </span>
        <span className="flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-full" style={{ background: "#f0f0f0" }} /> captions
        </span>
        <span className="ml-auto font-mono">{fmt(plan.duration)} total</span>
      </div>
    </div>
  );
}
