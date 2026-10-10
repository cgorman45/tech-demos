export const STATUSES = [
  "new",
  "todo",
  "in-progress",
  "review",
  "done",
  "skipped",
  "not-implemented",
] as const;

export type Status = (typeof STATUSES)[number];

/** Columns that are always visible. Skipped and Not implemented appear only when they hold cards. */
export const BOARD_COLUMNS: Status[] = [
  "new",
  "todo",
  "in-progress",
  "review",
  "done",
];

export const EXTRA_COLUMNS: Status[] = ["skipped", "not-implemented"];

export const DEFAULT_COLUMN_NAMES: Record<Status, string> = {
  new: "New",
  todo: "Todo",
  "in-progress": "In progress",
  review: "Review",
  done: "Done",
  skipped: "Skipped",
  "not-implemented": "Not implemented",
};

export const CATEGORIES = [
  "Map",
  "Animation",
  "Data",
  "Copy",
  "Agents",
  "General",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Source = "text" | "voice" | "email";

export interface AgentLogEntry {
  text: string;
  at: number;
}

export type AgentState = "none" | "queued" | "running" | "done";

export interface CardAgent {
  state: AgentState;
  /** Index of the current step while running, -1 otherwise. */
  step: number;
  log: AgentLogEntry[];
  pr: { number: number; summary: string } | null;
}

export interface Card {
  id: string;
  /** Short hex reference shown in the card header. */
  ref: string;
  handle: string;
  source: Source;
  /** Extra source detail, e.g. "3s" for a voice clip. */
  sourceMeta: string | null;
  createdAt: number;
  body: string;
  tags: string[];
  category: Category;
  status: Status;
  notes: string;
  agent: CardAgent;
}

export interface Toast {
  id: number;
  message: string;
  variant: "default" | "destructive" | "success";
}

export const IDLE_AGENT: CardAgent = { state: "none", step: -1, log: [], pr: null };
