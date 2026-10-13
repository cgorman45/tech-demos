import { formatMeter, formatPrice } from "./pricing"
import { providerLabel, type Labels } from "../labels/labels"
import type { VisibleCall } from "../run/runTypes"
import { meterFrom } from "../run/view"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function CostMeter({ calls, labels }: { calls: VisibleCall[]; labels: Labels }) {
  const meter = meterFrom(calls)
  return (
    <div data-testid="cost-meter" className="grid gap-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default font-mono text-sm text-amber-200">{formatMeter(meter.total)}</span>
        </TooltipTrigger>
        <TooltipContent>Settled total for this run</TooltipContent>
      </Tooltip>
      <span className="font-mono text-[11px] text-muted-foreground">
        {meter.calls} calls · {meter.hits} hits · {meter.misses} misses
      </span>
      {meter.providers.length > 0 && (
        <span className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          {meter.providers.map((item) => (
            <span key={item.providerId}>
              {providerLabel(labels, item.providerId)} {formatPrice(item.total)}
            </span>
          ))}
        </span>
      )}
    </div>
  )
}
