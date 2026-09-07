"use client";

import { motion } from "motion/react";
import { useIntensity } from "@/lib/intensity";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function BellIcon() {
  const { enabled, amp, speed } = useIntensity();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className="size-10"
      {...stroke}
      style={{ originX: 0.5, originY: 0.1 }}
      animate={
        enabled
          ? { rotate: [0, 14 * amp, -12 * amp, 8 * amp, -5 * amp, 2 * amp, 0] }
          : { rotate: 0 }
      }
      transition={{
        duration: 1.4 / speed,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 1.8 / speed,
      }}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </motion.svg>
  );
}

export function HeartIcon() {
  const { enabled, amp, speed } = useIntensity();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className="size-10"
      {...stroke}
      animate={
        enabled
          ? { scale: [1, 1 + 0.16 * amp, 1, 1 + 0.08 * amp, 1] }
          : { scale: 1 }
      }
      transition={{
        duration: 0.9 / speed,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 1.2 / speed,
      }}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </motion.svg>
  );
}

export function StarIcon() {
  const { enabled, amp, speed } = useIntensity();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className="size-10"
      {...stroke}
      animate={
        enabled
          ? {
              rotate: [0, -10 * amp, 12 * amp, -6 * amp, 0],
              scale: [1, 1 + 0.06 * amp, 1],
            }
          : { rotate: 0, scale: 1 }
      }
      transition={{
        duration: 1.2 / speed,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 2 / speed,
      }}
    >
      <path d="M11.05 3.7a1 1 0 0 1 1.9 0l1.6 4.9a1 1 0 0 0 .95.7h5.15a1 1 0 0 1 .59 1.8l-4.17 3.03a1 1 0 0 0-.36 1.12l1.59 4.9a1 1 0 0 1-1.54 1.11L12.6 18.2a1 1 0 0 0-1.18 0l-4.17 3.03a1 1 0 0 1-1.53-1.12l1.58-4.9a1 1 0 0 0-.36-1.11L2.77 11.1a1 1 0 0 1 .59-1.8h5.15a1 1 0 0 0 .95-.7l1.6-4.9Z" />
    </motion.svg>
  );
}

export function MailIcon() {
  const { enabled, amp, speed } = useIntensity();
  return (
    <motion.svg
      viewBox="0 0 24 24"
      className="size-10 overflow-visible"
      {...stroke}
      animate={enabled ? { y: [0, -1.5 * amp, 0] } : { y: 0 }}
      transition={{
        duration: 0.8 / speed,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 2.2 / speed,
      }}
    >
      <rect x="2" y="5" width="20" height="15" rx="2" />
      <path d="m2 7 8.97 5.7a1.94 1.94 0 0 0 2.06 0L22 7" />
      <motion.circle
        cx="20"
        cy="5"
        r="3"
        fill="currentColor"
        stroke="none"
        className="text-rose-400"
        animate={
          enabled
            ? { scale: [1, 1 + 0.5 * amp, 1], opacity: [1, 0.6, 1] }
            : { scale: 1, opacity: 1 }
        }
        transition={{
          duration: 1.1 / speed,
          ease: "easeInOut",
          repeat: Infinity,
          repeatDelay: 0.6 / speed,
        }}
        style={{ originX: "20px", originY: "5px" }}
      />
    </motion.svg>
  );
}

export function SunIcon() {
  const { enabled, amp, speed } = useIntensity();
  return (
    <svg viewBox="0 0 24 24" className="size-10" {...stroke}>
      <motion.circle
        cx="12"
        cy="12"
        r="4"
        animate={enabled ? { scale: [1, 1 + 0.1 * amp, 1] } : { scale: 1 }}
        transition={{ duration: 3 / speed, ease: "easeInOut", repeat: Infinity }}
        style={{ originX: "12px", originY: "12px" }}
      />
      <motion.g
        animate={enabled ? { rotate: 360 } : { rotate: 0 }}
        transition={{ duration: 14 / speed, ease: "linear", repeat: Infinity }}
        style={{ originX: "12px", originY: "12px" }}
      >
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </motion.g>
    </svg>
  );
}

export function CheckIcon() {
  const { enabled, speed } = useIntensity();
  return (
    <svg viewBox="0 0 24 24" className="size-10" {...stroke}>
      <circle cx="12" cy="12" r="10" opacity={0.25} />
      <motion.path
        d="m8 12.5 2.5 2.5L16 9.5"
        animate={
          enabled
            ? { pathLength: [0, 1, 1, 0], opacity: [1, 1, 1, 0] }
            : { pathLength: 1, opacity: 1 }
        }
        transition={{
          duration: 2.4 / speed,
          times: [0, 0.35, 0.8, 1],
          repeat: Infinity,
          repeatDelay: 0.4 / speed,
        }}
      />
    </svg>
  );
}
