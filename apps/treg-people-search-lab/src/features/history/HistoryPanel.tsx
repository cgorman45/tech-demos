import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatPrice } from "../cost/pricing"
import { displayTotal } from "../cost/receipt.ts"
import type { HistoryEntry } from "../../store/schema"

export function HistoryPanel({
  entries,
  onPick,
  onClose,
}: {
  entries: HistoryEntry[]
  onPick: (entry: HistoryEntry) => void
  onClose: () => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-popover">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-sm font-medium">History</h2>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        {entries.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">No runs yet.</p>
        ) : (
          <ul className="grid gap-1 p-2">
            {entries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-transparent px-2 py-2 text-left hover:border-border hover:bg-muted"
                  onClick={() => onPick(entry)}
                >
                  <span className="block text-sm">{entry.company}</span>
                  <span className="block text-xs text-muted-foreground">{entry.role}</span>
                  <span className="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground">
                    <span>{formatPrice(displayTotal(entry.total))}</span>
                    <span>{entry.mode === "example" ? "Example data" : "Live"}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ScrollArea>
    </div>
  )
}
