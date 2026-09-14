"use client";

import { motion } from "motion/react";

export type Flavor = "classic" | "volume" | "rage";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Face (and range-fill) color as the mood sours. */
export function moodColor(t: number, flavor: Flavor): string {
  const u = clamp(t, 0, 1);
  switch (flavor) {
    case "classic":
      return `hsl(${140 - 135 * u} 72% ${60 - 4 * u}%)`;
    case "volume":
      return `hsl(${205 - 198 * u} 76% ${62 - 4 * u}%)`;
    case "rage":
      return `hsl(${45 - 42 * u} 88% ${58 - 12 * u}%)`;
  }
}

export function moodWord(t: number): string {
  if (t < 0.15) return "content";
  if (t < 0.35) return "fine…";
  if (t < 0.55) return "hmm.";
  if (t < 0.75) return "annoyed";
  if (t < 0.92) return "angry";
  return "FURIOUS";
}

const INK = "#1c2333";

type FaceProps = {
  /** Mood, 0 = happy, 1 = furious. Already spring-smoothed by the caller. */
  t: number;
  flavor: Flavor;
  /** Lean of the thumb from drag velocity; used to make pupils look ahead. */
  tilt: number;
};

export function Face({ t, flavor, tilt }: FaceProps) {
  const u = clamp(t, 0, 1);
  const face = moodColor(u, flavor);

  // Brows: outer tips rise a touch, inner tips crash down toward the nose.
  const browOut = 15 - 2 * u;
  const browIn = 15 + 8 * u;
  const browW = 2.5 + 2 * u;

  // Eyes narrow with anger; the volume face squeezes them shut when it's loud.
  const wincing = flavor === "volume" && u > 0.88;
  const eyeOpen = wincing ? 0.08 : 1 - 0.6 * u;
  const eyeRy = 5.5 * eyeOpen;
  const pupilShift = clamp(tilt / 5, -2.5, 2.5);

  // Mouth: smile -> flat -> frown, then an open shout past 0.8.
  const shouting = u >= 0.8;
  const smileOffset = 12 - 26 * u;
  const shout = shouting ? (u - 0.8) / 0.2 : 0;
  const mouthRy = 4 + 6 * shout;

  const steaming = flavor === "rage" && u > 0.85;
  const sweating = flavor === "volume" && u > 0.55;
  const veinOpacity = flavor === "classic" ? clamp((u - 0.85) / 0.15, 0, 1) : 0;
  const blushOpacity = clamp((u - 0.45) * 1.6, 0, 0.55);

  return (
    <svg viewBox="0 0 64 64" className="h-full w-full overflow-visible" aria-hidden>
      {steaming && (
        <g>
          {[20, 32, 44].map((x, i) => (
            <motion.circle
              key={x}
              cx={x}
              r={3 - i * 0.4}
              fill="rgba(255,255,255,0.75)"
              initial={{ cy: 4, opacity: 0 }}
              animate={{ cy: [4, -10], opacity: [0, 0.9, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.25, ease: "easeOut" }}
            />
          ))}
        </g>
      )}

      <circle cx="32" cy="32" r="29" fill={face} stroke="rgba(0,0,0,0.3)" strokeWidth="2" />

      {/* blush / overheating cheeks */}
      <circle cx="16" cy="37" r="5" fill="#e2434b" opacity={blushOpacity} />
      <circle cx="48" cy="37" r="5" fill="#e2434b" opacity={blushOpacity} />

      {/* brows */}
      <line x1="15" y1={browOut} x2="27" y2={browIn} stroke={INK} strokeWidth={browW} strokeLinecap="round" />
      <line x1="37" y1={browIn} x2="49" y2={browOut} stroke={INK} strokeWidth={browW} strokeLinecap="round" />

      {/* eyes (blink loop on the whole group) */}
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "50% 50%" }}
        animate={{ scaleY: [1, 1, 0.08, 1] }}
        transition={{ duration: 0.4, times: [0, 0.75, 0.88, 1], repeat: Infinity, repeatDelay: flavor === "rage" ? 1.7 : 2.6 }}
      >
        <ellipse cx="21" cy="27" rx="5.5" ry={eyeRy} fill="#fff" />
        <ellipse cx="43" cy="27" rx="5.5" ry={eyeRy} fill="#fff" />
        <ellipse cx={21 + pupilShift} cy="27" rx="2.5" ry={Math.min(2.5, eyeRy * 0.8)} fill={INK} />
        <ellipse cx={43 + pupilShift} cy="27" rx="2.5" ry={Math.min(2.5, eyeRy * 0.8)} fill={INK} />
      </motion.g>

      {/* mouth */}
      {shouting ? (
        <g>
          <ellipse cx="32" cy="46" rx={6 + 5 * shout} ry={mouthRy} fill="#401015" stroke={INK} strokeWidth="1.5" />
          <rect x="27.5" y={46 - mouthRy + 1} width="9" height="3" rx="1.2" fill="#fff" opacity="0.9" />
        </g>
      ) : (
        <path
          d={`M 22 44 Q 32 ${44 + smileOffset} 42 44`}
          stroke={INK}
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* manga-style anger vein for the classic face at the top end */}
      <g opacity={veinOpacity} stroke="#7f1d1d" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M 49 8 q 4 2 3 6" />
        <path d="M 56 10 q -4 1 -6 5" />
      </g>

      {sweating && (
        <motion.path
          d="M 54 14 q 3 5 0 7 q -3 -2 0 -7"
          fill="#7dd3fc"
          stroke="#38bdf8"
          strokeWidth="0.8"
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [0, 9], opacity: [0, 1, 0] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeIn" }}
        />
      )}
    </svg>
  );
}
