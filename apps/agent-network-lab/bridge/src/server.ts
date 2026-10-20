import { randomBytes } from "node:crypto"
import { spawn } from "node:child_process"
import { readFileSync } from "node:fs"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { authorize } from "./auth.ts"
import { discoverBinary, runEngine } from "./engine.ts"
import { isOwnCopy, parseListenOutput, type ParsedMessage } from "./parseMessages.ts"
import { parseSendResult } from "./parseSendResult.ts"
import { INSTALL_LINES, TESTED_VERSION, installLine, parseVersion, versionWarning } from "./version.ts"

export type BridgeOptions = {
  port: number
  openBrowser: boolean
  token?: string
  htmlPath?: string
  env?: NodeJS.ProcessEnv
}

export type BridgeHandle = {
  port: number
  token: string
  url: string
  close: () => Promise<void>
}

type Directory = {
  team?: string | null
  person?: string
  machine?: string
  sessions?: unknown[]
  machines?: unknown[]
}

type SseClient = ServerResponse

export async function startBridge(opts: BridgeOptions): Promise<BridgeHandle> {
  const env = opts.env ?? process.env
  const token = opts.token ?? randomBytes(32).toString("hex")
  const htmlPath = opts.htmlPath ?? defaultHtmlPath()
  const clients = new Set<SseClient>()
  let stopped = false
  let directory: Directory | null = null
  let directoryJson = ""
  let version: string | null = null
  let binPath: string | null = discoverBinary(env)
  let dashboardListening = false
  let lastError = ""
  let listenAbort: { kill: () => void } | null = null
  const timers = new Set<NodeJS.Timeout>()

  const server = createServer((req, res) => {
    void handle(req, res).catch((error) => {
      const message = error instanceof Error ? error.message : "request failed"
      if (!res.headersSent) sendJson(res, 500, { error: message }, undefined)
    })
  })

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(opts.port, "127.0.0.1", () => resolve())
  })
  const address = server.address()
  const port = typeof address === "object" && address ? address.port : opts.port
  const url = `http://127.0.0.1:${port}/#token=${token}`
  console.log(`Open ${url}`)
  if (opts.openBrowser) openBrowser(url)

  const pollTimer = setInterval(() => {
    void pollWho()
  }, 2000)
  void refreshVersion()
  void pollWho()
  void listenLoop()

  async function handle(req: IncomingMessage, res: ServerResponse) {
    const urlObj = new URL(req.url ?? "/", `http://127.0.0.1:${port}`)
    const host = header(req, "host")
    const origin = header(req, "origin")
    const requireToken = urlObj.pathname.startsWith("/api/")
    if (req.method === "OPTIONS" && requireToken) {
      const gate = authorize({
        host,
        origin,
        authorization: undefined,
        urlToken: undefined,
        token,
        port,
        requireToken: false,
      })
      if (!gate.ok) {
        sendJson(res, gate.status, { error: gate.error }, origin)
        return
      }
      writeCors(res, origin, port)
      res.writeHead(204)
      res.end()
      return
    }
    const gate = authorize({
      host,
      origin,
      authorization: header(req, "authorization"),
      urlToken: urlObj.searchParams.get("token") ?? undefined,
      token,
      port,
      requireToken,
    })
    if (!gate.ok) {
      sendJson(res, gate.status, { error: gate.error }, origin)
      return
    }
    if (req.method === "GET" && urlObj.pathname === "/") {
      serveHtml(res, htmlPath, origin, port)
      return
    }
    if (req.method === "GET" && urlObj.pathname === "/api/status") {
      sendJson(res, 200, statusBody(), origin)
      return
    }
    if (req.method === "GET" && urlObj.pathname === "/api/doctor") {
      const text = await doctorText()
      writeCors(res, origin, port)
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" })
      res.end(text)
      return
    }
    if (req.method === "GET" && urlObj.pathname === "/api/events") {
      startSse(req, res, origin)
      return
    }
    if (req.method === "POST" && urlObj.pathname === "/api/send") {
      const raw = await readBody(req)
      let body: {
        to?: string
        body?: string
        fyi?: boolean
        notify?: boolean
        replyTo?: string
        kind?: string
      }
      try {
        body = JSON.parse(raw) as typeof body
      } catch {
        sendJson(res, 400, { error: "Send a JSON body." }, origin)
        return
      }
      const result = await sendMessage(body)
      sendJson(res, result.error ? 400 : 200, result, origin)
      return
    }
    sendJson(res, 404, { error: "not found" }, origin)
  }

  function statusBody() {
    const person = directory?.person ?? null
    const inTeam = Boolean(directory?.team)
    return {
      engine: binPath ? "ok" : "missing",
      version,
      path: binPath,
      inTeam,
      team: directory?.team ?? null,
      person,
      machine: directory?.machine ?? null,
      testedVersion: TESTED_VERSION,
      versionWarning: versionWarning(version),
      dashboardListening,
      installLine: installLine(process.platform),
      installLines: INSTALL_LINES,
      platform: process.platform,
    }
  }

  function emit(event: string, data: unknown) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    for (const client of clients) client.write(payload)
  }

  function startSse(req: IncomingMessage, res: ServerResponse, origin: string | undefined) {
    writeCors(res, origin, port)
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-store",
      connection: "keep-alive",
    })
    res.write(": ok\n\n")
    clients.add(res)
    if (directory) res.write(`event: directory\ndata: ${JSON.stringify(directory)}\n\n`)
    res.write(`event: engine_status\ndata: ${JSON.stringify(statusBody())}\n\n`)
    const beat = setInterval(() => res.write(": ping\n\n"), 15000)
    const drop = () => {
      clearInterval(beat)
      clients.delete(res)
    }
    req.on("close", drop)
    res.on("close", drop)
  }

  async function refreshVersion() {
    binPath = discoverBinary(env)
    if (!binPath) {
      version = null
      emit("engine_status", statusBody())
      return
    }
    try {
      const result = await runEngine(binPath, ["--version"], { timeoutMs: 8000, env })
      version = parseVersion(`${result.stdout}\n${result.stderr}`)
    } catch {
      version = null
    }
    emit("engine_status", statusBody())
  }

  async function pollWho() {
    if (stopped) return
    binPath = discoverBinary(env)
    if (!binPath) {
      if (lastError !== "missing") {
        lastError = "missing"
        emit("engine_status", statusBody())
      }
      return
    }
    try {
      const result = await runEngine(binPath, ["who", "--json", "--all"], { timeoutMs: 15000, env })
      if (result.code !== 0) {
        const message = firstLine(result.stderr || result.stdout || "who failed")
        if (message !== lastError) {
          lastError = message
          note(message)
          emit("error", { message })
        }
        return
      }
      const parsed = JSON.parse(result.stdout) as Directory
      if (!parsed || !Array.isArray(parsed.sessions)) {
        emit("error", { message: "who returned an unexpected shape", raw: result.stdout.slice(0, 500) })
        return
      }
      const next = JSON.stringify(parsed)
      directory = parsed
      if (next !== directoryJson) {
        directoryJson = next
        emit("directory", parsed)
      }
      if (lastError) {
        lastError = ""
        emit("engine_status", statusBody())
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "who failed"
      if (message !== lastError) {
        lastError = message
        note(message)
        emit("error", { message })
      }
    }
  }

  async function listenLoop() {
    while (!stopped) {
      binPath = discoverBinary(env)
      if (!binPath) {
        dashboardListening = false
        await sleep(2000, timers)
        continue
      }
      const started = Date.now()
      dashboardListening = true
      emit("engine_status", statusBody())
      let result
      try {
        result = await runCancellable(binPath, ["listen", "--as", "dashboard", "--wait", "600"], 620_000)
      } catch (error) {
        dashboardListening = false
        const message = error instanceof Error ? error.message : "listen failed"
        note(`listen stopped: ${message}`)
        emit("error", { message })
        await sleep(1000, timers)
        continue
      }
      dashboardListening = false
      if (stopped) return
      const parsed = parseListenOutput(result.stdout)
      const person = directory?.person ?? ""
      for (const message of parsed.messages) {
        if (isOwnCopy(message, person)) continue
        emit("message", { ...message, receivedAt: Date.now() })
      }
      if (parsed.leftover) emit("error", { message: "Could not parse a listen block.", raw: parsed.leftover })
      if (result.code !== 0) {
        const message = firstLine(result.stderr || "listen failed")
        note(`listen exit ${result.code}: ${message}`)
        emit("error", { message })
        if (Date.now() - started < 1000) await sleep(1000, timers)
      }
    }
  }

  function runCancellable(bin: string, args: string[], timeoutMs: number): Promise<{ code: number | null; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const child = spawn(bin, args, {
        shell: false,
        env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      })
      listenAbort = { kill: () => child.kill("SIGTERM") }
      const out: Buffer[] = []
      const err: Buffer[] = []
      child.stdout.on("data", (chunk: Buffer) => out.push(chunk))
      child.stderr.on("data", (chunk: Buffer) => err.push(chunk))
      const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs)
      child.on("error", (error) => {
        clearTimeout(timer)
        listenAbort = null
        reject(error)
      })
      child.on("close", (code) => {
        clearTimeout(timer)
        listenAbort = null
        resolve({ code, stdout: Buffer.concat(out).toString("utf8"), stderr: Buffer.concat(err).toString("utf8") })
      })
    })
  }

  async function sendMessage(body: {
    to?: string
    body?: string
    fyi?: boolean
    notify?: boolean
    replyTo?: string
    kind?: string
  }) {
    binPath = discoverBinary(env)
    if (!binPath) {
      return { recipients: [], messageIds: [], error: "reason-network is not installed." }
    }
    if (!directory?.person) await pollWho()
    const person = directory?.person
    if (!person) {
      return { recipients: [], messageIds: [], error: "This computer is not in a team yet." }
    }
    const text = typeof body.body === "string" ? body.body : ""
    if (!text.trim()) return { recipients: [], messageIds: [], error: "The message is empty." }
    const kind = body.kind ?? "tell"
    const from = kind === "broadcast" ? `${person}/terminal` : `${person}/dashboard`
    const to = kind === "broadcast" ? "*" : (body.to ?? "").trim()
    if (!to) return { recipients: [], messageIds: [], error: "Name who should get this." }
    if (kind === "broadcast") {
      const registered = await runEngine(binPath, ["listen", "--as", "terminal", "--wait", "0"], {
        timeoutMs: 15000,
        env,
      })
      const heard = parseListenOutput(registered.stdout)
      for (const message of heard.messages) {
        if (!isOwnCopy(message, person)) emit("message", { ...message, receivedAt: Date.now() })
      }
    }
    const args = ["send", to, "--from", from, "-"]
    if (body.fyi) args.push("--fyi")
    if (body.notify) args.push("--notify")
    if (body.replyTo) args.push("--reply-to", body.replyTo)
    note(`send kind=${kind} to=${to}`)
    const result = await runEngine(binPath, args, { input: text, timeoutMs: 20000, env })
    if (result.code !== 0) {
      const message = firstLine(result.stderr || result.stdout || "send failed")
      emit("error", { message })
      return { recipients: [], messageIds: [], error: message }
    }
    const parsed = parseSendResult(result.stdout)
    emit("send_result", parsed)
    return parsed
  }

  async function doctorText(): Promise<string> {
    binPath = discoverBinary(env)
    if (!binPath) return `reason-network is not installed.\n${installLine(process.platform)}\n`
    const result = await runEngine(binPath, ["doctor"], { timeoutMs: 20000, env })
    return `${result.stdout}${result.stderr}`
  }

  async function close() {
    if (stopped) return
    stopped = true
    clearInterval(pollTimer)
    for (const timer of timers) clearTimeout(timer)
    timers.clear()
    listenAbort?.kill()
    for (const client of clients) client.end()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }

  return { port, token, url, close }
}

function defaultHtmlPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url))
  return path.join(here, "..", "agent-network.html")
}

function serveHtml(res: ServerResponse, htmlPath: string, origin: string | undefined, port: number) {
  let html: string
  try {
    html = readFileSync(htmlPath, "utf8")
  } catch {
    html = "<!doctype html><title>Agent Network</title><p>Run bun run build:single so agent-network.html exists, then start the bridge again.</p>"
  }
  writeCors(res, origin, port)
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" })
  res.end(html)
}

function sendJson(res: ServerResponse, status: number, body: unknown, origin: string | undefined) {
  res.setHeader("content-type", "application/json; charset=utf-8")
  res.setHeader("cache-control", "no-store")
  if (origin === "null" || (origin && origin.startsWith("http://127.0.0.1:")) || (origin && origin.startsWith("http://localhost:"))) {
    res.setHeader("access-control-allow-origin", origin)
    res.setHeader("vary", "Origin")
  }
  res.writeHead(status)
  res.end(JSON.stringify(body))
}

function writeCors(res: ServerResponse, origin: string | undefined, port: number) {
  if (origin === "null") {
    res.setHeader("access-control-allow-origin", "null")
    res.setHeader("vary", "Origin")
  } else if (origin && (origin === `http://127.0.0.1:${port}` || origin === `http://localhost:${port}`)) {
    res.setHeader("access-control-allow-origin", origin)
    res.setHeader("vary", "Origin")
  }
  res.setHeader("access-control-allow-headers", "authorization, content-type")
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS")
}

function header(req: IncomingMessage, name: string): string | undefined {
  const value = req.headers[name]
  if (Array.isArray(value)) return value[0]
  return value
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on("data", (chunk: Buffer) => {
      size += chunk.length
      if (size > 1_000_000) {
        reject(new Error("body too large"))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
    req.on("error", reject)
  })
}

function firstLine(text: string): string {
  return text.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "error"
}

function note(message: string) {
  if (message.includes("<reason-message")) return
  console.log(`[bridge] ${message.slice(0, 240)}`)
}

function sleep(ms: number, timers: Set<NodeJS.Timeout>): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      timers.delete(timer)
      resolve()
    }, ms)
    timers.add(timer)
  })
}

function openBrowser(url: string) {
  const platform = process.platform
  let command = "xdg-open"
  let args = [url]
  if (platform === "darwin") command = "open"
  if (platform === "win32") {
    command = "cmd"
    args = ["/c", "start", "", url]
  }
  const child = spawn(command, args, { shell: false, detached: true, stdio: "ignore" })
  child.on("error", () => console.log("[bridge] could not open a browser"))
  child.unref()
}

export type { ParsedMessage }
