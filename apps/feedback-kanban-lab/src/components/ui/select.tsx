import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "cn"

/** Styled native select: keyboard and screen reader behavior for free. */
function Select({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <span className={cn("relative inline-flex min-w-0", className)}>
      <select
        data-slot="select"
        className="h-7 w-full appearance-none rounded-md border border-input bg-input/30 pr-6 pl-2 text-xs text-foreground transition-colors outline-none hover:bg-input/50 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 [&>option]:bg-popover [&>option]:text-popover-foreground"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-1.5 size-3 -translate-y-1/2 text-muted-foreground" />
    </span>
  )
}

export { Select }
