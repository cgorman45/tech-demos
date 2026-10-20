export const DEMO_MS = 30_000

export type DemoEvent =
  | { at: number; type: "incoming"; from: string; agent: string; repo: string; body: string }
  | { at: number; type: "status"; address: string; status: string; repo?: string; branch?: string; doing?: string }

export const demoScript: DemoEvent[] = [
  {
    at: 2000,
    type: "incoming",
    from: "maya/api-codex",
    agent: "codex",
    repo: "acme/api",
    body: "The refresh tests fail when the token is rotated. Are you changing the format?",
  },
  {
    at: 8000,
    type: "status",
    address: "colton/web-cursor",
    status: "busy",
    repo: "acme/api",
    branch: "feat/auth",
    doing: "checking the same auth branch",
  },
  {
    at: 15000,
    type: "incoming",
    from: "sam/ci-opencode",
    agent: "opencode",
    repo: "acme/web",
    body: "Build is green on main.",
  },
  {
    at: 22000,
    type: "status",
    address: "maya/api-codex",
    status: "idle",
    doing: "waiting",
  },
]
