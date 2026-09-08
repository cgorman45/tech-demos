# PLAN — God's Eye View lab

## Goal

A single-user "God's Eye View" mini globe: a photorealistic 3D Earth with a couple of live open-data layers (ISS + aircraft), inspired by bilawalsidhu/gods-eye-view — small and delightful, not an OSINT clone.

## Single-user MVP boundary

**In:**

- Photorealistic 3D Earth (night-lights / Blue Marble textures, atmosphere glow) you can orbit and zoom.
- Live ISS position + recent/predicted ground track, refreshed every few seconds.
- Live aircraft layer (ADS-B) around a focus region, refreshed periodically.
- Layer toggles and a "Focus on ISS" camera control.
- Keyless public APIs only; server-side proxy routes to avoid CORS/rate-limit pain.

**Out (deferred):**

- Auth, persistence, multi-user, alerts.
- AIS ship feeds (no reliable keyless source), satellite catalogs, historical playback.
- Cesium-grade terrain/imagery streaming, mobile polish, offline mode.

## Stack (one-line rationale each)

- **Bun** — repo standard; installs and runs everything.
- **Next.js 15 (App Router)** — official scaffold, gives API proxy routes for free.
- **react-globe.gl / three-globe** — chosen over CesiumJS: works instantly as an npm package with Bun/Next (no static-asset copying, no Ion token), photorealistic enough with NASA Blue Marble/night textures.
- **shadcn/ui + Tailwind** — minimalist preset for the control panel (switches, buttons, badges).
- **wheretheiss.at API** — keyless ISS position + bulk positions for the ground track.
- **api.adsb.lol** — keyless open ADS-B feed for live aircraft near a point.

No API keys or env vars required.

## Outcome-oriented tasks

1. **Scaffold boots** — `bunx create-next-app` (TS, Tailwind, App Router) under `apps/gods-eye-lab/` with `bunfig.toml` (`minimumReleaseAge = 259200`) written before any install; `bun run dev` serves the default page.
2. **Earth renders** — full-screen react-globe.gl globe with night-earth texture, bump map, atmosphere; smooth orbit controls.
3. **ISS is live** — `/api/iss` proxy (position + track from wheretheiss.at); ISS marker moves, ground track drawn as an arc/path.
4. **Planes are live** — `/api/aircraft` proxy (adsb.lol point query around a default region); aircraft rendered as points with altitude-tinted colors.
5. **Controls work** — floating shadcn panel: toggle ISS layer, toggle aircraft layer, "Focus on ISS" button that flies the camera to the ISS; live status badges (ISS lat/lon/alt, plane count).
6. **Self-contained check** — fresh `bun install && bun run dev` from `apps/gods-eye-lab/` works; README documents APIs and controls.

## Tests / verification

- Manual run-through in browser (screenshot + screen recording attached to PR).
- Proxy routes return valid JSON (spot-checked via curl).
