import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { todayIso } from "@/data/example-data";
import { EditableLabel } from "@/features/labels/EditableLabel";
import { formatUsd, upcoming } from "@/features/metrics/metrics";
import { usePipelineStore } from "@/store/usePipelineStore";
import { cn } from "@/lib/utils";

function daysChipClass(daysLeft: number): string {
  if (daysLeft < 7) return "bg-red-500/15 text-red-400 border-red-500/30";
  if (daysLeft < 14)
    return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  return "bg-sky-500/10 text-sky-300 border-sky-500/25";
}

export function UpcomingList() {
  const rows = usePipelineStore((state) => state.rows);
  const items = upcoming(rows, todayIso());

  return (
    <Card className="glow-card h-full">
      <CardHeader>
        <CardTitle className="text-sm">
          <EditableLabel labelKey="upcoming.title" />
          <span className="ml-2 font-normal text-muted-foreground">
            next 30 days
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing due in the next 30 days.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map(({ row, daysLeft }) => (
              <li
                key={row.id}
                className="flex items-center gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{row.opportunity}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.agency} · {row.stage} · {formatUsd(row.value)}
                  </p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {row.dueDate}
                </span>
                <Badge
                  variant="outline"
                  className={cn("shrink-0 tabular-nums", daysChipClass(daysLeft))}
                >
                  {daysLeft === 0 ? "today" : `${daysLeft}d`}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
