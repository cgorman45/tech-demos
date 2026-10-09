import { describe, expect, test } from "bun:test";
import type { PipelineRow } from "@/lib/types";
import {
  byOpenStage,
  byStage,
  totalOpenValue,
  upcoming,
  weightedOpenValue,
  winRate,
} from "./metrics";

let id = 0;
function row(partial: Partial<PipelineRow>): PipelineRow {
  id += 1;
  return {
    id: `t${id}`,
    opportunity: `Opp ${id}`,
    agency: "City of Example",
    stage: "Lead",
    value: 100,
    probability: 0.5,
    dueDate: null,
    owner: "Avery",
    ...partial,
  };
}

describe("winRate", () => {
  test("computes count and value rates", () => {
    const rows = [
      row({ stage: "Won", value: 300 }),
      row({ stage: "Won", value: 100 }),
      row({ stage: "Lost", value: 100 }),
      row({ stage: "Lead", value: 999 }),
    ];
    const rate = winRate(rows);
    expect(rate.byCount).toBeCloseTo(2 / 3);
    expect(rate.byValue).toBeCloseTo(400 / 500);
    expect(rate.wonCount).toBe(2);
    expect(rate.lostCount).toBe(1);
  });

  test("returns null when nothing has closed", () => {
    const rate = winRate([row({ stage: "Lead" })]);
    expect(rate.byCount).toBeNull();
    expect(rate.byValue).toBeNull();
  });
});

describe("pipeline totals", () => {
  const rows = [
    row({ stage: "Lead", value: 1000, probability: 0.1 }),
    row({ stage: "Proposal", value: 2000, probability: 0.5 }),
    row({ stage: "Won", value: 5000, probability: 1 }),
    row({ stage: "Lost", value: 7000, probability: 0 }),
  ];

  test("open totals exclude Won and Lost", () => {
    expect(totalOpenValue(rows)).toBe(3000);
    expect(weightedOpenValue(rows)).toBeCloseTo(1000 * 0.1 + 2000 * 0.5);
  });

  test("byStage sums value, weighted value, and count per stage", () => {
    const buckets = byStage(rows);
    expect(buckets).toHaveLength(6);
    const lead = buckets.find((b) => b.stage === "Lead")!;
    expect(lead.count).toBe(1);
    expect(lead.total).toBe(1000);
    expect(lead.weighted).toBeCloseTo(100);
    expect(byOpenStage(rows)).toHaveLength(4);
  });
});

describe("upcoming", () => {
  const today = "2026-10-09";
  const rows = [
    row({ opportunity: "Due soon", dueDate: "2026-10-12", stage: "Proposal" }),
    row({ opportunity: "Due later", dueDate: "2026-11-05", stage: "Lead" }),
    row({ opportunity: "Too far", dueDate: "2026-12-25", stage: "Lead" }),
    row({ opportunity: "Past", dueDate: "2026-10-01", stage: "Lead" }),
    row({ opportunity: "Closed", dueDate: "2026-10-10", stage: "Won" }),
    row({ opportunity: "No date", dueDate: null, stage: "Lead" }),
  ];

  test("keeps open rows due inside the window, sorted by days left", () => {
    const items = upcoming(rows, today);
    expect(items.map((i) => i.row.opportunity)).toEqual([
      "Due soon",
      "Due later",
    ]);
    expect(items[0]!.daysLeft).toBe(3);
    expect(items[1]!.daysLeft).toBe(27);
  });

  test("includes items due today", () => {
    const items = upcoming([row({ dueDate: today, stage: "Lead" })], today);
    expect(items).toHaveLength(1);
    expect(items[0]!.daysLeft).toBe(0);
  });
});
