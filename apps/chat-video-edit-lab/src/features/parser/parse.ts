import type { Step } from "@/features/plan/steps";
import type { RuleContext } from "./rules";
import { RULES } from "./rules";

export interface UnknownClause {
  clause: string;
  suggestions: string[];
}

export interface ParseResult {
  steps: Step[];
  unknown: UnknownClause[];
}

/**
 * Split a message into clauses on commas, semicolons, "and", "then".
 * "black and white" is kept together.
 */
export function splitClauses(message: string): string[] {
  const protectedMsg = message.replace(/black\s+and\s+white/gi, "black_and_white");
  return protectedMsg
    .split(/\s*(?:,|;|\bthen\b|\band\b)\s*/i)
    .map((c) => c.replace(/black_and_white/gi, "black and white").trim())
    .filter((c) => c.length > 0);
}

const GENERIC_SUGGESTIONS = [
  "cut the first 3 seconds",
  "add title card Q3 Pipeline",
  "speed up the middle",
  "fade out 1s",
  "make it black and white",
  "put 'Draft' in the top right",
];

function suggestFor(clause: string): string[] {
  const c = clause.toLowerCase();
  const picks: string[] = [];
  if (/\b(cut|trim|remove|delete)\b/.test(c)) {
    picks.push("cut the first 3 seconds", "remove 5s to 8s", "keep 0:04 to 0:12");
  } else if (/\b(slow|fast|speed|x)\b/.test(c)) {
    picks.push("speed up the middle", "slow down the end 0.5x", "2x from 3 to 6");
  } else if (/\b(text|title|card|caption|word|label)\b/.test(c)) {
    picks.push("add title card Q3 Pipeline", "caption 0 to 3: Hello", "put 'Draft' in the top right");
  } else {
    picks.push(...GENERIC_SUGGESTIONS.slice(0, 3));
  }
  return picks.slice(0, 3);
}

export function parseMessage(message: string, ctx: RuleContext): ParseResult {
  const steps: Step[] = [];
  const unknown: UnknownClause[] = [];
  for (const clause of splitClauses(message)) {
    let matched: Step | null = null;
    for (const rule of RULES) {
      matched = rule(clause, ctx);
      if (matched) break;
    }
    if (matched) steps.push(matched);
    else unknown.push({ clause, suggestions: suggestFor(clause) });
  }
  return { steps, unknown };
}
