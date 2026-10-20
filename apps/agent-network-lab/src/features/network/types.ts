import { z } from "zod"

export const sessionSchema = z.looseObject({
  address: z.string(),
  name: z.string(),
  person: z.string(),
  machine: z.string(),
  agent: z.string(),
  cwd: z.string(),
  repo: z.string().nullable(),
  branch: z.string().nullable(),
  status: z.string(),
  since: z.number().nullable(),
  doing: z.string().nullable(),
  tier: z.string(),
  unread: z.number(),
  is_me: z.boolean(),
})

export const machineSchema = z.looseObject({
  person: z.string(),
  machine: z.string(),
  endpoint: z.string(),
  is_me: z.boolean(),
  online: z.boolean(),
  link: z.string().nullable(),
  rtt_ms: z.number().nullable(),
  last_seen: z.number().nullable(),
})

export const directorySchema = z.looseObject({
  team: z.string().nullable(),
  person: z.string(),
  machine: z.string(),
  machines: z.array(machineSchema),
  sessions: z.array(sessionSchema),
})

export type SessionInfo = z.infer<typeof sessionSchema>
export type MachineInfo = z.infer<typeof machineSchema>
export type Directory = z.infer<typeof directorySchema>

export type IncomingMessage = {
  id: string
  from: string
  agent: string | null
  repo: string | null
  via: string | null
  replyTo: string | null
  body: string
  receivedAt: number
  simulated?: boolean
}

export type RecipientState = {
  address: string
  state: string
  note: string
}

export type SendOutcome = {
  recipients: RecipientState[]
  messageIds: string[]
  error?: string
}

export type EngineStatus = {
  engine: "ok" | "missing" | "error"
  version: string | null
  path: string | null
  inTeam: boolean
  team: string | null
  person: string | null
  machine: string | null
  testedVersion: string
  versionWarning: string | null
  dashboardListening: boolean
  installLine: string
  installLines: { unix: string; windows: string }
  platform: string
}

export const engineStatusSchema = z.looseObject({
  engine: z.enum(["ok", "missing", "error"]),
  version: z.string().nullable(),
  path: z.string().nullable(),
  inTeam: z.boolean(),
  team: z.string().nullable(),
  person: z.string().nullable(),
  machine: z.string().nullable(),
  testedVersion: z.string(),
  versionWarning: z.string().nullable(),
  dashboardListening: z.boolean(),
  installLine: z.string(),
  installLines: z.object({ unix: z.string(), windows: z.string() }),
  platform: z.string(),
})

export function repoKey(repo: string | null | undefined): string | null {
  if (!repo) return null
  const trimmed = repo.trim().toLowerCase().replace(/\.git$/, "")
  return trimmed || null
}

export function samePlace(
  a: { repo: string | null; branch: string | null },
  b: { repo: string | null; branch: string | null },
): boolean {
  const left = repoKey(a.repo)
  const right = repoKey(b.repo)
  if (!left || !right || left !== right) return false
  if (!a.branch || !b.branch) return false
  return a.branch === b.branch
}

export function formatSince(since: number | null, now: number): string {
  if (!since) return ""
  const seconds = Math.max(0, Math.round((now - since) / 1000))
  if (seconds < 60) return `for ${seconds}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `for ${minutes}m`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `for ${hours}h`
  const days = Math.round(hours / 24)
  return `for ${days}d`
}

export function isOwnEcho(message: { from: string; via: string | null }, person: string): boolean {
  if (!person) return false
  if (message.from === `${person}/dashboard`) return true
  if (message.via === "*" && message.from === `${person}/terminal`) return true
  return false
}

export function isUtilitySession(session: SessionInfo, person: string): boolean {
  return session.person === person && (session.name === "dashboard" || session.name === "terminal")
}
