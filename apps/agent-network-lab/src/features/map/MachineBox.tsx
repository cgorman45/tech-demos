import type { MachineInfo, SessionInfo } from "../network/types.ts"
import { SessionNode } from "./SessionNode.tsx"

export type MachineLayout = {
  machine: MachineInfo
  sessions: SessionInfo[]
  x: number
  y: number
  w: number
  h: number
  color: string
}

export function MachineBox({ box }: { box: MachineLayout }) {
  return (
    <g>
      <rect
        x={box.x}
        y={box.y}
        width={box.w}
        height={box.h}
        rx={16}
        fill="transparent"
        stroke={box.color}
        strokeWidth={1.5}
      />
      <text x={box.x + 12} y={box.y + 18} fontSize="12" fill={box.color}>
        {box.machine.machine}
      </text>
      <text x={box.x + 12} y={box.y + 32} fontSize="10" fill="currentColor" opacity={0.7}>
        {box.machine.person}
        {box.machine.is_me ? " · this machine" : ""}
      </text>
      {box.sessions.map((session, index) => (
        <SessionNode key={session.address} session={session} x={box.x + 28 + index * 40} y={box.y + 62} />
      ))}
    </g>
  )
}
