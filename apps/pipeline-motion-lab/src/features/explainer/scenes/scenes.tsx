import {
  easeInOutCubic,
  easeOutCubic,
  ramp,
} from "@/features/explainer/timeline";
import {
  formatPercent,
  formatUsd,
  type StageBucket,
  type UpcomingItem,
  type WinRate,
} from "@/features/metrics/metrics";

/* All scenes draw into a 960x540 viewBox and are driven only by `progress`
   (0 to 1 inside the scene), so seeking and speed changes stay exact. */

export const VIEW_W = 960;
export const VIEW_H = 540;

const STAGE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];

interface SceneProps {
  progress: number;
}

export function SceneTitle({
  progress,
  title,
  dateText,
}: SceneProps & { title: string; dateText: string }) {
  const appear = easeOutCubic(ramp(progress, 0.05, 0.45));
  const sub = easeOutCubic(ramp(progress, 0.3, 0.7));
  return (
    <g>
      <text
        x={VIEW_W / 2}
        y={250 + (1 - appear) * 30}
        textAnchor="middle"
        fill="var(--foreground)"
        opacity={appear}
        fontSize={64}
        fontWeight={650}
      >
        {title}
      </text>
      <text
        x={VIEW_W / 2}
        y={320}
        textAnchor="middle"
        fill="var(--muted-foreground)"
        opacity={sub}
        fontSize={28}
      >
        {dateText}
      </text>
      <line
        x1={VIEW_W / 2 - 160 * appear}
        x2={VIEW_W / 2 + 160 * appear}
        y1={282}
        y2={282}
        stroke="var(--chart-1)"
        strokeWidth={3}
        opacity={appear}
      />
    </g>
  );
}

export function SceneTotal({
  progress,
  total,
  openCount,
}: SceneProps & { total: number; openCount: number }) {
  const count = easeOutCubic(ramp(progress, 0.08, 0.75));
  const shown = total * count;
  const dots = Math.min(openCount, 48);
  return (
    <g>
      {Array.from({ length: dots }, (_, i) => {
        const t = easeOutCubic(ramp(progress, 0.05 + (i / dots) * 0.5, 0.35 + (i / dots) * 0.5));
        const angle = (i / dots) * Math.PI * 2;
        const startR = 420;
        const endR = 150 + (i % 5) * 18;
        const r = startR + (endR - startR) * t;
        const x = VIEW_W / 2 + Math.cos(angle) * r;
        const y = VIEW_H / 2 + Math.sin(angle) * r * 0.55;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={5}
            fill={STAGE_COLORS[i % 4]}
            opacity={0.25 + 0.55 * t}
          />
        );
      })}
      <text
        x={VIEW_W / 2}
        y={265}
        textAnchor="middle"
        fill="var(--foreground)"
        fontSize={88}
        fontWeight={700}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {formatUsd(shown)}
      </text>
      <text
        x={VIEW_W / 2}
        y={320}
        textAnchor="middle"
        fill="var(--muted-foreground)"
        fontSize={26}
        opacity={ramp(progress, 0.5, 0.8)}
      >
        {openCount} open opportunities
      </text>
    </g>
  );
}

interface BarsSceneProps extends SceneProps {
  buckets: StageBucket[];
  weighted: boolean;
  totalLabel: string;
  totalValue: number;
  fromValue?: number;
}

/** Scenes 3 and 4 share the bar layout, so the shrink reads as one motion. */
export function SceneBars({
  progress,
  buckets,
  weighted,
  totalLabel,
  totalValue,
  fromValue,
}: BarsSceneProps) {
  const max = Math.max(...buckets.map((b) => b.total), 1);
  const chartLeft = 150;
  const chartWidth = VIEW_W - 300;
  const barWidth = Math.min(120, chartWidth / buckets.length - 40);
  const baseY = 420;
  const maxH = 260;

  const countT = easeOutCubic(ramp(progress, 0.15, 0.8));
  const shownTotal =
    fromValue === undefined
      ? totalValue * countT
      : fromValue + (totalValue - fromValue) * countT;

  return (
    <g>
      {buckets.map((bucket, i) => {
        const slot = chartWidth / buckets.length;
        const x = chartLeft + slot * i + (slot - barWidth) / 2;
        const fullH = (bucket.total / max) * maxH;
        const weightedH = (bucket.weighted / max) * maxH;
        let h: number;
        if (!weighted) {
          const grow = easeOutCubic(
            ramp(progress, 0.08 + i * 0.16, 0.32 + i * 0.16),
          );
          h = fullH * grow;
        } else {
          const shrink = easeInOutCubic(
            ramp(progress, 0.1 + i * 0.1, 0.5 + i * 0.1),
          );
          h = fullH + (weightedH - fullH) * shrink;
        }
        const value = weighted
          ? bucket.total + (bucket.weighted - bucket.total) * easeInOutCubic(ramp(progress, 0.1 + i * 0.1, 0.5 + i * 0.1))
          : bucket.total * easeOutCubic(ramp(progress, 0.08 + i * 0.16, 0.32 + i * 0.16));
        return (
          <g key={bucket.stage}>
            {weighted && (
              <rect
                x={x}
                y={baseY - fullH}
                width={barWidth}
                height={fullH}
                rx={6}
                fill={STAGE_COLORS[i % 4]}
                opacity={0.14}
              />
            )}
            <rect
              x={x}
              y={baseY - h}
              width={barWidth}
              height={Math.max(h, 0)}
              rx={6}
              fill={STAGE_COLORS[i % 4]}
              opacity={0.9}
            />
            <text
              x={x + barWidth / 2}
              y={baseY - h - 12}
              textAnchor="middle"
              fill="var(--foreground)"
              fontSize={20}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatUsd(value)}
            </text>
            <text
              x={x + barWidth / 2}
              y={baseY + 28}
              textAnchor="middle"
              fill="var(--muted-foreground)"
              fontSize={20}
            >
              {bucket.stage}
            </text>
          </g>
        );
      })}
      <text
        x={VIEW_W / 2}
        y={92}
        textAnchor="middle"
        fill="var(--foreground)"
        fontSize={34}
        fontWeight={600}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {totalLabel}: {formatUsd(shownTotal)}
      </text>
    </g>
  );
}

export function SceneWinRate({
  progress,
  rate,
}: SceneProps & { rate: WinRate }) {
  const fillT = easeInOutCubic(ramp(progress, 0.1, 0.7));
  const target = rate.byCount ?? 0;
  const shown = target * fillT;
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const cx = VIEW_W / 2;
  const cy = 250;
  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth={22}
      />
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="var(--chart-3)"
        strokeWidth={22}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - shown)}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text
        x={cx}
        y={cy + 20}
        textAnchor="middle"
        fill="var(--foreground)"
        fontSize={64}
        fontWeight={700}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {rate.byCount === null ? "n/a" : formatPercent(shown)}
      </text>
      <text
        x={cx}
        y={cy + 180}
        textAnchor="middle"
        fill="var(--muted-foreground)"
        fontSize={26}
        opacity={ramp(progress, 0.55, 0.85)}
      >
        {rate.byCount === null
          ? "No closed opportunities yet"
          : `${rate.wonCount} won (${formatUsd(rate.wonValue)}) vs ${rate.lostCount} lost (${formatUsd(rate.lostValue)})`}
      </text>
    </g>
  );
}

export function SceneUpcoming({
  progress,
  items,
  totalDueCount,
}: SceneProps & { items: UpcomingItem[]; totalDueCount: number }) {
  const top = items.slice(0, 5);
  const rowH = 62;
  const startY = 120;
  return (
    <g>
      {top.map((item, i) => {
        const t = easeOutCubic(ramp(progress, 0.05 + i * 0.11, 0.3 + i * 0.11));
        const y = startY + i * rowH;
        const x = 120 + (1 - t) * 80;
        return (
          <g key={item.row.id} opacity={t}>
            <rect
              x={x}
              y={y}
              width={VIEW_W - 240}
              height={rowH - 12}
              rx={10}
              fill="var(--card)"
              stroke="var(--border)"
            />
            <text x={x + 24} y={y + 32} fill="var(--foreground)" fontSize={22}>
              {item.row.opportunity}
            </text>
            <text
              x={x + VIEW_W - 240 - 150}
              y={y + 32}
              fill="var(--muted-foreground)"
              fontSize={20}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatUsd(item.row.value)}
            </text>
            <text
              x={x + VIEW_W - 240 - 24}
              y={y + 32}
              textAnchor="end"
              fill={
                item.daysLeft < 7
                  ? "oklch(0.72 0.19 25)"
                  : item.daysLeft < 14
                    ? "oklch(0.8 0.15 85)"
                    : "var(--chart-1)"
              }
              fontSize={20}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {item.daysLeft === 0 ? "today" : `${item.daysLeft}d`}
            </text>
          </g>
        );
      })}
      {top.length === 0 && (
        <text
          x={VIEW_W / 2}
          y={260}
          textAnchor="middle"
          fill="var(--muted-foreground)"
          fontSize={28}
        >
          Nothing due in the next 30 days
        </text>
      )}
      <text
        x={VIEW_W / 2}
        y={490}
        textAnchor="middle"
        fill="var(--foreground)"
        fontSize={30}
        fontWeight={600}
        opacity={easeOutCubic(ramp(progress, 0.65, 0.9))}
      >
        Next 30 days: {totalDueCount} due
      </text>
    </g>
  );
}
