# DESIGN.md Lab

Paste a website URL and get an agent-ready `DESIGN.md` — color tokens, typography, spacing, radii, shadows, and component styles extracted from the site's shipped CSS. Drop the output into a repo so AI coding agents can match the source site's look and feel.

## Run

```bash
bun install
bun run dev
```

Then open [http://localhost:3000](http://localhost:3000), paste a URL (e.g. `stripe.com`), and hit Generate.

## How it works

1. A route handler (`/api/generate`) fetches the target page's HTML server-side (no CORS issues).
2. `cheerio` collects linked stylesheets, `@import`s, `<style>` blocks, and inline `style` attributes.
3. `css-tree` parses every stylesheet into an AST; declarations are aggregated into token buckets: CSS custom properties, colors, font families/sizes/weights, spacing, border radii, shadows, transitions, and z-index layers.
4. Common selectors (`button`, `h1`–`h3`, `a`, `.card`, inputs, nav) are matched to recover best-effort component styles.
5. A generator turns the buckets into a structured `DESIGN.md` with frequency-ordered tables, previewable in-app and downloadable.

Extraction is **static** — styles injected at runtime by JavaScript are not captured. See `PLAN.md` for scope and deferred items.

## Stack

Bun · Next.js (App Router, TypeScript) · Tailwind CSS v4 · shadcn/ui · cheerio · css-tree · react-markdown
