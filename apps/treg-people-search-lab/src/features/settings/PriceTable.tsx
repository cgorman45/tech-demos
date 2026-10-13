import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { PriceRow } from "../cost/pricing"
import { capabilityLabel, providerLabel, type Labels } from "../labels/labels"
import { EditableLabel } from "../labels/EditableLabel"

export function PriceTable({
  prices,
  labels,
  editing,
  onPrice,
  onHitRate,
  onRename,
}: {
  prices: PriceRow[]
  labels: Labels
  editing: boolean
  onPrice: (providerId: string, capability: PriceRow["capability"], price: number) => void
  onHitRate: (providerId: string, capability: PriceRow["capability"], hitRate: number) => void
  onRename: (providerId: string, value: string) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Provider</TableHead>
          <TableHead>Capability</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Hit rate</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {prices.map((row) => (
          <TableRow key={`${row.providerId}-${row.capability}`}>
            <TableCell>
              <EditableLabel
                value={providerLabel(labels, row.providerId)}
                editing={editing}
                onChange={(value) => onRename(row.providerId, value)}
                label={`Provider name for ${row.providerId}`}
              />
            </TableCell>
            <TableCell className="text-muted-foreground">{capabilityLabel(row.capability)}</TableCell>
            <TableCell>
              <Input
                aria-label={`${row.providerId} price`}
                className="w-24 font-mono"
                type="number"
                min={0}
                step={0.0001}
                value={row.price}
                onChange={(event) => onPrice(row.providerId, row.capability, Number(event.target.value))}
              />
            </TableCell>
            <TableCell>
              <Input
                aria-label={`${row.providerId} hit rate percent`}
                className="w-20 font-mono"
                type="number"
                min={0}
                max={100}
                step={1}
                value={Math.round(row.hitRate * 100)}
                onChange={(event) => onHitRate(row.providerId, row.capability, Number(event.target.value) / 100)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
