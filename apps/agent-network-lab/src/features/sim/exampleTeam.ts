import type { Directory, MachineInfo, SessionInfo } from "../network/types.ts"

export function exampleTeam(now = Date.now()): Directory {
  const machines: MachineInfo[] = [
    machine("colton", "colton-mbp", true, true, null, null),
    machine("maya", "maya-studio", false, true, "direct", 28),
    machine("sam", "build-box", false, true, "relay", 180),
  ]
  const sessions: SessionInfo[] = [
    session("colton/api-claude", "claude", "colton", "colton-mbp", "push", "acme/api", "feat/auth", "busy", "JWT middleware", now - 2 * 60_000),
    session("colton/web-cursor", "cursor", "colton", "colton-mbp", "turn", "acme/web", "main", "idle", "waiting on review", now - 14 * 60_000),
    session("colton/docs-grok", "grok", "colton", "colton-mbp", "turn", "acme/docs", "main", "idle", null, now - 40 * 60_000),
    session("maya/api-codex", "codex", "maya", "maya-studio", "push", "acme/api", "feat/auth", "busy", "refresh token tests", now - 6 * 60_000),
    session("maya/mobile-cursor", "cursor", "maya", "maya-studio", "turn", "acme/mobile", "main", "live", "layout pass", now - 3 * 60_000),
    session("sam/ci-opencode", "opencode", "sam", "build-box", "push", "acme/web", "main", "idle", "watching main", now - 20 * 60_000),
    session("sam/worker-pi", "pi", "sam", "build-box", "push", "acme/worker", "main", "offline", null, now - 2 * 60 * 60_000),
  ]
  return { team: "example", person: "colton", machine: "colton-mbp", machines, sessions }
}

function machine(
  person: string,
  name: string,
  isMe: boolean,
  online: boolean,
  link: string | null,
  rtt: number | null,
): MachineInfo {
  return {
    person,
    machine: name,
    endpoint: `example-${person}-${name}`,
    is_me: isMe,
    online,
    link,
    rtt_ms: rtt,
    last_seen: online ? null : 1,
  }
}

function session(
  address: string,
  agent: string,
  person: string,
  machine: string,
  tier: string,
  repo: string,
  branch: string,
  status: string,
  doing: string | null,
  since: number,
): SessionInfo {
  return {
    address,
    name: address.split("/")[1] ?? address,
    person,
    machine,
    agent,
    cwd: `/work/${repo}`,
    repo,
    branch,
    status,
    since,
    doing,
    tier,
    unread: 0,
    is_me: false,
  }
}
