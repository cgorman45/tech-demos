export type HandoffStatus = "open" | "done" | "blocked"

export type Handoff = {
  id: string
  to: string
  task: string
  repo: string | null
  branch: string | null
  status: HandoffStatus
  at: number
}

export function handoffBody(from: string, task: string, repo: string | null, branch: string | null): string {
  const where = repo && branch ? `${repo}@${branch}` : repo || branch || "unspecified"
  return `Handoff from ${from}: ${task}\nWhere: ${where}\nReply with done, blocked, or a question.`
}

export function statusFromReply(body: string): HandoffStatus {
  const word = body.trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? ""
  if (word === "done") return "done"
  if (word === "blocked") return "blocked"
  return "open"
}

export function applyReply(handoff: Handoff, body: string): Handoff {
  return { ...handoff, status: statusFromReply(body) }
}
