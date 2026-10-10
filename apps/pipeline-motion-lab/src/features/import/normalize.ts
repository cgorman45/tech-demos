import { STAGES, newRowId, type PipelineRow, type Stage } from "@/lib/types";

export interface NormalizeResult {
  rows: PipelineRow[];
  skipped: { index: number; reason: string }[];
  warnings: string[];
}

const HEADER_ALIASES: Record<string, keyof RawShape> = {
  opportunity: "opportunity",
  opportunity_name: "opportunity",
  name: "opportunity",
  project: "opportunity",
  title: "opportunity",
  agency: "agency",
  client: "agency",
  customer: "agency",
  organization: "agency",
  account: "agency",
  stage: "stage",
  status: "stage",
  phase: "stage",
  value: "value",
  amount: "value",
  contract_value: "value",
  deal_value: "value",
  fee: "value",
  probability: "probability",
  prob: "probability",
  win_probability: "probability",
  confidence: "probability",
  pwin: "probability",
  due_date: "dueDate",
  due: "dueDate",
  close_date: "dueDate",
  deadline: "dueDate",
  date: "dueDate",
  owner: "owner",
  lead_person: "owner",
  bd_lead: "owner",
  rep: "owner",
  assigned: "owner",
  assigned_to: "owner",
};

interface RawShape {
  opportunity: unknown;
  agency: unknown;
  stage: unknown;
  value: unknown;
  probability: unknown;
  dueDate: unknown;
  owner: unknown;
}

export function canonicalHeader(header: string): keyof RawShape | null {
  const key = header
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  return HEADER_ALIASES[key] ?? null;
}

/** Accepts 450000, "450000", "$450,000", "1.2M", "80K". */
export function parseValue(input: unknown): number | null {
  if (typeof input === "number") {
    return Number.isFinite(input) ? input : null;
  }
  if (typeof input !== "string") return null;
  const text = input.trim().replace(/[$,\s]/g, "");
  if (text === "") return null;
  const suffix = text.slice(-1).toUpperCase();
  const multiplier = suffix === "M" ? 1_000_000 : suffix === "K" ? 1_000 : 1;
  const numericPart = multiplier === 1 ? text : text.slice(0, -1);
  const parsed = Number(numericPart);
  if (!Number.isFinite(parsed)) return null;
  return parsed * multiplier;
}

/** Accepts "40%", 40, 0.4. Returns a fraction between 0 and 1. */
export function parseProbability(input: unknown): number | null {
  let raw: number;
  let hadPercentSign = false;
  if (typeof input === "number") {
    raw = input;
  } else if (typeof input === "string") {
    const text = input.trim();
    if (text === "") return null;
    hadPercentSign = text.endsWith("%");
    raw = Number(text.replace(/%/g, "").trim());
  } else {
    return null;
  }
  if (!Number.isFinite(raw)) return null;
  const fraction = hadPercentSign || raw > 1 ? raw / 100 : raw;
  return Math.min(1, Math.max(0, fraction));
}

/** Accepts ISO (yyyy-mm-dd), M/D/YYYY, and Date objects. Returns ISO or null. */
export function parseDate(input: unknown): string | null {
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return toIso(input.getFullYear(), input.getMonth() + 1, input.getDate());
  }
  if (typeof input !== "string") return null;
  const text = input.trim();
  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    return toIso(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }
  const usMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    return toIso(Number(usMatch[3]), Number(usMatch[1]), Number(usMatch[2]));
  }
  return null;
}

function toIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

const STAGE_SYNONYMS: Record<string, Stage> = {
  "closed won": "Won",
  win: "Won",
  "closed lost": "Lost",
  shortlist: "Shortlisted",
  prospecting: "Lead",
  proposed: "Proposal",
};

export function parseStage(input: unknown): { stage: Stage; known: boolean } {
  const text = String(input ?? "").trim();
  const lower = text.toLowerCase();
  const exact = STAGES.find((s) => s.toLowerCase() === lower);
  if (exact) return { stage: exact, known: true };
  const synonym = STAGE_SYNONYMS[lower];
  if (synonym) return { stage: synonym, known: true };
  return { stage: "Lead", known: false };
}

/**
 * Turns parsed spreadsheet records (arbitrary headers) into pipeline rows.
 * Skips rows with no opportunity name or no usable value, and warns on
 * unknown stage strings (mapped to Lead).
 */
export function normalizeRows(
  records: Record<string, unknown>[],
): NormalizeResult {
  const rows: PipelineRow[] = [];
  const skipped: { index: number; reason: string }[] = [];
  const warnings: string[] = [];

  records.forEach((record, index) => {
    const mapped: Partial<RawShape> = {};
    for (const [header, cell] of Object.entries(record)) {
      const canonical = canonicalHeader(header);
      if (canonical && mapped[canonical] === undefined) {
        mapped[canonical] = cell;
      }
    }

    const opportunity = String(mapped.opportunity ?? "").trim();
    if (opportunity === "") {
      skipped.push({ index, reason: "missing opportunity name" });
      return;
    }
    const value = parseValue(mapped.value);
    if (value === null) {
      skipped.push({ index, reason: "value is not a number" });
      return;
    }

    const { stage, known } = parseStage(mapped.stage);
    if (!known) {
      warnings.push(
        `Row ${index + 1}: unknown stage "${String(mapped.stage ?? "")}" mapped to Lead`,
      );
    }

    const probability =
      parseProbability(mapped.probability) ?? defaultProbability(stage);

    rows.push({
      id: newRowId(),
      opportunity,
      agency: String(mapped.agency ?? "").trim(),
      stage,
      value,
      probability,
      dueDate: parseDate(mapped.dueDate),
      owner: String(mapped.owner ?? "").trim(),
    });
  });

  return { rows, skipped, warnings };
}

function defaultProbability(stage: Stage): number {
  if (stage === "Won") return 1;
  if (stage === "Lost") return 0;
  return 0.25;
}
