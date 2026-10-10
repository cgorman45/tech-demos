# Demo Feedback: a self-improving software kanban

A recreation of Matt Palmer's feedback kanban demo: every comment on an app flows into a board, and dragging a card into Todo launches a coding agent that implements the change. The agents here are simulated. There are no API calls and no network use. All names, comments, and PR numbers are example data. The example feedback is colleagues reacting to Colton's tech demos.

## Run it

```sh
bun install
bun run dev
```

Then open the printed local URL. Other scripts:

```sh
bun test              # queue, concurrency, persistence, and transition tests
bun run build         # type check and production build
bun run build:single  # one self-contained HTML file (feedback-kanban.html)
bun run lint          # oxlint
```

## Open it locally

No install and no server needed. Download `feedback-kanban.html` from this folder and double-click it. It opens in any modern browser from the file system, with all code, styles, and fonts inlined, and needs no network. Your board state is saved by the browser and survives a reload of the file.

## What this shows

Five columns: New, Todo, In progress, Review, Done. Two more, Skipped and Not implemented, appear when the status dropdown sends a card there.

- **Live feed**: a new example comment slides into the top of New every 8 to 15 seconds. Toggle it off in the header. The Add feedback box at the top of New takes your own comments.
- **Cards**: avatar initials, submitter handle, relative timestamp, source (text, voice, email), a short reference id, the comment, tags, a category dropdown, a status dropdown that moves the card instantly, and a collapsible Notes section.
- **Agents**: drop a card in Todo (drag it, or pick Todo in the status dropdown) to launch a simulated agent. With a free slot the card moves to In progress with a running badge and a live step log: reading code, editing files, running tests, opening PR. At the cap (3 by default) the card waits in Todo with a queued badge and starts automatically when a slot frees, oldest first. Starting an agent on a card that is already running shows a red toast.
- **Review**: a finished run moves the card to Review with an example PR chip and a short summary. Approve sends it to Done. Request changes sends it back through Todo, which starts a fresh run. Stop returns a running card to Todo.
- **Settings** (gear icon): max agents (1 to 5), agent speed, export or import the board as JSON, and Reset board.
- **Edit mode**: rename the board title and column names, and edit card text and tags inline. Everything persists to localStorage.

Keyboard: cards are focusable. Space or Enter picks a card up, arrow keys move it, Space drops it. The status dropdown does the same moves without a mouse.

## Stack

Bun, Vite, React, TypeScript, Tailwind v4, shadcn (nova preset), Zustand, @dnd-kit/core, oxlint, vite-plugin-singlefile. Conventions follow `apps/bd-workflow-topology/`. The queue and concurrency logic is pure (`src/store/agents.ts`) and covered by `bun test`, along with persistence and status transitions.
