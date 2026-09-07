"use client";

import { motion } from "motion/react";
import { useIntensity } from "@/lib/intensity";

export function OrbitSpinner() {
  const { enabled, speed } = useIntensity();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className="size-10"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      animate={enabled ? { rotate: 360 } : { rotate: 0 }}
      transition={{ duration: 1.2 / speed, ease: "linear", repeat: Infinity }}
    >
      <circle cx="12" cy="12" r="9" opacity={0.15} />
      <motion.circle
        cx="12"
        cy="12"
        r="9"
        animate={
          enabled ? { pathLength: [0.1, 0.6, 0.1] } : { pathLength: 0.25 }
        }
        transition={{ duration: 1.6 / speed, ease: "easeInOut", repeat: Infinity }}
      />
    </motion.svg>
  );
}

export function DotsLoader() {
  const { enabled, amp, speed } = useIntensity();
  return (
    <svg viewBox="0 0 48 24" className="h-10 w-20" fill="currentColor">
      {[10, 24, 38].map((cx, i) => (
        <motion.circle
          key={cx}
          cx={cx}
          cy="14"
          r="3.5"
          animate={enabled ? { cy: [14, 14 - 5.5 * amp, 14] } : { cy: 14 }}
          transition={{
            duration: 0.55 / speed,
            ease: "easeInOut",
            repeat: Infinity,
            repeatDelay: 0.55 / speed,
            delay: (i * 0.14) / speed,
          }}
        />
      ))}
    </svg>
  );
}

export function PulseLoader() {
  const { enabled, speed } = useIntensity();
  return (
    <svg
      viewBox="0 0 64 24"
      className="h-10 w-28"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12h12l4-8 8 16 5-11 3 3h28" opacity={0.15} />
      <motion.path
        d="M2 12h12l4-8 8 16 5-11 3 3h28"
        animate={
          enabled
            ? { pathLength: [0, 1, 1], pathOffset: [0, 0, 1] }
            : { pathLength: 1, pathOffset: 0 }
        }
        transition={{
          duration: 1.8 / speed,
          times: [0, 0.6, 1],
          ease: "easeInOut",
          repeat: Infinity,
        }}
      />
    </svg>
  );
}
