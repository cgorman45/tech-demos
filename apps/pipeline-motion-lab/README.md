# Pipeline Motion

A local app for business development pipelines. Drop in a spreadsheet and get a dark dashboard plus a 30 second animated explainer of the same numbers, made to play in a meeting.

## Run it

```bash
bun install
bun run dev
```

Or skip the server: open `pipeline-motion.html` directly in a browser. It is one self-contained file that works from `file://` with no network.

## What it does

- Import a `.csv` or `.xlsx` pipeline file (drag and drop or file picker). A short summary reports rows loaded and rows skipped with reasons.
- Dashboard with KPI cards (win rate, total open pipeline, weighted pipeline, open count), value by stage, weighted vs unweighted by stage, upcoming due dates with days-left chips, and a small owner table.
- Data table with inline editing: click a cell, Enter saves, Esc cancels, stage is a dropdown. Add and delete rows. Every number on the dashboard and in the explainer recomputes live.
- Edit toggle in the top bar makes the app title, card titles, and explainer captions click-to-rename.
- Everything persists to localStorage. Reset restores the example data and default labels. Export CSV downloads the edited table.
- Explainer: six scenes of about five seconds each, built from the live numbers. Play, Pause, Restart, speed (0.5x to 2x), a scene step bar, and a Present fullscreen mode. Space toggles play, arrow keys step scenes, Esc exits.

## Data format

Columns (case-insensitive, common aliases accepted): `opportunity`, `agency`, `stage`, `value`, `probability`, `due_date`, `owner`. Values accept formats like `$1,200,000`, probabilities accept `40%`, `40`, or `0.4`, dates accept ISO or `M/D/YYYY`. Stages: Lead, Qualified, Proposal, Shortlisted, Won, Lost. Unknown stages map to Lead with a warning.

The shipped rows are mock data labeled "Example data", with generic agency names. Example due dates shift relative to the day you open the app, so the upcoming list always has items.

## Scripts

```bash
bun run dev           # dev server
bun test              # unit tests (parsing, metrics, timeline, CSV round-trip)
bun run lint          # oxlint
bun run build         # type-check and production build
bun run build:single  # one-file build, written to pipeline-motion.html
```

## Stack

Bun, Vite, React, TypeScript, Tailwind v4, shadcn/ui (nova preset), Recharts, Zustand (persist), papaparse, SheetJS, vite-plugin-singlefile, oxlint.
