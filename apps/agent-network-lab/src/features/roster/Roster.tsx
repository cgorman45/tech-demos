import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { personLabel } from "../edit/Nicknames.tsx"
import { isUtilitySession, type Directory, type SessionInfo } from "../network/types.ts"
import { SessionRow } from "./SessionRow.tsx"

export function Roster({
  directory,
  filter,
  showOffline,
  editMode,
  nicknames,
  hidden,
  pinned,
  now,
  onFilter,
  onNickname,
  onHide,
  onPin,
}: {
  directory: Directory
  filter: string
  showOffline: boolean
  editMode: boolean
  nicknames: Record<string, string>
  hidden: string[]
  pinned: string[]
  now: number
  onFilter: (value: string) => void
  onNickname: (address: string, value: string) => void
  onHide: (address: string) => void
  onPin: (address: string) => void
}) {
  const needle = filter.trim().toLowerCase()
  const sessions = directory.sessions.filter((session) => {
    if (!editMode && !showOffline && session.status === "offline") return false
    if (!editMode && hidden.includes(session.address)) return false
    if (!editMode && isUtilitySession(session, directory.person)) return false
    if (!needle) return true
    const hay = [session.person, session.agent, session.repo ?? "", session.doing ?? "", session.address, nicknames[`session:${session.address}`] ?? ""]
      .join(" ")
      .toLowerCase()
    return hay.includes(needle)
  })
  const ordered = [...sessions].sort((a, b) => Number(pinned.includes(b.address)) - Number(pinned.includes(a.address)))
  const people = group(ordered)
  return (
    <section data-testid="roster" className="flex min-h-0 flex-col rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-2 px-3 pt-3">
        <h2 className="text-sm font-medium">Roster</h2>
        <span className="text-[11px] text-muted-foreground">{ordered.length} shown</span>
      </div>
      <div className="px-3 py-2">
        <Input
          data-testid="roster-filter"
          value={filter}
          placeholder="Filter person, agent, repo, or doing"
          aria-label="Filter sessions"
          className="h-8"
          onChange={(event) => onFilter(event.target.value)}
        />
      </div>
      <ScrollArea className="min-h-0 flex-1 px-3 pb-3">
        <div className="flex flex-col gap-3">
          {people.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sessions match.</p>
          ) : (
            people.map(([person, machines]) => (
              <div key={person}>
                <div className="mb-1 text-xs font-medium text-muted-foreground">{personLabel(person, nicknames)}</div>
                {machines.map(([machine, rows]) => (
                  <div key={machine} className="mb-2">
                    <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{machine}</div>
                    <div className="flex flex-col gap-1.5">
                      {rows.map((session) => (
                        <SessionRow
                          key={session.address}
                          session={session}
                          now={now}
                          nicknames={nicknames}
                          pinned={pinned.includes(session.address)}
                          editMode={editMode}
                          onNickname={(value) => onNickname(session.address, value)}
                          onHide={() => onHide(session.address)}
                          onPin={() => onPin(session.address)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </section>
  )
}

function group(sessions: SessionInfo[]): Array<[string, Array<[string, SessionInfo[]]>]> {
  const people = new Map<string, Map<string, SessionInfo[]>>()
  for (const session of sessions) {
    const machines = people.get(session.person) ?? new Map<string, SessionInfo[]>()
    const rows = machines.get(session.machine) ?? []
    rows.push(session)
    machines.set(session.machine, rows)
    people.set(session.person, machines)
  }
  return [...people.entries()].map(([person, machines]) => [person, [...machines.entries()]])
}
