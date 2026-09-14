# Angry Sliders — PLAN

## Goal

A one-page playground of personified range sliders that get visibly annoyed as you drag them, inspired by gsimone's "angry sliders" clip.

## Single-user MVP + outs

One local user opens one page and drags three sliders; each slider has a face on its thumb that reacts live (expression, color, shake) to the value and drag motion. No persistence, no auth, no settings, no mobile-specific work beyond what Tailwind gives for free.

Outs (explicitly not building): a reusable component library, theming system, configurable personalities, tests beyond a smoke build, storybook.

## Outcome-oriented tasks

1. **App boots** — Next.js App Router scaffold via `bun create next-app`, Tailwind, `bunfig.toml` with `minimumReleaseAge = 259200` written before any install.
2. **A slider exists** — shadcn/ui `slider` (Radix) installed and rendered with a custom thumb slot.
3. **The slider has feelings** — `AngryThumb` component: SVG face whose brows, eyes, and mouth interpolate from content → annoyed → furious as value rises; framer-motion springs for squash/tilt from drag velocity; shake + red flush near max.
4. **Three flavors on one page** — Classic range (0–100, generic mood), Volume (winces and covers "ears" as it gets loud), Intensity (heats up, steams, rage-shakes at max). Each shows a live value readout.
5. **Screenshot-friendly polish** — dark playful backdrop, big centered card, titles/captions, subtle idle animation (blinking) so a video looks alive.

## Stack

- **Bun** — repo standard; runs install/dev.
- **Next.js (App Router)** — official scaffold, zero wiring for a single page.
- **Tailwind + shadcn/ui** — minimalist preset; only the `slider` component, styled in place.
- **framer-motion (`motion`)** — springs, `useTransform` value→expression mapping, shake/blink micro-motion; absorbs all animation wiring.

## Deferred

Sound effects, haptics, more slider flavors, extracting the thumb as a published component, tests beyond `bun run build`, accessibility beyond what Radix slider provides out of the box.
