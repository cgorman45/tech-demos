import { expect, test } from "bun:test"
import { parseCommand } from "./parseCommand.ts"

const addresses = ["colton/worker", "colton/api-claude", "maya/api-codex", "sam/ci-opencode"]
const live = { addresses, mode: "live" as const }
const sim = { addresses, mode: "sim" as const }

test("parses every command form", () => {
  expect(parseCommand('ask colton/worker "hello"', live)).toEqual({
    ok: true,
    command: { type: "ask", address: "colton/worker", message: "hello" },
  })
  expect(parseCommand('tell colton/worker "note"', live)).toEqual({
    ok: true,
    command: { type: "tell", address: "colton/worker", message: "note", fyi: false, notify: false },
  })
  expect(parseCommand('handoff colton/worker "do the thing" --repo acme/api --branch feat/auth', live)).toEqual({
    ok: true,
    command: {
      type: "handoff",
      address: "colton/worker",
      message: "do the thing",
      repo: "acme/api",
      branch: "feat/auth",
    },
  })
  expect(parseCommand('broadcast "hello team"', live)).toEqual({
    ok: true,
    command: { type: "broadcast", message: "hello team" },
  })
  expect(parseCommand("who", live)).toEqual({ ok: true, command: { type: "who" } })
  expect(parseCommand("who api", live)).toEqual({ ok: true, command: { type: "who", filter: "api" } })
  expect(parseCommand("doctor", live).ok).toBe(true)
  expect(parseCommand("help", live)).toEqual({ ok: true, command: { type: "help" } })
  expect(parseCommand("clear", live)).toEqual({ ok: true, command: { type: "clear" } })
  expect(parseCommand("serve claude", sim)).toEqual({ ok: true, command: { type: "serve", tool: "claude" } })
  expect(parseCommand("as colton/worker", sim)).toEqual({ ok: true, command: { type: "as", address: "colton/worker" } })
  expect(parseCommand("move colton/worker acme/api@feat/auth", sim)).toEqual({
    ok: true,
    command: { type: "move", address: "colton/worker", repo: "acme/api", branch: "feat/auth" },
  })
})

test("quoted messages keep spaces and escaped quotes", () => {
  const parsed = parseCommand('ask colton/worker "say \\"hi there\\""', live)
  expect(parsed).toEqual({
    ok: true,
    command: { type: "ask", address: "colton/worker", message: 'say "hi there"' },
  })
  const spaced = parseCommand('tell colton/worker "hello world"', live)
  expect(spaced.ok && spaced.command.type === "tell" && spaced.command.message).toBe("hello world")
})

test("flags work in any order", () => {
  const parsed = parseCommand('tell --notify colton/worker --fyi "nope"', live)
  expect(parsed.ok).toBe(false)
  const handoff = parseCommand('handoff --branch feat/auth --repo acme/api colton/worker "task"', live)
  expect(handoff).toEqual({
    ok: true,
    command: {
      type: "handoff",
      address: "colton/worker",
      message: "task",
      repo: "acme/api",
      branch: "feat/auth",
    },
  })
  const tell = parseCommand('tell --fyi colton/worker "note"', live)
  expect(tell.ok && tell.command.type === "tell" && tell.command.fyi).toBe(true)
})

test("unknown command, unknown address with a suggestion, and sim-only commands", () => {
  expect(parseCommand("dance", live).ok).toBe(false)
  const missing = parseCommand('ask colton/workr "hi"', live)
  expect(missing.ok).toBe(false)
  if (!missing.ok) expect(missing.error).toContain("colton/worker")
  const liveServe = parseCommand("serve claude", live)
  expect(liveServe.ok).toBe(false)
  if (!liveServe.ok) expect(liveServe.error).toContain("simulator")
  const liveMove = parseCommand("move colton/worker acme/api@main", live)
  expect(liveMove.ok).toBe(false)
  const liveAs = parseCommand("as colton/worker", live)
  expect(liveAs.ok).toBe(false)
})
