# PLAN — Schematic Morph Lab

## Goal

One-sentence goal: a single-page playground where a labeled 2D schematic of the
Santa Ana Police Department / Civic Center campus (60 Civic Center Plaza,
Santa Ana, CA 92701) morphs into an extruded 3D massing view as you drag a
slider — inspired by Dilum Sanjaya's 2D→3D floor-plan morph demo.

## Single-user MVP boundary

One visitor, one page, one site. No auth, no persistence, no routing, no
multi-site picker. The page loads with the schematic flat (morph = 0); dragging
the scrubber extrudes the buildings and tilts the camera into a 3D view; after
the morph completes, light orbit/pan is enabled. A card below the canvas shows
a copy-ready snippet of the morph control.

Explicitly out (deferred):
- Multiple sites / address search / arbitrary OSM import UI
- Interior floor plans of any kind — the site is a police facility, so we only
  use the public exterior footprint from OpenStreetMap plus simple campus
  massing. No invented secure-area layouts.
- Textures, sun studies, shadows-accurate rendering, mobile-perfect layout
- Tests beyond a build smoke check (page is one visual scene; `next build`
  plus manual verification covers the MVP)

## Data (site-specific, public sources only)

- Building footprints: OpenStreetMap via the public OSM API —
  way 205740155 ("Santa Ana Police Department", `amenity=police`), way
  205740158 ("Santa Ana City Jail"), two parking structures, and nearby
  context buildings within ~150 m. Extracted once at build time by
  `scripts/fetch-site-data.ts` into `src/data/civic-center.json`
  (local meter coordinates). © OpenStreetMap contributors, ODbL.
- Heights: OSM `height` tags where mapped (context buildings); the named civic
  buildings have no OSM height, so we use estimates from public imagery
  (SAPD HQ ≈ 4 stories). The UI labels these as estimates and cites the source.

## Outcome-oriented tasks

1. Site data ready — one-shot script converts the OSM extract to a compact
   JSON of polygons + heights in local meters; checked into the repo so the
   app never hits the network at runtime.
2. Page renders the 2D schematic — React Three Fiber scene, top-down camera,
   flat filled footprints with outline edges and building labels; looks like a
   drawing, not a game.
3. Scrubber morphs 2D → 3D — one `morph` value (0..1) drives extrusion depth,
   camera dolly/tilt (top-down ortho feel → 3/4 perspective), and label fade.
4. Post-morph orbit — OrbitControls enabled when morph ≥ ~0.95 (nice-to-have,
   drei gives it for free).
5. Copy-ready snippet — shadcn Card with the `<MorphControl />` source and a
   copy button.
6. Provenance in UI — footer states the exact address, the OSM way IDs, the
   license, and that heights are estimates; no interior data used.

## Stack (one-line rationale each)

- **Bun** — repo standard; install + dev runner.
- **Next.js 15 (app router, `create-next-app` scaffold)** — official scaffold,
  zero wiring for TS/Tailwind/ESLint.
- **Tailwind v4 + shadcn/ui (Slider, Card, Button, Badge)** — prebuilt
  minimalist controls; the slider *is* the product's main control.
- **three + @react-three/fiber + @react-three/drei** — declarative Three.js;
  drei's `OrbitControls`/`Html` absorb camera + label work.
- **No state library** — one `useState` morph value is the whole app state.

## Deferred

Multi-site support, real terrain, OSM live fetch UI, animated auto-play tour,
tests for scene internals, deploy config.

## Visual upgrade pass

The page now reads as an architectural presentation sheet rather than a dark
HUD: parchment paper (`#d8d2c0`), dark-sepia ink (`#4a4436`), hairline
borders, a title block, boxed DATA SOURCE / NOTES panels and a static PLAN
inset (SVG from `civic-center.json`). In the scene, a `MATERIALS` record gives
each building kind wall/roof/ink tones with a procedural per-floor facade band
(police: sandstone with strip glazing, jail: cool concrete, parking: exposed
deck, context: pale massing); an `ANNOTATIONS` table drives leader-line labels
for SAPD, the City Jail, the largest parking structure and Civic Center Plaza;
seeded (`mulberry32`) trees are placed in planting zones, rejected within 4 m
of any footprint, and rendered as two instanced meshes that flatten to plan
symbols at morph 0. Warm hemisphere + ambient + one directional key with soft
PCF shadows (radius 8, intensity 0.8) over a paving slab and faint sepia plot
grid. `?morph=0..1` starts the lab settled at that state for deterministic
captures. Morph feel, stagger, camera path and the 0.93 orbit handoff are
unchanged.
