import type { EngineStatus } from "../network/types.ts"

export function StatusPill({
  mode,
  status,
  reconnecting,
}: {
  mode: "live" | "sim"
  status: EngineStatus | null
  reconnecting: boolean
}) {
  const live = mode === "live"
  const text = live
    ? reconnecting
      ? "Reconnecting"
      : status?.team
        ? `Live: ${status.team} as ${status.person} on ${status.machine}`
        : "Live"
    : "Simulated: example data"
  return (
    <div
      data-testid="status-pill"
      className={`inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
        live ? "bg-emerald-400/15 text-emerald-200" : "bg-amber-400/15 text-amber-200"
      }`}
    >
      <span className={`size-2 shrink-0 rounded-full ${live ? "bg-emerald-300" : "bg-amber-300"}`} />
      <span className="truncate">{text}</span>
    </div>
  )
}
