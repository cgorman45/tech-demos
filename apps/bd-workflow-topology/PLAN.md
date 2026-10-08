# bd-workflow-topology: plan

Colton's own request (not an X bookmark). Derived from `apps/openship-topology-lab/` (PR #9, branch `cursor/openship-topology-lab-e7c5`, may be unmerged). Read that branch for patterns (`git fetch origin cursor/openship-topology-lab-e7c5` then `git show FETCH_HEAD:apps/openship-topology-lab/<file>`), but copy what you need. The new app must be fully self-contained in `apps/bd-workflow-topology/` and must not import from, modify, or depend on any other app.

## Goal
A polished, dark mission-control map titled "Colton's BD Workflow" that shows the Willdan AI group how one business developer uses AI from first lead to won work, with a "Run a lead" animation and live stop/start cascades.

## Audience and tone
- Audience: the broader internal AI group, who want to see how others use AI. It should look finished and presentable on a projector.
- Title on screen: "Colton's BD Workflow". No Willdan logo or company name anywhere. "WPE" may appear only in the knowledge base label.
- All numbers and text are mock. No real client data, no real people besides "Colton" and "Alex" (knowledge base owner). Use generic agency names like "City of Example" or "Harbor City" in sample output.

## UI copy rules (apply to every string in the app, README, and PR body)
- No em dashes (use commas, periods, colons, or parentheses). Watch for the openship node that renders an em dash for stopped metrics; use "0" or "off" instead.
- No "not just X but Y" constructions.
- No buzzwords (avoid: leverage, synergy, supercharge, seamless, game-changing, unlock, revolutionize, cutting-edge, empower, robust).
- Plain, short, concrete sentences.

## Single-user MVP
1. Canvas (@xyflow/react) with five colored lane bands left to right, subtle grid background, glowing nodes.
2. Nodes and lanes:
   - **Find** (lane color e.g. sky): `scanner` Opportunity Scanner (RFPs and RFQs), `council` City Council Research, `grants` Grants and incentives.
   - **New lead** (amber/gold): `lead` New lead (hub node, round or pill shaped).
   - **Claude workspace** (violet, the widest lane): `kb` Alex's knowledge base, subtitle "WPE proposals, RFQs, RFPs, and SOQs" (the central, larger node, visually emphasized as the core); `proposal` Proposal drafting; `deck` Presentation builder; `emails` Follow-up emails; `tone` Tone tuning (subtitle "City manager vs facilities vs board").
   - **Meet** (teal): `rosie` Rosie meeting prep; `granola` Granola notes; `calls` Call Follow-Ups.
   - **Won work** (emerald): `won` Submitted proposals and won work.
3. Edges (flow direction, source feeds target):
   - scanner, council, grants -> lead
   - lead -> proposal, lead -> deck
   - kb -> proposal, kb -> deck, kb -> emails
   - deck -> rosie -> granola -> calls -> emails
   - tone -> emails
   - proposal -> won, emails -> won
   Note: openship edges point consumer -> dependency. Here edges point upstream -> downstream, so degraded status propagates ALONG edge direction (a node is degraded if any upstream source is stopped or degraded).
4. Status model (copy openship's pattern: stored `Lifecycle` = running | restarting | stopped, derived `NodeStatus` adds `degraded` via fixpoint over edges). Stopping `kb` must turn proposal, deck, emails and everything downstream (rosie, granola, calls, won) amber. Stopped node: grey, desaturated; edges touching a stopped node dashed and dim; degraded nodes amber glow.
5. Stop, Start, Restart on every node (in the inspect panel). Restart shows a ~1.5 to 2s "restarting" pulse, then running.
6. **Run a lead** button (top bar, primary): a glowing token (animated dot on edges, or an animated edge plus node glow) travels the fixed path below. Each node lights up when it fires, and the activity log appends that step's sample Claude/agent output.
   - Path: scanner -> lead -> proposal -> deck -> rosie -> granola -> calls -> tone -> emails -> won. The `kb` node pulses in sync when proposal, deck, and emails fire (shows it feeding them).
   - Step duration ~900 to 1200 ms, configurable (store option) so tests can run it synchronously.
   - If the next node on the path is stopped or degraded, the run halts there: status "stalled", node flashes red/amber, log line like "Lead stalled at Proposal drafting: Alex's knowledge base is offline." Button reads "Run a lead" again after done or stalled.
   - On completion: log "Lead submitted. Proposal and follow-up are out the door." and the relevant counters tick up by one (RFPs flagged, proposals drafted, decks built, emails sent, submitted), hours saved goes up by a small mock amount.
   - Only one run at a time; button disabled while running.
7. Sample output per step (mock text, short, generic agency names), for example:
   - scanner: "Flagged RFP: Citywide LED streetlight retrofit, City of Example. Due in 21 days. Fit score 86."
   - lead: "New lead created. Owner: Colton. Next: draft proposal and intro deck."
   - proposal: mock outline (1. Understanding of the project, 2. Approach and schedule, 3. Similar past work from the knowledge base, 4. Team, 5. Fee approach).
   - deck: slide titles ("Who we are", "What we heard", "Proposed approach", "Past results", "Next steps").
   - rosie: "Prep brief ready: 3 attendees, 2 open questions, last touchpoint 14 days ago."
   - granola: "Notes captured. Action items: send case study, confirm site walk date."
   - calls: "Follow-up queued for Thursday. Draft handed to email step."
   - tone: "Tone set: city manager (brief, outcome first)." Optionally show the same sentence in the three tones.
   - emails: a 3 to 4 line tone-adjusted follow-up email ("Hi Jordan, thanks for the time today...").
   - won: "Proposal submitted to City of Example. Status: under review."
8. Node metrics (each node shows 1 to 2 numbers; all mock):
   - scanner: RFPs flagged this month (e.g. 42); council: agendas reviewed; grants: programs tracked; lead: leads this month; kb: documents indexed (e.g. 1,240); proposal: proposals drafted; deck: decks built; emails: emails sent; tone: emails tuned; rosie: meetings prepped; granola: meetings captured; calls: follow-ups logged; won: submitted / won; plus "hours saved" on Claude nodes and a total "Hours saved this month" stat in the top bar.
   - An "Example data" badge is always visible on the canvas (e.g. top bar or corner HUD) AND inside the inspect panel.
9. Inspect panel (shadcn Sheet, opens on node click): name, lane, status, what the step does (1 to 2 plain sentences), "Runs on" tool chip (Claude, Grok Bot agent, Granola, as below), stats grid with the "Example data" badge, recent log lines (mock, plus lines appended by runs and stop/start), and Stop / Start / Restart buttons.
   - Tool mapping: scanner, council, grants, rosie, calls: "Grok Bot agent"; lead: "Grok Bot agent"; kb, proposal, deck, emails, tone: "Claude"; granola: "Granola"; won: "Claude + Grok Bot agent" (or "Colton" as owner, tool Claude).
10. Controls: Fit view button, Reset scenario button (restores all lifecycle, metrics, logs, run state), React Flow Controls (zoom), MiniMap.
11. **Minimap must not cover any node** (known bug in PR #9 where it sat on the postgres card). Fix structurally, not by luck: e.g. keep the minimap small in a corner and use `fitViewOptions` padding that reserves that corner (React Flow 12 accepts per-side padding), and/or design the manual lane layout so the minimap corner is empty space. Also call Fit view after layout and on the Fit view button with the same padding. Verify in the browser at 1440x900 and 1280x720 after load and after Fit view.

Explicit outs: real Claude/Anthropic or OpenRouter API calls, real Granola or mail integration, auth, persistence, graph editing, drag-to-save layout, multiple workflows, mobile layout beyond "does not break".

## Visual direction (dark mission control)
- Near-black navy background (e.g. #070b14), subtle dot or line grid (React Flow Background), faint scanline or vignette optional.
- Lane bands: full-height translucent colored rectangles behind nodes (render as non-interactive group/background nodes, `zIndex` below, `selectable: false`, `draggable: false`), lane title in small caps at the top of each band.
- Nodes: dark glass cards with a colored border glow matching lane color (box-shadow), status dot, icon (lucide), name, subtitle, metric row. `kb` is larger with a stronger glow. Running = lane glow, firing = bright pulse ring, degraded = amber glow, stopped = grey, restarting = pulse.
- Top bar: title "Colton's BD Workflow", short subtitle (e.g. "How AI moves a lead from first signal to submitted proposal"), "Example data" badge, total hours saved, buttons: Run a lead, Fit view, Reset scenario.
- Activity log: docked bottom or right panel (collapsible), monospace timestamps, step name chip colored by lane, multi-line sample output rendered nicely (outline as list, email as a quoted block).
- Font: Geist (as openship) or Inter; monospace for logs and numbers.

## Architecture (copy openship patterns, self-contained)
```
apps/bd-workflow-topology/
  PLAN.md  README.md  bunfig.toml  package.json  components.json  vite.config.ts  index.html  .oxlintrc.json
  src/
    main.tsx  App.tsx  index.css
    data/workflow.ts          # lanes, nodes (id, name, subtitle, lane, tool, description, icon key, metrics seed), edges, RUN_PATH, sample outputs
    lib/status.ts             # status -> colors/labels
    lib/mock.ts               # seed logs, metric helpers
    store/transitions.ts      # pure: deriveStatuses (downstream propagation), lifecycle helpers, run step logic
    store/workflow-store.ts   # Zustand: lifecycle, statuses, metrics, logs, selectedId, run state, actions
    store/*.test.ts           # bun tests
    components/topology/layout.ts         # manual lane layout (fixed x per lane column, y per row), lane band geometry
    components/topology/workflow-canvas.tsx
    components/topology/workflow-node.tsx
    components/topology/lane-band.tsx
    components/topology/token-edge.tsx    # custom edge with travelling glowing dot (SVG animateMotion or offset-path) when active
    components/inspect-panel.tsx
    components/activity-log.tsx
    components/top-bar.tsx
    components/ui/*            # shadcn components added on demand
```
- Store actions: `stopNode(id)`, `startNode(id)`, `restartNode(id, ms?)`, `runLead()`, `advanceRun()` (pure single step, used by the timer and by tests), `resetScenario()`, `select(id)`. Store run state: `{ status: 'idle' | 'running' | 'stalled' | 'done', stepIndex, activeNodeId, activeEdgeId }`. Keep timers in module scope like openship and clear them on reset and stop.
- Layout: manual lane columns (preferred over dagre so bands line up). Suggested: Find nodes stacked in column 1; lead centered in column 2; Claude lane two sub-columns with `kb` in the center, proposal top, deck middle, tone and emails lower; Meet lane rosie/granola/calls stacked top to bottom with calls near emails so the back-edge is short; won centered in the last column. Tune in the browser so edges stay readable.

## Tasks (vertical slices)
1. Scaffold: `cd apps && bunx create-vite@latest bd-workflow-topology --template react-ts` (use flags that skip install if offered). Immediately write `apps/bd-workflow-topology/bunfig.toml` with:
   ```
   [install]
   minimumReleaseAge = 259200
   ```
   BEFORE any `bun install` or `bun add`. Then `bun install`, Tailwind v4 via `@tailwindcss/vite`, `bunx shadcn@latest init` with a minimal preset, dark theme. Add only needed components (`button`, `badge`, `sheet`, `scroll-area`, `separator`, `tooltip`). Add `@xyflow/react`, `zustand`, `lucide-react`. oxlint for lint (as openship).
2. Data + store + tests: workflow data, pure transitions, Zustand store, bun tests (see Tests).
3. Canvas: lane bands, custom glowing nodes, edges, Background grid, Controls, MiniMap placed so it never overlaps nodes, Fit view and Reset scenario.
4. Run a lead: token animation along edges, node fire glow, kb sync pulse, activity log with formatted sample output, stall behavior, counters tick.
5. Inspect panel: description, tool chip, stats with Example data badge, logs, Stop/Start/Restart.
6. Polish: copy pass against the writing rules, empty/stalled states, keyboard focus, no console errors, README with run instructions and a short "what this shows" section.
7. Proof: run in a real browser, screenshot(s) and a walkthrough video attached to the PR.

## Tests (bun test, store only, critical logic)
- Propagation: stopping `kb` makes proposal, deck, emails, rosie, granola, calls, won `degraded`; scanner, council, grants, lead, tone stay `running`; starting `kb` restores all to `running`. Stopping `tone` degrades emails and won only. Rule: a node is degraded if ANY upstream source is stopped or degraded, so stopping `scanner` degrades lead and everything downstream of it (proposal, deck, rosie, granola, calls, emails, won) while council, grants, kb, and tone stay running. Document this rule in the README.
- Restart: `restartNode` sets `restarting`, then `running` after the duration (use a short duration and await, or fake timers).
- Run-lead sequencing: with all running, repeated `advanceRun()` visits exactly RUN_PATH in order, appends one log entry per step with the right node id, ends `done`, increments counters once. With `kb` stopped, the run stalls at `proposal` (first degraded/stopped node), status `stalled`, no completion counters incremented. `runLead()` while running is a no-op.
- Reset: after stops, a partial run, and metric changes, `resetScenario()` restores initial lifecycle, statuses, metrics, logs, run state, and clears pending timers.
- `bun run build` (tsc -b && vite build) and `bun run lint` must be clean.

## Stack
- Bun: runtime, package manager, scripts (fleet default).
- Vite + React + TypeScript: one-screen app, no routing needed.
- @xyflow/react: pan/zoom canvas, custom nodes/edges, minimap, controls out of the box.
- Manual lane layout (dagre optional): lanes must align to colored bands, which is simpler by hand.
- Zustand: small store for lifecycle, propagation, and run sequencing.
- shadcn/ui + Tailwind v4: Sheet, Button, Badge, ScrollArea, Tooltip, minimal preset.
- oxlint: fast lint, same as openship.

## Deferred
- Live Claude calls to generate the sample output (needs API key and data policy review).
- Real metrics from the Opportunity Scanner or mailbox.
- Editable workflow, saved layouts, multiple personas, export to slides.
