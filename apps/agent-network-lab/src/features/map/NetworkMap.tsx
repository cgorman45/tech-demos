import type { Directory } from "../network/types.ts"
import { isUtilitySession } from "../network/types.ts"
import { MachineBox, type MachineLayout } from "./MachineBox.tsx"
import { MessageDot } from "./MessageDot.tsx"

export type Flight = {
  id: string
  fromKey: string
  toKey: string
}

export function NetworkMap({
  directory,
  colors,
  showOffline,
  hidden,
  flight,
  example,
}: {
  directory: Directory
  colors: Record<string, string>
  showOffline: boolean
  hidden: string[]
  flight: Flight | null
  example: boolean
}) {
  const boxes = layout(directory, colors, showOffline, hidden)
  const width = Math.max(640, boxes.reduce((max, box) => Math.max(max, box.x + box.w + 24), 0))
  const height = 210
  const me = boxes.find((box) => box.machine.is_me) ?? boxes[0]
  return (
    <section data-testid="network-map" className="flex min-h-0 flex-col rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between px-3 pt-3">
        <h2 className="text-sm font-medium">Network</h2>
        {example ? <span className="text-[11px] text-amber-200">Example data</span> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full text-foreground" role="img" aria-label="Network map">
          {me
            ? boxes
                .filter((box) => box !== me)
                .map((box) => {
                  const link = linkLine(box.machine)
                  return (
                    <g key={`${box.machine.person}/${box.machine.machine}`}>
                      <line
                        x1={center(me).x}
                        y1={center(me).y}
                        x2={center(box).x}
                        y2={center(box).y}
                        stroke={link.color}
                        strokeWidth={1.5}
                        strokeDasharray={link.dash}
                      />
                      <text
                        x={(center(me).x + center(box).x) / 2}
                        y={(center(me).y + center(box).y) / 2 - 6}
                        textAnchor="middle"
                        fontSize="10"
                        fill={link.color}
                      >
                        {link.label}
                      </text>
                    </g>
                  )
                })
            : null}
          {boxes.map((box) => (
            <MachineBox key={`${box.machine.person}/${box.machine.machine}`} box={box} />
          ))}
          {flight && me ? <FlightDot boxes={boxes} flight={flight} /> : null}
        </svg>
      </div>
    </section>
  )
}

function FlightDot({ boxes, flight }: { boxes: MachineLayout[]; flight: Flight }) {
  const from = boxes.find((box) => keyOf(box) === flight.fromKey)
  const to = boxes.find((box) => keyOf(box) === flight.toKey)
  if (!from || !to) return null
  const a = center(from)
  const b = center(to)
  return <MessageDot id={flight.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
}

function layout(directory: Directory, colors: Record<string, string>, showOffline: boolean, hidden: string[]): MachineLayout[] {
  const boxes: MachineLayout[] = []
  let x = 16
  const machines = [...directory.machines].sort((a, b) => Number(b.is_me) - Number(a.is_me) || a.machine.localeCompare(b.machine))
  for (const machine of machines) {
    const sessions = directory.sessions.filter((session) => {
      if (session.person !== machine.person || session.machine !== machine.machine) return false
      if (!showOffline && session.status === "offline") return false
      if (hidden.includes(session.address)) return false
      if (isUtilitySession(session, directory.person)) return false
      return true
    })
    const w = Math.max(180, 36 + Math.max(sessions.length, 1) * 40)
    const color = colors[`${machine.person}/${machine.machine}`] ?? defaultColor(machine)
    boxes.push({ machine, sessions, x, y: 16, w, h: 150, color })
    x += w + 48
  }
  return boxes
}

function center(box: MachineLayout): { x: number; y: number } {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 }
}

function keyOf(box: MachineLayout): string {
  return `${box.machine.person}/${box.machine.machine}`
}

function defaultColor(machine: { is_me: boolean; online: boolean; link: string | null }): string {
  if (!machine.online) return "#6b7280"
  if (machine.is_me) return "#6ee7b7"
  if (machine.link === "relay") return "#fbbf24"
  return "#93c5fd"
}

function linkLine(machine: { online: boolean; link: string | null; rtt_ms: number | null }): { color: string; dash: string; label: string } {
  if (!machine.online) return { color: "#6b7280", dash: "4 4", label: "offline" }
  if (machine.link === "relay") {
    return { color: "#fbbf24", dash: "5 4", label: machine.rtt_ms != null ? `relay ${machine.rtt_ms}ms` : "relay" }
  }
  return { color: "#6ee7b7", dash: "", label: machine.rtt_ms != null ? `direct ${machine.rtt_ms}ms` : "direct" }
}
