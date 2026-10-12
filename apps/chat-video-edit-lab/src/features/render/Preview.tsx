import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Plan } from "@/features/plan/buildPlan";
import { outputToSource } from "@/features/plan/buildPlan";
import type { FrameSource } from "@/features/media/frameSource";
import { createVideoElement } from "@/features/media/frameSource";
import { fmt } from "@/features/plan/steps";
import { drawPlanFrame } from "./drawFrame";

export interface Playback {
  time: number;
  playing: boolean;
  toggle: () => void;
  seek: (t: number) => void;
}

/** A self-advancing playback clock over a plan duration. */
export function usePlayback(duration: number): Playback {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const stateRef = useRef({ time: 0, playing: false, duration });

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const s = stateRef.current;
      if (s.playing) {
        let next = s.time + dt;
        if (next >= s.duration) {
          next = s.duration;
          s.playing = false;
          setPlaying(false);
        }
        s.time = next;
        setTime(next);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggle = useCallback(() => {
    const s = stateRef.current;
    if (!s.playing && s.time >= s.duration - 0.01) {
      s.time = 0;
      setTime(0);
    }
    s.playing = !s.playing;
    setPlaying(s.playing);
  }, []);

  const seek = useCallback((t: number) => {
    const s = stateRef.current;
    s.time = Math.max(0, Math.min(t, s.duration));
    setTime(s.time);
  }, []);

  useEffect(() => {
    const s = stateRef.current;
    s.duration = duration;
    if (s.time > duration) {
      s.time = duration;
      setTime(duration);
    }
  }, [duration]);

  return { time, playing, toggle, seek };
}

interface PreviewCanvasProps {
  source: FrameSource;
  plan: Plan;
  time: number;
  playing: boolean;
  raw: boolean;
  /** Only one pane at a time should produce sound. */
  audible?: boolean;
}

export function PreviewCanvas({ source, plan, time, playing, raw, audible }: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const propsRef = useRef({ source, plan, time, playing, raw, audible });

  useEffect(() => {
    propsRef.current = { source, plan, time, playing, raw, audible };
  });

  useEffect(() => {
    if (source.kind === "file" && source.url) {
      const video = createVideoElement(source.url);
      videoRef.current = video;
      return () => {
        video.pause();
        video.removeAttribute("src");
        videoRef.current = null;
      };
    }
    videoRef.current = null;
    return undefined;
  }, [source]);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const p = propsRef.current;
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const video = videoRef.current;
      if (video && p.source.kind === "file") {
        const lookup = outputToSource(p.plan, p.time);
        if (lookup.kind === "video") {
          const drift = Math.abs(video.currentTime - lookup.srcTime);
          const shouldRun = p.playing;
          if (drift > 0.3 || !shouldRun) {
            if (drift > 0.05) video.currentTime = lookup.srcTime;
          }
          video.playbackRate = Math.max(0.0625, Math.min(16, lookup.rate));
          video.muted = !p.audible || p.plan.muted || p.raw;
          if (shouldRun && video.paused) void video.play().catch(() => {});
          if (!shouldRun && !video.paused) video.pause();
        } else if (!video.paused) {
          video.pause();
        }
      }

      drawPlanFrame({
        ctx,
        source: p.source,
        plan: p.plan,
        t: p.time,
        width: w,
        height: h,
        raw: p.raw,
        video: videoRef.current ?? undefined,
      });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full rounded-md bg-black" />;
}

interface PaneProps {
  label: string;
  source: FrameSource;
  plan: Plan;
  playback: Playback;
  raw?: boolean;
  audible?: boolean;
  children?: React.ReactNode;
}

export function PreviewPane({ label, source, plan, playback, raw, audible, children }: PaneProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {fmt(playback.time)} / {fmt(plan.duration)}
        </span>
      </div>
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <PreviewCanvas
            source={source}
            plan={plan}
            time={playback.time}
            playing={playback.playing}
            raw={raw ?? false}
            audible={audible}
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" className="w-16" onClick={playback.toggle}>
          {playback.playing ? "Pause" : "Play"}
        </Button>
        <Slider
          value={[playback.time]}
          min={0}
          max={Math.max(plan.duration, 0.01)}
          step={0.05}
          onValueChange={(v) => playback.seek(Array.isArray(v) ? v[0] : (v as number))}
          className="flex-1"
        />
        {children}
      </div>
    </div>
  );
}
