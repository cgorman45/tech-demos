import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditableLabel } from "@/features/labels/EditableLabel";
import {
  formatPercent,
  formatUsd,
  openRows,
  totalOpenValue,
  weightedOpenValue,
  winRate,
} from "@/features/metrics/metrics";
import { usePipelineStore } from "@/store/usePipelineStore";
import type { LabelKey } from "@/features/labels/labels";

interface KpiProps {
  labelKey: LabelKey;
  value: string;
  subtitle: string;
}

function Kpi({ labelKey, value, subtitle }: KpiProps) {
  return (
    <Card className="glow-card gap-2 py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <EditableLabel labelKey={labelKey} />
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}

export function KpiCards() {
  const rows = usePipelineStore((state) => state.rows);
  const rate = winRate(rows);
  const open = openRows(rows);
  const total = totalOpenValue(rows);
  const weighted = weightedOpenValue(rows);

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Kpi
        labelKey="kpi.winRate"
        value={rate.byCount === null ? "n/a" : formatPercent(rate.byCount)}
        subtitle={
          rate.byValue === null
            ? "No closed opportunities yet"
            : `${formatPercent(rate.byValue)} by value, ${rate.wonCount} won / ${rate.lostCount} lost`
        }
      />
      <Kpi
        labelKey="kpi.openPipeline"
        value={formatUsd(total)}
        subtitle="Sum of value across open stages"
      />
      <Kpi
        labelKey="kpi.weightedPipeline"
        value={formatUsd(weighted)}
        subtitle="Value times probability, open stages"
      />
      <Kpi
        labelKey="kpi.openCount"
        value={String(open.length)}
        subtitle="Lead through Shortlisted"
      />
    </div>
  );
}
