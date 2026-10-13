export const capabilities = [
  "companies.enrich",
  "people.search",
  "people.email.find",
  "email.verify",
] as const

export type Capability = (typeof capabilities)[number]

export type Outcome = "hit" | "miss" | "unknown"

export type Speed = "1" | "2" | "instant"

export interface CompanyProfile {
  name: string
  domain: string
  industry: string
  stage: string
  size: string
  hq: string
}

export interface PersonProfile {
  id: string
  name: string
  title: string
  match: number
}

export interface PlannedCall {
  id: string
  providerId: string
  capability: Capability
  subject: string
  personId?: string
  listPrice: number
  billed: number
  outcome: Outcome
  estimated: boolean
  delayMs: number
  company?: CompanyProfile
  people?: PersonProfile[]
  email?: string | null
  emailStatus?: "found" | "verified" | "unknown" | "miss"
}

export type RunEvent =
  | { type: "started"; call: PlannedCall }
  | { type: "settled"; call: PlannedCall }

export interface SearchRequest {
  company: string
  role: string
  limit: number
}

export interface VisibleCall extends PlannedCall {
  state: "pending" | "settled"
}
