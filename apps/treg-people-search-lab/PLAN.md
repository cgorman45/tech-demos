# treg-people-search-lab: plan

Approved by Colton on 2026-10-13. Inspired by Treg's people-search launch post (https://x.com/treg_ai/status/2109615287062745090), product page https://treg.to/people-search, repo https://github.com/superdesigndev/treg. The app must be fully self-contained in `apps/treg-people-search-lab/` and must not import from, modify, or depend on any other app. You may read `apps/pipeline-motion-lab/`, `apps/bd-workflow-topology/`, and `apps/chat-video-edit-lab/` (PR #13) for patterns: dark look, edit mode, localStorage persistence, vite-plugin-singlefile setup. These may be unmerged. Copy what you need; do not import.

## Goal
A local app where you type a company and a role, then watch an animated run go from company to people to a verified work email, with a live cost meter and a receipt at the end.

## Audience and tone
- Audience: Colton and BD colleagues, shown on a projector. It should look finished.
- Title on screen: "People Search". No Willdan logo or company name anywhere.
- Mock mode is the default. A badge reading "Example data" shows in the top bar whenever results are simulated. All shipped companies and people are fictional (invented names, `.example` email domains such as `jordan.lee@northwind-robotics.example`). No real personal data anywhere in the repo.

## UI copy rules (every string in the app, README, and PR body)
- No em dashes (use commas, periods, colons, or parentheses).
- No "not just X but Y" constructions. No forced lists of three.
- No buzzwords (leverage, synergy, supercharge, seamless, game-changing, unlock, revolutionize, cutting-edge, empower, robust, insights).
- Plain, short, concrete sentences.

## What Treg looks like (for realism)
Treg is a metered router for agent tools: one token, many providers (Apollo, Hunter, Tomba, Kitt, People Data Labs, Crustdata, LeadMagic). Capabilities seen on treg.to, with list prices from the page:
| capability | what it does | example price |
|---|---|---|
| companies.enrich | company profile (industry, stage, size, HQ) | from $0.010 |
| companies.similar | lookalike companies | from $0.049 |
| people.search / people.enrich | people at a company by role | from $0.028 |
| people.email.find | work email, routed across finders | from $0.0089 |
| email.verify | deliverability check | $0.003 per check |
Key behaviors to mirror: misses are billed $0.00, a finder miss falls through to the next provider (Hunter then Kitt on their real receipt), each call shows provider + price, and the receipt reports cost per usable (verified) result. Their published sample run: 27 people, 21 emails found, 20 verified, $0.58 total, $0.029 per usable result.

The public HTTP API shape is not documented on the page. Before writing the live adapter, read the README and source in github.com/superdesigndev/treg for the real base URL, auth header, and call/catalog request format (the Treg MCP exposes `catalog_search`, `call`, `balance`). Put everything Treg-specific in one file, `features/treg/liveClient.ts`, with the base URL editable in Settings. If the shape cannot be confirmed, keep the adapter, mark it "Experimental" in Settings, and say so in the PR body.

## Single-user MVP
1. **Search form**: Company (text) and Role (text, e.g. "Head of Marketing"), optional "How many people" (1 to 10, default 3). Suggestion chips with example pairs from the fictional dataset. Enter runs.
2. **Animated walk**: three columns connected by animated edges (Framer Motion or CSS, prefer `motion`): Company card (enrich result) -> People cards (name, title, match %) -> Email cards (address, status: found, verifying, verified, unknown, miss). Each call appears as a chip on its edge with provider name and price, ticking from pending to settled. Misses show a strikethrough price "$0.00, miss" and the fallthrough to the next provider. Playback speed control (1x, 2x, instant) and Replay.
3. **Live cost meter**: running total in the top bar ($0.0000 format), counts of calls, hits, misses, and a per-provider breakdown that updates as calls settle.
4. **Receipt**: after the run, a receipt panel matching Treg's style: people with a name, emails found, verified, unknown (not billed), misses (free), total cost, cost per usable result, plus per-provider lines ("Hunter 3 calls @ $0.0245, 1 miss at $0.00"). Copy as text and Download CSV of the found contacts (CSV flagged with an "Example data" column in mock mode).
5. **Mock engine (default)**: `features/mock/` holds a bundled fictional dataset (about 12 companies, 4 to 8 people each, invented names and roles) and a seeded simulator that picks providers, latency (200 to 900 ms), and hit/miss outcomes deterministically from company + role, so the same search replays the same way. Unknown companies get a generated fictional company so any input works. Prices come from an editable price table.
6. **Optional live mode**: Settings dialog with "Treg API key" (password field), base URL, and a "Use live API" switch that is off by default and disabled without a key. Key stored only in localStorage, never logged, never committed. With live off, the app makes zero network requests. With live on, the same walk is driven by real responses; cost comes from the response if present, else the price table, labeled "estimated". Show a warning that live calls spend real balance. Errors (CORS, 401, 402 low balance) show a clear message and offer "Run in example mode instead".
7. **History**: last 20 runs listed in a side panel; click to replay the run and receipt.
8. **Editable labels and data**: an "Edit" toggle makes the app title, column titles, and provider names click-to-rename. A "Price table" tab in Settings edits per-provider prices and hit rates for the mock. All saved to localStorage under `treg-people-search-lab:v1`. "Reset" restores defaults (confirm). Export / Import settings JSON (zod-validated).
9. **Double-click build**: `bun run build:single` with vite-plugin-singlefile produces `apps/treg-people-search-lab/treg-people-search.html`, committed. Works from `file://` with no network in mock mode: no external fonts, CDNs, or workers in separate files.

## Layout
Top bar: title, Example data badge, cost meter, History, Edit, Settings, Reset. Below it: search form row. Main: the three-column animated walk. Right panel (~340px): live call log, then receipt when done. No overlaps or clipped text at 1440x900 and 1280x720. Dark theme.

## Structure
```
apps/treg-people-search-lab/
  bunfig.toml package.json vite.config.ts index.html README.md PLAN.md treg-people-search.html
  src/
    features/search/   (SearchForm.tsx, Suggestions.tsx)
    features/run/      (runTypes.ts, runSearch.ts orchestrator emitting call events, useRun.ts)
    features/mock/     (dataset.ts, simulator.ts, seededRandom.ts, simulator.test.ts)
    features/treg/     (liveClient.ts, liveClient.test.ts with mocked fetch)
    features/walk/     (Walk.tsx, CompanyCard.tsx, PersonCard.tsx, EmailCard.tsx, CallChip.tsx)
    features/cost/     (pricing.ts, CostMeter.tsx, Receipt.tsx, receipt.ts, receipt.test.ts)
    features/history/  (HistoryPanel.tsx)
    features/labels/   (EditableLabel.tsx, labels.ts)
    features/settings/ (SettingsDialog.tsx, PriceTable.tsx)
    store/             (useAppStore.ts: Zustand persist)
    components/ui/     (shadcn)
```
Both mock and live implement one `SearchEngine` interface that yields a stream of call events (`started`, `settled` with provider, capability, price, outcome, payload). The UI only consumes events, so mock and live render identically.

## Tests (bun test, critical logic only)
- simulator: same input gives same events; misses cost $0.00; fallthrough happens after a finder miss; every shipped email ends in `.example`.
- receipt math: totals, cost per usable result, unknown and misses unbilled (include a fixture reproducing Treg's 27-person receipt: $0.58, $0.029 per usable).
- liveClient: request built with key header and base URL; maps response to events; 401/402 map to friendly errors (fetch mocked).
- persistence: settings round trip through zod.

## Stack
- Bun: runtime, package manager, scripts.
- Vite + React + TypeScript: one-screen app.
- Tailwind v4 + shadcn/ui (nova preset): Card, Button, Badge, Input, Dialog, Switch, Tabs, Table, ScrollArea, Tooltip, Slider.
- motion: column and edge animations.
- Zustand with persist: settings, labels, history.
- zod: validate imports and live responses.
- vite-plugin-singlefile: double-click HTML.
- oxlint: lint.

## Deferred
- Phone lookup, lookalike company lists, bulk CSV upload.
- Server proxy for live calls (if CORS blocks the browser, note it in the PR).
- Multi-user or saved lists.
