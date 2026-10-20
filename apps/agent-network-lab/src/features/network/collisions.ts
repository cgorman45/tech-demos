import { repoKey, samePlace, type SessionInfo } from "./types.ts"

export type Overlap = {
  repo: string
  branch: string
  sessions: SessionInfo[]
}

const ACTIVE = new Set(["busy", "live"])

export function activeCollisions(sessions: SessionInfo[]): Overlap[] {
  return groups(sessions.filter((session) => ACTIVE.has(session.status)))
}

export function idleOverlaps(sessions: SessionInfo[]): Overlap[] {
  return groups(sessions.filter((session) => session.status === "idle"))
}

export function handoffConflict(
  sessions: SessionInfo[],
  targetAddress: string,
  repo: string | null,
  branch: string | null,
): SessionInfo | null {
  if (!repo || !branch) return null
  const place = { repo, branch }
  return (
    sessions.find(
      (session) =>
        session.address !== targetAddress &&
        ACTIVE.has(session.status) &&
        samePlace(session, place),
    ) ?? null
  )
}

function groups(sessions: SessionInfo[]): Overlap[] {
  const buckets = new Map<string, SessionInfo[]>()
  for (const session of sessions) {
    const repo = repoKey(session.repo)
    if (!repo || !session.branch) continue
    const key = `${repo}\n${session.branch}`
    const list = buckets.get(key) ?? []
    list.push(session)
    buckets.set(key, list)
  }
  const overlaps: Overlap[] = []
  for (const list of buckets.values()) {
    if (list.length < 2) continue
    overlaps.push({
      repo: list[0]!.repo ?? "",
      branch: list[0]!.branch ?? "",
      sessions: list,
    })
  }
  return overlaps
}
