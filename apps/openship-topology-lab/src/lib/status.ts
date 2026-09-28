import type { ServiceStatus } from "@/data/topology";

export const STATUS_META: Record<ServiceStatus, { label: string; dot: string; text: string }> = {
  running: { label: "running", dot: "bg-emerald-400", text: "text-emerald-400" },
  restarting: { label: "restarting", dot: "bg-sky-400 animate-pulse", text: "text-sky-400" },
  degraded: { label: "degraded", dot: "bg-amber-400 animate-pulse", text: "text-amber-400" },
  stopped: { label: "stopped", dot: "bg-zinc-500", text: "text-zinc-400" },
};
