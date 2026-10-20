export type RecipientLine = {
  address: string
  state: string
  note: string
}

export type ParsedSendResult = {
  recipients: RecipientLine[]
  messageIds: string[]
}

const STATES = ["pushed", "queued", "inbox", "held", "delivered", "refused", "notified"] as const

export function parseSendResult(text: string): ParsedSendResult {
  const recipients: RecipientLine[] = []
  const messageIds: string[] = []
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const id = /^message id (\S+)$/.exec(trimmed)
    if (id) {
      messageIds.push(id[1]!)
      continue
    }
    const arrow = /^[→>]+\s*(.+?):\s+(\S[\s\S]*)$/.exec(trimmed)
    if (!arrow) continue
    const note = arrow[2]!.trim()
    recipients.push({
      address: arrow[1]!.trim(),
      state: stateOf(note),
      note,
    })
  }
  return { recipients, messageIds }
}

function stateOf(note: string): string {
  if (note.startsWith("not notified")) return "not notified"
  const match = new RegExp(`^(${STATES.join("|")})\\b`).exec(note)
  return match ? match[1]! : "unknown"
}
