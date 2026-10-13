import { describe, expect, test } from "bun:test"
import { defaultPersisted, parsePersisted, persistedSchema } from "./schema"

describe("persistence", () => {
  test("settings round trip through zod", () => {
    const state = defaultPersisted()
    state.settings.baseUrl = "https://registry.example"
    state.labels.title = "Desk search"
    state.labels.providers.hunter = "Hunter desk"
    state.prices[2]!.price = 0.02
    state.prices[2]!.hitRate = 0.5
    const again = parsePersisted(JSON.parse(JSON.stringify(state)))
    expect(again).toEqual(state)
    expect(persistedSchema.parse(JSON.parse(JSON.stringify(state))).settings.live).toBe(false)
  })

  test("rejects a hit rate above 1 and turns live off without a key", () => {
    const state = defaultPersisted()
    const bad = { ...state, prices: state.prices.map((row, index) => (index === 0 ? { ...row, hitRate: 1.4 } : row)) }
    expect(() => parsePersisted(bad)).toThrow()
    const live = parsePersisted({
      ...state,
      settings: { ...state.settings, apiKey: "", live: true },
    })
    expect(live.settings.live).toBe(false)
  })
})
