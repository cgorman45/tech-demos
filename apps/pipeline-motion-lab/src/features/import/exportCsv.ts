import Papa from "papaparse";
import type { PipelineRow } from "@/lib/types";

/** Canonical headers, so an export re-imports cleanly. */
export function rowsToCsv(rows: PipelineRow[]): string {
  return Papa.unparse(
    rows.map((row) => ({
      opportunity: row.opportunity,
      agency: row.agency,
      stage: row.stage,
      value: row.value,
      probability: row.probability,
      due_date: row.dueDate ?? "",
      owner: row.owner,
    })),
  );
}

export function downloadCsv(rows: PipelineRow[], filename: string): void {
  const blob = new Blob([rowsToCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
