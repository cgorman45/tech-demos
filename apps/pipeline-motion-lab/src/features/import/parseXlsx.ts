import * as XLSX from "xlsx";
import { normalizeRows, type NormalizeResult } from "./normalize";

export async function parseXlsxFile(file: File): Promise<NormalizeResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { rows: [], skipped: [], warnings: ["Workbook has no sheets"] };
  }
  const sheet = workbook.Sheets[firstSheetName];
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  return normalizeRows(records);
}
