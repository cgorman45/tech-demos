# pipeline-motion-lab: plan

Approved by Colton on 2026-10-09. Inspired by Anthropic's Claude Dashboards and Claude Motion beta (https://x.com/claudeai/status/2108271552991252810). The app must be fully self-contained in `apps/pipeline-motion-lab/` and must not import from, modify, or depend on any other app. You may read `apps/bd-workflow-topology/` (PR #10, branch `cursor/bd-workflow-topology-605a`, may be unmerged) for patterns: dark mission-control look, edit mode, localStorage persistence, vite-plugin-singlefile setup. Copy what you need; do not import.

## Goal
A local app where a business developer drops in a pipeline spreadsheet and gets a live dark dashboard plus a ~30 second animated explainer of the same numbers to play in a meeting.

## Audience and tone
- Audience: Colton's BD colleagues. It should look finished on a projector.
- Title on screen: "Pipeline Motion". No Willdan logo or company name anywhere.
- All shipped data is mock and labeled "Example data" (badge in the top bar while example data is loaded). Generic agency names only (City of Example, Harbor City, Lakeview County, Northside School District, Port of Example, etc.).

## UI copy rules (every string in the app, README, and PR body)
- No em dashes (use commas, periods, colons, or parentheses).
- No "not just X but Y" constructions. No forced lists of three.
- No buzzwords (leverage, synergy, supercharge, seamless, game-changing, unlock, revolutionize, cutting-edge, empower, robust, insights).
- Plain, short, concrete sentences.

## Data model
Columns (case-insensitive header match, with simple aliases): `opportunity`, `agency`, `stage`, `value` (USD, accept "$1,200,000"), `probability` (0 to 100 or 0 to 1, accept "40%"), `due_date` (ISO or M/D/YYYY), `owner`.
Stages (ordered): Lead, Qualified, Proposal, Shortlisted, Won, Lost. Unknown stage strings map to Lead and raise a non-blocking warning.
Ship `src/data/example-pipeline.csv` with ~24 rows across all stages, values $80K to $4M, due dates spread relative to a fixed reference date with an option to shift them so some are always "upcoming" (compute relative to today at load: store offsets in days).

## Single-user MVP
1. **Import**: drag-and-drop zone and file picker accepting `.csv` and `.xlsx`. Parse CSV with papaparse, XLSX with SheetJS (`xlsx`, use the official CDN tarball only if npm version is stale; otherwise npm, respecting minimumReleaseAge). Show a short validation summary (rows loaded, rows skipped with reason). "Load example data" button always available.
2. **Dashboard** (dark mission-control style, glowing cards on a subtle grid):
   - KPI cards: Win rate (Won / (Won + Lost), by count, with value-based rate as a subtitle), Total open pipeline, Weighted pipeline (sum value x probability over open stages), Opportunities open.
   - Pipeline value by stage: horizontal or vertical bar chart (Recharts via shadcn Chart component).
   - Weighted vs unweighted by stage, or a stage funnel.
   - Upcoming due dates: list of the next 30 days sorted by date, with days-left chips (red under 7 days, amber under 14).
   - Owner breakdown small table (optional if space is tight; cut before clarity).
   - All numbers recompute live from the table.
3. **Data table + editing**: shadcn Table with inline-edit cells (click to edit, Enter saves, Esc cancels, stage as a Select), add row, delete row. Dashboard and explainer update immediately.
4. **Edit labels**: an "Edit" toggle in the top bar makes the app title, card titles, chart titles, and explainer scene captions click-to-rename.
5. **Persistence**: table rows and label overrides saved to localStorage (namespaced key `pipeline-motion-lab:v1`). "Reset" restores example data and default labels (with a confirm). "Export CSV" downloads the edited table.
6. **Explainer** (~30s, SVG plus CSS/JS animation, Motion library `motion` allowed): built from the live numbers, 6 scenes of ~5s each:
   1. Title card: "Pipeline snapshot" with the date.
   2. Total open pipeline counting up, opportunity dots flowing in.
   3. Value by stage: bars grow stage by stage.
   4. Weighted pipeline: bars shrink to their weighted height, total counts to weighted value.
   5. Win rate: ring fills to the rate, won vs lost counts.
   6. Next due dates: top 3 to 5 upcoming items slide in, closing line "Next 30 days: N due."
   Controls: Play, Pause, Restart, speed (0.5x, 1x, 1.5x, 2x), a scene step bar to jump to any scene, and a "Present" fullscreen mode (Fullscreen API, Esc exits, Space toggles play, arrow keys step scenes). Animation driven by a single timeline clock (a store value) so pause/seek/speed are exact and testable.
7. **Double-click build**: `bun run build:single` uses vite-plugin-singlefile to produce one self-contained HTML, committed as `apps/pipeline-motion-lab/pipeline-motion.html`. It must work opened from `file://` with no network: no external fonts, no CDN, hash routing or no routing, all assets inlined. Edits persist there too (localStorage on file:// origin).

## Layout
Top bar: title, Example data badge, Import, Edit, Export CSV, Reset, Play explainer. Main: tabs or split view of Dashboard and Data. Explainer opens as a large panel/overlay with its controls; Present goes fullscreen. Must have no overlaps or clipped text at 1440x900 and 1280x720.

## Structure
```
apps/pipeline-motion-lab/
  bunfig.toml  package.json  vite.config.ts  index.html  README.md  PLAN.md  pipeline-motion.html
  src/
    data/example-pipeline.csv
    features/import/      (parseCsv.ts, parseXlsx.ts, normalize.ts, DropZone.tsx)
    features/metrics/     (metrics.ts: winRate, totals, weighted, byStage, upcoming)
    features/dashboard/   (KpiCards.tsx, StageChart.tsx, UpcomingList.tsx)
    features/table/       (PipelineTable.tsx, EditableCell.tsx)
    features/explainer/   (Explainer.tsx, scenes/*.tsx, timeline.ts, Controls.tsx)
    features/labels/      (EditableLabel.tsx, labels.ts)
    store/                (usePipelineStore.ts: Zustand with persist)
    components/ui/        (shadcn)
```

## Tests (bun test, critical logic only)
- normalize: header aliases, currency and percent parsing, date formats, unknown stage warning.
- metrics: win rate (incl. zero won+lost), weighted pipeline, by-stage sums, upcoming window.
- timeline: scene index from time, speed scaling, seek/restart.
- CSV export round-trips through the parser.

## Stack
- Bun: runtime, package manager, scripts.
- Vite + React + TypeScript: one-screen app, no routing.
- Tailwind v4 + shadcn/ui (nova preset): Card, Table, Button, Badge, Select, Tabs, Dialog, Tooltip, Chart.
- Recharts (via shadcn Chart): dashboard charts with little wiring.
- Zustand with persist middleware: rows, labels, explainer clock, localStorage.
- papaparse + SheetJS: CSV and XLSX parsing.
- motion (optional): scene transitions; plain SVG/CSS is fine.
- vite-plugin-singlefile: double-click HTML.
- oxlint: fast lint.

## Deferred
- Live Claude calls to write narration (needs API key and data policy review).
- Video export (MP4/GIF) of the explainer.
- Multiple pipelines, column mapping UI, sharing.
