# Schematic 3D Lab

A 2D site schematic of the **Santa Ana Police Department / Civic Center**
(60 Civic Center Plaza, Santa Ana, CA 92701) that morphs into an extruded
Three.js 3D massing view as you drag a scrubber. Inspired by
[Dilum Sanjaya's 2D→3D morph demo](https://x.com/DilumSanjaya/status/2097005668389802027).

## Run it

```bash
bun install
bun run dev
```

Then open http://localhost:3000, drag the 2D/3D scrubber (or hit **Extrude**),
and orbit the campus once the morph completes.

## Data source

Building footprints © OpenStreetMap contributors (ODbL 1.0), pulled from the
public OSM API by `scripts/fetch-site-data.ts` and checked in at
`src/data/civic-center.json` — way 205740155 (Santa Ana Police Department),
way 205740158 (Santa Ana City Jail), nearby parking structures, and context
buildings within ~150 m. **Exterior footprints and public campus massing
only** — no interior floor plans or secure-area layouts are used or invented.
Named civic building heights are estimates from public imagery; context
heights use OSM `height` tags where mapped.

Regenerate the extract with `bun run scripts/fetch-site-data.ts`.

## Stack

Bun · Next.js (app router) · Tailwind v4 · shadcn/ui · three /
@react-three/fiber / @react-three/drei
