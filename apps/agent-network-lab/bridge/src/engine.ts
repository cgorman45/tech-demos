import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"

export type EngineRun = {
  code: number | null
  signal: NodeJS.Signals | null
  stdout: string
  stderr: string
}

export function discoverBinary(
  env: NodeJS.ProcessEnv = process.env,
  home: string = homedir(),
): string | null {
  const fromEnv = env.REASON_NETWORK_BIN
  if (fromEnv && existsSync(fromEnv)) return fromEnv
  const onPath = which("reason-network", env)
  if (onPath) return onPath
  const suffix = process.platform === "win32" ? ".exe" : ""
  const candidates = [
    path.join(home, ".local", "bin", `reason-network${suffix}`),
    path.join(home, ".reason", "bin", `reason-network${suffix}`),
    path.join(home, ".reason", "bin", "reason-network"),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

export function which(name: string, env: NodeJS.ProcessEnv): string | null {
  const pathEnv = env.PATH || env.Path || ""
  const sep = process.platform === "win32" ? ";" : ":"
  const exts = process.platform === "win32" ? [".exe", ".cmd", ""] : [""]
  for (const dir of pathEnv.split(sep)) {
    if (!dir) continue
    for (const ext of exts) {
      const full = path.join(dir, name + ext)
      if (existsSync(full)) return full
    }
  }
  return null
}

export function runEngine(
  bin: string,
  args: string[],
  opts: { input?: string; timeoutMs?: number; env?: NodeJS.ProcessEnv; cwd?: string } = {},
): Promise<EngineRun> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      shell: false,
      cwd: opts.cwd,
      env: opts.env ?? process.env,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    })
    const out: Buffer[] = []
    const err: Buffer[] = []
    child.stdout.on("data", (chunk: Buffer) => out.push(chunk))
    child.stderr.on("data", (chunk: Buffer) => err.push(chunk))
    let timer: NodeJS.Timeout | undefined
    if (opts.timeoutMs && opts.timeoutMs > 0) {
      timer = setTimeout(() => {
        child.kill("SIGTERM")
      }, opts.timeoutMs)
    }
    child.on("error", (error) => {
      if (timer) clearTimeout(timer)
      reject(error)
    })
    child.on("close", (code, signal) => {
      if (timer) clearTimeout(timer)
      resolve({
        code,
        signal,
        stdout: Buffer.concat(out).toString("utf8"),
        stderr: Buffer.concat(err).toString("utf8"),
      })
    })
    if (opts.input !== undefined) child.stdin.write(opts.input)
    child.stdin.end()
  })
}
