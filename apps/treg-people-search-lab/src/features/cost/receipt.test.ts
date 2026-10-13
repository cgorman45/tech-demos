import { describe, expect, test } from "bun:test"
import { defaultLabels } from "../labels/labels"
import type { PlannedCall } from "../run/runTypes"
import { buildReceipt, displayPerUsable, displayTotal, providerLine, receiptText } from "./receipt.ts"

function call(partial: Partial<PlannedCall> & Pick<PlannedCall, "id" | "providerId" | "capability" | "outcome" | "billed">): PlannedCall {
  return {
    subject: partial.subject ?? partial.id,
    listPrice: partial.listPrice ?? partial.billed,
    estimated: false,
    delayMs: 200,
    ...partial,
  }
}

describe("receipt", () => {
  test("reproduces the 27 person sample", () => {
    const calls: PlannedCall[] = []
    for (let index = 1; index <= 27; index++) {
      const hunterHit = index <= 18
      calls.push(
        call({
          id: `h${index}`,
          providerId: "hunter",
          capability: "people.email.find",
          personId: `p${index}`,
          outcome: hunterHit ? "hit" : "miss",
          billed: hunterHit ? 0.0245 : 0,
          email: hunterHit ? `person${index}@northwind-robotics.example` : null,
          emailStatus: hunterHit ? "found" : "miss",
        }),
      )
      if (!hunterHit) {
        const kittHit = index <= 21
        calls.push(
          call({
            id: `k${index}`,
            providerId: "kitt",
            capability: "people.email.find",
            personId: `p${index}`,
            outcome: kittHit ? "hit" : "miss",
            billed: kittHit ? 0.005 : 0,
            email: kittHit ? `person${index}@northwind-robotics.example` : null,
            emailStatus: kittHit ? "found" : "miss",
          }),
        )
      }
    }
    for (let index = 1; index <= 21; index++) {
      const verified = index <= 20
      calls.push(
        call({
          id: `v${index}`,
          providerId: "bounceban",
          capability: "email.verify",
          personId: `p${index}`,
          outcome: verified ? "hit" : "unknown",
          billed: verified ? 0.00625 : 0,
          email: `person${index}@northwind-robotics.example`,
          emailStatus: verified ? "verified" : "unknown",
        }),
      )
    }

    const receipt = buildReceipt(calls)
    expect(receipt.people).toBe(27)
    expect(receipt.emailsFound).toBe(21)
    expect(receipt.verified).toBe(20)
    expect(receipt.unknown).toBe(1)
    expect(receipt.misses).toBe(6)
    expect(receipt.total).toBeCloseTo(0.581, 5)
    expect(displayTotal(receipt.total)).toBe(0.58)
    expect(displayPerUsable(receipt.total, receipt.verified)).toBe(0.029)
    for (const item of calls) {
      if (item.outcome === "miss" || item.outcome === "unknown") expect(item.billed).toBe(0)
    }
    const hunter = receipt.providers.find((item) => item.providerId === "hunter")!
    const kitt = receipt.providers.find((item) => item.providerId === "kitt")!
    expect(providerLine("Hunter", hunter)).toBe("Hunter 27 calls @ $0.0245, 9 misses at $0.00")
    expect(providerLine("Kitt", kitt)).toBe("Kitt 9 calls @ $0.005, 6 misses at $0.00")
    const text = receiptText(receipt, defaultLabels, true)
    expect(text.startsWith("Example data")).toBe(true)
    expect(text).toContain("Total: $0.58")
    expect(text).toContain("Cost per usable result: $0.029")
  })
})
