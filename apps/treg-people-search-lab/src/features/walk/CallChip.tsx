import { cn } from "cn"
import { capabilityLabel, providerLabel, type Labels } from "../labels/labels"
import { EditableLabel } from "../labels/EditableLabel"
import { formatPrice } from "../cost/pricing"
import type { VisibleCall } from "../run/runTypes"

export function CallChip({
  call,
  labels,
  editing,
  onRename,
}: {
  call: VisibleCall
  labels: Labels
  editing: boolean
  onRename: (providerId: string, value: string) => void
}) {
  const pending = call.state === "pending"
  const miss = call.state === "settled" && call.outcome === "miss"
  const unknown = call.state === "settled" && call.outcome === "unknown"
  const price = pending ? call.listPrice : call.billed

  return (
    <div
      data-testid={`chip-${call.id}`}
      className={cn(
        "rounded-md border bg-background/80 px-1.5 py-1 text-[11px] leading-tight shadow-sm",
        pending && "border-amber-300/50 text-amber-100",
        !pending && call.outcome === "hit" && "border-emerald-400/40 text-emerald-100",
        miss && "border-rose-400/40 text-rose-100",
        unknown && "border-border text-muted-foreground",
      )}
    >
      <EditableLabel
        value={providerLabel(labels, call.providerId)}
        editing={editing}
        onChange={(value) => onRename(call.providerId, value)}
        label={`Provider name for ${call.providerId}`}
        className="font-medium"
      />
      <div className="text-muted-foreground">{capabilityLabel(call.capability)}</div>
      <div className="font-mono">
        {miss ? (
          <span>
            <span className="line-through">$0.00</span>, miss
          </span>
        ) : unknown ? (
          <span>$0.00, unknown</span>
        ) : (
          <span>
            {formatPrice(price)}
            {pending ? " · pending" : ""}
            {!pending && call.estimated ? " · estimated" : ""}
          </span>
        )}
      </div>
    </div>
  )
}
