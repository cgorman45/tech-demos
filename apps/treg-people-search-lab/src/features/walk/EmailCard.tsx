import { motion } from "motion/react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { EmailView } from "../run/view"

const tone: Record<EmailView["status"], string> = {
  pending: "text-muted-foreground",
  found: "text-foreground",
  verifying: "text-amber-100",
  verified: "text-emerald-200",
  unknown: "text-muted-foreground",
  miss: "text-rose-200",
}

export function EmailCard({ email, instant }: { email: EmailView; instant: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: instant ? 0 : 0.25 }}>
      <Card className="min-h-[5.5rem] py-2">
        <CardContent className="grid gap-1 px-3">
          <p className="break-all font-mono text-[11px] leading-snug">
            {email.address ?? (email.status === "miss" ? "No email" : "Waiting")}
          </p>
          <Badge variant="outline" className={tone[email.status]}>
            {email.status}
          </Badge>
        </CardContent>
      </Card>
    </motion.div>
  )
}
