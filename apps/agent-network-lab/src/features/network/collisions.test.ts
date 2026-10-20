import { expect, test } from "bun:test"
import { activeCollisions, handoffConflict, idleOverlaps } from "./collisions.ts"
import type { SessionInfo } from "./types.ts"

function session(partial: Partial<SessionInfo> & Pick<SessionInfo, "address" | "status">): SessionInfo {
  const [person, name] = partial.address.split("/")
  return {
    name: name ?? partial.address,
    person: person ?? "colton",
    machine: "mbp",
    agent: "cli",
    cwd: "/tmp",
    repo: null,
    branch: null,
    since: 1,
    doing: null,
    tier: "turn",
    unread: 0,
    is_me: false,
    ...partial,
  }
}

const sessions = [
  session({ address: "colton/api", status: "busy", repo: "Acme/API.git", branch: "feat/auth", doing: "JWT middleware" }),
  session({ address: "maya/api", status: "live", repo: "acme/api", branch: "feat/auth", doing: "refresh tests" }),
  session({ address: "maya/other", status: "busy", repo: "acme/api", branch: "main", doing: "docs" }),
  session({ address: "colton/web", status: "idle", repo: "acme/web", branch: "main" }),
  session({ address: "sam/ci", status: "idle", repo: "acme/web.git", branch: "main" }),
  session({ address: "sam/no-branch", status: "busy", repo: "acme/api", branch: null }),
  session({ address: "sam/blank", status: "busy", repo: "acme/api", branch: "" }),
]

test("busy or live sessions on the same repo and branch are flagged", () => {
  const hits = activeCollisions(sessions)
  expect(hits).toHaveLength(1)
  expect(hits[0]!.sessions.map((item) => item.address).sort()).toEqual(["colton/api", "maya/api"])
})

test("the handoff target is excluded, and a different branch is not flagged", () => {
  expect(handoffConflict(sessions, "maya/api", "acme/api", "feat/auth")?.address).toBe("colton/api")
  expect(handoffConflict(sessions, "colton/api", "acme/api", "feat/auth")?.address).toBe("maya/api")
  expect(handoffConflict(sessions, "sam/else", "acme/api", "main")?.address).toBe("maya/other")
  expect(handoffConflict(sessions, "maya/other", "acme/api", "main")).toBeNull()
  expect(handoffConflict(sessions, "sam/else", "acme/api", "feat/other")).toBeNull()
})

test("idle overlap gives a soft note, .git and case are normalized, and a missing branch never matches", () => {
  const idle = idleOverlaps(sessions)
  expect(idle).toHaveLength(1)
  expect(idle[0]!.sessions.map((item) => item.address).sort()).toEqual(["colton/web", "sam/ci"])
  expect(activeCollisions(sessions).some((hit) => hit.sessions.some((item) => !item.branch))).toBe(false)
  expect(handoffConflict(sessions, "colton/api", "acme/api", null)).toBeNull()
})
