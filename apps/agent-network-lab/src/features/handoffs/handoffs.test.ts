import { expect, test } from "bun:test"
import { applyReply, handoffBody, statusFromReply, type Handoff } from "./handoffs.ts"

test("handoff text names the task, the place, and the reply words", () => {
  const text = handoffBody("colton/dashboard", "check the token", "acme/api", "feat/auth")
  expect(text.startsWith("Handoff from colton/dashboard: check the token")).toBe(true)
  expect(text).toContain("Where: acme/api@feat/auth")
  expect(text).toContain("Reply with done, blocked, or a question.")
})

test("a reply is open, done, or blocked from its first word", () => {
  expect(statusFromReply("done")).toBe("done")
  expect(statusFromReply("Done with the middleware.")).toBe("done")
  expect(statusFromReply("blocked on the failing test")).toBe("blocked")
  expect(statusFromReply("Blocked: needs a token")).toBe("blocked")
  expect(statusFromReply("question: which file?")).toBe("open")
  const handoff: Handoff = {
    id: "1",
    to: "maya/api-codex",
    task: "check tests",
    repo: "acme/api",
    branch: "feat/auth",
    status: "open",
    at: 1,
  }
  expect(applyReply(handoff, "done").status).toBe("done")
  expect(applyReply(handoff, "blocked waiting on ci").status).toBe("blocked")
  expect(applyReply(handoff, "still looking").status).toBe("open")
})
