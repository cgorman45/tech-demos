import type { ServiceKind } from "@/data/topology";

export interface LogLine {
  ts: number;
  level: "info" | "warn" | "error";
  message: string;
}

const KIND_LOGS: Record<ServiceKind, string[]> = {
  web: [
    "GET / 200 12ms",
    "GET /assets/index-B3xk.js 200 3ms",
    "GET /api/session 200 41ms",
    "hydration complete in 88ms",
    "GET /dashboard 200 27ms",
  ],
  api: [
    "POST /v1/orders 201 63ms",
    "GET /v1/orders?limit=50 200 22ms",
    "cache hit ratio 0.94",
    "published event order.created",
    "GET /healthz 200 1ms",
  ],
  worker: [
    "picked up job resize-image #4821",
    "job resize-image #4821 done in 412ms",
    "picked up job send-email #4822",
    "job send-email #4822 done in 187ms",
    "queue depth: 3",
  ],
  cron: [
    "tick: nightly-report not due",
    "running job cleanup-sessions",
    "cleanup-sessions removed 214 rows",
    "next run of nightly-report in 6h12m",
  ],
  postgres: [
    "checkpoint starting: time",
    "checkpoint complete: wrote 118 buffers",
    "autovacuum: table orders analyzed",
    "connection authorized: user=api database=shipyard",
  ],
  redis: [
    "10 changes in 300 seconds. Saving...",
    "background saving terminated with success",
    "evicted 0 keys (maxmemory-policy allkeys-lru)",
  ],
  queue: [
    "[JS] consumer worker-pool ack floor 88412",
    "publish orders.created seq 88413",
    "stream ORDERS: 3 consumers, 0 pending redeliveries",
  ],
  storage: [
    "PUT /uploads/inv-2210.pdf 200 34ms",
    "GET /uploads/logo.png 200 5ms",
    "lifecycle: expired 2 objects in tmp/",
  ],
};

export function makeLogs(kind: ServiceKind, now: number, count = 6): LogLine[] {
  const pool = KIND_LOGS[kind];
  const lines: LogLine[] = [];
  for (let i = count - 1; i >= 0; i--) {
    lines.push({
      ts: now - i * (4000 + Math.floor(Math.random() * 9000)),
      level: "info",
      message: pool[(count - 1 - i) % pool.length],
    });
  }
  return lines;
}

export function randomRuntimeLog(kind: ServiceKind, now: number): LogLine {
  const pool = KIND_LOGS[kind];
  return {
    ts: now,
    level: "info",
    message: pool[Math.floor(Math.random() * pool.length)],
  };
}

/** Baseline CPU% / memory(MB) per kind so the readouts look plausible. */
const METRIC_BASELINE: Record<ServiceKind, { cpu: number; mem: number }> = {
  web: { cpu: 6, mem: 140 },
  api: { cpu: 18, mem: 310 },
  worker: { cpu: 32, mem: 260 },
  cron: { cpu: 1, mem: 60 },
  postgres: { cpu: 12, mem: 480 },
  redis: { cpu: 4, mem: 96 },
  queue: { cpu: 7, mem: 120 },
  storage: { cpu: 5, mem: 210 },
};

export function initialMetrics(kind: ServiceKind): { cpu: number; mem: number } {
  const base = METRIC_BASELINE[kind];
  return { cpu: base.cpu, mem: base.mem };
}

/** Random-walk one step around the kind's baseline. */
export function tickMetric(
  kind: ServiceKind,
  prev: { cpu: number; mem: number },
): { cpu: number; mem: number } {
  const base = METRIC_BASELINE[kind];
  const drift = (value: number, target: number, jitter: number, min: number) => {
    const pull = (target - value) * 0.2;
    const noise = (Math.random() - 0.5) * jitter;
    return Math.max(min, value + pull + noise);
  };
  return {
    cpu: Math.min(99, drift(prev.cpu, base.cpu, base.cpu * 0.8 + 2, 0.3)),
    mem: drift(prev.mem, base.mem, base.mem * 0.12, 16),
  };
}

export function formatUptime(startedAt: number | null, now: number): string {
  if (startedAt === null) return "—";
  let seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const hours = Math.floor(seconds / 3600);
  seconds -= hours * 3600;
  const minutes = Math.floor(seconds / 60);
  seconds -= minutes * 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
