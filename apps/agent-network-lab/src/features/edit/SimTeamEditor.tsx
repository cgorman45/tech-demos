import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Directory } from "../network/types.ts"
import { MACHINE_COLORS } from "./Nicknames.tsx"

export function SimTeamEditor({
  team,
  onChange,
  onColor,
}: {
  team: Directory
  onChange: (team: Directory) => void
  onColor: (key: string, color: string) => void
}) {
  function updateSession(address: string, patch: Partial<Directory["sessions"][number]>) {
    onChange({
      ...team,
      sessions: team.sessions.map((session) => (session.address === address ? { ...session, ...patch } : session)),
    })
  }

  return (
    <section data-testid="sim-editor" className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <h2 className="text-sm font-medium">Example team</h2>
      <p className="mt-1 text-xs text-muted-foreground">Example data. Renames stay in this browser.</p>
      <div className="mt-2 flex max-h-40 flex-col gap-2 overflow-auto">
        {team.sessions.map((session) => (
          <div key={session.address} className="grid grid-cols-2 gap-1">
            <Input
              className="h-7 text-xs"
              aria-label={`Name ${session.address}`}
              value={session.name}
              onChange={(event) =>
                updateSession(session.address, {
                  name: event.target.value,
                  address: `${session.person}/${event.target.value}`,
                })
              }
            />
            <Input
              className="h-7 text-xs"
              aria-label={`Repo ${session.address}`}
              value={session.repo ?? ""}
              onChange={(event) => updateSession(session.address, { repo: event.target.value || null })}
            />
            <Input
              className="h-7 text-xs"
              aria-label={`Branch ${session.address}`}
              value={session.branch ?? ""}
              onChange={(event) => updateSession(session.address, { branch: event.target.value || null })}
            />
            <Input
              className="h-7 text-xs"
              aria-label={`Status ${session.address}`}
              value={session.status}
              onChange={(event) => updateSession(session.address, { status: event.target.value })}
            />
            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="col-span-2 justify-start"
              onClick={() => onChange({ ...team, sessions: team.sessions.filter((item) => item.address !== session.address) })}
            >
              Remove {session.address}
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        <Button
          type="button"
          size="xs"
          variant="outline"
          data-testid="add-session"
          onClick={() => {
            const machine = team.machines[0]
            if (!machine) return
            const name = `agent-${team.sessions.length + 1}`
            onChange({
              ...team,
              sessions: [
                ...team.sessions,
                {
                  address: `${machine.person}/${name}`,
                  name,
                  person: machine.person,
                  machine: machine.machine,
                  agent: "cli",
                  cwd: "/work",
                  repo: "acme/web",
                  branch: "main",
                  status: "idle",
                  since: Date.now(),
                  doing: "new example session",
                  tier: "turn",
                  unread: 0,
                  is_me: false,
                },
              ],
            })
          }}
        >
          Add session
        </Button>
        <Button
          type="button"
          size="xs"
          variant="outline"
          data-testid="add-computer"
          onClick={() => {
            const name = `computer-${team.machines.length + 1}`
            onChange({
              ...team,
              machines: [
                ...team.machines,
                {
                  person: "guest",
                  machine: name,
                  endpoint: `example-${name}`,
                  is_me: false,
                  online: true,
                  link: "direct",
                  rtt_ms: 40,
                  last_seen: null,
                },
              ],
            })
          }}
        >
          Add computer
        </Button>
        {team.machines.filter((machine) => !machine.is_me).map((machine) => (
          <Button
            key={`${machine.person}/${machine.machine}`}
            type="button"
            size="xs"
            variant="ghost"
            onClick={() =>
              onChange({
                ...team,
                machines: team.machines.filter((item) => item.machine !== machine.machine || item.person !== machine.person),
                sessions: team.sessions.filter((session) => session.machine !== machine.machine || session.person !== machine.person),
              })
            }
          >
            Remove {machine.machine}
          </Button>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {MACHINE_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`Color ${color}`}
            className="size-4 rounded-full"
            style={{ background: color }}
            onClick={() => {
              const machine = team.machines.find((item) => item.is_me)
              if (!machine) return
              onColor(`${machine.person}/${machine.machine}`, color)
            }}
          />
        ))}
      </div>
    </section>
  )
}
