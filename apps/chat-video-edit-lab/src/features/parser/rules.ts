import type { CaptionSegment, Corner, RangeSpec, Step } from "@/features/plan/steps";
import { stepId } from "@/features/plan/steps";
import { parseFactor, parseSeconds, TIME_TOKEN } from "./numbers";

export interface RuleContext {
  /** Example captions used for "add captions" on the example clip. */
  exampleCaptions: CaptionSegment[] | null;
}

export type Rule = (clause: string, ctx: RuleContext) => Step | null;

const T = TIME_TOKEN;

function base() {
  return { id: stepId(), enabled: true as const };
}

const keepRule: Rule = (c) => {
  const m = c.match(new RegExp(`keep\\s+(?:from\\s+)?(${T})\\s+(?:to|through|until|-)\\s+(${T})`, "i"));
  if (!m) return null;
  const from = parseSeconds(m[1]);
  const to = parseSeconds(m[2]);
  if (from === null || to === null || to <= from) return null;
  return { ...base(), type: "trim", mode: "keep", seconds: 0, from, to };
};

const trimRule: Rule = (c) => {
  const m = c.match(
    new RegExp(`(?:cut|trim|remove|delete|chop)(?:\\s+off)?\\s+(?:the\\s+)?(first|last)\\s+(${T})`, "i"),
  );
  if (!m) return null;
  const seconds = parseSeconds(m[2]);
  if (seconds === null || seconds <= 0) return null;
  const mode = m[1].toLowerCase() === "first" ? "start" : "end";
  return { ...base(), type: "trim", mode, seconds, from: 0, to: 0 };
};

const cutRangeRule: Rule = (c) => {
  const m = c.match(
    new RegExp(`(?:remove|cut|delete|chop)\\s+(?:out\\s+)?(?:from\\s+)?(${T})\\s+(?:to|through|until|-)\\s+(${T})`, "i"),
  );
  if (!m) return null;
  const from = parseSeconds(m[1]);
  const to = parseSeconds(m[2]);
  if (from === null || to === null || to <= from) return null;
  return { ...base(), type: "cutRange", from, to };
};

function parseSpeedRange(c: string): RangeSpec {
  const span = c.match(new RegExp(`from\\s+(${T})\\s+(?:to|until|-)\\s+(${T})`, "i"));
  if (span) {
    const from = parseSeconds(span[1]);
    const to = parseSeconds(span[2]);
    if (from !== null && to !== null && to > from) return { kind: "span", from, to };
  }
  if (/\b(middle|center)\b/i.test(c)) return { kind: "third", which: "middle" };
  if (/\b(beginning|first third|start|intro)\b/i.test(c)) return { kind: "third", which: "first" };
  if (/\b(end|ending|last third|outro)\b/i.test(c)) return { kind: "third", which: "last" };
  return { kind: "all" };
}

const speedRule: Rule = (c) => {
  const slow = /\bslow(?:\s+down|er)?\b/i.test(c);
  const fast = /\bspeed(?:\s+up)?\b|\bfaster\b/i.test(c);
  const explicitX = c.match(/(\d+(?:\.\d+)?)\s*x\b/i);
  const word = c.match(/\b(half|double|triple)(?:\s+speed)?\b/i);
  let factor: number | null = explicitX
    ? parseFactor(explicitX[1])
    : word
      ? parseFactor(word[1])
      : null;
  const hasVerb = slow || fast || /\bspeed\b/i.test(c);
  if (!hasVerb && !explicitX && !word) return null;
  if (factor === null) factor = slow ? 0.5 : 2;
  if (slow && factor > 1) factor = 1 / factor;
  return { ...base(), type: "speed", factor, range: parseSpeedRange(c) };
};

const titleCardRule: Rule = (c) => {
  const end = c.match(/(?:add\s+)?(?:an?\s+)?end\s*card\s*[:]?\s*['"]?(.+?)['"]?$/i);
  if (end && end[1].trim()) {
    return { ...base(), type: "titleCard", text: end[1].trim(), seconds: 2, position: "end" };
  }
  const m = c.match(/(?:add\s+)?(?:a\s+)?title\s*(?:card)?\s*[:]?\s*['"]?(.+?)['"]?$/i);
  if (!m) return null;
  const text = m[1].trim();
  if (!text || /^card$/i.test(text)) return null;
  const atEnd = /\bat\s+the\s+end\b/i.test(c);
  return {
    ...base(),
    type: "titleCard",
    text: text.replace(/\s+at\s+the\s+end$/i, ""),
    seconds: 2,
    position: atEnd ? "end" : "start",
  };
};

const captionLineRule: Rule = (c) => {
  const m = c.match(new RegExp(`caption\\s+(${T})\\s+(?:to|until|-)\\s+(${T})\\s*[:]?\\s*(.+)$`, "i"));
  if (!m) return null;
  const from = parseSeconds(m[1]);
  const to = parseSeconds(m[2]);
  const text = m[3].trim();
  if (from === null || to === null || to <= from || !text) return null;
  return { ...base(), type: "captions", segments: [{ from, to, text }] };
};

const captionsRule: Rule = (c, ctx) => {
  if (!/\b(add\s+)?captions?\b/i.test(c)) return null;
  if (/\bcaption\s+\d/i.test(c)) return null;
  const segments: CaptionSegment[] = ctx.exampleCaptions ?? [
    { from: 0, to: 3, text: "Edit this caption text" },
  ];
  return { ...base(), type: "captions", segments: segments.map((s) => ({ ...s })) };
};

const textOverlayRule: Rule = (c) => {
  const m = c.match(
    /(?:put|add|show|place)\s+['"]?(.+?)['"]?\s+(?:in|at|on)\s+the\s+(top|bottom|upper|lower)[\s-]*(left|right)/i,
  );
  if (!m) return null;
  const vert = /top|upper/i.test(m[2]) ? "top" : "bottom";
  const corner = `${vert}-${m[3].toLowerCase()}` as Corner;
  const span = c.match(new RegExp(`from\\s+(${T})\\s+(?:to|until|-)\\s+(${T})`, "i"));
  const from = span ? (parseSeconds(span[1]) ?? 0) : 0;
  const to = span ? (parseSeconds(span[2]) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
  return { ...base(), type: "textOverlay", text: m[1].trim(), from, to, corner };
};

const fadeRule: Rule = (c) => {
  const m = c.match(new RegExp(`fade\\s*[-]?\\s*(in|out)(?:\\s+(${T}))?`, "i"));
  if (!m) return null;
  const seconds = m[2] ? (parseSeconds(m[2]) ?? 1) : 1;
  return { ...base(), type: "fade", direction: m[1].toLowerCase() as "in" | "out", seconds };
};

const muteRule: Rule = (c) => {
  if (!/\bmute\b|\bno\s+(audio|sound)\b|\bremove\s+(the\s+)?(audio|sound)\b|\bsilen(ce|t)\b/i.test(c))
    return null;
  return { ...base(), type: "mute" };
};

const filterRule: Rule = (c) => {
  if (/\bblack\s+and\s+white\b|\bgrayscale\b|\bgreyscale\b|\bb&w\b/i.test(c)) {
    return { ...base(), type: "filter", filter: "grayscale", amount: 1 };
  }
  if (/\bbright(en|er)?\b/i.test(c)) {
    const lot = /\ba\s+lot\b|\bmuch\b/i.test(c);
    return { ...base(), type: "filter", filter: "brightness", amount: lot ? 1.4 : 1.15 };
  }
  if (/\bdark(en|er)?\b|\bdim\b/i.test(c)) {
    return { ...base(), type: "filter", filter: "brightness", amount: 0.8 };
  }
  if (/\bcontrast\b/i.test(c)) {
    const less = /\bless|lower|reduce\b/i.test(c);
    return { ...base(), type: "filter", filter: "contrast", amount: less ? 0.85 : 1.25 };
  }
  return null;
};

/** Order matters: more specific rules first. */
export const RULES: Rule[] = [
  keepRule,
  cutRangeRule,
  trimRule,
  captionLineRule,
  titleCardRule,
  speedRule,
  textOverlayRule,
  fadeRule,
  filterRule,
  muteRule,
  captionsRule,
];
