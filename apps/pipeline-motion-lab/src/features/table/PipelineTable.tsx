import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditableLabel } from "@/features/labels/EditableLabel";
import {
  parseDate,
  parseProbability,
  parseValue,
} from "@/features/import/normalize";
import { formatPercent, formatUsdFull } from "@/features/metrics/metrics";
import { STAGES, type Stage } from "@/lib/types";
import { usePipelineStore } from "@/store/usePipelineStore";
import { EditableCell } from "./EditableCell";

export function PipelineTable() {
  const rows = usePipelineStore((state) => state.rows);
  const updateRow = usePipelineStore((state) => state.updateRow);
  const addRow = usePipelineStore((state) => state.addRow);
  const deleteRow = usePipelineStore((state) => state.deleteRow);

  return (
    <Card className="glow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm">
          <EditableLabel labelKey="table.title" />
          <span className="ml-2 font-normal text-muted-foreground">
            click a cell to edit
          </span>
        </CardTitle>
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus />
          Add row
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-44">Opportunity</TableHead>
              <TableHead className="min-w-36">Agency</TableHead>
              <TableHead className="min-w-32">Stage</TableHead>
              <TableHead className="min-w-28 text-right">Value</TableHead>
              <TableHead className="min-w-20 text-right">Prob.</TableHead>
              <TableHead className="min-w-28">Due date</TableHead>
              <TableHead className="min-w-24">Owner</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="p-1.5">
                  <EditableCell
                    value={row.opportunity}
                    onCommit={(next) =>
                      updateRow(row.id, { opportunity: next.trim() })
                    }
                  />
                </TableCell>
                <TableCell className="p-1.5">
                  <EditableCell
                    value={row.agency}
                    placeholder="agency"
                    onCommit={(next) =>
                      updateRow(row.id, { agency: next.trim() })
                    }
                  />
                </TableCell>
                <TableCell className="p-1.5">
                  <Select
                    value={row.stage}
                    onValueChange={(next) => {
                      if (next) updateRow(row.id, { stage: next as Stage });
                    }}
                  >
                    <SelectTrigger size="sm" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="p-1.5">
                  <EditableCell
                    value={String(row.value)}
                    display={formatUsdFull(row.value)}
                    align="right"
                    onCommit={(next) => {
                      const parsed = parseValue(next);
                      if (parsed !== null) updateRow(row.id, { value: parsed });
                    }}
                  />
                </TableCell>
                <TableCell className="p-1.5">
                  <EditableCell
                    value={String(Math.round(row.probability * 100))}
                    display={formatPercent(row.probability)}
                    align="right"
                    onCommit={(next) => {
                      const parsed = parseProbability(next);
                      if (parsed !== null)
                        updateRow(row.id, { probability: parsed });
                    }}
                  />
                </TableCell>
                <TableCell className="p-1.5">
                  <EditableCell
                    value={row.dueDate ?? ""}
                    placeholder="yyyy-mm-dd"
                    onCommit={(next) => {
                      const trimmed = next.trim();
                      if (trimmed === "") {
                        updateRow(row.id, { dueDate: null });
                        return;
                      }
                      const parsed = parseDate(trimmed);
                      if (parsed) updateRow(row.id, { dueDate: parsed });
                    }}
                  />
                </TableCell>
                <TableCell className="p-1.5">
                  <EditableCell
                    value={row.owner}
                    placeholder="owner"
                    onCommit={(next) =>
                      updateRow(row.id, { owner: next.trim() })
                    }
                  />
                </TableCell>
                <TableCell className="p-1.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${row.opportunity}`}
                    onClick={() => deleteRow(row.id)}
                  >
                    <Trash2 className="text-muted-foreground" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
