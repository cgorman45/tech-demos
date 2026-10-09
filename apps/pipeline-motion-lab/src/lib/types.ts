export const STAGES = [
  "Lead",
  "Qualified",
  "Proposal",
  "Shortlisted",
  "Won",
  "Lost",
] as const;

export type Stage = (typeof STAGES)[number];

export const OPEN_STAGES: Stage[] = [
  "Lead",
  "Qualified",
  "Proposal",
  "Shortlisted",
];

export interface PipelineRow {
  id: string;
  opportunity: string;
  agency: string;
  stage: Stage;
  /** USD */
  value: number;
  /** 0 to 1 */
  probability: number;
  /** ISO date (yyyy-mm-dd) or null when unknown */
  dueDate: string | null;
  owner: string;
}

export function isOpenStage(stage: Stage): boolean {
  return stage !== "Won" && stage !== "Lost";
}

let counter = 0;

export function newRowId(): string {
  counter += 1;
  return `row-${Date.now().toString(36)}-${counter}`;
}
