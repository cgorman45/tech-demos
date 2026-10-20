import type { Directory, EngineStatus, IncomingMessage, SendOutcome } from "../network/types.ts"

export type SourceEvent =
  | { type: "directory"; directory: Directory }
  | { type: "message"; message: IncomingMessage }
  | { type: "send_result"; result: SendOutcome }
  | { type: "engine_status"; status: EngineStatus }
  | { type: "error"; message: string; raw?: string }

export type SendInput = {
  to: string
  body: string
  fyi?: boolean
  notify?: boolean
  replyTo?: string
  kind: "ask" | "tell" | "handoff" | "broadcast"
}

export type SourceControl =
  | { type: "serve"; tool: string }
  | { type: "as"; address: string }
  | { type: "move"; address: string; repo: string; branch: string }
  | { type: "demo" }
  | { type: "scale"; scale: number }
  | { type: "team"; team: Directory }

export interface NetworkSource {
  mode: "live" | "sim"
  start(onEvent: (event: SourceEvent) => void): void
  stop(): void
  send(input: SendInput): Promise<SendOutcome>
  doctor(): Promise<string>
  control(action: SourceControl): void
}

export const TOKEN_KEY = "agent-network-lab:token"
export const URL_KEY = "agent-network-lab:url"

export function readToken(): string | null {
  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash
  const fromHash = new URLSearchParams(hash).get("token")
  if (fromHash) return fromHash
  return sessionStorage.getItem(TOKEN_KEY)
}

export function bridgeBase(): string {
  if (window.location.protocol === "file:") return "http://127.0.0.1:4777"
  if (window.location.port === "4777") return window.location.origin
  return sessionStorage.getItem(URL_KEY) || "http://127.0.0.1:4777"
}

export function rememberConnection(base: string, token: string) {
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(URL_KEY, base)
}
