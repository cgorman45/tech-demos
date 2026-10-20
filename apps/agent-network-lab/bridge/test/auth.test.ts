import { afterEach, expect, test } from "bun:test"
import http from "node:http"
import { authorize } from "../src/auth.ts"
import { startBridge, type BridgeHandle } from "../src/server.ts"

const handles: BridgeHandle[] = []

afterEach(async () => {
  while (handles.length) {
    await handles.pop()!.close()
  }
})

test("authorize rejects a missing token, a wrong token, a bad host, and a foreign origin", () => {
  const base = {
    host: "127.0.0.1:4777",
    origin: undefined as string | undefined,
    authorization: undefined as string | undefined,
    urlToken: undefined as string | undefined,
    token: "secret-token",
    port: 4777,
    requireToken: true,
  }
  expect(authorize(base).ok).toBe(false)
  expect(authorize({ ...base, authorization: "Bearer no" }).status).toBe(401)
  expect(authorize({ ...base, host: "evil.example:4777", authorization: "Bearer secret-token" }).status).toBe(403)
  expect(
    authorize({
      ...base,
      origin: "https://evil.example",
      authorization: "Bearer secret-token",
    }).status,
  ).toBe(403)
  expect(authorize({ ...base, origin: "null", urlToken: "secret-token" }).ok).toBe(true)
  expect(authorize({ ...base, origin: "http://127.0.0.1:4777", authorization: "Bearer secret-token" }).ok).toBe(true)
})

test("the server enforces token, host, and origin", async () => {
  const bridge = await startBridge({
    port: 0,
    openBrowser: false,
    token: "secret-token",
    env: { PATH: "/usr/bin:/bin", REASON_NETWORK_BIN: "", REASON_NETWORK_HOME: "/tmp/agent-network-lab-no-engine" },
  })
  handles.push(bridge)
  const missing = await raw(bridge.port, "/api/status")
  expect(missing.status).toBe(401)
  const wrong = await raw(bridge.port, "/api/status", { authorization: "Bearer wrong" })
  expect(wrong.status).toBe(401)
  const badHost = await raw(bridge.port, "/api/status?token=secret-token", { host: "evil.example" })
  expect(badHost.status).toBe(403)
  const foreign = await raw(bridge.port, "/api/status?token=secret-token", { origin: "https://evil.example" })
  expect(foreign.status).toBe(403)
  const fileOrigin = await raw(bridge.port, "/api/status?token=secret-token", { origin: "null" })
  expect(fileOrigin.status).toBe(200)
  const body = JSON.parse(fileOrigin.body) as { engine: string; testedVersion: string }
  expect(body.testedVersion).toBe("0.10.8")
  expect(body.engine === "ok" || body.engine === "missing").toBe(true)
})

function raw(
  port: number,
  path: string,
  headers: { authorization?: string; origin?: string; host?: string } = {},
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path,
        method: "GET",
        setHost: false,
        headers: {
          host: headers.host ?? `127.0.0.1:${port}`,
          ...(headers.authorization ? { authorization: headers.authorization } : {}),
          ...(headers.origin ? { origin: headers.origin } : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on("data", (chunk: Buffer) => chunks.push(chunk))
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }),
        )
      },
    )
    req.on("error", reject)
    req.end()
  })
}
