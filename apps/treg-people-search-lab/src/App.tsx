import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CostMeter } from "./features/cost/CostMeter"
import { ReceiptPanel } from "./features/cost/Receipt"
import { capabilityLabel, providerLabel } from "./features/labels/labels"
import { EditableLabel } from "./features/labels/EditableLabel"
import { formatPrice } from "./features/cost/pricing"
import { HistoryPanel } from "./features/history/HistoryPanel"
import { useRun } from "./features/run/useRun"
import { viewFromCalls } from "./features/run/view"
import { SearchForm } from "./features/search/SearchForm"
import { SettingsDialog } from "./features/settings/SettingsDialog"
import { Walk } from "./features/walk/Walk"
import { useAppStore } from "./store/useAppStore"
import type { Speed } from "./features/run/runTypes"

const speeds: { id: Speed; label: string }[] = [
  { id: "1", label: "1x" },
  { id: "2", label: "2x" },
  { id: "instant", label: "Instant" },
]

export default function App() {
  const labels = useAppStore((state) => state.labels)
  const editing = useAppStore((state) => state.editing)
  const settings = useAppStore((state) => state.settings)
  const history = useAppStore((state) => state.history)
  const setEditing = useAppStore((state) => state.setEditing)
  const setLabel = useAppStore((state) => state.setLabel)
  const setProviderLabel = useAppStore((state) => state.setProviderLabel)
  const reset = useAppStore((state) => state.reset)
  const run = useRun()
  const view = viewFromCalls(run.calls)
  const [company, setCompany] = useState("Northwind Robotics")
  const [role, setRole] = useState("Head of Marketing")
  const [limit, setLimit] = useState(3)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const showExample = run.phase === "idle" ? !settings.live : run.mode === "example"

  function runSearch() {
    const next = { company: company.trim(), role: role.trim(), limit }
    if (!next.company || !next.role) return
    run.start(next)
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <header className="shrink-0 border-b px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <EditableLabel
            value={labels.title}
            editing={editing}
            onChange={(value) => setLabel("title", value)}
            label="App title"
            className="text-base font-semibold"
          />
          {showExample && (
            <Badge data-testid="example-badge" variant="outline" className="border-amber-300/50 text-amber-100">
              Example data
            </Badge>
          )}
          <div className="min-w-4 flex-1" />
          <CostMeter calls={run.calls} labels={labels} />
          <Button data-testid="history-button" size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>
            History
          </Button>
          <Button
            data-testid="edit-button"
            size="sm"
            variant={editing ? "default" : "outline"}
            aria-pressed={editing}
            onClick={() => setEditing(!editing)}
          >
            {editing ? "Editing" : "Edit"}
          </Button>
          <Button data-testid="settings-button" size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
            Settings
          </Button>
          <Button data-testid="reset-button" size="sm" variant="outline" onClick={() => setResetOpen(true)}>
            Reset
          </Button>
        </div>
      </header>

      <div className="shrink-0 border-b px-3 py-2">
        <SearchForm
          company={company}
          role={role}
          limit={limit}
          running={run.phase === "running"}
          onCompany={setCompany}
          onRole={setRole}
          onLimit={setLimit}
          onRun={runSearch}
          onPick={(nextCompany, nextRole) => {
            setCompany(nextCompany)
            setRole(nextRole)
            run.start({ company: nextCompany, role: nextRole, limit })
          }}
        />
      </div>

      {settings.live && (
        <p className="shrink-0 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100">
          Live mode is on. Calls spend real Treg balance.
        </p>
      )}
      {run.error && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 bg-destructive/15 px-3 py-1.5 text-sm">
          <span>{run.error}</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const current = run.request
              if (current) run.start(current, true)
            }}
          >
            Run in example mode instead
          </Button>
        </div>
      )}

      <div className="relative grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-h-0 overflow-auto p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1">
              {speeds.map((item) => (
                <Button
                  key={item.id}
                  data-testid={`speed-${item.label.toLowerCase()}`}
                  type="button"
                  size="sm"
                  variant={run.speed === item.id ? "default" : "outline"}
                  onClick={() => run.setSpeed(item.id)}
                >
                  {item.label}
                </Button>
              ))}
            </div>
            <Button
              data-testid="replay-button"
              type="button"
              size="sm"
              variant="outline"
              disabled={run.phase === "running" || run.calls.length === 0}
              onClick={run.replay}
            >
              Replay
            </Button>
          </div>
          <Walk
            key={run.playback}
            view={view}
            calls={run.calls}
            labels={labels}
            editing={editing}
            instant={run.speed === "instant"}
            typedName={company}
            onRename={setProviderLabel}
            onLabel={setLabel}
          />
        </section>

        <aside className="flex min-h-0 flex-col border-l">
          <div className="shrink-0 border-b px-3 py-2 text-xs tracking-wide text-muted-foreground uppercase">
            Call log
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <ol data-testid="call-log" className="grid gap-1 p-3 text-xs">
              {run.calls.length === 0 && <li className="text-muted-foreground">Calls show up here as the run goes.</li>}
              {run.calls.map((call) => (
                <li key={call.id} className="leading-snug">
                  <span className="text-foreground">{providerLabel(labels, call.providerId)}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {capabilityLabel(call.capability)} · {call.subject} ·{" "}
                  </span>
                  <span className="font-mono">
                    {call.state === "pending"
                      ? `${formatPrice(call.listPrice)} pending`
                      : call.outcome === "miss"
                        ? "$0.00, miss"
                        : call.outcome === "unknown"
                          ? "$0.00, unknown"
                          : `${formatPrice(call.billed)}${call.estimated ? " estimated" : ""} ${call.outcome}`}
                  </span>
                </li>
              ))}
            </ol>
          </ScrollArea>
          {run.phase === "done" && (
            <div className="max-h-[48%] shrink-0 overflow-auto">
              <ReceiptPanel
                calls={run.calls}
                view={view}
                labels={labels}
                example={run.mode === "example"}
                company={view.company?.name || run.request?.company || company}
              />
            </div>
          )}
        </aside>

        {historyOpen && (
          <div className="absolute inset-y-0 right-0 z-20 w-[340px] border-l shadow-2xl">
            <HistoryPanel
              entries={history}
              onClose={() => setHistoryOpen(false)}
              onPick={(entry) => {
                setCompany(entry.company)
                setRole(entry.role)
                setLimit(entry.limit)
                setHistoryOpen(false)
                run.playHistory(entry)
              }}
            />
          </div>
        )}
      </div>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset this app?</DialogTitle>
            <DialogDescription>
              This restores the title, column names, provider names, prices, and history. The API key is cleared.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              data-testid="confirm-reset"
              onClick={() => {
                reset()
                setResetOpen(false)
              }}
            >
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
