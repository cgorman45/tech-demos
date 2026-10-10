import { describe, expect, test } from "bun:test";
import {
  canonicalHeader,
  normalizeRows,
  parseDate,
  parseProbability,
  parseStage,
  parseValue,
} from "./normalize";

describe("canonicalHeader", () => {
  test("maps aliases case-insensitively", () => {
    expect(canonicalHeader("Opportunity")).toBe("opportunity");
    expect(canonicalHeader("Client")).toBe("agency");
    expect(canonicalHeader("Close Date")).toBe("dueDate");
    expect(canonicalHeader("Win Probability")).toBe("probability");
    expect(canonicalHeader("Deal-Value")).toBe("value");
    expect(canonicalHeader("unrelated")).toBeNull();
  });
});

describe("parseValue", () => {
  test("parses currency strings", () => {
    expect(parseValue("$1,200,000")).toBe(1_200_000);
    expect(parseValue("450000")).toBe(450_000);
    expect(parseValue(80_000)).toBe(80_000);
  });
  test("parses K and M suffixes", () => {
    expect(parseValue("80K")).toBe(80_000);
    expect(parseValue("$1.2M")).toBe(1_200_000);
  });
  test("rejects junk", () => {
    expect(parseValue("TBD")).toBeNull();
    expect(parseValue("")).toBeNull();
    expect(parseValue(undefined)).toBeNull();
  });
});

describe("parseProbability", () => {
  test("accepts percent strings, whole numbers, and fractions", () => {
    expect(parseProbability("40%")).toBe(0.4);
    expect(parseProbability(40)).toBe(0.4);
    expect(parseProbability(0.4)).toBe(0.4);
    expect(parseProbability("1%")).toBe(0.01);
    expect(parseProbability(1)).toBe(1);
  });
  test("clamps out-of-range input", () => {
    expect(parseProbability(140)).toBe(1);
    expect(parseProbability(-5)).toBe(0);
  });
  test("rejects junk", () => {
    expect(parseProbability("maybe")).toBeNull();
    expect(parseProbability("")).toBeNull();
  });
});

describe("parseDate", () => {
  test("accepts ISO and M/D/YYYY", () => {
    expect(parseDate("2026-10-09")).toBe("2026-10-09");
    expect(parseDate("10/9/2026")).toBe("2026-10-09");
    expect(parseDate("1/15/2027")).toBe("2027-01-15");
  });
  test("accepts Date objects (from XLSX)", () => {
    expect(parseDate(new Date(2026, 9, 9))).toBe("2026-10-09");
  });
  test("rejects junk", () => {
    expect(parseDate("soon")).toBeNull();
    expect(parseDate("")).toBeNull();
    expect(parseDate("13/40/2026")).toBeNull();
  });
});

describe("parseStage", () => {
  test("matches known stages case-insensitively", () => {
    expect(parseStage("won")).toEqual({ stage: "Won", known: true });
    expect(parseStage("Shortlisted")).toEqual({
      stage: "Shortlisted",
      known: true,
    });
    expect(parseStage("closed won")).toEqual({ stage: "Won", known: true });
  });
  test("maps unknown stages to Lead and flags them", () => {
    expect(parseStage("Negotiating")).toEqual({ stage: "Lead", known: false });
  });
});

describe("normalizeRows", () => {
  test("normalizes aliased headers and formatted values", () => {
    const { rows, skipped, warnings } = normalizeRows([
      {
        Name: "Bridge study",
        Client: "Harbor City",
        Status: "Proposal",
        Amount: "$1,200,000",
        "Win Probability": "40%",
        "Close Date": "10/15/2026",
        Rep: "Avery",
      },
    ]);
    expect(skipped).toHaveLength(0);
    expect(warnings).toHaveLength(0);
    expect(rows[0]).toMatchObject({
      opportunity: "Bridge study",
      agency: "Harbor City",
      stage: "Proposal",
      value: 1_200_000,
      probability: 0.4,
      dueDate: "2026-10-15",
      owner: "Avery",
    });
  });

  test("skips rows without a name or value, with reasons", () => {
    const { rows, skipped } = normalizeRows([
      { opportunity: "", value: "100" },
      { opportunity: "No value", value: "TBD" },
      { opportunity: "Fine", value: "100", stage: "Lead" },
    ]);
    expect(rows).toHaveLength(1);
    expect(skipped).toEqual([
      { index: 0, reason: "missing opportunity name" },
      { index: 1, reason: "value is not a number" },
    ]);
  });

  test("warns on unknown stage and maps it to Lead", () => {
    const { rows, warnings } = normalizeRows([
      { opportunity: "X", value: "10", stage: "Negotiation" },
    ]);
    expect(rows[0]!.stage).toBe("Lead");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("Negotiation");
  });
});
