import type { Handoff } from "./handoffs.ts"

export function HandoffList({ handoffs }: { handoffs: Handoff[] }) {
  return (
    <section data-testid="handoffs" className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <h2 className="text-sm font-medium">Handoffs</h2>
      {handoffs.length === 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">None open.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {handoffs.slice(0, 6).map((handoff) => (
            <li key={handoff.id} className="text-xs">
              <span className="font-medium">{handoff.status}</span> {handoff.to}: {handoff.task}
              {handoff.repo && handoff.branch ? (
                <span className="text-muted-foreground"> {handoff.repo}@{handoff.branch}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
