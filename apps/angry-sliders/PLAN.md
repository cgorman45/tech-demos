# Angry Sliders — PLAN

## Goal

Recreate gsimone's "angry sliders" demo: an *Angry Birds* pun where you set a slider's value by pulling its thumb off the track like a slingshot, aiming with a projected trajectory arc, and letting it fly.

## Reference behavior (from the clip)

A minimal dark settings panel with four plain sliders — Exposure, Bloom, Field of view, Samples. Dragging a thumb pulls it *off* the track (down and away, like a slingshot). While aiming:

- two solid accent-colored "rubber bands" stretch from the thumb's anchor point on the track to the pulled thumb,
- a dotted parabolic arc shows the trajectory to a landing point on the track,
- a small tick marks the landing spot with the projected value above it,
- the right-hand value readout turns accent-colored and live-updates to the target,
- the track's white fill line hides while the thumb is detached.

On release the thumb flies along the arc, lands crisply at the tick with a brief glow flash, and the fill reappears at the new value. Sliders act independently; no faces, no shaking.

## Single-user MVP + outs

One local user opens one page and slingshots four sliders. Keyboard arrows still nudge values (accessibility). No persistence, no settings, no sound.

Outs: touch-specific tuning beyond pointer events, configurable physics, component-library packaging.

## Outcome-oriented tasks

1. **App boots** — Next.js App Router scaffold via `bun create next-app`, Tailwind v4, `bunfig.toml` with `minimumReleaseAge = 259200` written before any install; shadcn/ui initialized (its stock `ui/slider.tsx` is kept as the conventional baseline, but the mechanic needs a free 2D thumb, so the slingshot slider handles its own pointer math).
2. **Slingshot works** — `SlingshotSlider`: pointer-capture drag detaches the thumb; projectile physics (launch velocity ∝ pull vector, constant gravity) computes the landing point on the track line; SVG overlay draws bands, dotted arc, tick, and floating target value.
3. **Release flies** — rAF animation moves the thumb along the real parabola to the landing spot, snaps to step, flashes a small glow on landing, commits the value.
4. **The panel** — four flavors with real-feeling units and formats: Exposure (−2…+2 EV), Bloom (0–100 %), Field of view (20–120°), Samples (0–256), laid out like the clip: label left, mono value right, thin track, generous spacing, near-black background.

## Stack

- **Bun** — repo standard.
- **Next.js (App Router)** — official scaffold, one page.
- **Tailwind v4 + shadcn/ui** — minimalist styling conventions and the `cn` helper.
- **framer-motion (`motion`)** — glow flash and small transitions; the flight itself is a hand-rolled parabola on rAF because it must follow physics exactly.

## Deferred

Sound on landing, particle dust, touch fine-tuning, configurable gravity, tests beyond `bun run build`.
