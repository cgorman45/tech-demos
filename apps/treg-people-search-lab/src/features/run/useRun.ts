import { useCallback, useRef, useState } from "react"
import { useAppStore } from "../../store/useAppStore"
import type { HistoryEntry } from "../../store/schema"
import { LiveClientError } from "../treg/liveClient"
import { playPlan, runSearch } from "./runSearch"
import type { PlannedCall, SearchRequest, Speed, VisibleCall } from "./runTypes"

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

export function useRun() {
  const [phase, setPhase] = useState<"idle" | "running" | "done" | "error">("idle")
  const [calls, setCalls] = useState<VisibleCall[]>([])
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<"example" | "live">("example")
  const [speed, setSpeed] = useState<Speed>("1")
  const [playback, setPlayback] = useState(0)
  const [request, setRequest] = useState<SearchRequest | null>(null)
  const speedRef = useRef(speed)
  speedRef.current = speed
  const abortRef = useRef<AbortController | null>(null)
  const runId = useRef(0)
  const planRef = useRef<PlannedCall[]>([])
  const requestRef = useRef<SearchRequest | null>(null)
  const modeRef = useRef<"example" | "live">("example")

  const play = useCallback(
    async (
      source: AsyncIterable<{ type: "started" | "settled"; call: PlannedCall }>,
      req: SearchRequest,
      runMode: "example" | "live",
      record: boolean,
      id: number,
    ) => {
      setPlayback(id)
      setPhase("running")
      setError(null)
      setCalls([])
      setMode(runMode)
      setRequest(req)
      requestRef.current = req
      modeRef.current = runMode
      const settled: PlannedCall[] = []
      try {
        for await (const event of source) {
          if (id !== runId.current) return
          if (event.type === "started") {
            setCalls((prev) => [...prev.filter((call) => call.id !== event.call.id), { ...event.call, state: "pending" }])
          } else {
            settled.push(event.call)
            setCalls((prev) =>
              prev.map((call) => (call.id === event.call.id ? { ...event.call, state: "settled" } : call)),
            )
          }
        }
        if (id !== runId.current) return
        planRef.current = settled
        setPhase("done")
        if (record) {
          useAppStore.getState().pushHistory({
            id: `${Date.now()}-${id}`,
            at: Date.now(),
            company: req.company,
            role: req.role,
            limit: req.limit,
            mode: runMode,
            total: settled.reduce((sum, call) => sum + call.billed, 0),
            calls: settled,
          })
        }
      } catch (err) {
        if (id !== runId.current || isAbort(err)) return
        setError(err instanceof LiveClientError ? err.message : "The run stopped before it finished.")
        setPhase("error")
      }
    },
    [],
  )

  const begin = useCallback(() => {
    const id = ++runId.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    return { id, signal: controller.signal }
  }, [])

  const start = useCallback(
    (req: SearchRequest, forceExample = false) => {
      if (forceExample) useAppStore.getState().setSettings({ live: false })
      const { settings, prices } = useAppStore.getState()
      const live = !forceExample && Boolean(settings.live && settings.apiKey.trim())
      const { id, signal } = begin()
      const source = runSearch(req, {
        live,
        prices,
        apiKey: settings.apiKey,
        baseUrl: settings.baseUrl,
        signal,
        speed: () => speedRef.current,
      })
      void play(source, req, live ? "live" : "example", true, id)
    },
    [begin, play],
  )

  const replay = useCallback(() => {
    const req = requestRef.current
    const plan = planRef.current
    if (!req || plan.length === 0 || phase === "running") return
    const { id, signal } = begin()
    void play(playPlan(plan, signal, () => speedRef.current), req, modeRef.current, false, id)
  }, [begin, phase, play])

  const playHistory = useCallback(
    (entry: HistoryEntry) => {
      const req = { company: entry.company, role: entry.role, limit: entry.limit }
      planRef.current = entry.calls
      const { id, signal } = begin()
      void play(playPlan(entry.calls, signal, () => speedRef.current), req, entry.mode, false, id)
    },
    [begin, play],
  )

  return {
    phase,
    calls,
    error,
    mode,
    speed,
    setSpeed,
    playback,
    request,
    start,
    replay,
    playHistory,
    clearError: () => setError(null),
  }
}
