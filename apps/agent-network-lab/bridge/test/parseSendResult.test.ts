import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import path from "node:path"
import { parseSendResult } from "../src/parseSendResult.ts"

const fixtures = path.join(import.meta.dir, "..", "fixtures")

test("send.txt from the sandbox parses delivered and queued notes", () => {
  const parsed = parseSendResult(readFileSync(path.join(fixtures, "send.txt"), "utf8"))
  expect(parsed.recipients.map((row) => row.state)).toEqual(["delivered", "queued", "queued", "queued"])
  expect(parsed.recipients[0]).toMatchObject({
    address: "colton/worker",
    state: "delivered",
    note: "delivered: the session was waiting for messages",
  })
  expect(parsed.recipients[2]!.note.startsWith("queued as FYI")).toBe(true)
  expect(parsed.messageIds).toHaveLength(4)
})

test("broadcast.txt has one line per recipient and no message id", () => {
  const parsed = parseSendResult(readFileSync(path.join(fixtures, "broadcast.txt"), "utf8"))
  expect(parsed.messageIds).toEqual([])
  expect(parsed.recipients.map((row) => `${row.address} ${row.state}`)).toEqual([
    "colton/dashboard delivered",
    "colton/worker queued",
  ])
})

test("each recipient state is recognized", () => {
  const text = [
    "→ a/b: pushed: woke the session",
    "→ a/b: queued: it gets it the next time it listens",
    "→ a/b: inbox: waiting in the inbox",
    "→ a/b: held: held until colton approves it",
    "→ a/b: delivered: the session was waiting for messages",
    "→ a/b: refused: agents message one session, not a group",
    "message id 01ABC",
  ].join("\n")
  const parsed = parseSendResult(text)
  expect(parsed.recipients.map((row) => row.state)).toEqual([
    "pushed",
    "queued",
    "inbox",
    "held",
    "delivered",
    "refused",
  ])
  expect(parsed.messageIds).toEqual(["01ABC"])
})
