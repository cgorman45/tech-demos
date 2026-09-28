# openship-topology-lab: plan

Inspired by Openship 0.8.0 Topology (https://x.com/openshipio/status/2104187404533838043, https://github.com/oblien/openship). No Openship install; everything is mocked locally.

## Goal
A single-page interactive map of a mock multi-service app where you can pan/zoom, click any service to inspect it, and restart or stop it, with the map reacting live.

## Single-user MVP
- Canvas with ~8 mock services (web, api, worker, postgres, redis, queue, cron, object storage) laid out automatically, edges showing connections (http, tcp, pub/sub).
- Pan, zoom, fit-to-view, minimap.
- Each node shows name, kind icon, status dot (running / restarting / stopped / degraded), and a tiny CPU/mem readout that ticks from a mock generator.
- Click a node to open a side panel: status, image/version, port, uptime, env var names (not values), recent log lines (mock), and Restart / Stop / Start buttons.
- Restart animates restarting then running (~2s). Stop turns the node gray and dims or dashes its edges; dependents flip to degraded. Start recovers.
- Hovering an edge highlights both ends and shows the protocol.
- "Reset scenario" button.

Explicit outs: real Docker/SSH/Openship API, auth, persistence, multiple projects, editing the graph, deploy flows.

## Tasks (vertical slices)
1. Scaffold under `apps/openship-topology-lab/` with Vite React TS, bunfig.toml (minimumReleaseAge = 259200), shadcn/ui minimal preset.
2. Mock topology data and a small in-memory store (Zustand) with actions for restart, stop, start, reset, plus dependency-aware degraded status.
3. Canvas via React Flow (@xyflow/react) with custom service nodes, typed edges, minimap, controls, and dagre (or elkjs) auto-layout.
4. Inspect panel (shadcn Sheet) with details, mock logs, and actions wired to the store.
5. Polish: dark theme, status colors, restart animation, edge highlight, empty and stopped states.
6. Tests: unit tests for store transitions (stop propagates degraded; start restores) via `bun test`.
7. Proof: screenshot + short screen recording of pan/zoom, inspect, restart, stop, and recover, attached to the PR.

## Stack
- Bun: runtime and scripts (fleet default).
- Vite + React + TypeScript: one-screen utility, no framework routing needed.
- @xyflow/react: prebuilt node/edge canvas with pan/zoom/minimap, which absorbs most of the work.
- dagre: simple deterministic auto-layout.
- Zustand: tiny store for status transitions.
- shadcn/ui + Tailwind: Sheet, Button, Badge, ScrollArea.

## Deferred
- Real Openship/Docker connection (needs a running host).
- Drag-to-rearrange persistence, multiple environments, metrics history charts.
