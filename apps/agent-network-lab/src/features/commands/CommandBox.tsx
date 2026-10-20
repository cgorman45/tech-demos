import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function CommandBox({
  value,
  matches,
  pendingHint,
  onChange,
  onSubmit,
  onComplete,
  onHistory,
  onStop,
}: {
  value: string
  matches: string[]
  pendingHint: string | null
  onChange: (value: string) => void
  onSubmit: () => void
  onComplete: () => void
  onHistory: (direction: -1 | 1) => void
  onStop: () => void
}) {
  return (
    <form
      className="rounded-xl bg-card px-3 py-2 ring-1 ring-foreground/10"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-emerald-200">$</span>
        <Input
          data-testid="command-input"
          value={value}
          aria-label="Command"
          placeholder='ask colton/api-claude "what are you working on?"'
          className="h-8 border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp") {
              event.preventDefault()
              onHistory(-1)
            } else if (event.key === "ArrowDown") {
              event.preventDefault()
              onHistory(1)
            } else if (event.key === "Tab") {
              event.preventDefault()
              onComplete()
            }
          }}
        />
        <Button type="submit" size="sm">
          Run
        </Button>
        {pendingHint ? (
          <Button type="button" size="sm" variant="outline" data-testid="stop-waiting" onClick={onStop}>
            Stop waiting
          </Button>
        ) : null}
      </div>
      {pendingHint ? <p className="mt-1 text-xs text-amber-200">{pendingHint}</p> : null}
      {matches.length > 1 ? <p className="mt-1 text-xs text-muted-foreground">{matches.join("  ")}</p> : null}
    </form>
  )
}
