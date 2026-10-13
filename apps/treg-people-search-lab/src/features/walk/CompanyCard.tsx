import { motion } from "motion/react"
import { Card, CardContent } from "@/components/ui/card"
import type { CompanyProfile } from "../run/runTypes"

export function CompanyCard({
  company,
  pending,
  miss,
  typedName,
  instant,
}: {
  company: CompanyProfile | null
  pending: boolean
  miss: boolean
  typedName: string
  instant: boolean
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: instant ? 0 : 0.25 }}>
      <Card className="min-h-[8.5rem] py-3">
        <CardContent className="grid gap-1 px-3 text-sm">
          {pending && <p className="text-muted-foreground">Looking up the company.</p>}
          {miss && (
            <>
              <p className="font-medium">{typedName}</p>
              <p className="text-rose-200">No profile. $0.00, miss.</p>
            </>
          )}
          {company && (
            <>
              <p className="font-medium leading-tight">{company.name}</p>
              <p className="break-all font-mono text-[11px] text-muted-foreground">{company.domain}</p>
              <dl className="mt-1 grid grid-cols-[4.5rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-xs">
                <dt className="text-muted-foreground">Industry</dt>
                <dd className="min-w-0">{company.industry}</dd>
                <dt className="text-muted-foreground">Stage</dt>
                <dd>{company.stage}</dd>
                <dt className="text-muted-foreground">Size</dt>
                <dd>{company.size}</dd>
                <dt className="text-muted-foreground">HQ</dt>
                <dd>{company.hq}</dd>
              </dl>
            </>
          )}
          {!pending && !miss && !company && <p className="text-muted-foreground">Company card lands here.</p>}
        </CardContent>
      </Card>
    </motion.div>
  )
}
