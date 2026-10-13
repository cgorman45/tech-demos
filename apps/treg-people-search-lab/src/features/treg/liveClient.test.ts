import { describe, expect, test } from "bun:test"
import { defaultPrices } from "../cost/pricing"
import { buildCallRequest, friendlyHttpError, liveSearch, LiveClientError } from "./liveClient"
import type { SearchRequest } from "../run/runTypes"

const request: SearchRequest = { company: "Northwind Robotics", role: "Head of Marketing", limit: 1 }

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers })
}

describe("liveClient", () => {
  test("builds a request with the key header and base URL", () => {
    const built = buildCallRequest(
      "https://registry.example/root/",
      "treg.people.email.find",
      { full_name: "Jordan Lee", domain: "northwind-robotics.example" },
      "secret-token",
    )
    expect(built.url).toBe("https://registry.example/root/call/treg.people.email.find")
    expect(built.init.method).toBe("POST")
    const headers = built.init.headers as Record<string, string>
    expect(headers["X-Treg-Token"]).toBe("secret-token")
    expect(String(built.init.body)).toContain("Jordan Lee")
  })

  test("maps a routed response into fallthrough events", async () => {
    const seen: { url: string; token: string }[] = []
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input)
      const headers = new Headers(init?.headers)
      seen.push({ url, token: headers.get("X-Treg-Token") ?? "" })
      if (url.endsWith("/call/treg.companies.enrich")) {
        return jsonResponse(
          {
            output: {
              name: "Northwind Robotics",
              domain: "northwind-robotics.example",
              industry: "Industrial robots",
              stage: "Series B",
              employee_count: "120",
              hq: "Austin",
            },
            _treg: { served_by: "crustdata.companies.enrich", charged_micro: 10000 },
          },
          200,
          { "X-Treg-Cost-Micro": "10000", "X-Treg-Served-By": "crustdata.companies.enrich" },
        )
      }
      if (url.endsWith("/call/treg.people.search")) {
        return jsonResponse(
          {
            output: { people: [{ full_name: "Jordan Lee", title: "Head of Marketing" }] },
            _treg: { served_by: "apollo.people.search" },
          },
          200,
          { "X-Treg-Cost-Micro": "28000" },
        )
      }
      if (url.endsWith("/call/treg.people.email.find")) {
        return jsonResponse(
          {
            output: { email: "jordan.lee@northwind-robotics.example" },
            _treg: {
              served_by: "trykitt.people.email.find",
              tried: [
                { endpoint: "hunter.people.email.find", provider: "hunter", outcome: "miss", charged_micro: 0 },
                { endpoint: "trykitt.people.email.find", provider: "trykitt", outcome: "hit", charged_micro: 5000 },
              ],
            },
          },
          200,
          { "X-Treg-Cost-Micro": "5000" },
        )
      }
      return jsonResponse(
        { output: { email: "jordan.lee@northwind-robotics.example", status: "valid" }, _treg: { served_by: "bounceban.people.email.verify" } },
        200,
        { "X-Treg-Cost-Micro": "3000" },
      )
    }

    const events = []
    for await (const event of liveSearch(request, {
      apiKey: "secret-token",
      baseUrl: "https://registry.example",
      prices: defaultPrices,
      signal: new AbortController().signal,
      speed: () => "instant",
      fetchImpl,
    })) {
      events.push(event)
    }

    expect(seen.every((item) => item.token === "secret-token")).toBe(true)
    expect(seen[0]?.url).toBe("https://registry.example/call/treg.companies.enrich")
    const settled = events.filter((event) => event.type === "settled").map((event) => event.call)
    const hunter = settled.find((call) => call.providerId === "hunter")
    const kitt = settled.find((call) => call.providerId === "trykitt")
    expect(hunter?.outcome).toBe("miss")
    expect(hunter?.billed).toBe(0)
    expect(kitt?.outcome).toBe("hit")
    expect(kitt?.billed).toBeCloseTo(0.005, 5)
    expect(kitt?.email).toBe("jordan.lee@northwind-robotics.example")
    const company = settled.find((call) => call.company)?.company
    expect(company?.name).toBe("Northwind Robotics")
    expect(company?.hq).toBe("Austin")
    const verified = settled.find((call) => call.capability === "email.verify")
    expect(verified?.outcome).toBe("hit")
    expect(verified?.billed).toBeCloseTo(0.003, 5)
    expect(verified?.estimated).toBe(false)
  })

  test("401 and 402 become friendly errors", async () => {
    expect(friendlyHttpError(401)).toContain("API key")
    expect(friendlyHttpError(402)).toContain("balance")
    const fetchImpl: typeof fetch = async () => jsonResponse({ detail: "unauthorized" }, 401)
    await expect(
      (async () => {
        for await (const _event of liveSearch(request, {
          apiKey: "nope",
          baseUrl: "https://registry.example",
          prices: defaultPrices,
          signal: new AbortController().signal,
          speed: () => "instant",
          fetchImpl,
        })) {
          /* drain */
        }
      })(),
    ).rejects.toBeInstanceOf(LiveClientError)

    try {
      for await (const _event of liveSearch(request, {
        apiKey: "nope",
        baseUrl: "https://registry.example",
        prices: defaultPrices,
        signal: new AbortController().signal,
        speed: () => "instant",
        fetchImpl,
      })) {
        /* drain */
      }
      throw new Error("expected 401")
    } catch (error) {
      expect(error).toBeInstanceOf(LiveClientError)
      expect((error as LiveClientError).message).toBe("That API key was rejected. Check the key in Settings.")
    }

    const lowBalance: typeof fetch = async () =>
      jsonResponse({ balance_micro: 0, estimated_cost_micro: 10000, topup_url: "https://treg.to" }, 402)
    try {
      for await (const _event of liveSearch(request, {
        apiKey: "nope",
        baseUrl: "https://registry.example",
        prices: defaultPrices,
        signal: new AbortController().signal,
        speed: () => "instant",
        fetchImpl: lowBalance,
      })) {
        /* drain */
      }
      throw new Error("expected 402")
    } catch (error) {
      expect((error as LiveClientError).message).toBe("The Treg balance is too low for this call.")
      expect((error as LiveClientError).code).toBe("payment")
    }
  })
})
