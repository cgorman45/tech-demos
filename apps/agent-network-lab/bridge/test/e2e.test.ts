import { expect, test } from "bun:test"
import { spawn } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { discoverBinary } from "../src/engine.ts"
import { startBridge } from "../src/server.ts"

const bin = discoverBinary(process.env)

test.skipIf(!bin)("bridge ask reaches a sandbox worker and the reply comes back over SSE", async () => {
  const home = mkdtempSync(path.join(tmpdir(), "rn-e2e-"))
  const env = {
    ...process.env,
    REASON_NETWORK_HOME: home,
    REASON_NETWORK_BIN: bin!,
  }
  const bridge = await startBridge({ port: 0, openBrowser: false, env })
  let worker: ReturnType<typeof spawn> | null = null
  try {
    const init = spawn(bin!, ["init", "e2e", "--as", "colton", "--no-setup"], { env, stdio: ["ignore", "pipe", "pipe"] })
    const initCode = await exitCode(init)
    expect(initCode).toBe(0)

    await waitFor(async () => {
      const status = await fetch(`http://127.0.0.1:${bridge.port}/api/status?token=${bridge.token}`, {
        headers: { authorization: `Bearer ${bridge.token}` },
      })
      const body = (await status.json()) as { inTeam: boolean; dashboardListening: boolean }
      return body.inTeam && body.dashboardListening
    }, 15000)

    const events = collectEvents(bridge.port, bridge.token)
    worker = spawn(bin!, ["listen", "--as", "worker", "--wait", "30"], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    })
    let workerOut = ""
    worker.stdout?.on("data", (chunk: Buffer) => {
      workerOut += chunk.toString("utf8")
    })

    await waitFor(async () => {
      const seen = await events.snapshot()
      return seen.some((event) => event.event === "directory" && event.data.includes("colton/worker"))
    }, 15000)

    const body = 'ping "quoted" and $(not-run)\nsecond line'
    const sent = await fetch(`http://127.0.0.1:${bridge.port}/api/send?token=${bridge.token}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${bridge.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ to: "colton/worker", body, kind: "ask" }),
    })
    const sendBody = (await sent.json()) as { recipients?: Array<{ state: string }>; error?: string }
    expect(sent.status).toBe(200)
    expect(sendBody.recipients?.[0]?.state).toBe("delivered")

    await waitFor(async () => workerOut.includes("second line") && workerOut.includes('$(not-run)'), 10000)
    expect(workerOut).toContain('ping "quoted"')

    const reply = spawn(
      bin!,
      ["send", "colton/dashboard", "--from", "colton/worker", "-"],
      { env, stdio: ["pipe", "pipe", "pipe"] },
    )
    reply.stdin?.end("pong from worker")
    expect(await exitCode(reply)).toBe(0)

    await waitFor(async () => {
      const seen = await events.snapshot()
      return seen.some((event) => event.event === "message" && event.data.includes("pong from worker"))
    }, 15000)

    const seen = await events.snapshot()
    const directories = seen.filter((event) => event.event === "directory").map((event) => event.data)
    expect(directories.some((data) => data.includes("colton/worker") && data.includes("colton/dashboard"))).toBe(true)
    await events.close()
  } finally {
    worker?.kill("SIGTERM")
    await bridge.close()
    await new Promise<void>((resolve) => {
      const stop = spawn(bin!, ["stop"], { env, stdio: "ignore" })
      stop.on("close", () => resolve())
      stop.on("error", () => resolve())
    })
    rmSync(home, { recursive: true, force: true })
  }
}, 90000)

function exitCode(child: ReturnType<typeof spawn>): Promise<number | null> {
  return new Promise((resolve, reject) => {
    child.on("error", reject)
    child.on("close", (code) => resolve(code))
  })
}

async function waitFor(check: () => Promise<boolean> | boolean, timeoutMs: number) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error("timed out waiting")
}

function collectEvents(port: number, token: string) {
  const events: Array<{ event: string; data: string }> = []
  let buffer = ""
  const controller = new AbortController()
  const done = (async () => {
    const response = await fetch(`http://127.0.0.1:${port}/api/events?token=${encodeURIComponent(token)}`, {
      signal: controller.signal,
    })
    const reader = response.body?.getReader()
    if (!reader) return
    const decoder = new TextDecoder()
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      buffer += decoder.decode(chunk.value, { stream: true })
      const parts = buffer.split("\n\n")
      buffer = parts.pop() ?? ""
      for (const part of parts) {
        let event = "message"
        const data: string[] = []
        for (const line of part.split("\n")) {
          if (line.startsWith("event:")) event = line.slice(6).trim()
          else if (line.startsWith("data:")) data.push(line.slice(5).trim())
        }
        if (data.length) events.push({ event, data: data.join("\n") })
      }
    }
  })()
  return {
    snapshot: async () => events.slice(),
    close: async () => {
      controller.abort()
      await done.catch(() => undefined)
    },
  }
}
