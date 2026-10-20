import { z } from "zod"
import { directorySchema, type Directory } from "../network/types.ts"

export const logEntrySchema = z.object({
  id: z.string(),
  at: z.number(),
  kind: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
  body: z.string(),
  state: z.string().optional(),
  elapsedMs: z.number().optional(),
  agent: z.string().nullable().optional(),
  repo: z.string().nullable().optional(),
  simulated: z.boolean().optional(),
  messageId: z.string().optional(),
})

export const handoffSchema = z.object({
  id: z.string(),
  to: z.string(),
  task: z.string(),
  repo: z.string().nullable(),
  branch: z.string().nullable(),
  status: z.enum(["open", "done", "blocked"]),
  at: z.number(),
})

export const backupSchema = z.object({
  version: z.literal(1),
  nicknames: z.record(z.string(), z.string()),
  hidden: z.array(z.string()),
  pinned: z.array(z.string()),
  machineColors: z.record(z.string(), z.string()),
  simTeam: directorySchema.nullable(),
  log: z.array(logEntrySchema).max(500),
  handoffs: z.array(handoffSchema),
  showOffline: z.boolean(),
})

export type Backup = z.infer<typeof backupSchema>
export type LogEntry = z.infer<typeof logEntrySchema>

export function parseBackup(text: string): { ok: true; data: Backup } | { ok: false; error: string } {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: "That file is not valid JSON." }
  }
  const parsed = backupSchema.safeParse(json)
  if (!parsed.success) {
    const detail = parsed.error.issues
      .slice(0, 4)
      .map((issue) => `${issue.path.join(".") || "file"}: ${issue.message}`)
      .join("; ")
    return { ok: false, error: `Import failed. ${detail}` }
  }
  return { ok: true, data: parsed.data }
}

export function emptyBackup(simTeam: Directory | null = null): Backup {
  return {
    version: 1,
    nicknames: {},
    hidden: [],
    pinned: [],
    machineColors: {},
    simTeam,
    log: [],
    handoffs: [],
    showOffline: false,
  }
}
