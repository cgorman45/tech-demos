import { motion } from "motion/react"

export function MessageDot({
  id,
  x1,
  y1,
  x2,
  y2,
}: {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}) {
  return (
    <motion.circle
      key={id}
      r={5}
      cy={y1}
      fill="#6ee7b7"
      initial={{ cx: x1, opacity: 0 }}
      animate={{ cx: [x1, x2], cy: [y1, y2], opacity: [0, 1, 0] }}
      transition={{ duration: 0.85, ease: "easeInOut" }}
    />
  )
}
