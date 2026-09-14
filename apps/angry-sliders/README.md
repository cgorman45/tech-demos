# Angry Sliders

An *Angry Birds*-style slingshot slider playground, recreating [gsimone's "angry sliders" clip](https://x.com/ggsimm/status/2099497518627184949): pull a slider's thumb off the track like a slingshot, aim with the projected trajectory arc, release, and watch it fly to its landing spot.

Four sliders on a minimal dark panel — Exposure, Bloom, Field of view, Samples. Press anywhere on a track, drag down and to the side, and release. Arrow keys still nudge values normally.

## Run

```bash
bun install
bun run dev
```

Then open http://localhost:3000.

## Stack

Bun · Next.js (App Router) · Tailwind v4 · shadcn/ui · motion (framer-motion). The slingshot physics (launch velocity from the pull vector, constant gravity, parabolic flight onto the track line) is hand-rolled in `src/components/slingshot-slider.tsx`.
