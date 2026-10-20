import { expect, test } from "bun:test"
import { exampleTeam } from "./exampleTeam.ts"
import { latencyMs, routeKind } from "./router.ts"
import { mulberry32 } from "./seededRandom.ts"
import { simulateScript } from "./simulator.ts"

test("the same seed produces the same events", () => {
  expect(simulateScript(7)).toEqual(simulateScript(7))
  expect(simulateScript(7)).not.toEqual(simulateScript(8))
})

test("local, LAN, and relay latency stay in range", () => {
  expect(latencyMs("local", () => 0)).toBe(2)
  expect(latencyMs("local", () => 0.999999)).toBe(10)
  expect(latencyMs("lan", () => 0)).toBe(15)
  expect(latencyMs("lan", () => 0.999999)).toBe(60)
  expect(latencyMs("relay", () => 0)).toBe(120)
  expect(latencyMs("relay", () => 0.999999)).toBe(300)
  const rng = mulberry32(3)
  for (let i = 0; i < 40; i++) {
    const relay = latencyMs("relay", rng)
    const direct = latencyMs("lan", rng)
    expect(relay).toBeGreaterThanOrEqual(120)
    expect(relay).toBeLessThanOrEqual(300)
    expect(direct).toBeGreaterThanOrEqual(15)
    expect(direct).toBeLessThanOrEqual(60)
  }
})

test("route kind follows the machine link", () => {
  const team = exampleTeam(1)
  const me = team.machines[0]!
  const maya = team.machines[1]!
  const box = team.machines[2]!
  expect(routeKind(me, me)).toBe("local")
  expect(routeKind(me, maya)).toBe("lan")
  expect(routeKind(me, box)).toBe("relay")
})

test("a busy session queues and an offline session fails", () => {
  const events = simulateScript(11)
  const results = events.filter((event) => event.type === "send_result")
  expect(results[0]?.type === "send_result" && results[0].result.recipients[0]?.state).toBe("queued")
  expect(results[1]?.type === "send_result" && results[1].result.recipients[0]?.state).toBe("queued")
  expect(results[1]?.type === "send_result" && results[1].result.recipients[0]?.note).toContain("busy")
  expect(results[2]?.type === "send_result" && results[2].result.recipients[0]?.state).toBe("refused")
  const replies = events.filter((event) => event.type === "message")
  expect(replies.some((event) => event.type === "message" && event.message.from === "sam/worker-pi")).toBe(false)
  const idleAt = replies.find((event) => event.type === "message" && event.message.from === "colton/docs-grok")
  const busyAt = replies.find((event) => event.type === "message" && event.message.from === "colton/api-claude")
  expect(idleAt?.type === "message" && busyAt?.type === "message" && busyAt.message.receivedAt > idleAt.message.receivedAt).toBe(true)
})
