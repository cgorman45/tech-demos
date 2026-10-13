import type { ReactNode } from "react"
import { EditableLabel } from "../labels/EditableLabel"
import type { Labels } from "../labels/labels"
import type { VisibleCall } from "../run/runTypes"
import type { RunView } from "../run/view"
import { CallChip } from "./CallChip"
import { CompanyCard } from "./CompanyCard"
import { EmailCard } from "./EmailCard"
import { PersonCard } from "./PersonCard"

function Edge({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-16 flex-col gap-1.5 px-1">
      <div className="edge-flow pointer-events-none absolute top-1 bottom-1 left-1/2 w-0.5 -translate-x-1/2 opacity-70" />
      <div className="relative z-10 flex flex-col gap-1.5">{children}</div>
    </div>
  )
}

export function Walk({
  view,
  calls,
  labels,
  editing,
  instant,
  typedName,
  onRename,
  onLabel,
}: {
  view: RunView
  calls: VisibleCall[]
  labels: Labels
  editing: boolean
  instant: boolean
  typedName: string
  onRename: (providerId: string, value: string) => void
  onLabel: (key: "companyColumn" | "peopleColumn" | "emailColumn", value: string) => void
}) {
  const bridge = calls.filter((call) => !call.personId)
  const empty = calls.length === 0

  return (
    <div className="min-w-0">
      {empty && (
        <p className="mb-3 text-sm text-muted-foreground">
          Run a search to watch the company, the people, and the email checks.
        </p>
      )}
      <div className="grid grid-cols-[minmax(0,1.05fr)_132px_minmax(0,0.95fr)_148px_minmax(0,1.1fr)] items-start gap-2">
        <EditableLabel
          value={labels.companyColumn}
          editing={editing}
          onChange={(value) => onLabel("companyColumn", value)}
          label="Company column title"
          className="text-xs tracking-wide text-muted-foreground uppercase"
        />
        <span />
        <EditableLabel
          value={labels.peopleColumn}
          editing={editing}
          onChange={(value) => onLabel("peopleColumn", value)}
          label="People column title"
          className="text-xs tracking-wide text-muted-foreground uppercase"
        />
        <span />
        <EditableLabel
          value={labels.emailColumn}
          editing={editing}
          onChange={(value) => onLabel("emailColumn", value)}
          label="Email column title"
          className="text-xs tracking-wide text-muted-foreground uppercase"
        />

        <div className="min-w-0" style={{ gridRow: `2 / span ${Math.max(view.people.length, 1)}` }}>
          {(view.company || view.companyPending || view.companyMiss || calls.length > 0) && (
            <CompanyCard
              company={view.company}
              pending={view.companyPending}
              miss={view.companyMiss}
              typedName={typedName}
              instant={instant}
            />
          )}
        </div>
        <div style={{ gridRow: `2 / span ${Math.max(view.people.length, 1)}` }}>
          <Edge>
            {bridge.map((call) => (
              <CallChip key={call.id} call={call} labels={labels} editing={editing} onRename={onRename} />
            ))}
          </Edge>
        </div>

        {view.people.map((person) => {
          const personCalls = calls.filter((call) => call.personId === person.id)
          const email = view.emails[person.id] ?? { address: null, status: "pending" as const }
          return (
            <div key={person.id} className="contents">
              <PersonCard person={person} instant={instant} />
              <Edge>
                {personCalls.map((call) => (
                  <CallChip key={call.id} call={call} labels={labels} editing={editing} onRename={onRename} />
                ))}
              </Edge>
              <EmailCard email={email} instant={instant} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
