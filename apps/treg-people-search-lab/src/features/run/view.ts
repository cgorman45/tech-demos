import type { CompanyProfile, PersonProfile, VisibleCall } from "./runTypes"

export type EmailStatus = "pending" | "found" | "verifying" | "verified" | "unknown" | "miss"

export interface EmailView {
  address: string | null
  status: EmailStatus
}

export interface RunView {
  company: CompanyProfile | null
  companyPending: boolean
  companyMiss: boolean
  people: PersonProfile[]
  emails: Record<string, EmailView>
}

export function viewFromCalls(calls: VisibleCall[]): RunView {
  const enrich = calls.filter((call) => call.capability === "companies.enrich")
  const enrichSettled = enrich.filter((call) => call.state === "settled")
  const company = [...enrichSettled].reverse().find((call) => call.company)?.company ?? null
  const companyPending = enrich.some((call) => call.state === "pending") && !company
  const companyMiss = !company && !companyPending && enrichSettled.some((call) => call.outcome === "miss")

  const search = [...calls].reverse().find(
    (call) => call.capability === "people.search" && call.state === "settled" && call.outcome === "hit" && call.people,
  )
  const people = search?.people ?? []
  const emails: Record<string, EmailView> = {}

  for (const person of people) {
    const related = calls.filter((call) => call.personId === person.id)
    const finders = related.filter((call) => call.capability === "people.email.find")
    const verifies = related.filter((call) => call.capability === "email.verify")
    const hit = [...finders].reverse().find((call) => call.state === "settled" && call.outcome === "hit" && call.email)
    const verifyPending = verifies.some((call) => call.state === "pending")
    const verifySettled = [...verifies].reverse().find((call) => call.state === "settled")
    let status: EmailStatus = "pending"
    if (hit) {
      status = "found"
      if (verifyPending) status = "verifying"
      else if (verifySettled?.outcome === "hit") status = "verified"
      else if (verifySettled) status = "unknown"
    } else if (finders.some((call) => call.state === "pending")) {
      status = "pending"
    } else if (finders.length > 0 && finders.every((call) => call.state === "settled")) {
      status = "miss"
    }
    emails[person.id] = { address: hit?.email ?? null, status }
  }

  return { company, companyPending, companyMiss, people, emails }
}

export function meterFrom(calls: VisibleCall[]) {
  const settled = calls.filter((call) => call.state === "settled")
  const totals = new Map<string, number>()
  for (const call of settled) {
    totals.set(call.providerId, (totals.get(call.providerId) ?? 0) + call.billed)
  }
  return {
    total: settled.reduce((sum, call) => sum + call.billed, 0),
    calls: settled.length,
    hits: settled.filter((call) => call.outcome === "hit").length,
    misses: settled.filter((call) => call.outcome === "miss").length,
    providers: [...totals.entries()].map(([providerId, total]) => ({ providerId, total })),
  }
}
