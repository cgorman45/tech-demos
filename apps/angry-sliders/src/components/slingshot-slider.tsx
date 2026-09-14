"use client";

import * as React from "react";
import { motion } from "motion/react";

const ACCENT = "#6d8dff";
const GRAVITY = 2000; // px/s²
const KX = 4.5; // horizontal launch velocity (px/s) per px of pull
const KY = 12; // vertical launch velocity (px/s) per px of pull
const MAX_PULL = 150; // px
const MIN_PULL = 10; // below this the drag is treated as a cancelled click
const MAX_FLIGHT_S = 0.85; // longer real flights are played back faster

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type Aim = {
  x: number;
  y: number; // relative to the track line, positive = below
  pull: number;
  arc: string | null; // svg path of the projected trajectory
  landingX: number | null;
  target: number | null; // snapped value at the landing point
  vx: number;
  vy: number;
  tLand: number;
  sx: number; // horizontal squeeze applied when the raw landing overshoots the track
};

type Flight = {
  x: number;
  y: number;
  arc: string | null;
  landingX: number | null;
  target: number | null;
};

type SlingshotSliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  format: (value: number) => string;
};

export function SlingshotSlider({ label, min, max, step, defaultValue, format }: SlingshotSliderProps) {
  const [value, setValue] = React.useState(defaultValue);
  const [width, setWidth] = React.useState(0);
  const [aim, setAim] = React.useState<Aim | null>(null);
  const [flight, setFlight] = React.useState<Flight | null>(null);
  const [flash, setFlash] = React.useState(0);

  const trackRef = React.useRef<HTMLDivElement>(null);
  const aimRef = React.useRef<Aim | null>(null);
  const flyingRef = React.useRef(false);
  const frameRef = React.useRef(0);
  const dragCleanup = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    const el = trackRef.current!;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frameRef.current);
      dragCleanup.current?.();
    };
  }, []);

  const xOf = React.useCallback(
    (v: number) => ((v - min) / (max - min)) * width,
    [min, max, width]
  );
  const valueOf = React.useCallback(
    (x: number) => {
      const raw = min + (clamp(x, 0, width) / Math.max(width, 1)) * (max - min);
      const snapped = Math.round(raw / step) * step;
      return clamp(Number(snapped.toFixed(6)), min, max);
    },
    [min, max, step, width]
  );

  function computeAim(px: number, py: number): Aim {
    const anchorX = xOf(value);
    let dx = px - anchorX;
    let dy = py;
    const pull = Math.hypot(dx, dy);
    if (pull > MAX_PULL) {
      const s = MAX_PULL / pull;
      dx *= s;
      dy *= s;
    }
    const x0 = anchorX + dx;
    const y0 = dy;
    // Slingshot: launch opposite to the pull, gravity brings it back to the track line (y = 0).
    const vx = KX * (anchorX - x0);
    const vy = KY * -y0;
    const disc = vy * vy - 2 * GRAVITY * y0;
    let tLand = 0;
    if (disc >= 0) {
      const t = (-vy + Math.sqrt(disc)) / GRAVITY;
      if (t > 0.03) tLand = t;
    }
    if (!tLand) {
      return { x: x0, y: y0, pull, arc: null, landingX: null, target: null, vx, vy, tLand: 0, sx: 1 };
    }
    const rawX = x0 + vx * tLand;
    const landingX = clamp(rawX, 0, width);
    const sx = rawX === x0 ? 1 : (landingX - x0) / (rawX - x0);
    let arc = "";
    const n = 32;
    for (let i = 0; i <= n; i++) {
      const t = (tLand * i) / n;
      const X = x0 + vx * t * sx;
      const Y = y0 + vy * t + 0.5 * GRAVITY * t * t;
      arc += `${i ? "L" : "M"}${X.toFixed(1)},${Y.toFixed(1)}`;
    }
    return { x: x0, y: y0, pull, arc, landingX, target: valueOf(landingX), vx, vy, tLand, sx };
  }

  // Window-level listeners for the whole drag: robust even when the pointer
  // leaves the tiny thumb or pointer capture is unavailable.
  function startDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (flyingRef.current || dragCleanup.current) return;
    e.preventDefault();
    const rect = trackRef.current!.getBoundingClientRect();
    const toLocal = (ev: { clientX: number; clientY: number }) => ({
      x: ev.clientX - rect.left,
      y: ev.clientY - (rect.top + rect.height / 2),
    });

    const update = (ev: { clientX: number; clientY: number }) => {
      const p = toLocal(ev);
      const a = computeAim(p.x, p.y);
      aimRef.current = a;
      setAim(a);
    };
    update(e);

    const onMove = (ev: PointerEvent) => update(ev);
    const onUp = () => {
      cleanup();
      release();
    };
    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      dragCleanup.current = null;
    };
    dragCleanup.current = cleanup;
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function release() {
    const a = aimRef.current;
    aimRef.current = null;
    setAim(null);
    if (!a || a.pull < MIN_PULL) return;
    if (!a.tLand || a.landingX === null || a.target === null) {
      fallBack(a);
      return;
    }
    launch(a);
  }

  /** Fly along the real parabola, then snap onto the track with a glow flash. */
  function launch(a: Aim) {
    flyingRef.current = true;
    const speed = Math.max(1, a.tLand / MAX_FLIGHT_S);
    const start = performance.now();
    setFlight({ x: a.x, y: a.y, arc: a.arc, landingX: a.landingX, target: a.target });
    const frame = (now: number) => {
      const t = Math.min(a.tLand, ((now - start) / 1000) * speed);
      if (t >= a.tLand) {
        flyingRef.current = false;
        setFlight(null);
        setValue(a.target!);
        setFlash((f) => f + 1);
        return;
      }
      const X = a.x + a.vx * t * a.sx;
      const Y = a.y + a.vy * t + 0.5 * GRAVITY * t * t;
      setFlight((prev) => prev && { ...prev, x: X, y: Y });
      frameRef.current = requestAnimationFrame(frame);
    };
    frameRef.current = requestAnimationFrame(frame);
  }

  /** Not enough pull to reach the track: sag back to where it started. */
  function fallBack(a: Aim) {
    flyingRef.current = true;
    const anchorX = xOf(value);
    const start = performance.now();
    const dur = 200;
    setFlight({ x: a.x, y: a.y, arc: null, landingX: null, target: null });
    const frame = (now: number) => {
      const u = Math.min(1, (now - start) / dur);
      const p = 1 - Math.pow(1 - u, 3);
      if (u >= 1) {
        flyingRef.current = false;
        setFlight(null);
        return;
      }
      setFlight((prev) => prev && { ...prev, x: a.x + (anchorX - a.x) * p, y: a.y * (1 - p) });
      frameRef.current = requestAnimationFrame(frame);
    };
    frameRef.current = requestAnimationFrame(frame);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = clamp(value + step, min, max);
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = clamp(value - step, min, max);
    if (e.key === "Home") next = min;
    if (e.key === "End") next = max;
    if (next !== null) {
      e.preventDefault();
      setValue(Number(next.toFixed(6)));
    }
  }

  const active = aim ?? flight;
  const displayValue = flight?.target ?? aim?.target ?? value;
  const engaged = (aim?.target ?? flight?.target) != null;
  const thumbX = active ? active.x : xOf(value);
  const thumbY = active ? active.y : 0;
  const anchorX = xOf(value);
  const landingX = aim?.landingX ?? flight?.landingX ?? null;
  const landingTarget = aim?.target ?? flight?.target ?? null;
  const arc = aim?.arc ?? flight?.arc ?? null;

  return (
    <div className="relative select-none" style={{ zIndex: active ? 40 : undefined }}>
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[15px] text-neutral-400">{label}</span>
        <span
          className="font-mono text-[15px] tabular-nums transition-colors duration-100"
          style={{ color: engaged ? ACCENT : "#d4d4d8" }}
        >
          {format(displayValue)}
        </span>
      </div>

      <div
        ref={trackRef}
        onPointerDown={startDrag}
        className="relative h-4 touch-none"
      >
        {/* taller invisible strip so grabbing the band is forgiving */}
        <div className="absolute -inset-y-3 inset-x-0 cursor-grab active:cursor-grabbing" />
        {/* track + fill */}
        <div className="pointer-events-none absolute top-1/2 h-[2px] w-full -translate-y-1/2 rounded-full bg-neutral-800" />
        <div
          className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-neutral-200 transition-opacity duration-100"
          style={{ width: xOf(value), opacity: active ? 0 : 1 }}
        />

        {/* slingshot overlay: bands, trajectory, landing tick */}
        <svg
          className="pointer-events-none absolute left-0 top-1/2 z-10 overflow-visible"
          width={Math.max(width, 1)}
          height="1"
        >
          {aim && aim.pull >= MIN_PULL && (
            <g stroke={ACCENT} strokeWidth="2" strokeLinecap="round">
              <line x1={anchorX - 6} y1={0} x2={aim.x} y2={aim.y} />
              <line x1={anchorX + 6} y1={0} x2={aim.x} y2={aim.y} />
            </g>
          )}
          {arc && (
            <path
              d={arc}
              fill="none"
              stroke={ACCENT}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="0.5 8"
              opacity="0.9"
            />
          )}
          {landingX !== null && (
            <g>
              <line x1={landingX} y1={-6} x2={landingX} y2={6} stroke={ACCENT} strokeWidth="2" strokeLinecap="round" />
              {landingTarget !== null && (
                <text
                  x={clamp(landingX, 26, Math.max(width - 26, 26))}
                  y={-14}
                  textAnchor="middle"
                  fill={ACCENT}
                  className="font-mono"
                  fontSize="11"
                >
                  {format(landingTarget)}
                </text>
              )}
            </g>
          )}
        </svg>

        {/* landing glow */}
        {flash > 0 && (
          <motion.div
            key={flash}
            className="pointer-events-none absolute z-10 size-6 rounded-full bg-white blur-[3px]"
            style={{ left: xOf(value) - 12, top: "50%", marginTop: -12 }}
            initial={{ opacity: 0.7, scale: 0.4 }}
            animate={{ opacity: 0, scale: 2.2 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          />
        )}

        {/* thumb (16px dot inside a 40px invisible hit area) */}
        <div
          role="slider"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={format(value)}
          onKeyDown={onKeyDown}
          className="absolute left-0 top-1/2 z-20 flex size-10 cursor-grab touch-none items-center justify-center rounded-full outline-none select-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-white/25"
          style={{ transform: `translate(${thumbX - 20}px, ${thumbY - 20}px)` }}
        >
          <div
            className="size-4 rounded-full bg-white transition-transform duration-100"
            style={{ transform: aim ? "scale(1.15)" : "scale(1)" }}
          />
        </div>
      </div>
    </div>
  );
}
