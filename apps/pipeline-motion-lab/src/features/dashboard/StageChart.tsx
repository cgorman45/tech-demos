import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { EditableLabel } from "@/features/labels/EditableLabel";
import { byOpenStage, byStage, formatUsd } from "@/features/metrics/metrics";
import { usePipelineStore } from "@/store/usePipelineStore";

const stageConfig = {
  total: { label: "Value", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function StageChart() {
  const rows = usePipelineStore((state) => state.rows);
  const data = byStage(rows).map((bucket) => ({
    stage: bucket.stage,
    total: bucket.total,
  }));

  return (
    <Card className="glow-card">
      <CardHeader>
        <CardTitle className="text-sm">
          <EditableLabel labelKey="chart.byStage" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={stageConfig} className="h-56 w-full">
          <BarChart data={data} margin={{ left: 4, right: 4 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.2} />
            <XAxis
              dataKey="stage"
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v: number) => formatUsd(v)}
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatUsd(Number(value))}
                />
              }
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const weightedConfig = {
  total: { label: "Unweighted", color: "var(--chart-1)" },
  weighted: { label: "Weighted", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function WeightedChart() {
  const rows = usePipelineStore((state) => state.rows);
  const data = byOpenStage(rows).map((bucket) => ({
    stage: bucket.stage,
    total: bucket.total,
    weighted: Math.round(bucket.weighted),
  }));

  return (
    <Card className="glow-card">
      <CardHeader>
        <CardTitle className="text-sm">
          <EditableLabel labelKey="chart.weighted" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={weightedConfig} className="h-56 w-full">
          <BarChart data={data} margin={{ left: 4, right: 4 }}>
            <CartesianGrid vertical={false} strokeOpacity={0.2} />
            <XAxis
              dataKey="stage"
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(v: number) => formatUsd(v)}
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fontSize: 11 }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) =>
                    `${name === "weighted" ? "Weighted" : "Unweighted"}: ${formatUsd(Number(value))}`
                  }
                />
              }
            />
            <Bar dataKey="total" fill="var(--color-total)" radius={4} />
            <Bar dataKey="weighted" fill="var(--color-weighted)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
