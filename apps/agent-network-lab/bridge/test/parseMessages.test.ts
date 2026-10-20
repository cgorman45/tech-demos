import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import path from "node:path"
import { isOwnCopy, parseListenOutput } from "../src/parseMessages.ts"
import { directorySchema } from "../../src/features/network/types.ts"

const fixtures = path.join(import.meta.dir, "..", "fixtures")

describe("listen fixtures", () => {
  const text = readFileSync(path.join(fixtures, "listen.txt"), "utf8")
  const parsed = parseListenOutput(text)

  test("parses blocks from the sandbox, including repo, via, and reply_to", () => {
    expect(parsed.leftover).toBe("")
    expect(parsed.messages.map((message) => message.id)).toEqual([
      "01M5BBDYGFY8EKBXSQXRQGE5S7",
      "01M5BBEDXEDXNXS9E1NFKX0ZJK",
      "01M5BBDZ2AQP9S7HZND0AMQTNR",
      "01M5BBDZ2NJDFYK7G2VDMW5CY5",
      "01M5BBE7ZT5REF988FWV167F62",
    ])
    expect(parsed.messages[1]).toMatchObject({ from: "colton/repoagent", repo: "rn-repo", agent: "cli" })
    expect(parsed.messages[2]).toMatchObject({ via: "*", from: "colton/terminal" })
    expect(parsed.messages[3]).toMatchObject({ replyTo: "01TEST", from: "colton/worker" })
  })

  test("keeps multi-line bodies and angle brackets", () => {
    expect(parsed.messages[0]!.body).toContain("line two with <brackets>")
    expect(parsed.messages[0]!.body).toContain('quote "inside"')
    expect(parsed.messages[4]!.body).toContain("<b>not html</b>")
    expect(parsed.messages[4]!.body).toContain("angle < brackets >")
    expect(parsed.messages[4]!.body.split("\n").length).toBeGreaterThan(1)
  })

  test("a broken block is leftover text, not dropped", () => {
    const broken = parseListenOutput('noise before\n<reason-message from="x" id="1">no close')
    expect(broken.messages).toHaveLength(0)
    expect(broken.leftover).toContain("<reason-message")
  })

  test("decodes attribute escapes", () => {
    const parsed = parseListenOutput(
      '<reason-message from="a/b" agent="cli" repo="acme/api" id="9">\nhi &amp; there\n</reason-message>\n',
    )
    expect(parsed.messages[0]).toMatchObject({ from: "a/b", repo: "acme/api", body: "hi &amp; there" })
  })

  test("filters our dashboard and our own broadcast copies", () => {
    expect(isOwnCopy({ from: "colton/dashboard", via: null }, "colton")).toBe(true)
    expect(isOwnCopy({ from: "colton/terminal", via: "*" }, "colton")).toBe(true)
    expect(isOwnCopy({ from: "maya/terminal", via: "*" }, "colton")).toBe(false)
    expect(isOwnCopy({ from: "colton/worker", via: null }, "colton")).toBe(false)
  })
})

test("who.json from the sandbox matches the directory schema and keeps unknown fields", () => {
  const raw = JSON.parse(readFileSync(path.join(fixtures, "who.json"), "utf8")) as Record<string, unknown>
  raw.extra = { ok: true }
  const parsed = directorySchema.parse(raw)
  expect(parsed.team).toBe("capture-team")
  expect(parsed.person).toBe("colton")
  expect(parsed.sessions.some((session) => session.repo === "rn-repo" && session.branch === "feat/auth")).toBe(true)
  expect(parsed.extra).toEqual({ ok: true })
})
