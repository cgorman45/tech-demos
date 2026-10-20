import { motion } from "motion/react"
import type { SessionInfo } from "../network/types.ts"

const statusColor: Record<string, string> = {
  busy: "#fbbf24",
  live: "#6ee7b7",
  idle: "#93c5fd",
  offline: "#6b7280",
}

export function SessionNode({ session, x, y }: { session: SessionInfo; x: number; y: number }) {
  const fill = statusColor[session.status] ?? "#94a3b8"
  const letter = session.agent.slice(0, 1).toUpperCase()
  return (
    <motion.g initial={false} animate={{ opacity: session.status === "offline" ? 0.45 : 1 }}>
      <circle cx={x} cy={y} r={12} fill={fill} />
      <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fill="#14201c" fontFamily="ui-monospace, monospace">
        {letter}
      </text>
      <text x={x} y={y + 26} textAnchor="middle" fontSize="9" fill="currentColor">
        {session.name}
      </text>
    </motion.g>
  )
}
