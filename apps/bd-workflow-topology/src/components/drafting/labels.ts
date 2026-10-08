/**
 * Every editable text in the drafting animation, keyed by a stable id.
 * Overrides live in localStorage under their own key, separate from the
 * main map's edits, so they survive a reload of the single-file build too.
 */

export const DRAFTING_LABEL_DEFAULTS: Record<string, string> = {
  "intake.title": "Ticket in",
  "intake.sub": "from New lead",
  pill: "RFP-2417",
  "kb.title": "Alex's knowledge base",
  "kb.sub": "past proposals, SOQs, RFQs",
  "chip.1": "3 similar proposals found",
  "chip.2": "2 SOQs matched",
  "chip.3": "1 RFQ response reused",
  "draft.title": "Claude drafts",
  "draft.sub": "writes the draft",
  "critic.title": "Reviewer grades",
  "critic.sub": "grades the draft",
  "loop.revise": "revise",
  "loop.round1": "round 1 of 5",
  "loop.round2": "round 2 of 5",
  "loop.round3": "round 3 of 5",
  "loop.approved": "approved in round 3",
  "loop.v1": "draft v1",
  "loop.v2": "draft v2",
  "loop.v3": "draft v3",
  "loop.score": "9/10",
  "track.top": "Technical approach",
  "track.mid": "Team qualifications",
  "track.bottom": "Pricing",
  "assemble.title": "Assemble",
  "assemble.sub.idle": "sections merge",
  "assemble.sub.active": "assembling...",
  "assemble.sub.done": "sections merged",
  "review.title": "Review",
  "spoke.compliance": "Compliance matrix",
  "spoke.past": "Past performance",
  "spoke.tone": "Tone",
  "spoke.pagelimits": "Page limits",
  "spoke.pricing": "Pricing check",
  "spoke.formatting": "Formatting",
  "fix.title": "Fix",
  "fix.sub": "then review again",
  "status.reviewing": "reviewing...",
  "status.approved": "approved",
  "status.sentback": "sent back",
  "signoff.title": "Colton signs off",
  "signoff.sub": "final read before it goes out",
  "submit.title": "Submitted",
  "submit.sub": "proposal out the door",
  "step.intake": "Intake",
  "step.kb": "Knowledge base",
  "step.draft": "Draft",
  "step.sections": "Sections",
  "step.review": "Review",
  "step.submit": "Submit",
};

const STORAGE_KEY = "bd-workflow-topology.drafting-labels.v1";

export function loadDraftingLabels(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (key in DRAFTING_LABEL_DEFAULTS && typeof value === "string") {
        result[key] = value;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function saveDraftingLabels(labels: Record<string, string>): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (Object.keys(labels).length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(labels));
    }
  } catch {
    // Storage can be unavailable (private mode); edits then last for the session.
  }
}

export function clearDraftingLabels(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Same as above.
  }
}

/** Resolve a label id against overrides, falling back to the default text. */
export function draftingLabel(overrides: Record<string, string>, id: string): string {
  return overrides[id] ?? DRAFTING_LABEL_DEFAULTS[id] ?? id;
}
