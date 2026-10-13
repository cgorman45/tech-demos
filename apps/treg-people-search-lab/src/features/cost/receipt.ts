import { formatPrice, roundTo } from "./pricing"
import { providerLabel, type Labels } from "../labels/labels"
import type { PersonProfile, PlannedCall } from "../run/runTypes"

export interface ProviderRollup {
  providerId: string
  calls: PlannedCall[]
  cost: number
  misses: number
  unknowns: number
}

export interface Receipt {
  people: number
  emailsFound: number
  verified: number
  unknown: number
  misses: number
  total: number
  perUsable: number
  providers: ProviderRollup[]
}

export function buildReceipt(calls: PlannedCall[]): Receipt {
  const search = calls.find((call) => call.capability === "people.search" && call.outcome === "hit")
  const finderCalls = calls.filter((call) => call.capability === "people.email.find")
  const verifyCalls = calls.filter((call) => call.capability === "email.verify")
  const personIds = new Set(finderCalls.map((call) => call.personId).filter((id): id is string => Boolean(id)))
  const foundIds = new Set(
    finderCalls.filter((call) => call.outcome === "hit" && call.personId).map((call) => call.personId),
  )
  const people = search?.people?.length ? search.people.length : personIds.size
  const emailsFound = foundIds.size
  const verified = verifyCalls.filter((call) => call.outcome === "hit").length
  const unknown = verifyCalls.filter((call) => call.outcome === "unknown" && call.billed === 0).length
  const misses = [...personIds].filter((id) => !foundIds.has(id)).length
  const total = calls.reduce((sum, call) => sum + call.billed, 0)
  const perUsable = verified > 0 ? total / verified : 0
  const providers: ProviderRollup[] = []
  for (const call of calls) {
    let rollup = providers.find((item) => item.providerId === call.providerId)
    if (!rollup) {
      rollup = { providerId: call.providerId, calls: [], cost: 0, misses: 0, unknowns: 0 }
      providers.push(rollup)
    }
    rollup.calls.push(call)
    rollup.cost += call.billed
    if (call.outcome === "miss") rollup.misses += 1
    if (call.outcome === "unknown") rollup.unknowns += 1
  }
  return { people, emailsFound, verified, unknown, misses, total, perUsable, providers }
}

export function displayTotal(total: number): number {
  return roundTo(total, 2)
}

export function displayPerUsable(total: number, verified: number): number {
  if (verified <= 0) return 0
  return roundTo(total / verified, 3)
}

export function providerLine(label: string, rollup: ProviderRollup): string {
  const count = rollup.calls.length
  const noun = count === 1 ? "call" : "calls"
  const hits = rollup.calls.filter((call) => call.outcome === "hit")
  let line = `${label} ${count} ${noun}`
  if (hits.length > 0) {
    const same = hits.every((call) => call.billed === hits[0]?.billed)
    const shown = same ? hits[0]!.billed : rollup.cost / hits.length
    line += ` @ ${formatPrice(shown)}`
  }
  if (rollup.misses > 0) {
    const missWord = rollup.misses === 1 ? "miss" : "misses"
    line += `, ${rollup.misses} ${missWord} at $0.00`
  }
  if (rollup.unknowns > 0) {
    line += `, ${rollup.unknowns} unknown at $0.00`
  }
  return line
}

export function receiptText(receipt: Receipt, labels: Labels, example: boolean): string {
  const lines = [
    example ? "Example data" : "Live run",
    `People with a name: ${receipt.people}`,
    `Work email found: ${receipt.emailsFound}`,
    `Verified: ${receipt.verified}`,
    `Unknown (not billed): ${receipt.unknown}`,
    `Misses (free): ${receipt.misses}`,
    `Total: ${formatPrice(displayTotal(receipt.total))}`,
    `Cost per usable result: ${formatPrice(displayPerUsable(receipt.total, receipt.verified))}`,
    "",
    ...receipt.providers.map((rollup) => providerLine(providerLabel(labels, rollup.providerId), rollup)),
  ]
  return lines.join("\n")
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function contactsCsv(
  company: string,
  people: PersonProfile[],
  calls: PlannedCall[],
  example: boolean,
): string {
  const header = ["Name", "Title", "Company", "Email", "Status", "Example data"]
  const rows = [header]
  for (const person of people) {
    const verify = calls.find(
      (call) => call.personId === person.id && call.capability === "email.verify" && call.email,
    )
    const found = calls.find(
      (call) => call.personId === person.id && call.capability === "people.email.find" && call.outcome === "hit" && call.email,
    )
    const email = verify?.email ?? found?.email
    if (!email) continue
    const status = verify?.emailStatus ?? found?.emailStatus ?? "found"
    rows.push([person.name, person.title, company, email, status, example ? "yes" : "no"])
  }
  return rows.map((row) => row.map(csvCell).join(",")).join("\n")
}
