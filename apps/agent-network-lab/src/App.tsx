import { useEffect, useRef, useState } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { applyCompletion } from "./features/commands/suggest.ts"
import { CommandBox } from "./features/commands/CommandBox.tsx"
import { ExampleChips, exampleCommands } from "./features/commands/ExampleChips.tsx"
import { helpText } from "./features/commands/help.ts"
import { parseCommand, type ParsedCommand } from "./features/commands/parseCommand.ts"
import { EditableLabel } from "./features/edit/EditableLabel.tsx"
import { MACHINE_COLORS } from "./features/edit/Nicknames.tsx"
import { parseBackup } from "./features/edit/importExport.ts"
import { SimTeamEditor } from "./features/edit/SimTeamEditor.tsx"
import { HandoffList } from "./features/handoffs/HandoffList.tsx"
import { handoffBody, statusFromReply } from "./features/handoffs/handoffs.ts"
import { logAsJson, logAsText } from "./features/log/logExport.ts"
import { MessageLog } from "./features/log/MessageLog.tsx"
import type { Flight } from "./features/map/NetworkMap.tsx"
import { NetworkMap } from "./features/map/NetworkMap.tsx"
import { activeCollisions, handoffConflict, idleOverlaps } from "./features/network/collisions.ts"
import { CollisionStrip } from "./features/network/CollisionStrip.tsx"
import { isOwnEcho, isUtilitySession, type Directory, type EngineStatus, type SessionInfo } from "./features/network/types.ts"
import { Roster } from "./features/roster/Roster.tsx"
import { SetupTab } from "./features/setup/SetupTab.tsx"
import { exampleTeam } from "./features/sim/exampleTeam.ts"
import { ConnectDialog } from "./features/source/ConnectDialog.tsx"
import { fetchStatus, LiveSource } from "./features/source/LiveSource.ts"
import { bridgeBase, readToken, rememberConnection, type NetworkSource, type SourceEvent } from "./features/source/NetworkSource.ts"
import { initialSimTeam, SimSource } from "./features/source/SimSource.ts"
import { StatusPill } from "./features/source/StatusPill.tsx"
import { backupFromStore, useAppStore } from "./store/useAppStore.ts"

type Pending = {
  logId: string
  to: string
  sentAt: number
  messageId: string | null
  kind: "ask" | "handoff"
  handoffId?: string
  tier: string
}

type Choice = "ask" | "send" | "cancel"

export default function App() {
  const store = useAppStore()
  const [mode, setMode] = useState<"live" | "sim">("sim")
  const [directory, setDirectory] = useState<Directory | null>(null)
  const [status, setStatus] = useState<EngineStatus | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [reconnecting, setReconnecting] = useState(false)
  const [booting, setBooting] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [filter, setFilter] = useState("")
  const [tab, setTab] = useState("network")
  const [draft, setDraft] = useState("")
  const [matches, setMatches] = useState<string[]>([])
  const [pending, setPending] = useState<Pending | null>(null)
  const [flight, setFlight] = useState<Flight | null>(null)
  const [connectOpen, setConnectOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [collision, setCollision] = useState<{ address: string; doing: string; repo: string; branch: string } | null>(null)
  const [broadcast, setBroadcast] = useState<string[] | null>(null)
  const [backupText, setBackupText] = useState("")
  const [importError, setImportError] = useState<string | null>(null)
  const [demoScale, setDemoScale] = useState<1 | 2>(1)
  const [now, setNow] = useState(() => Date.now())
  const sourceRef = useRef<NetworkSource | null>(null)
  const handlerRef = useRef<(event: SourceEvent) => void>(() => {})
  const pendingRef = useRef<Pending | null>(null)
  const directoryRef = useRef<Directory | null>(null)
  const modeRef = useRef<"live" | "sim">("sim")
  const historyRef = useRef<string[]>([])
  const historyAt = useRef(0)
  const collisionResolve = useRef<((choice: Choice) => void) | null>(null)
  const broadcastResolve = useRef<((ok: boolean) => void) | null>(null)

  directoryRef.current = directory
  modeRef.current = mode

  function setPendingBoth(value: Pending | null) {
    pendingRef.current = value
    setPending(value)
  }

  handlerRef.current = (event) => {
    if (event.type === "directory") {
      setDirectory(event.directory)
      return
    }
    if (event.type === "engine_status") {
      setStatus(event.status)
      setReconnecting(false)
      return
    }
    if (event.type === "error") {
      store.addLog({
        id: uid(),
        at: Date.now(),
        kind: "system",
        body: event.raw ? `${event.message}\n${event.raw}` : event.message,
        simulated: modeRef.current === "sim",
      })
      return
    }
    if (event.type === "message") {
      const message = event.message
      const person = directoryRef.current?.person ?? ""
      if (modeRef.current === "live" && isOwnEcho(message, person)) return
      const waiting = pendingRef.current
      const matched =
        waiting &&
        (message.from === waiting.to || (waiting.messageId !== null && message.replyTo === waiting.messageId))
      const elapsed = matched ? Date.now() - waiting.sentAt : undefined
      if (matched && waiting.handoffId) store.patchHandoff(waiting.handoffId, statusFromReply(message.body))
      if (matched) {
        store.patchLog(waiting.logId, { elapsedMs: elapsed })
        setPendingBoth(null)
      }
      store.addLog({
        id: uid(),
        at: Date.now(),
        kind: "incoming",
        from: message.from,
        to: person ? `${person}/dashboard` : undefined,
        body: message.body,
        agent: message.agent,
        repo: message.repo,
        elapsedMs: elapsed,
        simulated: Boolean(message.simulated) || modeRef.current === "sim",
        messageId: message.id,
      })
      const fromSession = directoryRef.current?.sessions.find((session) => session.address === message.from)
      if (fromSession && directoryRef.current) {
        setFlight({
          id: uid(),
          fromKey: `${fromSession.person}/${fromSession.machine}`,
          toKey: `${directoryRef.current.person}/${directoryRef.current.machine}`,
        })
      }
    }
  }

  function adopt(source: NetworkSource) {
    sourceRef.current?.stop()
    sourceRef.current = source
    source.start((event) => handlerRef.current(event))
  }

  function startSim(message: string | null) {
    const team = initialSimTeam(useAppStore.getState().simTeam)
    setMode("sim")
    setStatus(null)
    setReconnecting(false)
    setDirectory(team)
    setNote(message)
    const source = new SimSource(team)
    source.control({ type: "scale", scale: demoScale })
    adopt(source)
  }

  useEffect(() => {
    let cancel = false
    function boot() {
      const token = readToken()
      const base = bridgeBase()
      const filePage = window.location.protocol === "file:"
      if (!filePage && token) {
        void fetchStatus(base, token)
          .then((next) => {
            if (cancel || readToken() !== token) return
            rememberConnection(base, token)
            setStatus(next)
            setMode("live")
            setNote(null)
            setReconnecting(false)
            setBooting(false)
            adopt(new LiveSource(base, token, (down) => {
              setReconnecting(true)
              setNote(down)
            }))
          })
          .catch((error: unknown) => {
            if (cancel || readToken() !== token) return
            startSim(error instanceof Error ? error.message : "Showing example data.")
            setBooting(false)
          })
      } else {
        startSim(null)
        setBooting(false)
      }
    }
    boot()
    window.addEventListener("hashchange", boot)
    const clock = window.setInterval(() => setNow(Date.now()), 15000)
    return () => {
      cancel = true
      window.removeEventListener("hashchange", boot)
      window.clearInterval(clock)
      sourceRef.current?.stop()
    }
  }, [])

  useEffect(() => {
    if (!pending) return
    const to = pending.to
    const simulated = mode === "sim"
    const timer = window.setTimeout(() => {
      useAppStore.getState().addLog({
        id: uid(),
        at: Date.now(),
        kind: "system",
        body: `Stopped waiting for ${to}.`,
        simulated,
      })
      setPendingBoth(null)
    }, 10 * 60 * 1000)
    return () => window.clearTimeout(timer)
  }, [pending, mode])

  useEffect(() => {
    if (!flight) return
    const timer = window.setTimeout(() => setFlight(null), 900)
    return () => window.clearTimeout(timer)
  }, [flight])

  const shown = directory
  const addresses = (shown?.sessions ?? [])
    .filter((session) => !isUtilitySession(session, shown?.person ?? ""))
    .map((session) => session.address)
  const chips = exampleCommands(addresses, shown?.sessions[0]?.repo ?? null, shown?.sessions[0]?.branch ?? null)
  const visibleLog = mode === "live" ? store.log.filter((entry) => !entry.simulated) : store.log
  const hard = shown ? activeCollisions(shown.sessions) : []
  const soft = shown ? idleOverlaps(shown.sessions) : []

  async function run(text: string) {
    if (!shown) return
    const parsed = parseCommand(text, { addresses, mode })
    if (!parsed.ok) {
      store.addLog({ id: uid(), at: Date.now(), kind: "system", body: parsed.error, simulated: mode === "sim" })
      return
    }
    historyRef.current = [...historyRef.current, text].slice(-50)
    historyAt.current = historyRef.current.length
    setDraft("")
    setMatches([])
    await perform(parsed.command, shown)
  }

  async function perform(command: ParsedCommand, current: Directory) {
    const source = sourceRef.current
    if (!source) return
    if (command.type === "help") {
      store.addLog({ id: uid(), at: Date.now(), kind: "system", body: helpText(mode), simulated: mode === "sim" })
      return
    }
    if (command.type === "clear") {
      store.clearLog()
      return
    }
    if (command.type === "who") {
      const needle = command.filter?.toLowerCase() ?? ""
      const lines = current.sessions
        .filter((session) => !needle || `${session.address} ${session.agent} ${session.repo ?? ""} ${session.doing ?? ""}`.toLowerCase().includes(needle))
        .map((session) => `${session.address} ${session.agent} ${session.status} ${session.repo ?? "no repo"}${session.branch ? `@${session.branch}` : ""} ${session.doing ?? ""}`.trim())
      store.addLog({ id: uid(), at: Date.now(), kind: "who", body: lines.join("\n") || "No sessions.", simulated: mode === "sim" })
      return
    }
    if (command.type === "doctor") {
      const text = await source.doctor()
      store.addLog({ id: uid(), at: Date.now(), kind: "doctor", body: text, simulated: mode === "sim" })
      return
    }
    if (command.type === "serve" || command.type === "as" || command.type === "move") {
      source.control(command)
      store.addLog({
        id: uid(),
        at: Date.now(),
        kind: "system",
        body: command.type === "serve" ? `Serving ${command.tool} in the example team.` : command.type === "as" ? `Acting as ${command.address} in the example team.` : `Moved ${command.address} to ${command.repo}@${command.branch}.`,
        simulated: true,
      })
      return
    }
    if (command.type === "broadcast") {
      const recipients = current.sessions.filter((session) => session.name !== "terminal" && session.status !== "offline").map((session) => session.address)
      const ok = await confirmBroadcast(recipients)
      if (!ok) return
      await deliver({ to: "*", body: command.message, kind: "broadcast" }, current, null)
      return
    }
    if (command.type === "handoff") {
      const target = current.sessions.find((session) => session.address === command.address)
      const repo = command.repo ?? target?.repo ?? null
      const branch = command.branch ?? target?.branch ?? null
      const conflict = handoffConflict(current.sessions, command.address, repo, branch)
      if (conflict && repo && branch) {
        const choice = await confirmCollision(conflict, repo, branch)
        if (choice === "cancel") return
        if (choice === "ask") {
          setDraft(`ask ${conflict.address} "what are you doing in ${repo}@${branch}?"`)
          return
        }
      }
      const from = `${current.person}/dashboard`
      const body = handoffBody(from, command.message, repo, branch)
      const handoffId = uid()
      store.upsertHandoff({
        id: handoffId,
        to: command.address,
        task: command.message,
        repo,
        branch,
        status: "open",
        at: Date.now(),
      })
      await deliver({ to: command.address, body, kind: "handoff" }, current, { kind: "handoff", handoffId, tier: target?.tier ?? "" })
      return
    }
    const target = current.sessions.find((session) => session.address === command.address)
    await deliver(
      {
        to: command.address,
        body: command.message,
        kind: command.type,
        fyi: command.type === "tell" ? command.fyi : undefined,
        notify: command.type === "tell" ? command.notify : undefined,
      },
      current,
      command.type === "ask" ? { kind: "ask", tier: target?.tier ?? "" } : null,
    )
  }

  async function deliver(
    input: { to: string; body: string; kind: "ask" | "tell" | "handoff" | "broadcast"; fyi?: boolean; notify?: boolean },
    current: Directory,
    wait: { kind: "ask" | "handoff"; handoffId?: string; tier: string } | null,
  ) {
    const source = sourceRef.current
    if (!source) return
    const logId = uid()
    const sentAt = Date.now()
    const target = current.sessions.find((session) => session.address === input.to)
    if (target) {
      setFlight({
        id: uid(),
        fromKey: `${current.person}/${current.machine}`,
        toKey: `${target.person}/${target.machine}`,
      })
    }
    const result = await source.send(input)
    const state = result.recipients.map((row) => `${row.address} ${row.state}`).join(", ")
    store.addLog({
      id: logId,
      at: sentAt,
      kind: input.kind,
      from: `${current.person}/${input.kind === "broadcast" ? "terminal" : "dashboard"}`,
      to: input.to,
      body: input.body,
      state: result.error || state || "sent",
      simulated: mode === "sim",
      messageId: result.messageIds[0],
    })
    if (result.error) return
    if (wait) {
      setPendingBoth({
        logId,
        to: input.to,
        sentAt,
        messageId: result.messageIds[0] ?? null,
        kind: wait.kind,
        handoffId: wait.handoffId,
        tier: wait.tier,
      })
    }
  }

  function confirmCollision(session: SessionInfo, repo: string, branch: string): Promise<Choice> {
    return new Promise((resolve) => {
      collisionResolve.current = resolve
      setCollision({ address: session.address, doing: session.doing || "no current task", repo, branch })
    })
  }

  function finishCollision(choice: Choice) {
    const resolve = collisionResolve.current
    collisionResolve.current = null
    setCollision(null)
    resolve?.(choice)
  }

  function confirmBroadcast(recipients: string[]): Promise<boolean> {
    return new Promise((resolve) => {
      broadcastResolve.current = resolve
      setBroadcast(recipients)
    })
  }

  function finishBroadcast(ok: boolean) {
    const resolve = broadcastResolve.current
    broadcastResolve.current = null
    setBroadcast(null)
    resolve?.(ok)
  }

  const pendingHint = pending
    ? pending.tier === "turn"
      ? "waiting, turn tier, may wait for its human"
      : `waiting for ${pending.to}`
    : null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2">
        <h1 className="text-base font-semibold">Agent Network</h1>
        <StatusPill mode={mode} status={status} reconnecting={reconnecting} />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Switch checked={store.showOffline} onCheckedChange={store.setShowOffline} />
            Show offline
          </label>
          <Button type="button" size="sm" variant={editMode ? "default" : "outline"} data-testid="edit-toggle" onClick={() => setEditMode((value) => !value)}>
            {editMode ? "Done editing" : "Edit"}
          </Button>
          <Button type="button" size="sm" variant="outline" data-testid="connect-button" onClick={() => setConnectOpen(true)}>
            Connect
          </Button>
        </div>
      </header>
      {status?.versionWarning ? (
        <div className="shrink-0 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">{status.versionWarning}</div>
      ) : null}
      {note ? <div className="shrink-0 px-3 py-1 text-xs text-muted-foreground">{note}</div> : null}
      <Tabs value={tab} onValueChange={(value) => setTab(String(value))} className="min-h-0 flex-1">
        <div className="px-3 pt-2">
          <TabsList>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="setup">Setup</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="network" className="flex min-h-0 flex-col gap-2 px-3 pb-2">
          {booting || !shown ? (
            <p className="text-sm text-muted-foreground">Connecting to the bridge.</p>
          ) : (
            <>
              <CollisionStrip active={hard} idle={soft} onAsk={(address) => setDraft(`ask ${address} "what are you working on?"`)} />
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[280px_minmax(0,1fr)_260px]">
                <Roster
                  directory={shown}
                  filter={filter}
                  showOffline={store.showOffline || editMode}
                  editMode={editMode}
                  nicknames={store.nicknames}
                  hidden={store.hidden}
                  pinned={store.pinned}
                  now={now}
                  onFilter={setFilter}
                  onNickname={(address, value) => store.setNickname(`session:${address}`, value)}
                  onHide={store.toggleHidden}
                  onPin={store.togglePinned}
                />
                <NetworkMap
                  directory={shown}
                  colors={store.machineColors}
                  showOffline={store.showOffline || editMode}
                  hidden={editMode ? [] : store.hidden}
                  flight={flight}
                  example={mode === "sim"}
                />
                <div className="flex min-h-0 flex-col gap-2 overflow-auto">
                  <HandoffList handoffs={mode === "live" ? store.handoffs : store.handoffs} />
                  {mode === "sim" ? (
                    <div className="flex flex-wrap gap-1">
                      <Button type="button" size="xs" variant={demoScale === 2 ? "default" : "outline"} data-testid="demo-2x" onClick={() => { setDemoScale(2); sourceRef.current?.control({ type: "scale", scale: 2 }) }}>
                        2x
                      </Button>
                      <Button type="button" size="xs" variant="outline" data-testid="demo-1x" onClick={() => { setDemoScale(1); sourceRef.current?.control({ type: "scale", scale: 1 }) }}>
                        1x
                      </Button>
                      <Button
                        type="button"
                        size="xs"
                        data-testid="run-demo"
                        onClick={() => {
                          sourceRef.current?.control({ type: "scale", scale: demoScale })
                          sourceRef.current?.control({ type: "demo" })
                        }}
                      >
                        Run demo
                      </Button>
                    </div>
                  ) : null}
                  {editMode && mode === "sim" ? (
                    <SimTeamEditor
                      team={shown}
                      onColor={store.setMachineColor}
                      onChange={(team) => {
                        store.setSimTeam(team)
                        sourceRef.current?.control({ type: "team", team })
                        setDirectory(team)
                      }}
                    />
                  ) : null}
                  {editMode && mode === "live" ? (
                    <section className="rounded-xl bg-card p-3 text-xs ring-1 ring-foreground/10">
                      <p>A live session renames itself. A nickname here is only on this dashboard.</p>
                      <div className="mt-2 flex flex-col gap-1">
                        {[...new Set(shown.machines.map((machine) => machine.person))].map((person) => (
                          <EditableLabel
                            key={person}
                            value={store.nicknames[`person:${person}`] ?? ""}
                            placeholder={`Nickname for ${person}`}
                            onChange={(value) => store.setNickname(`person:${person}`, value)}
                          />
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {shown.machines.map((machine) => (
                          <div key={`${machine.person}/${machine.machine}`} className="flex items-center gap-1">
                            <span>{machine.machine}</span>
                            {MACHINE_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                aria-label={`${machine.machine} ${color}`}
                                className="size-4 rounded-full"
                                style={{ background: color }}
                                onClick={() => store.setMachineColor(`${machine.person}/${machine.machine}`, color)}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}
                  <section className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
                    <div className="flex flex-wrap gap-1">
                      <Button type="button" size="xs" variant="outline" data-testid="export-json" onClick={() => {
                        const json = JSON.stringify(backupFromStore(useAppStore.getState()), null, 2)
                        setBackupText(json)
                        download("agent-network-lab.json", json)
                      }}>
                        Export
                      </Button>
                      <Button type="button" size="xs" variant="outline" data-testid="import-json" onClick={() => {
                        const parsed = parseBackup(backupText)
                        if (!parsed.ok) {
                          setImportError(parsed.error)
                          return
                        }
                        store.replace(parsed.data)
                        setImportError(null)
                        if (mode === "sim") {
                          const team = parsed.data.simTeam ?? exampleTeam()
                          sourceRef.current?.control({ type: "team", team })
                          setDirectory(team)
                        }
                      }}>
                        Import
                      </Button>
                      <Button type="button" size="xs" variant="ghost" onClick={() => setResetOpen(true)}>
                        Reset
                      </Button>
                    </div>
                    <textarea
                      data-testid="backup-text"
                      value={backupText}
                      aria-label="Backup JSON"
                      className="mt-2 h-16 w-full resize-none rounded-md bg-muted p-2 font-mono text-[11px]"
                      onChange={(event) => setBackupText(event.target.value)}
                    />
                    {importError ? <p data-testid="import-error" className="mt-1 text-xs text-amber-200">{importError}</p> : null}
                  </section>
                </div>
              </div>
              <ExampleChips chips={chips} onPick={setDraft} />
              <CommandBox
                value={draft}
                matches={matches}
                pendingHint={pendingHint}
                onChange={setDraft}
                onSubmit={() => void run(draft)}
                onComplete={() => {
                  const next = applyCompletion(draft, addresses)
                  if (!next) return
                  setDraft(next.next)
                  setMatches(next.matches)
                }}
                onHistory={(direction) => {
                  if (historyRef.current.length === 0) return
                  const next = Math.min(historyRef.current.length, Math.max(0, historyAt.current + direction))
                  historyAt.current = next
                  setDraft(historyRef.current[next] ?? "")
                }}
                onStop={() => setPendingBoth(null)}
              />
              <MessageLog
                entries={[...visibleLog].reverse()}
                onReplay={(entry) => {
                  const from = shown.sessions.find((session) => session.address === entry.from)
                  const to = shown.sessions.find((session) => session.address === entry.to)
                  if (!from && !to) return
                  const origin = from ?? shown.sessions.find((session) => session.person === shown.person && session.machine === shown.machine)
                  const dest = to ?? shown.sessions.find((session) => session.person === shown.person && session.machine === shown.machine)
                  if (!origin || !dest) return
                  setFlight({ id: uid(), fromKey: `${origin.person}/${origin.machine}`, toKey: `${dest.person}/${dest.machine}` })
                }}
                onClear={store.clearLog}
                onCopy={() => void navigator.clipboard.writeText(logAsText(visibleLog))}
                onExport={() => download("agent-network-log.json", logAsJson(visibleLog))}
              />
            </>
          )}
        </TabsContent>
        <TabsContent value="setup" className="min-h-0 overflow-hidden">
          <SetupTab />
        </TabsContent>
      </Tabs>
      <footer className="shrink-0 border-t px-3 py-1.5 text-[11px] text-muted-foreground">
        Built on the open-source{" "}
        <a className="underline" href="https://github.com/reason-machines/reason-network">
          Reason Network engine
        </a>
      </footer>
      <ConnectDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        initialBase={bridgeBase()}
        initialToken={readToken() ?? ""}
        filePage={typeof window !== "undefined" && window.location.protocol === "file:"}
        onConnect={(base, token, next) => {
          rememberConnection(base, token)
          setStatus(next)
          setMode("live")
          setNote(null)
          setReconnecting(false)
          setConnectOpen(false)
          adopt(new LiveSource(base, token, (down) => {
            setReconnecting(true)
            setNote(down)
          }))
        }}
      />
      <AlertDialog open={collision !== null} onOpenChange={(open) => { if (!open) finishCollision("cancel") }}>
        <AlertDialogContent style={{ maxWidth: "34rem" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Same repo and branch</AlertDialogTitle>
            <AlertDialogDescription>
              {collision ? `${collision.address} is already working in ${collision.repo}@${collision.branch} (${collision.doing}). Ask it first?` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => finishCollision("cancel")}>Cancel</Button>
            <Button type="button" variant="outline" data-testid="collision-ask" onClick={() => finishCollision("ask")}>
              Ask {collision?.address}
            </Button>
            <Button type="button" data-testid="collision-send" onClick={() => finishCollision("send")}>Send anyway</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={broadcast !== null} onOpenChange={(open) => { if (!open) finishBroadcast(false) }}>
        <AlertDialogContent style={{ maxWidth: "34rem" }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Broadcast</AlertDialogTitle>
            <AlertDialogDescription>
              This sends to {broadcast?.length ?? 0} sessions: {broadcast?.join(", ")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => finishBroadcast(false)}>Cancel</Button>
            <Button type="button" data-testid="broadcast-send" onClick={() => finishBroadcast(true)}>Send</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset this browser?</AlertDialogTitle>
            <AlertDialogDescription>This clears nicknames, the log, handoffs, and simulator edits stored here.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
            <Button type="button" data-testid="reset-confirm" onClick={() => {
              store.reset()
              setResetOpen(false)
              if (mode === "sim") {
                const team = exampleTeam()
                sourceRef.current?.control({ type: "team", team })
                setDirectory(team)
              }
            }}>Reset</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function uid(): string {
  return crypto.randomUUID()
}

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
