# God's Eye View lab

A single-user mini "God's Eye View": a photorealistic 3D globe with live open-data layers — the ISS with its orbit track, and live aircraft from an open ADS-B feed. Inspired by [bilawalsidhu/gods-eye-view](https://github.com/bilawalsidhu/gods-eye-view).

## Run it

```bash
bun install
bun run dev
```

Then open http://localhost:3000.

## Data sources (all keyless — no API keys or env vars needed)

- **ISS position + orbit track**: [wheretheiss.at](https://wheretheiss.at/w/developer), proxied via `/api/iss`. The live position is polled every 3 s; the ±orbit ground track is cached server-side for 5 minutes.
- **Aircraft (ADS-B)**: [api.adsb.lol](https://api.adsb.lol/docs), proxied via `/api/aircraft`. Defaults to a 250 nm radius around the North Sea / Benelux (dense airspace); polled every 12 s with a 10 s server-side cache. Override with `?lat=&lng=&radius=` query params on the API route.

Both external APIs are called from Next.js route handlers so the browser never hits them directly (no CORS issues, and polite caching keeps us within their rate limits).

## Controls

- **Drag** to orbit, **scroll** to zoom. The globe auto-rotates until you focus.
- **ISS + orbit track** toggle — glowing marker, label, and the sky-blue ground track.
- **Aircraft (ADS-B)** toggle — dots tinted by altitude (amber near the ground → cyan at cruise).
- **Focus on ISS** — flies the camera to the station's current position.

## Stack

Bun · Next.js (App Router) · react-globe.gl / three-globe · shadcn/ui · Tailwind. Globe textures (NASA Blue Marble, topology bump map, night sky) are served locally from `public/textures/`.
