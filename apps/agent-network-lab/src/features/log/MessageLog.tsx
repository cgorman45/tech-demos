import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { LogEntry } from "../edit/importExport.ts"

export function MessageLog({
  entries,
  onReplay,
  onClear,
  onCopy,
  onExport,
}: {
  entries: LogEntry[]
  onReplay: (entry: LogEntry) => void
  onClear: () => void
  onCopy: () => void
  onExport: () => void
}) {
  return (
    <section data-testid="message-log" className="flex h-[168px] shrink-0 flex-col rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-2 px-3 pt-2">
        <h2 className="text-sm font-medium">Log</h2>
        <div className="flex gap-1">
          <Button type="button" size="xs" variant="outline" onClick={onCopy}>
            Copy
          </Button>
          <Button type="button" size="xs" variant="outline" onClick={onExport}>
            Export JSON
          </Button>
          <Button type="button" size="xs" variant="ghost" onClick={onClear}>
            Clear
          </Button>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1 px-1">
        {entries.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">When</TableHead>
                <TableHead className="w-24">Kind</TableHead>
                <TableHead>Route and text</TableHead>
                <TableHead className="w-36">State</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} className="cursor-pointer align-top" onClick={() => onReplay(entry)}>
                  <TableCell className="whitespace-nowrap text-xs">{formatTime(entry.at)}</TableCell>
                  <TableCell className="text-xs">
                    {entry.kind}
                    {entry.simulated ? <span className="ml-1 text-amber-200">simulated</span> : null}
                  </TableCell>
                  <TableCell className="whitespace-normal text-xs">
                    <div className="break-words">
                      {entry.from ? `${entry.from} to ${entry.to ?? ""}` : entry.to ?? ""}
                    </div>
                    <div className="mt-0.5 break-words whitespace-pre-wrap text-muted-foreground">{entry.body}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {entry.state ?? ""}
                    {entry.elapsedMs !== undefined ? ` ${entry.elapsedMs}ms` : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </ScrollArea>
    </section>
  )
}

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
}
