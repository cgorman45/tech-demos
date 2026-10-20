export function completeToken(partial: string, addresses: string[]): string[] {
  const needle = partial.toLowerCase()
  if (!needle) return []
  return addresses.filter((address) => address.toLowerCase().startsWith(needle) && address.toLowerCase() !== needle)
}

export function applyCompletion(input: string, addresses: string[]): { next: string; matches: string[] } | null {
  const match = /^(.*?)(\S+)$/.exec(input)
  if (!match) return null
  const head = match[1] ?? ""
  const token = match[2] ?? ""
  if (token.startsWith("--") || token.startsWith('"')) return null
  const matches = completeToken(token, addresses)
  if (matches.length === 1) return { next: `${head}${matches[0]} `, matches }
  if (matches.length > 1) return { next: input, matches }
  return null
}
