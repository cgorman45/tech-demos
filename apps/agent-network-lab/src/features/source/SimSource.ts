import type { Directory, SendOutcome } from "../network/types.ts"
import { exampleTeam } from "../sim/exampleTeam.ts"
import { Simulator } from "../sim/simulator.ts"
import type { NetworkSource, SendInput, SourceControl, SourceEvent } from "./NetworkSource.ts"

export class SimSource implements NetworkSource {
  mode = "sim" as const
  private sim: Simulator
  private timer: ReturnType<typeof setInterval> | null = null
  private scale = 1

  constructor(team: Directory, seed = 42) {
    this.sim = new Simulator(team, seed)
  }

  start(onEvent: (event: SourceEvent) => void) {
    this.sim.on((event) => {
      if (event.type === "directory") onEvent({ type: "directory", directory: event.directory })
      else if (event.type === "message") onEvent(event)
      else if (event.type === "send_result") onEvent({ type: "send_result", result: event.result })
      else onEvent({ type: "error", message: event.message })
    })
    onEvent({ type: "directory", directory: structuredClone(this.sim.team) })
    this.timer = setInterval(() => this.sim.clock.advance(100 * this.scale), 100)
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  send(input: SendInput): Promise<SendOutcome> {
    return Promise.resolve(this.sim.send(input))
  }

  doctor(): Promise<string> {
    return Promise.resolve("doctor checks the live engine. The simulator has no daemon.")
  }

  control(action: SourceControl) {
    if (action.type === "serve") this.sim.serve(action.tool)
    else if (action.type === "as") this.sim.as(action.address)
    else if (action.type === "move") this.sim.move(action.address, action.repo, action.branch)
    else if (action.type === "demo") this.sim.playDemo()
    else if (action.type === "scale") this.scale = action.scale
    else if (action.type === "team") this.sim.setTeam(action.team)
  }
}

export function initialSimTeam(saved: Directory | null): Directory {
  return saved ?? exampleTeam()
}
