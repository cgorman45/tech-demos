import { Button } from "@/components/ui/button"

export function ExampleChips({
  chips,
  onPick,
}: {
  chips: Array<{ label: string; command: string }>
  onPick: (command: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <Button key={chip.command} type="button" size="xs" variant="outline" onClick={() => onPick(chip.command)}>
          {chip.label}
        </Button>
      ))}
    </div>
  )
}

export function exampleCommands(addresses: string[], repo: string | null, branch: string | null): Array<{ label: string; command: string }> {
  const address = addresses[0] ?? "colton/api-claude"
  const place = repo && branch ? ` --repo ${repo} --branch ${branch}` : ""
  return [
    { label: "ask", command: `ask ${address} "what are you working on?"` },
    { label: "handoff", command: `handoff ${address} "take the next task"${place}` },
    { label: "broadcast", command: 'broadcast "status check"' },
    { label: "who", command: "who" },
    { label: "help", command: "help" },
  ]
}
