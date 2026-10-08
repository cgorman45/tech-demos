import { NODES, type MetricSpec } from "@/data/workflow";

export interface LogLine {
  ts: number;
  level: "info" | "warn" | "error";
  message: string;
}

/** Seed log lines per node so the inspect panel looks lived-in. All mock. */
const NODE_SEED_LOGS: Record<string, string[]> = {
  scanner: [
    "Scanned 6 portals, 3 new postings.",
    "Flagged RFQ: HVAC controls upgrade, Harbor City.",
    "Fit score model refreshed.",
  ],
  council: [
    "Reviewed Harbor City council agenda.",
    "Noted budget line for facility upgrades.",
  ],
  grants: [
    "Tracked 2 new state incentive programs.",
    "Deadline reminder set for energy grant.",
  ],
  lead: [
    "Lead synced from scanner.",
    "Routing rules checked, owner Colton.",
  ],
  kb: [
    "Indexed 12 new documents.",
    "Answered 4 retrieval queries.",
  ],
  proposal: [
    "Outline drafted for Harbor City pool retrofit.",
    "Pulled 3 similar projects from the knowledge base.",
  ],
  deck: [
    "Built intro deck for City of Example.",
    "Speaker notes added to 5 slides.",
  ],
  emails: [
    "Drafted 2 follow-ups for review.",
    "Send queue is clear.",
  ],
  tone: [
    "Tuned 3 drafts for a facilities reader.",
    "Board summary shortened to one page.",
  ],
  rosie: [
    "Prep brief sent for Thursday meeting.",
    "Pulled last 2 touchpoints from notes.",
  ],
  granola: [
    "Captured notes from Harbor City intro call.",
    "Action items synced.",
  ],
  calls: [
    "Follow-up logged for City of Example.",
    "Next touch scheduled in 6 days.",
  ],
  won: [
    "Submitted: pool mechanical retrofit proposal.",
    "Status check: 2 proposals under review.",
  ],
};

export function makeNodeLogs(now: number): Record<string, LogLine[]> {
  const logs: Record<string, LogLine[]> = {};
  for (const node of NODES) {
    const pool = NODE_SEED_LOGS[node.id] ?? [];
    logs[node.id] = pool.map((message, i) => ({
      ts: now - (pool.length - i) * (90_000 + Math.floor(Math.random() * 240_000)),
      level: "info",
      message,
    }));
  }
  return logs;
}

export function seedMetrics(): Record<string, Record<string, number>> {
  const metrics: Record<string, Record<string, number>> = {};
  for (const node of NODES) {
    metrics[node.id] = Object.fromEntries(node.metrics.map((m: MetricSpec) => [m.key, m.seed]));
  }
  return metrics;
}

export function formatMetric(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatClock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour12: false });
}
