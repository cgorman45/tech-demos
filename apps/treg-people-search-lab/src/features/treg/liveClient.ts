import { rowsFor, type PriceRow } from "../cost/pricing"
import type {
  Capability,
  CompanyProfile,
  PersonProfile,
  PlannedCall,
  RunEvent,
  SearchRequest,
  Speed,
} from "../run/runTypes"
import { z } from "zod"

export const DEFAULT_BASE_URL = "https://treg.to"

const ENDPOINTS: Record<Capability, string> = {
  "companies.enrich": "treg.companies.enrich",
  "people.search": "treg.people.search",
  "people.email.find": "treg.people.email.find",
  "email.verify": "treg.people.email.verify",
}

export class LiveClientError extends Error {
  code: "unauthorized" | "payment" | "network" | "http"
  status?: number

  constructor(message: string, code: LiveClientError["code"], status?: number) {
    super(message)
    this.name = "LiveClientError"
    this.code = code
    this.status = status
  }
}

export function buildCallRequest(
  baseUrl: string,
  endpointId: string,
  body: Record<string, unknown>,
  apiKey: string,
): { url: string; init: RequestInit } {
  const root = baseUrl.trim().replace(/\/+$/, "")
  return {
    url: `${root}/call/${endpointId}`,
    init: {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Treg-Token": apiKey,
      },
      body: JSON.stringify(body),
    },
  }
}

export function friendlyHttpError(status: number): string | null {
  if (status === 401) return "That API key was rejected. Check the key in Settings."
  if (status === 402) return "The Treg balance is too low for this call."
  return null
}

const triedSchema = z.union([
  z.string(),
  z
    .object({
      endpoint: z.string().optional(),
      endpoint_id: z.string().optional(),
      provider: z.string().optional(),
      outcome: z.string().optional(),
      hit: z.boolean().optional(),
      charged_micro: z.number().optional(),
      cost_usd: z.number().optional(),
    })
    .passthrough(),
])

const envelopeSchema = z
  .object({
    output: z.unknown().optional(),
    _treg: z
      .object({
        served_by: z.string().optional(),
        tried: z.array(triedSchema).optional(),
        charged_micro: z.number().nullable().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function pickString(record: Record<string, unknown> | null, keys: string[]): string {
  if (!record) return ""
  for (const key of keys) {
    const value = record[key]
    if (typeof value === "string" && value.trim()) return value.trim()
    if (typeof value === "number" && Number.isFinite(value)) return String(value)
  }
  return ""
}

export function providerIdFromEndpoint(endpoint: string): string {
  const head = endpoint.split(".")[0]?.trim()
  return head || "treg"
}

function microToUsd(micro: number): number {
  return micro / 1_000_000
}

function fallbackPrice(prices: PriceRow[], capability: Capability, providerId: string): number {
  const row =
    prices.find((item) => item.capability === capability && item.providerId === providerId) ??
    rowsFor(prices, capability)[0]
  return row?.price ?? 0
}

function companyFromOutput(output: unknown): CompanyProfile | undefined {
  const record = asRecord(output)
  const name = pickString(record, ["name", "company_name", "legal_name"])
  if (!name) return undefined
  const domain = pickString(record, ["domain", "primary_domain", "website"]).replace(/^https?:\/\//, "")
  return {
    name,
    domain,
    industry: pickString(record, ["industry", "sector"]) || "Unknown",
    stage: pickString(record, ["stage", "funding_stage", "latest_funding_stage"]) || "Unknown",
    size: pickString(record, ["size", "employee_range", "employees", "employee_count"]) || "Unknown",
    hq: pickString(record, ["hq", "headquarters", "location", "city"]) || "Unknown",
  }
}

function peopleFromOutput(output: unknown, role: string): PersonProfile[] {
  const record = asRecord(output)
  const list =
    (record && Array.isArray(record.people) && record.people) ||
    (record && Array.isArray(record.results) && record.results) ||
    (record && Array.isArray(record.contacts) && record.contacts) ||
    (Array.isArray(output) ? output : [])
  return list.slice(0, 10).map((item, index) => {
    const row = asRecord(item)
    const name = pickString(row, ["full_name", "name", "fullName"]) || `Person ${index + 1}`
    const title = pickString(row, ["title", "job_title", "position", "headline"]) || role
    return { id: `live-${index + 1}`, name, title, match: titleMatch(title, role) }
  })
}

function titleMatch(title: string, role: string): number {
  const roleTokens = role.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  const titleTokens = new Set(title.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))
  if (roleTokens.length === 0) return 70
  const hits = roleTokens.filter((token) => titleTokens.has(token)).length
  return Math.max(40, Math.min(99, Math.round(48 + (hits / roleTokens.length) * 50)))
}

function emailFromOutput(output: unknown): string | null {
  const record = asRecord(output)
  const email = pickString(record, ["email", "work_email", "address"])
  return email.includes("@") ? email : null
}

function verifyStatus(output: unknown): "verified" | "unknown" | "miss" {
  const record = asRecord(output)
  const raw = pickString(record, ["status", "verdict", "result"]).toLowerCase()
  if (["valid", "deliverable", "ok"].includes(raw)) return "verified"
  if (!raw) return "miss"
  return "unknown"
}

interface TriedStep {
  providerId: string
  outcome: OutcomeGuess
  chargedMicro: number | null
}

type OutcomeGuess = "hit" | "miss" | "unknown" | "unspecified"

function readTried(value: unknown, servedBy: string | null): TriedStep[] {
  const envelope = envelopeSchema.safeParse(value)
  if (!envelope.success || !envelope.data._treg?.tried?.length) {
    return servedBy ? [{ providerId: providerIdFromEndpoint(servedBy), outcome: "unspecified", chargedMicro: null }] : []
  }
  return envelope.data._treg.tried.map((item) => {
    if (typeof item === "string") {
      return { providerId: providerIdFromEndpoint(item), outcome: "unspecified" as const, chargedMicro: null }
    }
    const endpoint = item.endpoint ?? item.endpoint_id ?? item.provider ?? servedBy ?? "treg"
    const providerId = item.provider ? providerIdFromEndpoint(item.provider) : providerIdFromEndpoint(endpoint)
    const label = (item.outcome ?? "").toLowerCase()
    let outcome: OutcomeGuess = "unspecified"
    if (item.hit === true || label === "hit" || label === "ok") outcome = "hit"
    else if (item.hit === false || label === "miss" || label === "error") outcome = "miss"
    else if (label === "unknown") outcome = "unknown"
    const chargedMicro = item.charged_micro ?? (item.cost_usd == null ? null : Math.round(item.cost_usd * 1_000_000))
    return { providerId, outcome, chargedMicro }
  })
}

export function mapResponseToCalls(args: {
  capability: Capability
  json: unknown
  costMicro: number | null
  servedBy: string | null
  subject: string
  personId?: string
  role: string
  prices: PriceRow[]
  idPrefix: string
}): PlannedCall[] {
  const envelope = envelopeSchema.safeParse(args.json)
  const output = envelope.success ? envelope.data.output : args.json
  const served = args.servedBy ?? (envelope.success ? envelope.data._treg?.served_by ?? null : null)
  const steps = readTried(args.json, served)
  const headerUsd = args.costMicro == null ? null : microToUsd(args.costMicro)
  const estimatedHeader = headerUsd == null

  if (args.capability === "companies.enrich") {
    const company = companyFromOutput(output)
    return oneOrMany(steps, {
      capability: args.capability,
      subject: args.subject,
      idPrefix: args.idPrefix,
      prices: args.prices,
      headerUsd,
      estimatedHeader,
      payloadHit: Boolean(company),
      decorate: (hit) => (hit && company ? { company } : {}),
    })
  }

  if (args.capability === "people.search") {
    const people = peopleFromOutput(output, args.role)
    return oneOrMany(steps, {
      capability: args.capability,
      subject: args.subject,
      idPrefix: args.idPrefix,
      prices: args.prices,
      headerUsd,
      estimatedHeader,
      payloadHit: people.length > 0,
      decorate: (hit) => (hit && people.length ? { people } : { people: [] }),
    })
  }

  if (args.capability === "people.email.find") {
    const email = emailFromOutput(output)
    return oneOrMany(steps, {
      capability: args.capability,
      subject: args.subject,
      personId: args.personId,
      idPrefix: args.idPrefix,
      prices: args.prices,
      headerUsd,
      estimatedHeader,
      payloadHit: Boolean(email),
      decorate: (hit) => ({
        email: hit ? email : null,
        emailStatus: hit ? "found" : "miss",
      }),
    })
  }

  const status = verifyStatus(output)
  const email = emailFromOutput(output) ?? args.subject
  const calls = oneOrMany(steps, {
    capability: args.capability,
    subject: args.subject,
    personId: args.personId,
    idPrefix: args.idPrefix,
    prices: args.prices,
    headerUsd,
    estimatedHeader,
    payloadHit: status === "verified",
    decorate: (hit) => ({
      email,
      emailStatus: hit ? "verified" : status === "miss" ? "miss" : "unknown",
    }),
  })
  return calls.map((call) => {
    if (call.outcome === "hit") return call
    if (status === "unknown" || (status !== "miss" && call.billed === 0)) {
      return { ...call, outcome: "unknown" as const, billed: 0, emailStatus: "unknown" as const }
    }
    return call
  })
}

function oneOrMany(
  steps: TriedStep[],
  args: {
    capability: Capability
    subject: string
    personId?: string
    idPrefix: string
    prices: PriceRow[]
    headerUsd: number | null
    estimatedHeader: boolean
    payloadHit: boolean
    decorate: (hit: boolean) => Partial<PlannedCall>
  },
): PlannedCall[] {
  const chain = steps.length > 0 ? steps : [{ providerId: "treg", outcome: "unspecified" as const, chargedMicro: null }]
  const hitIndex = (() => {
    const marked = chain.findIndex((step) => step.outcome === "hit")
    if (marked >= 0) return marked
    if (args.payloadHit) return chain.length - 1
    return -1
  })()

  return chain.map((step, index) => {
    const hit = index === hitIndex
    const outcome = hit ? "hit" : step.outcome === "unknown" ? "unknown" : "miss"
    let billed = 0
    let estimated = args.estimatedHeader
    if (outcome === "miss" || outcome === "unknown") {
      billed = step.chargedMicro == null ? 0 : microToUsd(step.chargedMicro)
      if (outcome === "miss") billed = 0
      estimated = false
    } else if (step.chargedMicro != null) {
      billed = microToUsd(step.chargedMicro)
      estimated = false
    } else if (args.headerUsd != null && hitIndex === index) {
      const earlier = chain
        .slice(0, index)
        .reduce((sum, item) => sum + (item.chargedMicro == null ? 0 : microToUsd(item.chargedMicro)), 0)
      billed = Math.max(0, args.headerUsd - earlier)
      estimated = false
    } else {
      billed = fallbackPrice(args.prices, args.capability, step.providerId)
      estimated = true
    }
    return {
      id: `${args.idPrefix}-${step.providerId}-${index + 1}`,
      providerId: step.providerId,
      capability: args.capability,
      subject: args.subject,
      personId: args.personId,
      listPrice: fallbackPrice(args.prices, args.capability, step.providerId) || billed,
      billed,
      outcome,
      estimated,
      delayMs: 240,
      ...args.decorate(hit),
    }
  })
}

export interface LiveContext {
  apiKey: string
  baseUrl: string
  prices: PriceRow[]
  signal: AbortSignal
  speed: () => Speed
  fetchImpl?: typeof fetch
}

async function callEndpoint(
  ctx: LiveContext,
  capability: Capability,
  body: Record<string, unknown>,
): Promise<{ json: unknown; costMicro: number | null; servedBy: string | null }> {
  const endpointId = ENDPOINTS[capability]
  const request = buildCallRequest(ctx.baseUrl || DEFAULT_BASE_URL, endpointId, body, ctx.apiKey)
  const fetchImpl = ctx.fetchImpl ?? fetch
  let response: Response
  try {
    response = await fetchImpl(request.url, { ...request.init, signal: ctx.signal })
  } catch (error) {
    if (ctx.signal.aborted) throw error
    throw new LiveClientError("The browser could not reach Treg. The request may have been blocked.", "network")
  }
  const text = await response.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text)
    } catch {
      json = { output: { raw: text } }
    }
  }
  if (!response.ok) {
    const friendly = friendlyHttpError(response.status)
    throw new LiveClientError(
      friendly ?? `Treg returned HTTP ${response.status}.`,
      response.status === 401 ? "unauthorized" : response.status === 402 ? "payment" : "http",
      response.status,
    )
  }
  const header = response.headers.get("X-Treg-Cost-Micro")
  const costMicro = header == null || header.trim() === "" ? null : Number(header)
  return {
    json,
    costMicro: costMicro != null && Number.isFinite(costMicro) ? costMicro : null,
    servedBy: response.headers.get("X-Treg-Served-By"),
  }
}

function factor(speed: Speed): number {
  if (speed === "instant") return 0
  if (speed === "2") return 0.5
  return 1
}

async function wait(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0 || signal.aborted) return
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException("Aborted", "AbortError"))
    }
    signal.addEventListener("abort", onAbort, { once: true })
  })
}

async function* emitCalls(calls: PlannedCall[], ctx: LiveContext): AsyncGenerator<RunEvent> {
  for (const call of calls) {
    if (ctx.signal.aborted) return
    yield { type: "started", call }
    await wait(call.delayMs * factor(ctx.speed()), ctx.signal)
    if (ctx.signal.aborted) return
    yield { type: "settled", call }
  }
}

function looksLikeDomain(value: string): boolean {
  return !value.includes(" ") && value.includes(".")
}

export async function* liveSearch(request: SearchRequest, ctx: LiveContext): AsyncGenerator<RunEvent> {
  const companyName = request.company.trim()
  const role = request.role.trim()
  const limit = Math.max(1, Math.min(10, Math.round(request.limit)))
  const enrichBody = looksLikeDomain(companyName) ? { domain: companyName } : { name: companyName }
  const enrich = await callEndpoint(ctx, "companies.enrich", enrichBody)
  const enrichCalls = mapResponseToCalls({
    capability: "companies.enrich",
    json: enrich.json,
    costMicro: enrich.costMicro,
    servedBy: enrich.servedBy,
    subject: companyName,
    role,
    prices: ctx.prices,
    idPrefix: "enrich",
  })
  yield* emitCalls(enrichCalls, ctx)
  const company = [...enrichCalls].reverse().find((call) => call.company)?.company
  const domain = company?.domain || (looksLikeDomain(companyName) ? companyName : "")
  const peopleBody: Record<string, unknown> = { title: role, limit }
  if (domain) peopleBody.company_domain = domain
  else peopleBody.q = `${role} at ${companyName}`
  const people = await callEndpoint(ctx, "people.search", peopleBody)
  const peopleCalls = mapResponseToCalls({
    capability: "people.search",
    json: people.json,
    costMicro: people.costMicro,
    servedBy: people.servedBy,
    subject: role,
    role,
    prices: ctx.prices,
    idPrefix: "search",
  })
  yield* emitCalls(peopleCalls, ctx)
  const foundPeople = [...peopleCalls].reverse().find((call) => call.people && call.people.length > 0)?.people ?? []
  for (const person of foundPeople) {
    const nameParts = person.name.split(/\s+/)
    const findBody: Record<string, unknown> = {
      full_name: person.name,
      first_name: nameParts[0] ?? "",
      last_name: nameParts.slice(1).join(" "),
    }
    if (domain) findBody.domain = domain
    const found = await callEndpoint(ctx, "people.email.find", findBody)
    const findCalls = mapResponseToCalls({
      capability: "people.email.find",
      json: found.json,
      costMicro: found.costMicro,
      servedBy: found.servedBy,
      subject: person.name,
      personId: person.id,
      role,
      prices: ctx.prices,
      idPrefix: `find-${person.id}`,
    })
    yield* emitCalls(findCalls, ctx)
    const email = [...findCalls].reverse().find((call) => call.outcome === "hit" && call.email)?.email
    if (!email) continue
    const verified = await callEndpoint(ctx, "email.verify", { email })
    const verifyCalls = mapResponseToCalls({
      capability: "email.verify",
      json: verified.json,
      costMicro: verified.costMicro,
      servedBy: verified.servedBy,
      subject: email,
      personId: person.id,
      role,
      prices: ctx.prices,
      idPrefix: `verify-${person.id}`,
    })
    yield* emitCalls(verifyCalls, ctx)
  }
}
