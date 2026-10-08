# Colton's BD Workflow

A dark mission-control map that shows how one business developer uses AI to move a lead from first signal to submitted proposal. Built for the internal AI group as a presentable demo. All numbers, names, and output are mock. The only people named are Colton and Alex.

## Run it

```sh
bun install
bun run dev
```

Then open the printed local URL. Other scripts:

```sh
bun test        # store tests
bun run build   # type check and production build
bun run lint    # oxlint
```

## What this shows

Five lanes, left to right: Find, New lead, Claude workspace, Meet, Won work. Thirteen steps run as glowing nodes, from the Opportunity Scanner to submitted and won work. Alex's knowledge base sits at the center of the Claude workspace lane and feeds proposal drafting, the presentation builder, and follow-up emails.

- **Run a lead**: a token travels the fixed path scanner, lead, proposal, deck, Rosie, Granola, calls, tone, emails, won. Each step lights up and appends its sample output to the activity log. The knowledge base pulses when a drafting step reads from it. On completion the counters tick up and the hours saved total grows.
- **Stop, Start, Restart**: open any node and change its lifecycle. Stopping a step turns everything downstream amber, and a run stalls when it reaches a stopped or degraded step.
- **Inspect panel**: click a node for its description, lane, tool, stats (marked Example data), recent log lines, and lifecycle buttons.
- **Edit mode**: toggle it in the top bar. Nodes become draggable, and the inspect panel gains fields to rename a step, change its subtitle, and edit its metric values. Edits are saved to localStorage and survive a reload. Reset layout clears all saved edits. Log lines always use the current names.

## Status rule

Each node stores a lifecycle: running, restarting, or stopped. The visible status adds a derived value, degraded. A node is degraded if any upstream source is stopped or degraded. Edges point upstream to downstream, so the effect propagates along the flow direction. For example, stopping the Opportunity Scanner degrades New lead and everything downstream of it (proposal, deck, Rosie, Granola, calls, emails, won) while City Council Research, Grants and incentives, the knowledge base, and tone tuning stay running.

## Stack

Bun, Vite, React, TypeScript, @xyflow/react, Zustand, Tailwind v4, shadcn/ui, oxlint. The layout is manual lane columns so the colored bands line up, and the minimap keeps the bottom-right corner of the canvas to itself: the fit view padding reserves that strip and no node sits there.
