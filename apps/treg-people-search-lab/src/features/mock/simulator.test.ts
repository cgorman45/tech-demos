import { describe, expect, test } from "bun:test"
import { defaultPrices, type PriceRow } from "../cost/pricing"
import { companies } from "./dataset"
import { simulateSearch } from "./simulator"

const request = { company: "Northwind Robotics", role: "Head of Marketing", limit: 3 }

describe("simulator", () => {
  test("same input returns the same calls", () => {
    const first = simulateSearch(request, defaultPrices)
    const second = simulateSearch(request, defaultPrices)
    expect(first).toEqual(second)
    expect(first.length).toBeGreaterThan(2)
  })

  test("misses cost $0.00 and a finder miss falls through", () => {
    const prices: PriceRow[] = defaultPrices.map((row) => {
      if (row.providerId === "hunter") return { ...row, hitRate: 0 }
      if (row.providerId === "kitt") return { ...row, hitRate: 1 }
      return row
    })
    const calls = simulateSearch(request, prices)
    const finds = calls.filter((call) => call.capability === "people.email.find")
    const people = calls.find((call) => call.capability === "people.search")?.people ?? []
    expect(people.length).toBe(3)
    for (const person of people) {
      const hunter = finds.find((call) => call.personId === person.id && call.providerId === "hunter")
      const kitt = finds.find((call) => call.personId === person.id && call.providerId === "kitt")
      expect(hunter?.outcome).toBe("miss")
      expect(hunter?.billed).toBe(0)
      expect(kitt?.outcome).toBe("hit")
      expect(kitt && finds.indexOf(kitt)).toBeGreaterThan(finds.indexOf(hunter!))
    }
  })

  test("every shipped email ends in .example", () => {
    for (const company of companies) {
      expect(company.domain.endsWith(".example")).toBe(true)
      expect(company.people.length).toBeGreaterThanOrEqual(4)
      expect(company.people.length).toBeLessThanOrEqual(8)
      for (const person of company.people) {
        expect(person.email.endsWith(".example")).toBe(true)
        expect(person.email.includes("@")).toBe(true)
      }
    }
    expect(companies.length).toBeGreaterThanOrEqual(12)
    const known = simulateSearch(request, defaultPrices)
    const madeUp = simulateSearch(
      { company: "Paper Kettle Works", role: "Finance Lead", limit: 4 },
      defaultPrices,
    )
    for (const call of [...known, ...madeUp]) {
      if (call.email) expect(call.email.endsWith(".example")).toBe(true)
      if (call.company) expect(call.company.domain.endsWith(".example")).toBe(true)
    }
    const profile = madeUp.find((call) => call.company)?.company
    expect(profile?.name).toBe("Paper Kettle Works")
    expect(madeUp.find((call) => call.people)?.people?.length).toBe(4)
  })
})
