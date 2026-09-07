# SVG Motion Lab — Plan

## Goal

A single-page playground of tasteful, subtle SVG motion — animated icons, loaders, and one
illustration — with a global intensity control and copy-ready code snippets for each demo.
Inspired by [@kitlangton's "subtly animated svgs"](https://x.com/kitlangton/status/2096703869136867563).

## Single-user MVP + outs

One local user, one page, no backend, no persistence, no auth. Everything renders client-side.

Outs (explicitly not building): snippet editing/live playground, theme editor, sharing/permalinks,
mobile-first polish beyond responsive grid, exporting animations, multiple pages.

## Outcome-oriented tasks

1. **See the lab** — Next.js app boots with a header, intensity control, and a responsive grid of demo cards.
2. **Enjoy animated icons** — 6 icons (bell, heart, star, mail, sun, checkmark) with hover/loop micro-animations built on SVG paths + Motion springs.
3. **Watch loaders** — 3 loaders (dash-orbit spinner, staggered dots, pathLength pulse) that loop continuously.
4. **See one illustration** — a small night-sky scene (moon, drifting clouds, twinkling stars, shooting star) with layered subtle motion.
5. **Tune intensity** — a global toggle (Off / Subtle / Playful) that scales durations, distances, and spring stiffness across every demo via React context.
6. **Copy the code** — each card has a "Copy" action that puts a self-contained JSX snippet on the clipboard, with a toast confirmation.

## Stack (one-line rationale each)

- **Bun** — repo standard; installs and runs everything.
- **Next.js (App Router, TS)** — official scaffold via `bunx create-next-app`, zero wiring for a single-page client app.
- **Tailwind CSS v4** — comes with the scaffold; utility styling with no config ceremony.
- **shadcn/ui** — prebuilt Button / Card / Tabs / ToggleGroup / Sonner so no custom component plumbing.
- **motion (framer-motion)** — the reason the lab exists: springs, `pathLength`, staggering, hover variants.

## Structure

```
apps/svg-motion-lab/
  bunfig.toml            # [install] minimumReleaseAge = 259200 (written before any install)
  PLAN.md
  src/app/               # layout + single page
  src/components/lab/    # DemoCard, IntensityToggle, icon/loader/illustration demos
  src/lib/intensity.tsx  # intensity context + motion presets
  src/lib/snippets.ts    # copy-ready source strings per demo
```

## Minimum tests / checks

`bun run build` (type-check + production build) and `bun run lint` must pass; manual visual pass
of all demos at each intensity level.

## Deferred

Live-editable snippets, more illustrations, reduced-motion media-query support beyond the "Off"
setting, keyboard shortcuts, snippet syntax highlighting.
