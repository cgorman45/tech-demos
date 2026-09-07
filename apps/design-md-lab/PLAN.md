# DESIGN.md Lab — Plan

## Goal

Paste a website URL and get back an agent-ready `DESIGN.md` describing that site's design system — color tokens, typography, spacing, radii, shadows, and component styles where detectable — ready to drop into a repo for AI coding agents to consume.

## Single-user MVP (+ outs)

**In:**

- One page: URL input → "Generate DESIGN.md" → rendered result.
- Server-side fetch of the target page's HTML, linked stylesheets, and `<style>` blocks (no headless browser).
- Static CSS analysis: CSS custom properties, color palette by frequency, font families/sizes/weights, spacing scale, border radii, shadows.
- Best-effort component extraction (buttons, headings, links, cards) from common selectors.
- Markdown preview with raw/rendered toggle, copy-to-clipboard, and `.md` download.

**Out (deferred):**

- Headless-browser rendering (JS-injected styles, computed styles).
- Screenshot capture / visual diffing of the source site.
- Multi-page crawling, auth-gated pages.
- Saved history, sharing, multi-user anything.
- LLM-assisted summarization of extracted styles.

## Tasks (outcome-oriented)

1. **User can run the app** — scaffold Next.js (App Router, TS, Tailwind) with `bunx create-next-app`, add `bunfig.toml` with `minimumReleaseAge` before any install, add shadcn/ui.
2. **User can submit a URL** — form with validation, loading state, and clear error messages (unreachable host, non-HTML response).
3. **App extracts styles** — API route fetches HTML, resolves and fetches linked stylesheets (capped count/size), parses CSS with `css-tree`, aggregates declarations into token buckets.
4. **App emits DESIGN.md** — generator turns token buckets into structured markdown: overview, color tokens, typography, spacing, radii, shadows, components, usage notes for agents.
5. **User can consume the output** — rendered markdown preview (raw + rendered), copy button, download button.

## Stack

- **Bun** — runtime + package manager (house default).
- **Next.js (App Router, TypeScript)** — one framework covers UI + the server-side fetch/analyze API route; no CORS issues since fetching happens server-side.
- **shadcn/ui + Tailwind** — minimalist preset; prebuilt Button/Input/Card/Tabs instead of custom UI.
- **cheerio** — battle-tested HTML parsing for `<link rel="stylesheet">`, `<style>`, and inline styles.
- **css-tree** — proper CSS AST parsing instead of regex; walks declarations reliably across minified real-world CSS.
- **react-markdown** — render the generated DESIGN.md preview.

## Deferred

Headless rendering, crawling, history/persistence, LLM enrichment, visual screenshots of target sites, tests beyond a smoke test of the extractor.
