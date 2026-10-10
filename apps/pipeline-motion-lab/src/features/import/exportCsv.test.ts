import { describe, expect, test } from "bun:test";
import type { PipelineRow } from "@/lib/types";
import { rowsToCsv } from "./exportCsv";
import { parseCsvText } from "./parseCsv";

describe("CSV export round-trip", () => {
  test("exported CSV re-imports to the same data", () => {
    const original: PipelineRow[] = [
      {
        id: "a",
        opportunity: "Seawall, phase 2",
        agency: "Port of Example",
        stage: "Proposal",
        value: 1_750_000,
        probability: 0.55,
        dueDate: "2026-10-15",
        owner: "Jordan",
      },
      {
        id: "b",
        opportunity: "Fleet study",
        agency: "Lakeview County",
        stage: "Lost",
        value: 150_000,
        probability: 0,
        dueDate: null,
        owner: "Sam",
      },
    ];

    const csv = rowsToCsv(original);
    const { rows, skipped, warnings } = parseCsvText(csv);

    expect(skipped).toHaveLength(0);
    expect(warnings).toHaveLength(0);
    expect(rows).toHaveLength(2);
    rows.forEach((parsed, i) => {
      const source = original[i]!;
      expect(parsed.opportunity).toBe(source.opportunity);
      expect(parsed.agency).toBe(source.agency);
      expect(parsed.stage).toBe(source.stage);
      expect(parsed.value).toBe(source.value);
      expect(parsed.probability).toBeCloseTo(source.probability);
      expect(parsed.dueDate).toBe(source.dueDate);
      expect(parsed.owner).toBe(source.owner);
    });
  });
});
