"use client";

import { motion } from "motion/react";
import { useIntensity } from "@/lib/intensity";

const STARS: ReadonlyArray<readonly [number, number]> = [
  [40, 30],
  [80, 62],
  [130, 24],
  [190, 50],
  [240, 26],
  [285, 66],
  [160, 90],
];

const CLOUDS = [
  { d: "M150 140h60a12 12 0 0 0-23-5 16 16 0 0 0-30 3 10 10 0 0 0-7 2Z", drift: 14, dur: 9 },
  { d: "M230 110h48a10 10 0 0 0-19-4 13 13 0 0 0-24 2 8 8 0 0 0-5 2Z", drift: -18, dur: 12 },
];

export function NightSky() {
  const { enabled, amp, speed } = useIntensity();
  return (
    <svg
      viewBox="0 0 320 180"
      className="w-full max-w-xl"
      role="img"
      aria-label="Animated night sky with a moon, twinkling stars, drifting clouds, and a shooting star"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1026" />
          <stop offset="100%" stopColor="#1b2a4a" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#sky)" rx="12" />

      {STARS.map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r={1.6}
          fill="#e8ecff"
          animate={
            enabled
              ? { opacity: [0.25, 1, 0.25], scale: [1, 1 + 0.35 * amp, 1] }
              : { opacity: 0.7, scale: 1 }
          }
          transition={{
            duration: 2.4 / speed,
            repeat: Infinity,
            delay: (i * 0.35) / speed,
            ease: "easeInOut",
          }}
          style={{ originX: `${x}px`, originY: `${y}px` }}
        />
      ))}

      <motion.line
        x1="230"
        y1="20"
        x2="255"
        y2="34"
        stroke="#e8ecff"
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={{ x: 40, y: -20, opacity: 0 }}
        animate={
          enabled
            ? { x: [40, -60], y: [-20, 40], opacity: [0, 1, 0] }
            : { opacity: 0 }
        }
        transition={{
          duration: 1.4 / speed,
          repeat: Infinity,
          repeatDelay: 4.5 / speed,
          ease: "easeOut",
        }}
      />

      <motion.g
        animate={
          enabled
            ? { y: [0, -5 * amp, 0], rotate: [0, -3 * amp, 0] }
            : { y: 0, rotate: 0 }
        }
        transition={{ duration: 7 / speed, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: "62px", originY: "120px" }}
      >
        <circle cx="62" cy="120" r="26" fill="#f5f0d8" />
        <circle cx="52" cy="112" r="5" fill="#e4dec0" />
        <circle cx="70" cy="128" r="7" fill="#e4dec0" />
        <circle cx="72" cy="110" r="3" fill="#e4dec0" />
      </motion.g>

      {CLOUDS.map((cloud, i) => (
        <motion.path
          key={i}
          d={cloud.d}
          fill="#8a96b8"
          opacity={0.5}
          animate={enabled ? { x: [0, cloud.drift * amp, 0] } : { x: 0 }}
          transition={{
            duration: cloud.dur / speed,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </svg>
  );
}
