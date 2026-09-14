"use client";

import * as React from "react";
import { Slider as SliderPrimitive } from "radix-ui";
import { motion, useSpring, useMotionValueEvent } from "motion/react";
import { Face, moodColor, moodWord, type Flavor } from "@/components/face";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

type AngrySliderProps = {
  label: string;
  caption: string;
  flavor: Flavor;
  value: number;
  onValueChange: (value: number) => void;
  unit?: string;
};

export function AngrySlider({ label, caption, flavor, value, onValueChange, unit = "" }: AngrySliderProps) {
  const t = value / 100;

  // Spring-smooth the mood so click-jumps overshoot and settle like a sulk.
  const springT = useSpring(t, { stiffness: 320, damping: 22 });
  const [displayT, setDisplayT] = React.useState(t);
  React.useEffect(() => {
    springT.set(t);
  }, [springT, t]);
  useMotionValueEvent(springT, "change", (v) => setDisplayT(v));

  // Lean the thumb in the direction (and speed) of the drag.
  const [tilt, setTilt] = React.useState(0);
  const lastValue = React.useRef(value);
  const settleTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (values: number[]) => {
    const v = values[0];
    const delta = v - lastValue.current;
    lastValue.current = v;
    setTilt(clamp(delta * 3, -18, 18));
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => setTilt(0), 120);
    onValueChange(v);
  };

  const angry = flavor === "rage" ? displayT > 0.85 : displayT > 0.9;
  const shakeAmp = 1.5 + 4 * clamp((displayT - 0.85) / 0.15, 0, 1);
  const color = moodColor(displayT, flavor);
  const word = moodWord(displayT);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8 shadow-xl shadow-black/30">
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight text-white">{label}</h2>
        <div className="flex items-baseline gap-3">
          <span
            className="text-sm font-medium transition-colors"
            style={{ color }}
          >
            {word}
          </span>
          <span className="w-16 text-right font-mono text-2xl font-bold tabular-nums text-white">
            {value}
            <span className="text-sm text-white/50">{unit}</span>
          </span>
        </div>
      </div>
      <p className="mb-5 text-sm text-white/45">{caption}</p>

      <SliderPrimitive.Root
        value={[value]}
        onValueChange={handleChange}
        min={0}
        max={100}
        step={1}
        aria-label={label}
        className="relative flex h-16 w-full touch-none select-none items-center"
      >
        <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full bg-white/10">
          <SliderPrimitive.Range
            className="absolute h-full rounded-full transition-colors duration-150"
            style={{ backgroundColor: color }}
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className="block size-14 cursor-grab outline-none active:cursor-grabbing focus-visible:drop-shadow-[0_0_10px_rgba(255,255,255,0.45)]"
        >
          <motion.div
            className="h-full w-full"
            animate={
              angry
                ? {
                    x: [0, -shakeAmp, shakeAmp, -shakeAmp, shakeAmp, 0],
                    y: [0, shakeAmp / 2, -shakeAmp / 2, shakeAmp / 2, 0, 0],
                  }
                : { x: 0, y: 0 }
            }
            transition={angry ? { duration: 0.22, repeat: Infinity } : { type: "spring", stiffness: 300, damping: 20 }}
          >
            <motion.div
              className="h-full w-full drop-shadow-[0_6px_14px_rgba(0,0,0,0.45)]"
              animate={{ rotate: tilt }}
              whileTap={{ scale: 1.12 }}
              transition={{ type: "spring", stiffness: 350, damping: 18 }}
            >
              <Face t={displayT} flavor={flavor} tilt={tilt} />
            </motion.div>
          </motion.div>
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Root>
    </section>
  );
}
