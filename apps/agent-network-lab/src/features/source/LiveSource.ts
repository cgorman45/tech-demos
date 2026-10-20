import type { EngineStatus, SendOutcome } from "../network/types.ts"
import { engineStatusSchema } from "../network/types.ts"
import { directorySchema } from "../network/types.ts"
import type { NetworkSource, SendInput, SourceControl, SourceEvent } from "./NetworkSource.ts"

export class LiveSource implements NetworkSource {
  mode = "live" as const
  private stopped = false
  private socket: EventSource | null = null
  private retry: number | null = null
  private base: string
  private token: string
  private onDown: (message: string) => void

  constructor(base: string, token: string, onDown: (message: string) => void) {
    this.base = base
    this.token = token
    this.onDown = onDown
  }

  start(onEvent: (event: SourceEvent) => void) {
    this.connect(onEvent)
  }

  stop() {
    this.stopped = true
    this.socket?.close()
    if (this.retry !== null) window.clearTimeout(this.retry)
  }

  async send(input: SendInput): Promise<SendOutcome> {
    const response = await fetch(this.api("/api/send"), {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
    })
    const body = (await response.json()) as SendOutcome
    if (!response.ok) {
      return { recipients: [], messageIds: [], error: body.error || `Send failed (${response.status}).` }
    }
    return {
      recipients: body.recipients ?? [],
      messageIds: body.messageIds ?? [],
      error: body.error,
    }
  }

  async doctor(): Promise<string> {
    const response = await fetch(this.api("/api/doctor"), {
      headers: { authorization: `Bearer ${this.token}` },
    })
    return response.text()
  }

  control(_action: SourceControl) {}

  private connect(onEvent: (event: SourceEvent) => void) {
    if (this.stopped) return
    const socket = new EventSource(this.api("/api/events"))
    this.socket = socket
    const take = (name: string, fn: (data: string) => void) => {
      socket.addEventListener(name, (event) => fn((event as MessageEvent).data as string))
    }
    take("directory", (data) => {
      const parsed = directorySchema.safeParse(JSON.parse(data))
      if (parsed.success) onEvent({ type: "directory", directory: parsed.data })
    })
    take("message", (data) => onEvent({ type: "message", message: JSON.parse(data) }))
    take("send_result", (data) => onEvent({ type: "send_result", result: JSON.parse(data) as SendOutcome }))
    take("engine_status", (data) => {
      const parsed = engineStatusSchema.safeParse(JSON.parse(data))
      if (parsed.success) onEvent({ type: "engine_status", status: parsed.data })
    })
    take("error", (data) => {
      const body = JSON.parse(data) as { message?: string; raw?: string }
      onEvent({ type: "error", message: body.message ?? "The bridge reported an error.", raw: body.raw })
    })
    socket.onerror = () => {
      socket.close()
      if (this.stopped) return
      void this.recover(onEvent)
    }
  }

  private async recover(onEvent: (event: SourceEvent) => void) {
    try {
      const response = await fetch(this.api("/api/status"), {
        headers: { authorization: `Bearer ${this.token}` },
      })
      if (response.status === 401) {
        this.stopped = true
        this.onDown("The bridge restarted with a new token. Open the link it printed.")
        return
      }
    } catch {
      this.onDown("Reconnecting to the bridge.")
    }
    if (this.stopped) return
    this.retry = window.setTimeout(() => this.connect(onEvent), 1000)
  }

  private api(pathname: string): string {
    const url = new URL(pathname, this.base.endsWith("/") ? this.base : `${this.base}/`)
    url.searchParams.set("token", this.token)
    return url.toString()
  }
}

export async function fetchStatus(base: string, token: string): Promise<EngineStatus> {
  const url = new URL("/api/status", base.endsWith("/") ? base : `${base}/`)
  url.searchParams.set("token", token)
  let response: Response
  try {
    response = await fetch(url, { headers: { authorization: `Bearer ${token}` } })
  } catch {
    throw new Error(
      window.location.protocol === "file:"
        ? "This page was opened as a file, and this browser blocked it from calling the bridge. Use the link the bridge printed."
        : "The bridge did not answer. Is it running?",
    )
  }
  if (response.status === 401) throw new Error("That token was rejected. Open the link the bridge printed.")
  if (!response.ok) throw new Error(`The bridge returned ${response.status}.`)
  const parsed = engineStatusSchema.safeParse(await response.json())
  if (!parsed.success) throw new Error("The bridge status was not in the expected shape.")
  return parsed.data
}
