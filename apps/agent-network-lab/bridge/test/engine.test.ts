import { expect, test } from "bun:test"
import { chmodSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { discoverBinary, runEngine } from "../src/engine.ts"

const fake = path.join(import.meta.dir, "fake-engine.mjs")

test("binary discovery checks the env, then PATH, then ~/.local/bin, then ~/.reason/bin", () => {
  const home = mkdtempSync(path.join(tmpdir(), "rn-home-"))
  const pathDir = mkdtempSync(path.join(tmpdir(), "rn-path-"))
  const envBin = path.join(mkdtempSync(path.join(tmpdir(), "rn-env-")), "reason-network")
  const localBin = path.join(home, ".local", "bin", "reason-network")
  const reasonBin = path.join(home, ".reason", "bin", "reason-network")
  const pathBin = path.join(pathDir, "reason-network")
  for (const file of [envBin, localBin, reasonBin, pathBin]) {
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, "#!/bin/sh\nexit 0\n")
    chmodSync(file, 0o755)
  }
  const env = { PATH: pathDir, REASON_NETWORK_BIN: envBin }
  expect(discoverBinary(env, home)).toBe(envBin)
  expect(discoverBinary({ PATH: pathDir }, home)).toBe(pathBin)
  expect(discoverBinary({ PATH: "" }, home)).toBe(localBin)
  rmSync(localBin)
  expect(discoverBinary({ PATH: "" }, home)).toBe(reasonBin)
})

test("discovery skips a missing env path and falls through", () => {
  const home = mkdtempSync(path.join(tmpdir(), "rn-home-"))
  const reasonBin = path.join(home, ".reason", "bin", "reason-network")
  mkdirSync(path.dirname(reasonBin), { recursive: true })
  writeFileSync(reasonBin, "x")
  expect(discoverBinary({ PATH: "", REASON_NETWORK_BIN: "/no/such/reason-network" }, home)).toBe(reasonBin)
})

test("spawn passes argv as an array and keeps quotes, $(), and newlines in stdin", async () => {
  const body = 'say "hi" and $(rm -rf /)\nnext line'
  const result = await runEngine(process.execPath, [fake], { input: body, timeoutMs: 5000 })
  expect(result.code).toBe(0)
  const parsed = JSON.parse(result.stdout) as { argv: string[]; stdin: string }
  expect(parsed.argv).toEqual([])
  expect(parsed.stdin).toBe(body)
  const quoted = await runEngine(process.execPath, [fake, "send", "colton/worker", "--from", "colton/dashboard", "-"], {
    input: body,
    timeoutMs: 5000,
  })
  const again = JSON.parse(quoted.stdout) as { argv: string[]; stdin: string }
  expect(again.argv).toEqual(["send", "colton/worker", "--from", "colton/dashboard", "-"])
  expect(again.stdin).toBe(body)
})
