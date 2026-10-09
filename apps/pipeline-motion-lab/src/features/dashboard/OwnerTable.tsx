import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditableLabel } from "@/features/labels/EditableLabel";
import { formatUsd, openRows } from "@/features/metrics/metrics";
import { usePipelineStore } from "@/store/usePipelineStore";

export function OwnerTable() {
  const rows = usePipelineStore((state) => state.rows);
  const open = openRows(rows);

  const byOwner = new Map<string, { count: number; total: number }>();
  for (const row of open) {
    const owner = row.owner || "Unassigned";
    const entry = byOwner.get(owner) ?? { count: 0, total: 0 };
    entry.count += 1;
    entry.total += row.value;
    byOwner.set(owner, entry);
  }
  const owners = [...byOwner.entries()].sort((a, b) => b[1].total - a[1].total);

  return (
    <Card className="glow-card h-full">
      <CardHeader>
        <CardTitle className="text-sm">
          <EditableLabel labelKey="owners.title" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead>
              <TableHead className="text-right">Open</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {owners.map(([owner, entry]) => (
              <TableRow key={owner}>
                <TableCell>{owner}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {entry.count}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatUsd(entry.total)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
