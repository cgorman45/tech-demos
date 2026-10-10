import exampleCsv from "./example-pipeline.csv?raw";
import { parseCsvText } from "@/features/import/parseCsv";
import type { PipelineRow } from "@/lib/types";

/**
 * Dates in the shipped CSV are written relative to this reference date.
 * At load time every due date is shifted by (today - reference) days, so
 * the example always has upcoming items no matter when it is opened.
 */
export const REFERENCE_DATE = "2026-10-09";

const MS_PER_DAY = 86_400_000;

export function daysBetween(fromIso: string, toIso: string): number {
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
  return Math.round((to - from) / MS_PER_DAY);
}

export function shiftIsoDate(iso: string, days: number): string {
  const date = new Date(
    Date.UTC(
      Number(iso.slice(0, 4)),
      Number(iso.slice(5, 7)) - 1,
      Number(iso.slice(8, 10)),
    ) +
      days * MS_PER_DAY,
  );
  return date.toISOString().slice(0, 10);
}

export function todayIso(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
}

export function loadExampleRows(today: string = todayIso()): PipelineRow[] {
  const { rows } = parseCsvText(exampleCsv);
  const shift = daysBetween(REFERENCE_DATE, today);
  return rows.map((row) => ({
    ...row,
    dueDate: row.dueDate ? shiftIsoDate(row.dueDate, shift) : null,
  }));
}
