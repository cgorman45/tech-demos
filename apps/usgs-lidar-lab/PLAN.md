# USGS LiDAR Elevation Lab — Plan

## Goal

A small, delightful single-user web demo for exploring US terrain in 3D: search a place, see USGS 3DEP-derived elevation rendered as shaded relief in 3D, and swipe-compare it against satellite imagery.

## Single-user MVP boundary

One person, one browser, no accounts, no persistence, no server-side state. All data comes from free public tile/API endpoints at runtime — no keys, no downloads, no processing pipeline. US-focused (that's where 3DEP 1m LiDAR coverage lives); the rest of the world degrades gracefully to coarser DEM data baked into the same tileset.

**In:**

- Address / place search (geocoding) with keyboard-friendly results
- 3D terrain view: MapLibre GL terrain from USGS 3DEP-derived DEM tiles, hillshade + subtle color relief for the "LiDAR bare-earth" look
- Swipe slider comparing elevation view vs USGS satellite imagery (two synced maps, CSS clip)
- Vertical exaggeration slider, 2D/3D pitch toggle, one-click orbit spin
- Live elevation readout at the cursor (decoded client-side from DEM tiles)
- Curated preset locations (Grand Canyon, Mount Rainier, Half Dome, …) for instant wow

**Out (deferred):**

- GIF export — an orbit button gives the same delight without a client-side encoder; screen capture covers sharing
- Point-cloud rendering of raw LiDAR (LAZ/EPT) — heavy three.js path, not needed for the MVP feel
- Drawing profiles / cross-sections, measurement tools
- Mobile-first layout polish (works, but desktop is the target)

## Tasks (outcome-oriented)

1. **See terrain in 3D** — scaffold Next.js (Bun), add MapLibre map with raster-dem terrain + hillshade, pitched camera, preset start location.
2. **Compare vs satellite** — second synced map with USGS imagery, draggable swipe divider clipping the top map.
3. **Find any place** — search box hitting Nominatim geocoding (US-biased), fly-to on select.
4. **Play with the terrain** — exaggeration slider, 2D/3D toggle, orbit animation, cursor elevation readout.
5. **Ship it** — shadcn UI polish, presets, README, screenshot + video, PR.

## Stack

- **Bun** — runtime/package manager (house rule; `bunfig.toml` pins `minimumReleaseAge`).
- **Next.js (App Router)** — official scaffold, zero wiring decisions; everything client-side in one page.
- **MapLibre GL JS** — native `raster-dem` terrain, hillshade, and camera animation absorb the entire 3D-rendering task that three.js would make us hand-build.
- **shadcn/ui + Tailwind** — minimalist prebuilt components (card, input, slider, button, toggle).
- **Data sources (all free, keyless):**
  - Terrain: AWS Open Data *Terrain Tiles* (`elevation-tiles-prod`, Terrarium PNG encoding) — built from USGS 3DEP over CONUS, the best publicly tiled form of that data.
  - Imagery: USGS National Map `USGSImageryOnly` tile service.
  - Geocoding: OSM Nominatim search API.

## Rationale for MapLibre over three.js

MapLibre gives tiled DEM streaming, LOD, terrain mesh, hillshading, globe-ready camera controls, and attribution for free. A three.js terrain would need manual tile fetching, mesh stitching, and controls — all cost, no MVP benefit.
