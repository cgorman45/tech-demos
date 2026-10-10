import {
  OPEN_STAGES,
  STAGES,
  isOpenStage,
  type PipelineRow,
  type Stage,
} from "@/lib/types";

export interface WinRate {
  /** Won / (Won + Lost) by count, or null when nothing has closed. */
  byCount: number | null;
  /** Same ratio weighted by value. */
  byValue: number | null;
  wonCount: number;
  lostCount: number;
  wonValue: number;
  lostValue: number;
}

export function winRate(rows: PipelineRow[]): WinRate {
  let wonCount = 0;
  let lostCount = 0;
  let wonValue = 0;
  let lostValue = 0;
  for (const row of rows) {
    if (row.stage === "Won") {
      wonCount += 1;
      wonValue += row.value;
    } else if (row.stage === "Lost") {
      lostCount += 1;
      lostValue += row.value;
    }
  }
  const closedCount = wonCount + lostCount;
  const closedValue = wonValue + lostValue;
  return {
    byCount: closedCount === 0 ? null : wonCount / closedCount,
    byValue: closedValue === 0 ? null : wonValue / closedValue,
    wonCount,
    lostCount,
    wonValue,
    lostValue,
  };
}

export function openRows(rows: PipelineRow[]): PipelineRow[] {
  return rows.filter((row) => isOpenStage(row.stage));
}

export function totalOpenValue(rows: PipelineRow[]): number {
  return openRows(rows).reduce((sum, row) => sum + row.value, 0);
}

export function weightedOpenValue(rows: PipelineRow[]): number {
  return openRows(rows).reduce(
    (sum, row) => sum + row.value * row.probability,
    0,
  );
}

export interface StageBucket {
  stage: Stage;
  count: number;
  total: number;
  weighted: number;
}

export function byStage(
  rows: PipelineRow[],
  stages: readonly Stage[] = STAGES,
): StageBucket[] {
  return stages.map((stage) => {
    const inStage = rows.filter((row) => row.stage === stage);
    return {
      stage,
      count: inStage.length,
      total: inStage.reduce((sum, row) => sum + row.value, 0),
      weighted: inStage.reduce(
        (sum, row) => sum + row.value * row.probability,
        0,
      ),
    };
  });
}

export function byOpenStage(rows: PipelineRow[]): StageBucket[] {
  return byStage(rows, OPEN_STAGES);
}

export interface UpcomingItem {
  row: PipelineRow;
  daysLeft: number;
}

/** Open rows due within the next `windowDays` days, soonest first. */
export function upcoming(
  rows: PipelineRow[],
  todayIso: string,
  windowDays = 30,
): UpcomingItem[] {
  const items: UpcomingItem[] = [];
  for (const row of openRows(rows)) {
    if (!row.dueDate) continue;
    const daysLeft = isoDiffDays(todayIso, row.dueDate);
    if (daysLeft >= 0 && daysLeft <= windowDays) {
      items.push({ row, daysLeft });
    }
  }
  items.sort(
    (a, b) =>
      a.daysLeft - b.daysLeft || a.row.opportunity.localeCompare(b.row.opportunity),
  );
  return items;
}

function isoDiffDays(fromIso: string, toIso: string): number {
  const from = Date.UTC(
    Number(fromIso.slice(0, 4)),
    Number(fromIso.slice(5, 7)) - 1,
    Number(fromIso.slice(8, 10)),
  );
  const to = Date.UTC(
    Number(toIso.slice(0, 4)),
    Number(toIso.slice(5, 7)) - 1,
    Number(toIso.slice(8, 10)),
  );
  return Math.round((to - from) / 86_400_000);
}

export function formatUsd(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions.toFixed(millions >= 10 ? 1 : 2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${Math.round(value / 1_000)}K`;
  }
  return `$${Math.round(value)}`;
}

export function formatUsdFull(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}
