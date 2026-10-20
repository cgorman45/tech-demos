import type { Directory, IncomingMessage, SendOutcome, SessionInfo } from "../network/types.ts"
import { SimClock } from "./clock.ts"
import { DEMO_MS, demoScript, type DemoEvent } from "./demoScript.ts"
import { exampleTeam } from "./exampleTeam.ts"
import { replyFor } from "./replies.ts"
import { latencyMs, routeKind } from "./router.ts"
import { mulberry32 } from "./seededRandom.ts"

export type SimEvent =
  | { type: "directory"; directory: Directory }
  | { type: "message"; message: IncomingMessage }
  | { type: "send_result"; result: SendOutcome; at: number }
  | { type: "error"; message: string }

type Listener = (event: SimEvent) => void

export class Simulator {
  clock = new SimClock()
  team: Directory
  actingAs: string | null = null
  private rng: () => number
  private listeners = new Set<Listener>()
  private seq = 0

  constructor(team: Directory, seed: number) {
    this.team = structuredClone(team)
    this.rng = mulberry32(seed)
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit(event: SimEvent) {
    for (const listener of this.listeners) listener(event)
  }

  setTeam(team: Directory) {
    this.team = structuredClone(team)
    this.emit({ type: "directory", directory: this.team })
  }

  send(req: { to: string; body: string; kind: string }): SendOutcome {
    const target = this.find(req.to)
    if (!target) {
      const result: SendOutcome = { recipients: [], messageIds: [], error: `No session named ${req.to}.` }
      this.emit({ type: "send_result", result, at: this.clock.now })
      return result
    }
    const fromMachine = this.team.machines.find((machine) => machine.is_me) ?? this.team.machines[0]
    const toMachine = this.team.machines.find(
      (machine) => machine.person === target.person && machine.machine === target.machine,
    )
    if (!fromMachine || !toMachine || target.status === "offline" || !toMachine.online) {
      const result: SendOutcome = {
        recipients: [{ address: target.address, state: "refused", note: "offline: the session is not reachable" }],
        messageIds: [],
      }
      this.emit({ type: "send_result", result, at: this.clock.now })
      return result
    }
    const hop = latencyMs(routeKind(fromMachine, toMachine), this.rng)
    const delivery = describeDelivery(target)
    const messageId = `sim_${this.seq++}_${Math.floor(this.rng() * 1_000_000)}`
    const result: SendOutcome = {
      recipients: [{ address: target.address, state: delivery.state, note: delivery.note }],
      messageIds: [messageId],
    }
    this.emit({ type: "send_result", result, at: this.clock.now })
    const warm = 1500 + Math.floor(this.rng() * 501)
    const busyExtra = target.status === "busy" ? 3000 + Math.floor(this.rng() * 1000) : 0
    const reply = replyFor(req.body, this.rng)
    this.clock.schedule(hop + warm + busyExtra, () => {
      this.emit({
        type: "message",
        message: {
          id: `sim_reply_${messageId}`,
          from: target.address,
          agent: target.agent,
          repo: target.repo,
          via: null,
          replyTo: messageId,
          body: reply,
          receivedAt: this.clock.now,
          simulated: true,
        },
      })
    })
    return result
  }

  serve(tool: string) {
    const me = this.team.machines.find((machine) => machine.is_me) ?? this.team.machines[0]
    if (!me) return
    const name = `${tool}-serve`.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()
    const address = `${me.person}/${name}`
    this.team.sessions = this.team.sessions.filter((session) => session.address !== address)
    this.team.sessions.push({
      address,
      name,
      person: me.person,
      machine: me.machine,
      agent: tool,
      cwd: "/work/serve",
      repo: null,
      branch: null,
      status: "idle",
      since: Date.now(),
      doing: `serving ${tool}`,
      tier: "push",
      unread: 0,
      is_me: false,
    })
    this.emit({ type: "directory", directory: this.team })
  }

  as(address: string) {
    this.actingAs = address
  }

  move(address: string, repo: string, branch: string) {
    const target = this.find(address)
    if (!target) return
    target.repo = repo
    target.branch = branch
    target.status = "busy"
    target.doing = `moved to ${repo}@${branch}`
    target.since = Date.now()
    this.emit({ type: "directory", directory: this.team })
  }

  playDemo(now = Date.now()) {
    this.clock.clear()
    this.clock.now = 0
    this.team = exampleTeam(now)
    this.emit({ type: "directory", directory: this.team })
    for (const event of demoScript) {
      this.clock.schedule(event.at, () => this.applyDemo(event))
    }
    this.clock.schedule(DEMO_MS, () => {
      this.emit({ type: "error", message: "Demo finished." })
    })
  }

  private applyDemo(event: DemoEvent) {
    if (event.type === "incoming") {
      this.emit({
        type: "message",
        message: {
          id: `demo_${event.at}`,
          from: event.from,
          agent: event.agent,
          repo: event.repo,
          via: null,
          replyTo: null,
          body: event.body,
          receivedAt: this.clock.now,
          simulated: true,
        },
      })
      return
    }
    const target = this.find(event.address)
    if (!target) return
    target.status = event.status
    if (event.repo) target.repo = event.repo
    if (event.branch) target.branch = event.branch
    if (event.doing) target.doing = event.doing
    target.since = Date.now()
    this.emit({ type: "directory", directory: this.team })
  }

  private find(address: string): SessionInfo | undefined {
    return (
      this.team.sessions.find((session) => session.address === address) ??
      this.team.sessions.find((session) => session.name === address)
    )
  }
}

function describeDelivery(target: SessionInfo): { state: string; note: string } {
  if (target.status === "busy") return { state: "queued", note: "queued: the session is busy" }
  if (target.tier === "push") {
    return { state: "delivered", note: "delivered: the session was waiting for messages" }
  }
  if (target.tier === "turn") {
    return { state: "queued", note: "queued: it sees it at its next tool call or when its turn ends" }
  }
  if (target.tier === "pull") {
    return { state: "inbox", note: "queued: this agent only sees it when it checks its inbox" }
  }
  return { state: "queued", note: "queued: it gets it the next time it listens" }
}

export function simulateScript(seed: number) {
  const sim = new Simulator(exampleTeam(1_700_000_000_000), seed)
  const events: SimEvent[] = []
  sim.on((event) => events.push(event))
  sim.send({ to: "colton/docs-grok", body: "hi", kind: "ask" })
  sim.send({ to: "colton/api-claude", body: "busy?", kind: "ask" })
  sim.send({ to: "sam/worker-pi", body: "offline?", kind: "tell" })
  sim.clock.advance(20_000)
  return events
}
