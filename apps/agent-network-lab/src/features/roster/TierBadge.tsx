import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function tierText(agent: string, tier: string): string {
  if (tier === "push") return "This session gets the message right away. If it is idle, it wakes up."
  if (tier === "pull") return "This session only sees the message when it checks its inbox."
  if (tier === "turn") {
    if (agent === "cursor") return "Cursor reads this at its next step. If it is idle it waits for you."
    const name =
      agent === "grok" ? "Grok" : agent === "gemini" ? "Gemini CLI" : agent === "copilot" ? "Copilot CLI" : "This agent"
    return `${name} reads this at its next step. If it is idle it waits for you.`
  }
  return "This session has no delivery path."
}

export function TierBadge({ agent, tier }: { agent: string; tier: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        delay={200}
        render={<span className="inline-flex cursor-default" />}
      >
        <Badge variant="outline">{tier}</Badge>
      </TooltipTrigger>
      <TooltipContent>{tierText(agent, tier)}</TooltipContent>
    </Tooltip>
  )
}
