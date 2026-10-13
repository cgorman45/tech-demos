import { motion } from "motion/react"
import { Card, CardContent } from "@/components/ui/card"
import type { PersonProfile } from "../run/runTypes"

export function PersonCard({ person, instant }: { person: PersonProfile; instant: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: instant ? 0 : 0.25 }}>
      <Card className="min-h-[5.5rem] py-2">
        <CardContent className="px-3">
          <p className="text-sm font-medium leading-tight">{person.name}</p>
          <p className="text-xs text-muted-foreground">{person.title}</p>
          <p className="mt-1 font-mono text-xs text-amber-200">{person.match}% match</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
