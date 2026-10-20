import type { MachineInfo } from "../network/types.ts"
import { randInt } from "./seededRandom.ts"

export type RouteKind = "local" | "lan" | "relay"

export function routeKind(from: MachineInfo, to: MachineInfo): RouteKind {
  if (from.person === to.person && from.machine === to.machine) return "local"
  if (from.link === "relay" || to.link === "relay") return "relay"
  return "lan"
}

export function latencyMs(kind: RouteKind, rng: () => number): number {
  if (kind === "local") return randInt(rng, 2, 10)
  if (kind === "lan") return randInt(rng, 15, 60)
  return randInt(rng, 120, 300)
}
