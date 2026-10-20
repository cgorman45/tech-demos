export type ParsedMessage = {
  id: string
  from: string
  agent: string | null
  repo: string | null
  via: string | null
  replyTo: string | null
  body: string
}

const BLOCK = /<reason-message\b([^>]*)>([\s\S]*?)<\/reason-message>/g

export function parseListenOutput(text: string): { messages: ParsedMessage[]; leftover: string } {
  const messages: ParsedMessage[] = []
  const consumed: Array<[number, number]> = []
  for (const match of text.matchAll(BLOCK)) {
    const index = match.index ?? 0
    consumed.push([index, index + match[0].length])
    const attrs = parseAttrs(match[1] ?? "")
    messages.push({
      id: attrs.id ?? "",
      from: attrs.from ?? "",
      agent: attrs.agent ?? null,
      repo: attrs.repo ?? null,
      via: attrs.via ?? null,
      replyTo: attrs.reply_to ?? null,
      body: (match[2] ?? "").replace(/^\n/, "").replace(/\n$/, ""),
    })
  }
  let rest = text
  for (const [start, end] of consumed.sort((a, b) => b[0] - a[0])) {
    rest = rest.slice(0, start) + rest.slice(end)
  }
  const leftover = rest
    .split(/\r?\n/)
    .filter((line) => !isHint(line))
    .join("\n")
    .trim()
  return { messages, leftover }
}

export function isOwnCopy(message: { from: string; via: string | null }, person: string): boolean {
  if (!person) return false
  if (message.from === `${person}/dashboard`) return true
  if (message.via === "*" && message.from === `${person}/terminal`) return true
  return false
}

function isHint(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return true
  if (trimmed.startsWith("No messages")) return true
  if (trimmed.startsWith("From ") && trimmed.includes("Reply if useful")) return true
  return false
}

function parseAttrs(source: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*"([^"]*)"/g
  for (const match of source.matchAll(re)) {
    out[match[1]!] = decodeAttr(match[2]!)
  }
  return out
}

function decodeAttr(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
}
