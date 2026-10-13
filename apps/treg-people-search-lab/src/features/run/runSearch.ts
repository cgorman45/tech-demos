import { simulateSearch } from "../mock/simulator"
import type { PlannedCall, RunEvent, SearchRequest, Speed } from "./runTypes"
import { liveSearch, type LiveContext } from "../treg/liveClient"
import type { PriceRow } from "../cost/pricing"

export function speedFactor(speed: Speed): number {
  if (speed === "instant") return 0
  if (speed === "2") return 0.5
  return 1
}

export async function waitFor(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0 || signal.aborted) return
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      clearTimeout(timer)
      reject(new DOMException("Aborted", "AbortError"))
    }
    signal.addEventListener("abort", onAbort, { once: true })
  })
}

export async function* playPlan(
  plan: PlannedCall[],
  signal: AbortSignal,
  speed: () => Speed,
): AsyncGenerator<RunEvent> {
  for (const call of plan) {
    if (signal.aborted) return
    yield { type: "started", call }
    await waitFor(call.delayMs * speedFactor(speed()), signal)
    if (signal.aborted) return
    yield { type: "settled", call }
  }
}

export interface RunOptions {
  live: boolean
  prices: PriceRow[]
  apiKey: string
  baseUrl: string
  signal: AbortSignal
  speed: () => Speed
  fetchImpl?: typeof fetch
}

export interface SearchEngine {
  run(request: SearchRequest, options: RunOptions): AsyncIterable<RunEvent>
}

export const mockEngine: SearchEngine = {
  run(request, options) {
    return playPlan(simulateSearch(request, options.prices), options.signal, options.speed)
  },
}

export const liveEngine: SearchEngine = {
  run(request, options) {
    const ctx: LiveContext = {
      apiKey: options.apiKey,
      baseUrl: options.baseUrl,
      prices: options.prices,
      signal: options.signal,
      speed: options.speed,
      fetchImpl: options.fetchImpl,
    }
    return liveSearch(request, ctx)
  },
}

export function runSearch(request: SearchRequest, options: RunOptions): AsyncIterable<RunEvent> {
  return (options.live ? liveEngine : mockEngine).run(request, options)
}
