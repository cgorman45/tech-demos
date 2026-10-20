import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { EngineStatus } from "../network/types.ts"
import { fetchStatus } from "./LiveSource.ts"

export function ConnectDialog({
  open,
  onOpenChange,
  initialBase,
  initialToken,
  filePage,
  onConnect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialBase: string
  initialToken: string
  filePage: boolean
  onConnect: (base: string, token: string, status: EngineStatus) => void
}) {
  const [base, setBase] = useState(initialBase)
  const [token, setToken] = useState(initialToken)
  const [status, setStatus] = useState<EngineStatus | null>(null)
  const [error, setError] = useState<string | null>(filePage ? "If this browser blocks a file page from calling the bridge, use the link the bridge printed." : null)
  const [busy, setBusy] = useState(false)

  async function test() {
    setBusy(true)
    setError(null)
    try {
      const next = await fetchStatus(base.trim(), token.trim())
      setStatus(next)
    } catch (err) {
      setStatus(null)
      setError(err instanceof Error ? err.message : "The bridge did not answer.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect</DialogTitle>
          <DialogDescription>The bridge prints a link with the token. Paste that token here, or open the link.</DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-1 text-xs">
          Bridge URL
          <Input value={base} onChange={(event) => setBase(event.target.value)} aria-label="Bridge URL" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          Token
          <Input value={token} onChange={(event) => setToken(event.target.value)} aria-label="Bridge token" />
        </label>
        {error ? <p className="text-sm text-amber-200">{error}</p> : null}
        {status ? <Checklist status={status} /> : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void test()}>
            Test
          </Button>
          <Button
            type="button"
            disabled={!status || busy}
            onClick={() => {
              if (status) onConnect(base.trim(), token.trim(), status)
            }}
          >
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Checklist({ status }: { status: EngineStatus }) {
  const rows = [
    status.engine === "ok"
      ? `Engine found${status.version ? `: ${status.version}` : ""} at ${status.path}`
      : `Engine missing. macOS and Linux: ${status.installLines.unix}`,
    status.engine === "missing" ? `Windows: ${status.installLines.windows}` : null,
    status.versionWarning,
    status.inTeam
      ? `In team ${status.team} as ${status.person} on ${status.machine}.`
      : "Not in a team. Run: reason-network init <team> --as <name>",
    status.dashboardListening
      ? "Dashboard session is listening."
      : "Dashboard listen is not running yet. The bridge starts it. Check the bridge terminal.",
  ].filter(Boolean)
  return (
    <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
      {rows.map((row) => (
        <li key={row}>{row}</li>
      ))}
    </ul>
  )
}
