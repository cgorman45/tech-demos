import type { Card, Category } from "@/lib/types";

/** The two agent pools: ids currently running and ids waiting FIFO. */
export interface Slots {
  running: string[];
  queue: string[];
}

export const EMPTY_SLOTS: Slots = { running: [], queue: [] };

export type RequestResult =
  | { kind: "started"; slots: Slots }
  | { kind: "queued"; slots: Slots }
  | { kind: "already-running" }
  | { kind: "already-queued" };

/** Ask for an agent slot. Starts if capacity allows, otherwise queues FIFO. */
export function requestAgent(
  slots: Slots,
  id: string,
  maxAgents: number
): RequestResult {
  if (slots.running.includes(id)) return { kind: "already-running" };
  if (slots.queue.includes(id)) return { kind: "already-queued" };
  if (slots.running.length < maxAgents) {
    return {
      kind: "started",
      slots: { running: [...slots.running, id], queue: slots.queue },
    };
  }
  return {
    kind: "queued",
    slots: { running: slots.running, queue: [...slots.queue, id] },
  };
}

/**
 * Free the slot (or queue spot) held by `id`, then promote queued ids FIFO
 * while capacity allows. Returns the promoted ids so callers can start them.
 */
export function releaseAgent(
  slots: Slots,
  id: string,
  maxAgents: number
): { slots: Slots; promoted: string[] } {
  const running = slots.running.filter((r) => r !== id);
  let queue = slots.queue.filter((q) => q !== id);
  const promoted: string[] = [];
  while (running.length < maxAgents && queue.length > 0) {
    const next = queue[0];
    queue = queue.slice(1);
    running.push(next);
    promoted.push(next);
  }
  return { slots: { running, queue }, promoted };
}

/** Promote queued ids FIFO up to capacity, e.g. after raising max agents. */
export function promoteQueued(
  slots: Slots,
  maxAgents: number
): { slots: Slots; promoted: string[] } {
  let queue = slots.queue;
  const running = [...slots.running];
  const promoted: string[] = [];
  while (running.length < maxAgents && queue.length > 0) {
    const next = queue[0];
    queue = queue.slice(1);
    running.push(next);
    promoted.push(next);
  }
  return { slots: { running, queue }, promoted };
}

export const AGENT_STEPS = [
  "Reading code",
  "Editing files",
  "Running tests",
  "Opening PR",
] as const;

const CATEGORY_FILES: Record<Category, string> = {
  Map: "src/map/win-rates.ts",
  Animation: "src/drafting/timeline.ts",
  Data: "src/charts/pipeline.ts",
  Copy: "src/copy/strings.ts",
  Agents: "src/agents/runner.ts",
  General: "src/app.tsx",
};

export function stepLogLine(step: number, category: Category): string {
  switch (step) {
    case 0:
      return `Reading code: ${CATEGORY_FILES[category]}`;
    case 1:
      return "Editing files: 3 files changed";
    case 2:
      return "Running tests: 24 pass, 0 fail";
    default:
      return "Opening PR: drafting the summary";
  }
}

export function prSummary(card: Card): string {
  const body = card.body.trim().replace(/\s+/g, " ");
  const short = body.length > 72 ? `${body.slice(0, 72).trimEnd()}...` : body;
  return `Implements "${short}" 3 files changed, tests pass. (example)`;
}
