import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { Labels } from "../labels/labels"
import type { VisibleCall } from "../run/runTypes"
import type { RunView } from "../run/view"
import { buildReceipt, contactsCsv, displayPerUsable, displayTotal, providerLine, receiptText } from "./receipt.ts"
import { providerLabel } from "../labels/labels"
import { formatPrice } from "./pricing"

export function ReceiptPanel({
  calls,
  view,
  labels,
  example,
  company,
}: {
  calls: VisibleCall[]
  view: RunView
  labels: Labels
  example: boolean
  company: string
}) {
  const [copied, setCopied] = useState(false)
  const plan = calls.filter((call) => call.state === "settled")
  const receipt = buildReceipt(plan)
  const text = receiptText(receipt, labels, example)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  function download() {
    const csv = contactsCsv(company, view.people, plan, example)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "people-search-contacts.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section data-testid="receipt" className="border-t bg-card/60 px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Receipt</h2>
        {example && <span className="text-[11px] text-amber-200">Example data</span>}
      </div>
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 font-mono text-[12px]">
        <dt>People with a name</dt>
        <dd>{receipt.people}</dd>
        <dt>Work email found</dt>
        <dd>{receipt.emailsFound}</dd>
        <dt>Verified</dt>
        <dd>{receipt.verified}</dd>
        <dt>Unknown (not billed)</dt>
        <dd>{receipt.unknown}</dd>
        <dt>Misses (free)</dt>
        <dd>{receipt.misses}</dd>
        <dt>Total</dt>
        <dd>{formatPrice(displayTotal(receipt.total))}</dd>
        <dt>Cost per usable result</dt>
        <dd>{formatPrice(displayPerUsable(receipt.total, receipt.verified))}</dd>
      </dl>
      <ul className="mt-2 space-y-1 text-[11px] leading-snug text-muted-foreground">
        {receipt.providers.map((rollup) => (
          <li key={rollup.providerId}>{providerLine(providerLabel(labels, rollup.providerId), rollup)}</li>
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => void copy()}>
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button type="button" size="sm" variant="outline" data-testid="download-csv" onClick={download}>
          Download CSV
        </Button>
      </div>
    </section>
  )
}
