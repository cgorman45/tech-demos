# USGS LiDAR Elevation Lab

A small single-user demo for exploring US terrain in 3D, inspired by
[Matthew Mullin's state LiDAR explorer](https://mattmullin.space/state-lidar).

Search a place, fly over USGS 3DEP-derived elevation rendered as colored,
hillshaded 3D terrain, and swipe-compare it against USGS satellite imagery.

## Run it

```bash
bun install
bun run dev
```

Then open http://localhost:3000.

## Features

- **Place search** — OSM Nominatim geocoding, biased to the US (where 3DEP LiDAR coverage lives)
- **3D terrain** — MapLibre GL terrain from Terrarium-encoded DEM tiles ([Terrain Tiles on AWS Open Data](https://registry.opendata.aws/terrain-tiles/), built from USGS 3DEP over CONUS), styled with a `color-relief` hypsometric tint + `igor` hillshading
- **Swipe comparison** — two camera-synced maps; the satellite side ([USGS The National Map imagery](https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer)) is clipped by a draggable divider
- **Terrain controls** — vertical exaggeration slider, 2D/3D toggle, orbit spin
- **Live readout** — elevation (m / ft) and coordinates under the cursor, decoded client-side from the loaded DEM tiles
- **Presets** — Grand Canyon, Mount Rainier, Half Dome, Crater Lake, Mount St. Helens

All data sources are free, public, and keyless. No server-side state; everything runs in the browser.

## Stack

Bun · Next.js (App Router) · MapLibre GL JS · shadcn/ui · Tailwind CSS

See [PLAN.md](./PLAN.md) for scope decisions and deferred items.
