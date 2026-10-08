/** Edits made in Edit mode, keyed by node id. Persisted to localStorage. */
export interface NodeEdits {
  name?: string;
  subtitle?: string;
  position?: { x: number; y: number };
  /** Edited base values for the node's metrics. */
  metrics?: Record<string, number>;
}

export type Edits = Record<string, NodeEdits>;

const STORAGE_KEY = "bd-workflow-topology.edits.v1";

function storageAvailable(): boolean {
  // bun test has no localStorage; the browser always does.
  return typeof localStorage !== "undefined";
}

export function loadEdits(): Edits {
  if (!storageAvailable()) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return parsed as Edits;
  } catch {
    return {};
  }
}

export function saveEdits(edits: Edits): void {
  if (!storageAvailable()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
  } catch {
    // Storage full or blocked; edits simply will not survive a reload.
  }
}

export function clearEdits(): void {
  if (!storageAvailable()) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}
