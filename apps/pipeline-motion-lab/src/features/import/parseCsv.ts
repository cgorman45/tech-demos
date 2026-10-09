import Papa from "papaparse";
import { normalizeRows, type NormalizeResult } from "./normalize";

export function parseCsvText(text: string): NormalizeResult {
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
  });
  return normalizeRows(parsed.data);
}

export async function parseCsvFile(file: File): Promise<NormalizeResult> {
  const text = await file.text();
  return parseCsvText(text);
}
