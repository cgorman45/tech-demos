import type { Capability } from "../run/runTypes"

export interface PriceRow {
  providerId: string
  capability: Capability
  price: number
  hitRate: number
}

export const defaultPrices: PriceRow[] = [
  { providerId: "crustdata", capability: "companies.enrich", price: 0.01, hitRate: 1 },
  { providerId: "apollo", capability: "people.search", price: 0.028, hitRate: 1 },
  { providerId: "hunter", capability: "people.email.find", price: 0.0245, hitRate: 0.62 },
  { providerId: "kitt", capability: "people.email.find", price: 0.005, hitRate: 0.45 },
  { providerId: "bounceban", capability: "email.verify", price: 0.003, hitRate: 0.82 },
]

export function rowsFor(prices: PriceRow[], capability: Capability): PriceRow[] {
  return prices.filter((row) => row.capability === capability)
}

export function formatMeter(value: number): string {
  const safe = Number.isFinite(value) ? value : 0
  return `$${safe.toFixed(4)}`
}

export function formatPrice(value: number): string {
  if (!Number.isFinite(value) || Object.is(value, -0) || value === 0) return "$0.00"
  const negative = value < 0
  const fixed = Math.abs(value).toFixed(5)
  const trimmed = fixed.replace(/0+$/, "").replace(/\.$/, "")
  const [whole, frac = ""] = trimmed.split(".")
  return `${negative ? "-" : ""}$${whole}.${frac.padEnd(2, "0")}`
}

export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}
