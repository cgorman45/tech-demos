# Openship Topology Lab

An interactive, single-page map of a mock multi-service app. Pan and zoom around eight services (web, api, worker, cron, postgres, redis, queue, object storage), click any node to inspect its image, port, uptime, env var names, and mock logs, and use Restart / Stop / Start to watch the graph react live — stopping a dependency flips its dependents (transitively) to `degraded`, and starting it recovers them.

Everything is mocked locally: there is no Openship install, no Docker, and no network calls. Metrics tick from a small random-walk generator and logs are canned per service kind.

## Credit

Inspired by the Topology view shipped in [Openship 0.8](https://x.com/openshipio/status/2104187404533838043) — see the [Openship repo](https://github.com/oblien/openship). This demo just recreates the vibe of that feature with fake data.

## Run it

```sh
cd apps/openship-topology-lab
bun install
bun run dev
```

Then open the printed URL (default http://localhost:5173).

## Tests

Store transition tests (stop propagates `degraded`, start restores, restart cycles) run with:

```sh
bun test
```

## Stack

Bun · Vite + React + TypeScript · @xyflow/react (canvas, minimap, controls) · @dagrejs/dagre (auto-layout) · Zustand (store) · shadcn/ui + Tailwind (Sheet, Button, Badge, ScrollArea).
