import { rowsFor, type PriceRow } from "../cost/pricing"
import type { CompanyProfile, PersonProfile, PlannedCall, SearchRequest } from "../run/runTypes"
import { companies, findCompany, normalizeName, type DatasetCompany, type DatasetPerson } from "./dataset"
import { hashSeed, mulberry32 } from "./seededRandom"

const FIRST = [
  "Jordan", "Riley", "Avery", "Quinn", "Morgan", "Casey", "Rowan", "Parker",
  "Sage", "Eden", "Jules", "Remy", "Noa", "Ari", "Lane", "Skyler", "Harper", "Reese",
]
const LAST = [
  "North", "Keene", "Voss", "Hale", "Mercer", "Cho", "Okonkwo", "Petrov",
  "Alvarez", "Singh", "Berg", "Ibarra", "Nguyen", "Sato", "Adler", "Brooks",
]
const INDUSTRIES = ["Field tools", "Lab software", "Packaging", "Civic data", "Workshop gear"]
const STAGES = ["Seed", "Series A", "Series B", "Private"]
const SIZES = ["18 employees", "42 employees", "90 employees", "160 employees"]
const HQS = ["Tulsa", "Spokane", "Providence", "Madison", "Reno"]
const EXTRA_TITLES = [
  "VP Sales",
  "CTO",
  "Head of People",
  "Product Lead",
  "Finance Lead",
  "Customer Lead",
  "Engineering Manager",
  "Head of Operations",
  "Design Lead",
]

const STOP = new Set(["of", "the", "and", "a", "at", "for", "to"])

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !STOP.has(word))
}

function matchScore(title: string, role: string, rng: () => number): number {
  const roleTokens = tokens(role)
  const titleTokens = new Set(tokens(title))
  if (roleTokens.length === 0) return 70
  const hits = roleTokens.filter((token) => titleTokens.has(token)).length
  const base = Math.round(48 + (hits / roleTokens.length) * 50)
  return Math.max(40, Math.min(99, base + Math.floor(rng() * 3)))
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "example-co"
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length) % items.length]!
}

function delay(rng: () => number): number {
  return 200 + Math.floor(rng() * 701)
}

function hits(rng: () => number, rate: number): boolean {
  if (rate >= 1) return true
  if (rate <= 0) return false
  return rng() < rate
}

function emailFor(name: string, domain: string): string {
  const slug = name.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "")
  return `${slug}@${domain}`
}

function profileFrom(company: DatasetCompany): CompanyProfile {
  return {
    name: company.name,
    domain: company.domain,
    industry: company.industry,
    stage: company.stage,
    size: company.size,
    hq: company.hq,
  }
}

function generatedCompany(name: string, rng: () => number): DatasetCompany {
  const clean = name.trim().replace(/\s+/g, " ")
  const domain = `${slugify(clean)}.example`
  return {
    name: clean,
    domain,
    industry: pick(rng, INDUSTRIES),
    stage: pick(rng, STAGES),
    size: pick(rng, SIZES),
    hq: pick(rng, HQS),
    people: [],
  }
}

function generatedPeople(company: DatasetCompany, role: string, limit: number, rng: () => number): DatasetPerson[] {
  const titles = [role.trim(), ...EXTRA_TITLES.filter((title) => title.toLowerCase() !== role.trim().toLowerCase())]
  const people: DatasetPerson[] = []
  const used = new Set<string>()
  const count = Math.max(1, Math.min(10, limit))
  for (let index = 0; index < count; index++) {
    let name = `${pick(rng, FIRST)} ${pick(rng, LAST)}`
    let guard = 0
    while (used.has(name) && guard < 12) {
      name = `${pick(rng, FIRST)} ${pick(rng, LAST)}`
      guard += 1
    }
    used.add(name)
    people.push({
      name,
      title: titles[index % titles.length] ?? role,
      email: emailFor(name, company.domain),
    })
  }
  return people
}

function rankPeople(
  people: DatasetPerson[],
  role: string,
  limit: number,
  rng: () => number,
): PersonProfile[] {
  const ranked = people.map((person, index) => ({
    id: `p${index + 1}`,
    name: person.name,
    title: person.title,
    match: matchScore(person.title, role, rng),
    email: person.email,
  }))
  ranked.sort((a, b) => b.match - a.match || a.name.localeCompare(b.name))
  return ranked.slice(0, Math.max(1, Math.min(10, limit))).map((person) => ({
    id: person.id,
    name: person.name,
    title: person.title,
    match: person.match,
  }))
}

export function simulateSearch(request: SearchRequest, prices: PriceRow[]): PlannedCall[] {
  const companyQuery = request.company.trim()
  const role = request.role.trim()
  const limit = Math.max(1, Math.min(10, Math.round(request.limit)))
  const seed = hashSeed(`${normalizeName(companyQuery)}|${normalizeName(role)}|${limit}`)
  const rng = mulberry32(seed)
  const known = findCompany(companyQuery)
  const company = known ?? generatedCompany(companyQuery || "Example Co", rng)
  const sourcePeople = known ? known.people : generatedPeople(company, role || "Lead", limit, rng)
  const calls: PlannedCall[] = []

  const enrichRow = rowsFor(prices, "companies.enrich")[0]
  const enrichHit = enrichRow ? hits(rng, enrichRow.hitRate) : true
  calls.push({
    id: `enrich-${enrichRow?.providerId ?? "local"}`,
    providerId: enrichRow?.providerId ?? "local",
    capability: "companies.enrich",
    subject: company.name,
    listPrice: enrichRow?.price ?? 0,
    billed: enrichHit ? (enrichRow?.price ?? 0) : 0,
    outcome: enrichHit ? "hit" : "miss",
    estimated: false,
    delayMs: delay(rng),
    company: enrichHit ? profileFrom(company) : undefined,
  })

  const searchRow = rowsFor(prices, "people.search")[0]
  const searchHit = searchRow ? hits(rng, searchRow.hitRate) : true
  const ranked = rankPeople(sourcePeople, role, limit, rng)
  const people = searchHit ? ranked : []
  calls.push({
    id: `search-${searchRow?.providerId ?? "local"}`,
    providerId: searchRow?.providerId ?? "local",
    capability: "people.search",
    subject: role || "Role",
    listPrice: searchRow?.price ?? 0,
    billed: searchHit ? (searchRow?.price ?? 0) : 0,
    outcome: searchHit ? "hit" : "miss",
    estimated: false,
    delayMs: delay(rng),
    people,
  })

  if (!searchHit) return calls

  const finders = rowsFor(prices, "people.email.find")
  const verifiers = rowsFor(prices, "email.verify")
  const verifier = verifiers[0]
  const emailByName = new Map(sourcePeople.map((person) => [person.name, person.email]))

  for (const person of people) {
    let found: string | null = null
    const chain = finders.length > 0 ? finders : []
    if (chain.length === 0) {
      found = emailByName.get(person.name) ?? null
    }
    for (const finder of chain) {
      const hit = hits(rng, finder.hitRate)
      const address = hit ? (emailByName.get(person.name) ?? emailFor(person.name, company.domain)) : null
      calls.push({
        id: `find-${finder.providerId}-${person.id}`,
        providerId: finder.providerId,
        capability: "people.email.find",
        subject: person.name,
        personId: person.id,
        listPrice: finder.price,
        billed: hit ? finder.price : 0,
        outcome: hit ? "hit" : "miss",
        estimated: false,
        delayMs: delay(rng),
        email: address,
        emailStatus: hit ? "found" : "miss",
      })
      if (hit && address) {
        found = address
        break
      }
    }

    if (!found || !verifier) continue
    const verified = hits(rng, verifier.hitRate)
    calls.push({
      id: `verify-${verifier.providerId}-${person.id}`,
      providerId: verifier.providerId,
      capability: "email.verify",
      subject: found,
      personId: person.id,
      listPrice: verifier.price,
      billed: verified ? verifier.price : 0,
      outcome: verified ? "hit" : "unknown",
      estimated: false,
      delayMs: delay(rng),
      email: found,
      emailStatus: verified ? "verified" : "unknown",
    })
  }

  return calls
}

export function datasetCompanyCount(): number {
  return companies.length
}
