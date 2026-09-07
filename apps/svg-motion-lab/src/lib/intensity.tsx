"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type IntensityLevel = "off" | "subtle" | "playful";

export interface IntensityConfig {
  level: IntensityLevel;
  /** When false, every demo renders in its resting state. */
  enabled: boolean;
  /** Multiplier for distances, angles, and scale deltas. */
  amp: number;
  /** Base durations are divided by this, so playful runs faster. */
  speed: number;
  spring: { type: "spring"; stiffness: number; damping: number };
}

const PRESETS: Record<IntensityLevel, Omit<IntensityConfig, "level">> = {
  off: {
    enabled: false,
    amp: 0,
    speed: 1,
    spring: { type: "spring", stiffness: 170, damping: 26 },
  },
  subtle: {
    enabled: true,
    amp: 1,
    speed: 1,
    spring: { type: "spring", stiffness: 170, damping: 26 },
  },
  playful: {
    enabled: true,
    amp: 1.9,
    speed: 1.4,
    spring: { type: "spring", stiffness: 320, damping: 13 },
  },
};

interface IntensityContextValue extends IntensityConfig {
  setLevel: (level: IntensityLevel) => void;
}

const IntensityContext = createContext<IntensityContextValue | null>(null);

export function IntensityProvider({ children }: { children: ReactNode }) {
  const [level, setLevel] = useState<IntensityLevel>("subtle");
  return (
    <IntensityContext.Provider value={{ level, setLevel, ...PRESETS[level] }}>
      {children}
    </IntensityContext.Provider>
  );
}

export function useIntensity(): IntensityContextValue {
  const ctx = useContext(IntensityContext);
  if (!ctx) throw new Error("useIntensity must be used inside <IntensityProvider>");
  return ctx;
}
