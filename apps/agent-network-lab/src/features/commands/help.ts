export function helpText(mode: "live" | "sim"): string {
  const lines = [
    'ask <address> "<message>"',
    'tell <address> "<message>" [--fyi] [--notify]',
    'handoff <address> "<task>" [--repo <repo>] [--branch <branch>]',
    'broadcast "<message>"',
    "who [filter]",
    "doctor",
    "help",
    "clear",
  ]
  if (mode === "sim") {
    lines.push("serve <tool>", "as <address>", "move <address> <repo>@<branch>")
  }
  return lines.join("\n")
}
