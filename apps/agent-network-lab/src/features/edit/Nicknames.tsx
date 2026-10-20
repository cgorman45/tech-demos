export function sessionLabel(address: string, nicknames: Record<string, string>): { title: string; subtitle: string | null } {
  const nick = nicknames[`session:${address}`]
  if (!nick) return { title: address, subtitle: null }
  return { title: nick, subtitle: address }
}

export function machineLabel(person: string, machine: string, nicknames: Record<string, string>): { title: string; subtitle: string | null } {
  const key = `machine:${person}/${machine}`
  const nick = nicknames[key]
  if (!nick) return { title: machine, subtitle: null }
  return { title: nick, subtitle: machine }
}

export function personLabel(person: string, nicknames: Record<string, string>): string {
  return nicknames[`person:${person}`] || person
}

export const MACHINE_COLORS = ["#6ee7b7", "#93c5fd", "#fbbf24", "#f9a8d4", "#c4b5fd", "#fda4af"]
