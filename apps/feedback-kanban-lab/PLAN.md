# feedback-kanban-lab: plan

A recreation of Matt Palmer's "self-improving software" feedback kanban (x.com/mattyp/status/2108598257622667622). Every comment on an app flows into a kanban board, and dragging a card into Todo launches a coding agent that implements the change. Agents here are simulated: no real API calls, no network. Conventions copied from `apps/bd-workflow-topology/` (branch `cursor/bd-workflow-topology-605a`): Vite, React, TypeScript, Tailwind v4, shadcn nova preset, Zustand, Bun, oxlint, `bunfig.toml` with `minimumReleaseAge = 259200`, and a committed single-file build.

## Goal

A dark kanban board where example feedback streams in, cards move between columns by drag or dropdown, and dropping a card in Todo runs a simulated coding agent with a live step log, a three-agent concurrency cap, a FIFO queue, and a Review step with a fake PR chip.

## Audience and rules

- All data is example data and labeled as such. Feedback is from colleagues reacting to Colton's tech demos.
- No Willdan name or logo. No real client data.
- UI copy and docs: no em dashes, no buzzwords, plain short sentences.

## Single-user MVP

1. Board: header "Demo Feedback" (renamable), "Example data" badge, status pill "Agents N/3 running". Columns with counts: New, Todo, In progress, Review, Done. Skipped and Not implemented exist as statuses reachable from the card dropdown; their columns appear only when they hold cards.
2. Cards: avatar initials, relative timestamp, source label (text, voice, email), short submitter handle, body text, tags (screened, claude), category dropdown (Map, Animation, Data, Copy, Agents, General), status dropdown that moves the card instantly, collapsible Notes section.
3. Live feed: a new example comment slides into the top of New every 8 to 15 seconds, with an on/off toggle. An "Add feedback" box lets the user type their own.
4. Drag and drop between columns, keyboard accessible (dnd-kit keyboard sensor plus the status dropdown as a no-mouse path).
5. Simulated agents: dropping a card in Todo starts an agent. If fewer than `maxAgents` (default 3) are running, the card moves to In progress with an "Agent launched" toast, a running badge, a live step log (reading code, editing files, running tests, opening PR), and a Stop button. Otherwise the card stays in Todo with a queued badge and a "waiting for a free slot (3 agents at most)" strip plus a toast, and auto-starts FIFO when a slot frees. Starting an agent for a card that is already running shows a red toast: "An agent is already running for this item." A finished agent moves the card to Review with a fake PR chip (labeled example) and a short summary. Approve moves it to Done. Request changes sends it back to Todo. Stop returns the card to Todo.
6. Settings: max agents (1 to 5), agent speed (0.5x, 1x, 2x, 4x).
7. Edit mode: rename the board title and column names, edit card text and tags inline. All state persists to localStorage. Reset board restores the seed. Export and import the board as JSON.

Explicit outs: real agent or LLM API calls, auth, multi-user sync, mobile layout beyond "does not break", real voice or email ingestion, server of any kind.

## Visual direction

Match the source video: very dark gray background (near #111), slightly lighter rounded column wells, lighter gray rounded cards, small muted labels, green dot "running" pill, amber "queued" pill, amber "waiting for a free slot" strip, bottom-center toasts (dark for info, red tint for the duplicate-agent error). Geist font, dark mode only.

## Architecture

```
apps/feedback-kanban-lab/
  PLAN.md  README.md  bunfig.toml  package.json  components.json  vite.config.ts  index.html  .oxlintrc.json  .gitignore
  feedback-kanban.html        # committed single-file build (vite-plugin-singlefile)
  src/
    main.tsx  App.tsx  index.css
    data/seed.ts              # seed cards, incoming feedback pool, categories, column defs
    lib/utils.ts  lib/time.ts # cn helper, relative timestamps
    store/agents.ts           # pure queue/concurrency/status-transition logic
    store/agents.test.ts
    store/board-store.ts      # Zustand store with localStorage persistence
    store/board-store.test.ts
    store/persistence.test.ts
    components/board-header.tsx  kanban-board.tsx  kanban-column.tsx  feedback-card.tsx
    components/agent-log.tsx  add-feedback.tsx  settings-panel.tsx  toaster.tsx
    components/ui/*           # shadcn components added on demand
```

- Pure logic in `store/agents.ts`: `requestAgent`, `completeAgent`, `stopAgent`, `advanceAgentStep`, `applyStatusChange`, `promoteQueued` (FIFO). The Zustand store wraps these and owns timers in module scope, cleared on reset and import. Tests drive the pure functions and the store directly; timers are driven by a manual `tick` in tests.
- Persistence via `zustand/middleware` persist with a versioned key. Reset clears the key and reseeds. Export serializes the persisted slice; import validates shape and replaces it.

## Tasks

1. Scaffold: write `bunfig.toml` first, then package.json mirroring bd-workflow-topology (same tsconfigs, vite.config with `--mode single` single-file build, oxlint config, shadcn nova components.json). `bun install`.
2. Store and tests: seed data, pure agent queue logic, Zustand store with persist, bun tests for concurrency (cap, FIFO, duplicate-agent error), status transitions (dropdown and drag paths, Approve, Request changes, Stop), and persistence (round trip, reset, import validation).
3. Board UI: header, columns with counts, cards matching the video layout, status dropdowns, Notes section, toasts.
4. Agents: step log rendering, running and queued badges, Stop button, Review summary with example PR chip, Approve and Request changes.
5. Live feed and add box: interval stream with slide-in animation and toggle, add feedback form.
6. Edit mode, settings, export and import, Reset board.
7. Quality: lint, build, build:single, verify in a real browser at 1440x900 and 1280x720, screenshot and walkthrough video for the PR, README with an "Open it locally" section.

## Stack

- Bun: runtime, package manager, test runner (fleet default).
- Vite + React + TypeScript: one-screen app, no routing.
- Tailwind v4 + shadcn (nova preset): same setup as bd-workflow-topology.
- Zustand (+ persist): board, agents, and settings state in one store.
- @dnd-kit/core: drag and drop with a built-in keyboard sensor and screen reader announcements.
- oxlint: fast lint, same config as the reference app.
- vite-plugin-singlefile: the committed `feedback-kanban.html` double-click build.

## Deferred

- Real agent runs against a repo (needs API keys and a sandbox).
- Real feedback ingestion (webhooks, email, voice transcription).
- Multi-board support and sharing.
