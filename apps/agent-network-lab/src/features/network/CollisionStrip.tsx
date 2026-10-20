import { Button } from "@/components/ui/button"
import type { Overlap } from "./collisions.ts"

export function CollisionStrip({
  active,
  idle,
  onAsk,
}: {
  active: Overlap[]
  idle: Overlap[]
  onAsk: (address: string) => void
}) {
  if (active.length === 0 && idle.length === 0) return null
  return (
    <div data-testid="collisions" className="flex flex-col gap-1">
      {active.map((overlap) => (
        <div key={`hard-${overlap.repo}@${overlap.branch}`} className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-400/15 px-3 py-1.5 text-xs text-amber-100">
          <span>
            {overlap.sessions.map((session) => session.address).join(", ")} are in {overlap.repo}@{overlap.branch}
          </span>
          {overlap.sessions.map((session) => (
            <Button key={session.address} type="button" size="xs" variant="outline" onClick={() => onAsk(session.address)}>
              Ask {session.address}
            </Button>
          ))}
        </div>
      ))}
      {idle.map((overlap) => (
        <div key={`soft-${overlap.repo}@${overlap.branch}`} className="rounded-lg bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          Idle overlap: {overlap.sessions.map((session) => session.address).join(", ")} in {overlap.repo}@{overlap.branch}
        </div>
      ))}
    </div>
  )
}
