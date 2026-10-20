import type { LogEntry } from "../edit/importExport.ts"

export function logAsText(entries: LogEntry[]): string {
  return entries
    .map((entry) => {
      const when = new Date(entry.at).toISOString()
      const route = [entry.from, entry.to].filter(Boolean).join(" to ")
      const extra = [entry.state, entry.elapsedMs !== undefined ? `${entry.elapsedMs}ms` : ""]
        .filter(Boolean)
        .join(" ")
      return `${when} ${entry.kind} ${route} ${extra}\n${entry.body}`.trim()
    })
    .join("\n\n")
}

export function logAsJson(entries: LogEntry[]): string {
  return JSON.stringify(entries, null, 2)
}
