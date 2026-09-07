/**
 * Copy-ready, self-contained versions of each demo (values baked in at the
 * "subtle" level). Each snippet only needs `bun add motion`.
 */
export const snippets: Record<string, string> = {
  bell: `import { motion } from "motion/react";

export function BellIcon() {
  return (
    <motion.svg
      viewBox="0 0 24 24" width={40} height={40} fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ originX: 0.5, originY: 0.1 }}
      animate={{ rotate: [0, 14, -12, 8, -5, 2, 0] }}
      transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.8 }}
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </motion.svg>
  );
}`,

  heart: `import { motion } from "motion/react";

export function HeartIcon() {
  return (
    <motion.svg
      viewBox="0 0 24 24" width={40} height={40} fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      animate={{ scale: [1, 1.16, 1, 1.08, 1] }}
      transition={{ duration: 0.9, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.2 }}
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </motion.svg>
  );
}`,

  star: `import { motion } from "motion/react";

export function StarIcon() {
  return (
    <motion.svg
      viewBox="0 0 24 24" width={40} height={40} fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      animate={{ rotate: [0, -10, 12, -6, 0], scale: [1, 1.06, 1] }}
      transition={{ duration: 1.2, ease: "easeInOut", repeat: Infinity, repeatDelay: 2 }}
    >
      <path d="M11.05 3.7a1 1 0 0 1 1.9 0l1.6 4.9a1 1 0 0 0 .95.7h5.15a1 1 0 0 1 .59 1.8l-4.17 3.03a1 1 0 0 0-.36 1.12l1.59 4.9a1 1 0 0 1-1.54 1.11L12.6 18.2a1 1 0 0 0-1.18 0l-4.17 3.03a1 1 0 0 1-1.53-1.12l1.58-4.9a1 1 0 0 0-.36-1.11L2.77 11.1a1 1 0 0 1 .59-1.8h5.15a1 1 0 0 0 .95-.7l1.6-4.9Z" />
    </motion.svg>
  );
}`,

  mail: `import { motion } from "motion/react";

export function MailIcon() {
  return (
    <motion.svg
      viewBox="0 0 24 24" width={40} height={40} fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      animate={{ y: [0, -1.5, 0] }}
      transition={{ duration: 0.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.2 }}
    >
      <rect x="2" y="5" width="20" height="15" rx="2" />
      <path d="m2 7 8.97 5.7a1.94 1.94 0 0 0 2.06 0L22 7" />
      <motion.circle
        cx="20" cy="5" r="3" fill="currentColor" stroke="none"
        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.6, 1] }}
        transition={{ duration: 1.1, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.6 }}
        style={{ originX: "20px", originY: "5px" }}
      />
    </motion.svg>
  );
}`,

  sun: `import { motion } from "motion/react";

export function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24" width={40} height={40} fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    >
      <motion.circle
        cx="12" cy="12" r="4"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }}
        style={{ originX: "12px", originY: "12px" }}
      />
      <motion.g
        animate={{ rotate: 360 }}
        transition={{ duration: 14, ease: "linear", repeat: Infinity }}
        style={{ originX: "12px", originY: "12px" }}
      >
        <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
      </motion.g>
    </svg>
  );
}`,

  check: `import { motion } from "motion/react";

export function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24" width={40} height={40} fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" opacity={0.25} />
      <motion.path
        d="m8 12.5 2.5 2.5L16 9.5"
        animate={{ pathLength: [0, 1, 1, 0], opacity: [1, 1, 1, 0] }}
        transition={{ duration: 2.4, times: [0, 0.35, 0.8, 1], repeat: Infinity, repeatDelay: 0.4 }}
      />
    </svg>
  );
}`,

  orbit: `import { motion } from "motion/react";

export function OrbitSpinner() {
  return (
    <motion.svg
      viewBox="0 0 24 24" width={40} height={40} fill="none"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
      animate={{ rotate: 360 }}
      transition={{ duration: 1.2, ease: "linear", repeat: Infinity }}
    >
      <circle cx="12" cy="12" r="9" opacity={0.15} />
      <motion.circle
        cx="12" cy="12" r="9"
        animate={{ pathLength: [0.1, 0.6, 0.1] }}
        transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
      />
    </motion.svg>
  );
}`,

  dots: `import { motion } from "motion/react";

export function DotsLoader() {
  return (
    <svg viewBox="0 0 48 24" width={80} height={40} fill="currentColor">
      {[10, 24, 38].map((cx, i) => (
        <motion.circle
          key={cx} cx={cx} cy="14" r="3.5"
          animate={{ cy: [14, 8.5, 14] }}
          transition={{
            duration: 0.55, ease: "easeInOut", repeat: Infinity,
            repeatDelay: 0.55, delay: i * 0.14,
          }}
        />
      ))}
    </svg>
  );
}`,

  pulse: `import { motion } from "motion/react";

export function PulseLoader() {
  return (
    <svg
      viewBox="0 0 64 24" width={110} height={42} fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M2 12h12l4-8 8 16 5-11 3 3h28" opacity={0.15} />
      <motion.path
        d="M2 12h12l4-8 8 16 5-11 3 3h28"
        animate={{ pathLength: [0, 1, 1], pathOffset: [0, 0, 1] }}
        transition={{ duration: 1.8, times: [0, 0.6, 1], ease: "easeInOut", repeat: Infinity }}
      />
    </svg>
  );
}`,

  nightSky: `import { motion } from "motion/react";

const STARS = [
  [40, 30], [80, 62], [130, 24], [190, 50], [240, 26], [285, 66], [160, 90],
] as const;

export function NightSky() {
  return (
    <svg viewBox="0 0 320 180" width="100%" role="img" aria-label="Animated night sky">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1026" />
          <stop offset="100%" stopColor="#1b2a4a" />
        </linearGradient>
      </defs>
      <rect width="320" height="180" fill="url(#sky)" rx="12" />

      {STARS.map(([x, y], i) => (
        <motion.circle
          key={i} cx={x} cy={y} r={1.6} fill="#e8ecff"
          animate={{ opacity: [0.25, 1, 0.25], scale: [1, 1.35, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.35, ease: "easeInOut" }}
          style={{ originX: \`\${x}px\`, originY: \`\${y}px\` }}
        />
      ))}

      <motion.line
        x1="230" y1="20" x2="255" y2="34" stroke="#e8ecff" strokeWidth="1.5" strokeLinecap="round"
        initial={{ x: 40, y: -20, opacity: 0 }}
        animate={{ x: [40, -60], y: [-20, 40], opacity: [0, 1, 0] }}
        transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 4.5, ease: "easeOut" }}
      />

      <motion.g
        animate={{ y: [0, -5, 0], rotate: [0, -3, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: "62px", originY: "120px" }}
      >
        <circle cx="62" cy="120" r="26" fill="#f5f0d8" />
        <circle cx="52" cy="112" r="5" fill="#e4dec0" />
        <circle cx="70" cy="128" r="7" fill="#e4dec0" />
        <circle cx="72" cy="110" r="3" fill="#e4dec0" />
      </motion.g>

      {[
        { d: "M150 140h60a12 12 0 0 0-23-5 16 16 0 0 0-30 3 10 10 0 0 0-7 2Z", drift: 14, dur: 9 },
        { d: "M230 110h48a10 10 0 0 0-19-4 13 13 0 0 0-24 2 8 8 0 0 0-5 2Z", drift: -18, dur: 12 },
      ].map((cloud, i) => (
        <motion.path
          key={i} d={cloud.d} fill="#8a96b8" opacity={0.5}
          animate={{ x: [0, cloud.drift, 0] }}
          transition={{ duration: cloud.dur, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </svg>
  );
}`,
};
