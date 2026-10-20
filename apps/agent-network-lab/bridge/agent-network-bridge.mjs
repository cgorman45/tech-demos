// bridge/src/main.ts
import { pathToFileURL } from "node:url";

// bridge/src/server.ts
import { randomBytes } from "node:crypto";
import { spawn as spawn2 } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import path2 from "node:path";
import { fileURLToPath } from "node:url";

// bridge/src/auth.ts
function allowedHosts(port) {
  return [`127.0.0.1:${port}`, `localhost:${port}`];
}
function allowedOrigins(port) {
  return [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
}
function authorize(input) {
  const host = (input.host ?? "").trim().toLowerCase();
  if (!allowedHosts(input.port).includes(host)) {
    return { ok: false, status: 403, error: "bad host" };
  }
  const origin = input.origin;
  if (origin !== undefined && origin !== "null" && !allowedOrigins(input.port).includes(origin)) {
    return { ok: false, status: 403, error: "bad origin" };
  }
  if (!input.requireToken)
    return { ok: true };
  const header = input.authorization?.startsWith("Bearer ") ? input.authorization.slice("Bearer ".length).trim() : "";
  const presented = header || (input.urlToken ?? "");
  if (!presented || !safeEqual(presented, input.token)) {
    return { ok: false, status: 401, error: "bad token" };
  }
  return { ok: true };
}
function safeEqual(a, b) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length)
    return false;
  let diff = 0;
  for (let i = 0;i < left.length; i++)
    diff |= left[i] ^ right[i];
  return diff === 0;
}

// bridge/src/engine.ts
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
function discoverBinary(env = process.env, home = homedir()) {
  const fromEnv = env.REASON_NETWORK_BIN;
  if (fromEnv && existsSync(fromEnv))
    return fromEnv;
  const onPath = which("reason-network", env);
  if (onPath)
    return onPath;
  const suffix = process.platform === "win32" ? ".exe" : "";
  const candidates = [
    path.join(home, ".local", "bin", `reason-network${suffix}`),
    path.join(home, ".reason", "bin", `reason-network${suffix}`),
    path.join(home, ".reason", "bin", "reason-network")
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate))
      return candidate;
  }
  return null;
}
function which(name, env) {
  const pathEnv = env.PATH || env.Path || "";
  const sep = process.platform === "win32" ? ";" : ":";
  const exts = process.platform === "win32" ? [".exe", ".cmd", ""] : [""];
  for (const dir of pathEnv.split(sep)) {
    if (!dir)
      continue;
    for (const ext of exts) {
      const full = path.join(dir, name + ext);
      if (existsSync(full))
        return full;
    }
  }
  return null;
}
function runEngine(bin, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      shell: false,
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true
    });
    const out = [];
    const err = [];
    child.stdout.on("data", (chunk) => out.push(chunk));
    child.stderr.on("data", (chunk) => err.push(chunk));
    let timer;
    if (opts.timeoutMs && opts.timeoutMs > 0) {
      timer = setTimeout(() => {
        child.kill("SIGTERM");
      }, opts.timeoutMs);
    }
    child.on("error", (error) => {
      if (timer)
        clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code, signal) => {
      if (timer)
        clearTimeout(timer);
      resolve({
        code,
        signal,
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(err).toString("utf8")
      });
    });
    if (opts.input !== undefined)
      child.stdin.write(opts.input);
    child.stdin.end();
  });
}

// bridge/src/parseMessages.ts
var BLOCK = /<reason-message\b([^>]*)>([\s\S]*?)<\/reason-message>/g;
function parseListenOutput(text) {
  const messages = [];
  const consumed = [];
  for (const match of text.matchAll(BLOCK)) {
    const index = match.index ?? 0;
    consumed.push([index, index + match[0].length]);
    const attrs = parseAttrs(match[1] ?? "");
    messages.push({
      id: attrs.id ?? "",
      from: attrs.from ?? "",
      agent: attrs.agent ?? null,
      repo: attrs.repo ?? null,
      via: attrs.via ?? null,
      replyTo: attrs.reply_to ?? null,
      body: (match[2] ?? "").replace(/^\n/, "").replace(/\n$/, "")
    });
  }
  let rest = text;
  for (const [start, end] of consumed.sort((a, b) => b[0] - a[0])) {
    rest = rest.slice(0, start) + rest.slice(end);
  }
  const leftover = rest.split(/\r?\n/).filter((line) => !isHint(line)).join(`
`).trim();
  return { messages, leftover };
}
function isOwnCopy(message, person) {
  if (!person)
    return false;
  if (message.from === `${person}/dashboard`)
    return true;
  if (message.via === "*" && message.from === `${person}/terminal`)
    return true;
  return false;
}
function isHint(line) {
  const trimmed = line.trim();
  if (!trimmed)
    return true;
  if (trimmed.startsWith("No messages"))
    return true;
  if (trimmed.startsWith("From ") && trimmed.includes("Reply if useful"))
    return true;
  return false;
}
function parseAttrs(source) {
  const out = {};
  const re = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*"([^"]*)"/g;
  for (const match of source.matchAll(re)) {
    out[match[1]] = decodeAttr(match[2]);
  }
  return out;
}
function decodeAttr(value) {
  return value.replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

// bridge/src/parseSendResult.ts
var STATES = ["pushed", "queued", "inbox", "held", "delivered", "refused", "notified"];
function parseSendResult(text) {
  const recipients = [];
  const messageIds = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed)
      continue;
    const id = /^message id (\S+)$/.exec(trimmed);
    if (id) {
      messageIds.push(id[1]);
      continue;
    }
    const arrow = /^[→>]+\s*(.+?):\s+(\S[\s\S]*)$/.exec(trimmed);
    if (!arrow)
      continue;
    const note = arrow[2].trim();
    recipients.push({
      address: arrow[1].trim(),
      state: stateOf(note),
      note
    });
  }
  return { recipients, messageIds };
}
function stateOf(note) {
  if (note.startsWith("not notified"))
    return "not notified";
  const match = new RegExp(`^(${STATES.join("|")})\\b`).exec(note);
  return match ? match[1] : "unknown";
}

// bridge/src/version.ts
var TESTED_VERSION = "0.10.8";
var INSTALL_LINES = {
  unix: "curl -fsSL https://github.com/reason-machines/reason-network/releases/latest/download/install.sh | sh",
  windows: "irm https://github.com/reason-machines/reason-network/releases/latest/download/install.ps1 | iex"
};
function installLine(platform) {
  return platform === "win32" ? INSTALL_LINES.windows : INSTALL_LINES.unix;
}
function parseVersion(text) {
  const match = text.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}
function versionWarning(actual) {
  if (!actual)
    return null;
  const parts = actual.split(".");
  const tested = TESTED_VERSION.split(".");
  if (parts[0] !== tested[0] || parts[1] !== tested[1]) {
    return `This dashboard was tested with reason-network ${TESTED_VERSION}. This machine has ${actual}.`;
  }
  return null;
}

// bridge/src/server.ts
async function startBridge(opts) {
  const env = opts.env ?? process.env;
  const token = opts.token ?? randomBytes(32).toString("hex");
  const htmlPath = opts.htmlPath ?? defaultHtmlPath();
  const clients = new Set;
  let stopped = false;
  let directory = null;
  let directoryJson = "";
  let version = null;
  let binPath = discoverBinary(env);
  let dashboardListening = false;
  let lastError = "";
  let listenAbort = null;
  const timers = new Set;
  const server = createServer((req, res) => {
    handle(req, res).catch((error) => {
      const message = error instanceof Error ? error.message : "request failed";
      if (!res.headersSent)
        sendJson(res, 500, { error: message }, undefined);
    });
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(opts.port, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : opts.port;
  const url = `http://127.0.0.1:${port}/#token=${token}`;
  console.log(`Open ${url}`);
  if (opts.openBrowser)
    openBrowser(url);
  const pollTimer = setInterval(() => {
    pollWho();
  }, 2000);
  refreshVersion();
  pollWho();
  listenLoop();
  async function handle(req, res) {
    const urlObj = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    const host = header(req, "host");
    const origin = header(req, "origin");
    const requireToken = urlObj.pathname.startsWith("/api/");
    if (req.method === "OPTIONS" && requireToken) {
      const gate = authorize({
        host,
        origin,
        authorization: undefined,
        urlToken: undefined,
        token,
        port,
        requireToken: false
      });
      if (!gate.ok) {
        sendJson(res, gate.status, { error: gate.error }, origin);
        return;
      }
      writeCors(res, origin, port);
      res.writeHead(204);
      res.end();
      return;
    }
    const gate = authorize({
      host,
      origin,
      authorization: header(req, "authorization"),
      urlToken: urlObj.searchParams.get("token") ?? undefined,
      token,
      port,
      requireToken
    });
    if (!gate.ok) {
      sendJson(res, gate.status, { error: gate.error }, origin);
      return;
    }
    if (req.method === "GET" && urlObj.pathname === "/") {
      serveHtml(res, htmlPath, origin, port);
      return;
    }
    if (req.method === "GET" && urlObj.pathname === "/api/status") {
      sendJson(res, 200, statusBody(), origin);
      return;
    }
    if (req.method === "GET" && urlObj.pathname === "/api/doctor") {
      const text = await doctorText();
      writeCors(res, origin, port);
      res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
      res.end(text);
      return;
    }
    if (req.method === "GET" && urlObj.pathname === "/api/events") {
      startSse(req, res, origin);
      return;
    }
    if (req.method === "POST" && urlObj.pathname === "/api/send") {
      const raw = await readBody(req);
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        sendJson(res, 400, { error: "Send a JSON body." }, origin);
        return;
      }
      const result = await sendMessage(body);
      sendJson(res, result.error ? 400 : 200, result, origin);
      return;
    }
    sendJson(res, 404, { error: "not found" }, origin);
  }
  function statusBody() {
    const person = directory?.person ?? null;
    const inTeam = Boolean(directory?.team);
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
      platform: process.platform
    };
  }
  function emit(event, data) {
    const payload = `event: ${event}
data: ${JSON.stringify(data)}

`;
    for (const client of clients)
      client.write(payload);
  }
  function startSse(req, res, origin) {
    writeCors(res, origin, port);
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-store",
      connection: "keep-alive"
    });
    res.write(`: ok

`);
    clients.add(res);
    if (directory)
      res.write(`event: directory
data: ${JSON.stringify(directory)}

`);
    res.write(`event: engine_status
data: ${JSON.stringify(statusBody())}

`);
    const beat = setInterval(() => res.write(`: ping

`), 15000);
    const drop = () => {
      clearInterval(beat);
      clients.delete(res);
    };
    req.on("close", drop);
    res.on("close", drop);
  }
  async function refreshVersion() {
    binPath = discoverBinary(env);
    if (!binPath) {
      version = null;
      emit("engine_status", statusBody());
      return;
    }
    try {
      const result = await runEngine(binPath, ["--version"], { timeoutMs: 8000, env });
      version = parseVersion(`${result.stdout}
${result.stderr}`);
    } catch {
      version = null;
    }
    emit("engine_status", statusBody());
  }
  async function pollWho() {
    if (stopped)
      return;
    binPath = discoverBinary(env);
    if (!binPath) {
      if (lastError !== "missing") {
        lastError = "missing";
        emit("engine_status", statusBody());
      }
      return;
    }
    try {
      const result = await runEngine(binPath, ["who", "--json", "--all"], { timeoutMs: 15000, env });
      if (result.code !== 0) {
        const message = firstLine(result.stderr || result.stdout || "who failed");
        if (message !== lastError) {
          lastError = message;
          note(message);
          emit("error", { message });
        }
        return;
      }
      const parsed = JSON.parse(result.stdout);
      if (!parsed || !Array.isArray(parsed.sessions)) {
        emit("error", { message: "who returned an unexpected shape", raw: result.stdout.slice(0, 500) });
        return;
      }
      const next = JSON.stringify(parsed);
      directory = parsed;
      if (next !== directoryJson) {
        directoryJson = next;
        emit("directory", parsed);
      }
      if (lastError) {
        lastError = "";
        emit("engine_status", statusBody());
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "who failed";
      if (message !== lastError) {
        lastError = message;
        note(message);
        emit("error", { message });
      }
    }
  }
  async function listenLoop() {
    while (!stopped) {
      binPath = discoverBinary(env);
      if (!binPath) {
        dashboardListening = false;
        await sleep(2000, timers);
        continue;
      }
      const started = Date.now();
      dashboardListening = true;
      emit("engine_status", statusBody());
      let result;
      try {
        result = await runCancellable(binPath, ["listen", "--as", "dashboard", "--wait", "600"], 620000);
      } catch (error) {
        dashboardListening = false;
        const message = error instanceof Error ? error.message : "listen failed";
        note(`listen stopped: ${message}`);
        emit("error", { message });
        await sleep(1000, timers);
        continue;
      }
      dashboardListening = false;
      if (stopped)
        return;
      const parsed = parseListenOutput(result.stdout);
      const person = directory?.person ?? "";
      for (const message of parsed.messages) {
        if (isOwnCopy(message, person))
          continue;
        emit("message", { ...message, receivedAt: Date.now() });
      }
      if (parsed.leftover)
        emit("error", { message: "Could not parse a listen block.", raw: parsed.leftover });
      if (result.code !== 0) {
        const message = firstLine(result.stderr || "listen failed");
        note(`listen exit ${result.code}: ${message}`);
        emit("error", { message });
        if (Date.now() - started < 1000)
          await sleep(1000, timers);
      }
    }
  }
  function runCancellable(bin, args, timeoutMs) {
    return new Promise((resolve, reject) => {
      const child = spawn2(bin, args, {
        shell: false,
        env,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });
      listenAbort = { kill: () => child.kill("SIGTERM") };
      const out = [];
      const err = [];
      child.stdout.on("data", (chunk) => out.push(chunk));
      child.stderr.on("data", (chunk) => err.push(chunk));
      const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs);
      child.on("error", (error) => {
        clearTimeout(timer);
        listenAbort = null;
        reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        listenAbort = null;
        resolve({ code, stdout: Buffer.concat(out).toString("utf8"), stderr: Buffer.concat(err).toString("utf8") });
      });
    });
  }
  async function sendMessage(body) {
    binPath = discoverBinary(env);
    if (!binPath) {
      return { recipients: [], messageIds: [], error: "reason-network is not installed." };
    }
    if (!directory?.person)
      await pollWho();
    const person = directory?.person;
    if (!person) {
      return { recipients: [], messageIds: [], error: "This computer is not in a team yet." };
    }
    const text = typeof body.body === "string" ? body.body : "";
    if (!text.trim())
      return { recipients: [], messageIds: [], error: "The message is empty." };
    const kind = body.kind ?? "tell";
    const from = kind === "broadcast" ? `${person}/terminal` : `${person}/dashboard`;
    const to = kind === "broadcast" ? "*" : (body.to ?? "").trim();
    if (!to)
      return { recipients: [], messageIds: [], error: "Name who should get this." };
    if (kind === "broadcast") {
      const registered = await runEngine(binPath, ["listen", "--as", "terminal", "--wait", "0"], {
        timeoutMs: 15000,
        env
      });
      const heard = parseListenOutput(registered.stdout);
      for (const message of heard.messages) {
        if (!isOwnCopy(message, person))
          emit("message", { ...message, receivedAt: Date.now() });
      }
    }
    const args = ["send", to, "--from", from, "-"];
    if (body.fyi)
      args.push("--fyi");
    if (body.notify)
      args.push("--notify");
    if (body.replyTo)
      args.push("--reply-to", body.replyTo);
    note(`send kind=${kind} to=${to}`);
    const result = await runEngine(binPath, args, { input: text, timeoutMs: 20000, env });
    if (result.code !== 0) {
      const message = firstLine(result.stderr || result.stdout || "send failed");
      emit("error", { message });
      return { recipients: [], messageIds: [], error: message };
    }
    const parsed = parseSendResult(result.stdout);
    emit("send_result", parsed);
    return parsed;
  }
  async function doctorText() {
    binPath = discoverBinary(env);
    if (!binPath)
      return `reason-network is not installed.
${installLine(process.platform)}
`;
    const result = await runEngine(binPath, ["doctor"], { timeoutMs: 20000, env });
    return `${result.stdout}${result.stderr}`;
  }
  async function close() {
    if (stopped)
      return;
    stopped = true;
    clearInterval(pollTimer);
    for (const timer of timers)
      clearTimeout(timer);
    timers.clear();
    listenAbort?.kill();
    for (const client of clients)
      client.end();
    await new Promise((resolve) => server.close(() => resolve()));
  }
  return { port, token, url, close };
}
function defaultHtmlPath() {
  const here = path2.dirname(fileURLToPath(import.meta.url));
  return path2.join(here, "..", "agent-network.html");
}
function serveHtml(res, htmlPath, origin, port) {
  let html;
  try {
    html = readFileSync(htmlPath, "utf8");
  } catch {
    html = "<!doctype html><title>Agent Network</title><p>Run bun run build:single so agent-network.html exists, then start the bridge again.</p>";
  }
  writeCors(res, origin, port);
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
  res.end(html);
}
function sendJson(res, status, body, origin) {
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  if (origin === "null" || origin && origin.startsWith("http://127.0.0.1:") || origin && origin.startsWith("http://localhost:")) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "Origin");
  }
  res.writeHead(status);
  res.end(JSON.stringify(body));
}
function writeCors(res, origin, port) {
  if (origin === "null") {
    res.setHeader("access-control-allow-origin", "null");
    res.setHeader("vary", "Origin");
  } else if (origin && (origin === `http://127.0.0.1:${port}` || origin === `http://localhost:${port}`)) {
    res.setHeader("access-control-allow-origin", origin);
    res.setHeader("vary", "Origin");
  }
  res.setHeader("access-control-allow-headers", "authorization, content-type");
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
}
function header(req, name) {
  const value = req.headers[name];
  if (Array.isArray(value))
    return value[0];
  return value;
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 1e6) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
function firstLine(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "error";
}
function note(message) {
  if (message.includes("<reason-message"))
    return;
  console.log(`[bridge] ${message.slice(0, 240)}`);
}
function sleep(ms, timers) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      timers.delete(timer);
      resolve();
    }, ms);
    timers.add(timer);
  });
}
function openBrowser(url) {
  const platform = process.platform;
  let command = "xdg-open";
  let args = [url];
  if (platform === "darwin")
    command = "open";
  if (platform === "win32") {
    command = "cmd";
    args = ["/c", "start", "", url];
  }
  const child = spawn2(command, args, { shell: false, detached: true, stdio: "ignore" });
  child.on("error", () => console.log("[bridge] could not open a browser"));
  child.unref();
}

// bridge/src/main.ts
function parseArgs(argv) {
  let port = 4777;
  let openBrowser = true;
  for (let i = 0;i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--no-open")
      openBrowser = false;
    else if (arg === "--port") {
      const value = Number(argv[++i]);
      if (!Number.isInteger(value) || value < 0 || value > 65535) {
        throw new Error("Port must be an integer from 0 to 65535.");
      }
      port = value;
    }
  }
  return { port, openBrowser };
}
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bridge = await startBridge(args);
  const shutdown = () => {
    bridge.close().then(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
var entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "failed to start";
    console.error(`[bridge] ${message}`);
    process.exit(1);
  });
}
export {
  parseArgs
};
