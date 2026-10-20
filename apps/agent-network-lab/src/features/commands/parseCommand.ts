export type CommandMode = "live" | "sim"

export type ParsedCommand =
  | { type: "ask"; address: string; message: string }
  | { type: "tell"; address: string; message: string; fyi: boolean; notify: boolean }
  | { type: "handoff"; address: string; message: string; repo?: string; branch?: string }
  | { type: "broadcast"; message: string }
  | { type: "who"; filter?: string }
  | { type: "doctor" }
  | { type: "help" }
  | { type: "clear" }
  | { type: "serve"; tool: string }
  | { type: "as"; address: string }
  | { type: "move"; address: string; repo: string; branch: string }

export type ParseResult = { ok: true; command: ParsedCommand } | { ok: false; error: string }

const SIM_ONLY = new Set(["serve", "as", "move"])

export function parseCommand(input: string, opts: { addresses: string[]; mode: CommandMode }): ParseResult {
  const tokens = tokenize(input.trim())
  if ("error" in tokens) return { ok: false, error: tokens.error }
  if (tokens.length === 0) return { ok: false, error: "Type a command. help lists them." }
  const [head, ...rest] = tokens
  const command = head!.toLowerCase()
  if (SIM_ONLY.has(command) && opts.mode === "live") {
    return {
      ok: false,
      error: `${command} only runs in the simulator. The open engine does not have that command.`,
    }
  }
  if (command === "help") return { ok: true, command: { type: "help" } }
  if (command === "clear") return { ok: true, command: { type: "clear" } }
  if (command === "doctor") return { ok: true, command: { type: "doctor" } }
  if (command === "who") {
    const filter = rest.join(" ").trim()
    return { ok: true, command: filter ? { type: "who", filter } : { type: "who" } }
  }
  const flags = takeFlags(rest)
  if ("error" in flags) return { ok: false, error: flags.error }
  if (command === "ask") {
    const placed = place(flags.positionals, 1)
    if ("error" in placed) return { ok: false, error: placed.error }
    const known = knownAddress(placed.address, opts.addresses)
    if ("error" in known) return { ok: false, error: known.error }
    return { ok: true, command: { type: "ask", address: known.address, message: placed.message } }
  }
  if (command === "tell") {
    if (flags.fyi && flags.notify) return { ok: false, error: "Use either --fyi or --notify." }
    const placed = place(flags.positionals, 1)
    if ("error" in placed) return { ok: false, error: placed.error }
    const known = knownAddress(placed.address, opts.addresses)
    if ("error" in known) return { ok: false, error: known.error }
    return {
      ok: true,
      command: { type: "tell", address: known.address, message: placed.message, fyi: flags.fyi, notify: flags.notify },
    }
  }
  if (command === "handoff") {
    const placed = place(flags.positionals, 1)
    if ("error" in placed) return { ok: false, error: placed.error }
    const known = knownAddress(placed.address, opts.addresses)
    if ("error" in known) return { ok: false, error: known.error }
    return {
      ok: true,
      command: {
        type: "handoff",
        address: known.address,
        message: placed.message,
        ...(flags.repo ? { repo: flags.repo } : {}),
        ...(flags.branch ? { branch: flags.branch } : {}),
      },
    }
  }
  if (command === "broadcast") {
    const message = flags.positionals.join(" ").trim()
    if (!message) return { ok: false, error: "broadcast needs a message." }
    return { ok: true, command: { type: "broadcast", message } }
  }
  if (command === "serve") {
    const tool = flags.positionals.join(" ").trim()
    if (!tool) return { ok: false, error: "serve needs a tool name." }
    return { ok: true, command: { type: "serve", tool } }
  }
  if (command === "as") {
    const address = flags.positionals[0]
    if (!address) return { ok: false, error: "as needs an address." }
    const known = knownAddress(address, opts.addresses)
    if ("error" in known) return { ok: false, error: known.error }
    return { ok: true, command: { type: "as", address: known.address } }
  }
  if (command === "move") {
    const address = flags.positionals[0]
    const place = flags.positionals[1]
    if (!address || !place || !place.includes("@")) {
      return { ok: false, error: 'move needs an address and repo@branch. Example: move colton/web acme/web@main' }
    }
    const known = knownAddress(address, opts.addresses)
    if ("error" in known) return { ok: false, error: known.error }
    const at = place.lastIndexOf("@")
    const repo = place.slice(0, at)
    const branch = place.slice(at + 1)
    if (!repo || !branch) return { ok: false, error: "move needs both a repo and a branch." }
    return { ok: true, command: { type: "move", address: known.address, repo, branch } }
  }
  return { ok: false, error: `Unknown command "${command}". Type help.` }
}

export function tokenize(input: string): string[] | { error: string } {
  const out: string[] = []
  let i = 0
  while (i < input.length) {
    while (input[i] === " " || input[i] === "\t") i++
    if (i >= input.length) break
    if (input[i] === '"') {
      i++
      let value = ""
      let closed = false
      while (i < input.length) {
        if (input[i] === "\\") {
          i++
          if (i >= input.length) return { error: "A backslash is missing the character it escapes." }
          value += input[i]
          i++
          continue
        }
        if (input[i] === '"') {
          closed = true
          i++
          break
        }
        value += input[i]
        i++
      }
      if (!closed) return { error: "A quote is missing its closing quote." }
      out.push(value)
      continue
    }
    let value = ""
    while (i < input.length && input[i] !== " " && input[i] !== "\t") {
      value += input[i]
      i++
    }
    out.push(value)
  }
  return out
}

function takeFlags(tokens: string[]): {
  positionals: string[]
  fyi: boolean
  notify: boolean
  repo?: string
  branch?: string
} | { error: string } {
  const positionals: string[] = []
  let fyi = false
  let notify = false
  let repo: string | undefined
  let branch: string | undefined
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!
    if (token === "--fyi") {
      fyi = true
      continue
    }
    if (token === "--notify") {
      notify = true
      continue
    }
    if (token === "--repo" || token === "--branch") {
      const value = tokens[++i]
      if (!value || value.startsWith("--")) return { error: `${token} needs a value.` }
      if (token === "--repo") repo = value
      else branch = value
      continue
    }
    if (token.startsWith("--")) return { error: `Unknown flag ${token}.` }
    positionals.push(token)
  }
  return { positionals, fyi, notify, repo, branch }
}

function place(positionals: string[], addressCount: number): { address: string; message: string } | { error: string } {
  if (positionals.length < addressCount + 1) {
    return { error: "That command needs an address and a message." }
  }
  return {
    address: positionals[0]!,
    message: positionals.slice(addressCount).join(" ").trim(),
  }
}

function knownAddress(address: string, addresses: string[]): { address: string } | { error: string } {
  if (address === "*" || address.endsWith("/*") || address.startsWith("repo:")) {
    return { error: `Use broadcast for a group. ${address} is not one session.` }
  }
  if (addresses.length === 0 || addresses.includes(address)) return { address }
  const byName = addresses.filter((item) => item.endsWith(`/${address}`) || item === address)
  if (byName.length === 1) return { address: byName[0]! }
  const suggestion = suggestAddress(address, addresses)
  if (suggestion) return { error: `No session named ${address}. Closest: ${suggestion}` }
  return { error: `No session named ${address}.` }
}

export function suggestAddress(input: string, addresses: string[]): string | null {
  let best: { address: string; distance: number } | null = null
  for (const address of addresses) {
    const distance = editDistance(input.toLowerCase(), address.toLowerCase())
    if (!best || distance < best.distance) best = { address, distance }
  }
  if (!best) return null
  const limit = Math.max(3, Math.ceil(input.length / 3))
  return best.distance <= limit ? best.address : null
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0]!
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const current = row[j]!
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, previous + cost)
      previous = current
    }
  }
  return row[b.length]!
}
