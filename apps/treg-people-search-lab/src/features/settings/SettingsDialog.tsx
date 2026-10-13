import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { exportState, importState, useAppStore } from "../../store/useAppStore"
import { PriceTable } from "./PriceTable"

export function SettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const settings = useAppStore((state) => state.settings)
  const prices = useAppStore((state) => state.prices)
  const labels = useAppStore((state) => state.labels)
  const editing = useAppStore((state) => state.editing)
  const history = useAppStore((state) => state.history)
  const setSettings = useAppStore((state) => state.setSettings)
  const setPrice = useAppStore((state) => state.setPrice)
  const setHitRate = useAppStore((state) => state.setHitRate)
  const setProviderLabel = useAppStore((state) => state.setProviderLabel)
  const replacePersisted = useAppStore((state) => state.replacePersisted)
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState("")
  const hasKey = settings.apiKey.trim().length > 0

  function download() {
    const blob = new Blob([exportState({ labels, settings, prices, history })], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "people-search-settings.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      replacePersisted(importState(await file.text()))
      setMessage("Settings imported.")
    } catch {
      setMessage("That file did not match the settings format.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            The API key stays in this browser. With live mode off, this app makes no network requests.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="connection">
          <TabsList>
            <TabsTrigger value="connection">Connection</TabsTrigger>
            <TabsTrigger value="prices">Price table</TabsTrigger>
          </TabsList>
          <TabsContent value="connection" className="grid gap-3">
            <label className="grid gap-1 text-xs text-muted-foreground">
              Treg API key
              <Input
                data-testid="api-key-input"
                type="password"
                autoComplete="off"
                value={settings.apiKey}
                placeholder="Paste a token"
                onChange={(event) => setSettings({ apiKey: event.target.value })}
              />
            </label>
            <label className="grid gap-1 text-xs text-muted-foreground">
              Base URL
              <Input
                data-testid="base-url-input"
                value={settings.baseUrl}
                onChange={(event) => setSettings({ baseUrl: event.target.value })}
              />
            </label>
            <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm">Use live API</p>
                <p className="text-xs text-muted-foreground">Live calls spend real balance.</p>
              </div>
              <Switch
                data-testid="live-switch"
                checked={settings.live}
                disabled={!hasKey}
                onCheckedChange={(checked) => setSettings({ live: checked })}
                aria-label="Use live API"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Calls use POST {"{base URL}"}/call/{"{endpoint}"} with the header X-Treg-Token. A browser may block the
              request. If that happens, run in example mode.
            </p>
          </TabsContent>
          <TabsContent value="prices" className="grid gap-2">
            <p className="text-xs text-muted-foreground">
              Prices and hit rates apply to the next example run. Hit rate is a percent.
            </p>
            <PriceTable
              prices={prices}
              labels={labels}
              editing={editing}
              onPrice={setPrice}
              onHitRate={setHitRate}
              onRename={setProviderLabel}
            />
          </TabsContent>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={download}>
            Export
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              void onFile(event.target.files?.[0])
              event.target.value = ""
            }}
          />
          {message && <span className="text-xs text-muted-foreground">{message}</span>}
        </div>
        <p className="text-xs text-muted-foreground">The export file includes the API key when one is saved.</p>
      </DialogContent>
    </Dialog>
  )
}
