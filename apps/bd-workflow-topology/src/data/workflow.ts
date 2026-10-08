export type LaneId = "find" | "lead" | "claude" | "meet" | "won";

export type Tool = "Claude" | "Grok Bot agent" | "Granola" | "Claude + Grok Bot agent";

/** What the user asked the step to do. `degraded` is derived, never stored. */
export type Lifecycle = "running" | "restarting" | "stopped";
export type NodeStatus = Lifecycle | "degraded";

export type IconKey =
  | "radar"
  | "landmark"
  | "coins"
  | "sparkles"
  | "library"
  | "file-text"
  | "presentation"
  | "mail"
  | "sliders"
  | "clipboard"
  | "notebook"
  | "phone"
  | "trophy";

export interface LaneSpec {
  id: LaneId;
  name: string;
  /** Hex accent used for band tint, node glow, and log chips. */
  color: string;
}

export interface MetricSpec {
  key: string;
  label: string;
  seed: number;
}

export interface WorkflowNodeSpec {
  id: string;
  name: string;
  subtitle?: string;
  lane: LaneId;
  tool: Tool;
  description: string;
  icon: IconKey;
  metrics: MetricSpec[];
  /** Mock hours saved per month, shown on Claude nodes and summed in the top bar. */
  hoursSaved?: number;
  /** Visual emphasis for the knowledge base. */
  emphasis?: boolean;
  /** Round pill styling for the lead hub. */
  pill?: boolean;
}

/** An edge from an upstream step to the step it feeds. */
export interface WorkflowEdgeSpec {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export const LANES: LaneSpec[] = [
  { id: "find", name: "Find", color: "#38bdf8" },
  { id: "lead", name: "New lead", color: "#fbbf24" },
  { id: "claude", name: "Claude workspace", color: "#a78bfa" },
  { id: "meet", name: "Meet", color: "#2dd4bf" },
  { id: "won", name: "Won work", color: "#34d399" },
];

export const LANE_BY_ID: Record<LaneId, LaneSpec> = Object.fromEntries(
  LANES.map((l) => [l.id, l]),
) as Record<LaneId, LaneSpec>;

export const NODES: WorkflowNodeSpec[] = [
  {
    id: "scanner",
    name: "Opportunity Scanner",
    subtitle: "RFPs and RFQs",
    lane: "find",
    tool: "Grok Bot agent",
    description: "Watches procurement portals and flags RFPs and RFQs that fit the practice.",
    icon: "radar",
    metrics: [{ key: "rfpsFlagged", label: "RFPs flagged this month", seed: 42 }],
  },
  {
    id: "council",
    name: "City Council Research",
    subtitle: "Agendas and minutes",
    lane: "find",
    tool: "Grok Bot agent",
    description: "Reads council agendas and minutes for early signals before an RFP is posted.",
    icon: "landmark",
    metrics: [{ key: "agendasReviewed", label: "Agendas reviewed", seed: 18 }],
  },
  {
    id: "grants",
    name: "Grants and incentives",
    subtitle: "Funding programs",
    lane: "find",
    tool: "Grok Bot agent",
    description: "Tracks grant and incentive programs that can fund a client project.",
    icon: "coins",
    metrics: [{ key: "programsTracked", label: "Programs tracked", seed: 12 }],
  },
  {
    id: "lead",
    name: "New lead",
    subtitle: "Owner: Colton",
    lane: "lead",
    tool: "Grok Bot agent",
    description: "Collects every signal into one lead record and routes it to the Claude workspace.",
    icon: "sparkles",
    pill: true,
    metrics: [{ key: "leadsThisMonth", label: "Leads this month", seed: 9 }],
  },
  {
    id: "kb",
    name: "Alex's knowledge base",
    subtitle: "WPE proposals, RFQs, RFPs, and SOQs",
    lane: "claude",
    tool: "Claude",
    description: "The shared library of past proposals and SOQs. Every drafting step pulls from it.",
    icon: "library",
    emphasis: true,
    metrics: [{ key: "documentsIndexed", label: "Documents indexed", seed: 1240 }],
    hoursSaved: 11,
  },
  {
    id: "proposal",
    name: "Proposal drafting",
    subtitle: "Outline to first draft",
    lane: "claude",
    tool: "Claude",
    description: "Drafts the proposal outline and first pass from the lead and the knowledge base.",
    icon: "file-text",
    metrics: [{ key: "proposalsDrafted", label: "Proposals drafted", seed: 7 }],
    hoursSaved: 14,
  },
  {
    id: "deck",
    name: "Presentation builder",
    subtitle: "Intro and interview decks",
    lane: "claude",
    tool: "Claude",
    description: "Turns the proposal story into slide titles and speaker notes for the deck.",
    icon: "presentation",
    metrics: [{ key: "decksBuilt", label: "Decks built", seed: 5 }],
    hoursSaved: 8,
  },
  {
    id: "emails",
    name: "Follow-up emails",
    subtitle: "Drafts ready to send",
    lane: "claude",
    tool: "Claude",
    description: "Writes follow-up emails from call notes, tuned to the reader before sending.",
    icon: "mail",
    metrics: [{ key: "emailsSent", label: "Emails sent", seed: 31 }],
    hoursSaved: 6,
  },
  {
    id: "tone",
    name: "Tone tuning",
    subtitle: "City manager vs facilities vs board",
    lane: "claude",
    tool: "Claude",
    description: "Adjusts voice and length for the reader: city manager, facilities, or board.",
    icon: "sliders",
    metrics: [{ key: "emailsTuned", label: "Emails tuned", seed: 24 }],
    hoursSaved: 3,
  },
  {
    id: "rosie",
    name: "Rosie meeting prep",
    subtitle: "Briefs before every call",
    lane: "meet",
    tool: "Grok Bot agent",
    description: "Builds a short prep brief: attendees, history, and open questions before each meeting.",
    icon: "clipboard",
    metrics: [{ key: "meetingsPrepped", label: "Meetings prepped", seed: 11 }],
  },
  {
    id: "granola",
    name: "Granola notes",
    subtitle: "Notes and action items",
    lane: "meet",
    tool: "Granola",
    description: "Captures meeting notes and action items so nothing from the call is lost.",
    icon: "notebook",
    metrics: [{ key: "meetingsCaptured", label: "Meetings captured", seed: 14 }],
  },
  {
    id: "calls",
    name: "Call Follow-Ups",
    subtitle: "Next touch scheduled",
    lane: "meet",
    tool: "Grok Bot agent",
    description: "Queues the next touchpoint and hands a draft to the email step.",
    icon: "phone",
    metrics: [{ key: "followUpsLogged", label: "Follow-ups logged", seed: 19 }],
  },
  {
    id: "won",
    name: "Submitted proposals and won work",
    subtitle: "Out the door",
    lane: "won",
    tool: "Claude + Grok Bot agent",
    description: "Tracks what went out and what came back as won work.",
    icon: "trophy",
    metrics: [
      { key: "submitted", label: "Submitted", seed: 6 },
      { key: "won", label: "Won", seed: 2 },
    ],
  },
];

export const NODE_BY_ID: Record<string, WorkflowNodeSpec> = Object.fromEntries(
  NODES.map((n) => [n.id, n]),
);

export const EDGES: WorkflowEdgeSpec[] = [
  { id: "scanner-lead", source: "scanner", target: "lead" },
  { id: "council-lead", source: "council", target: "lead" },
  { id: "grants-lead", source: "grants", target: "lead" },
  { id: "lead-proposal", source: "lead", target: "proposal" },
  { id: "lead-deck", source: "lead", target: "deck" },
  { id: "kb-proposal", source: "kb", target: "proposal" },
  { id: "kb-deck", source: "kb", target: "deck" },
  { id: "kb-emails", source: "kb", target: "emails" },
  { id: "deck-rosie", source: "deck", target: "rosie" },
  { id: "rosie-granola", source: "rosie", target: "granola" },
  { id: "granola-calls", source: "granola", target: "calls" },
  { id: "calls-emails", source: "calls", target: "emails", sourceHandle: "out-left", targetHandle: "in-right" },
  { id: "tone-emails", source: "tone", target: "emails" },
  { id: "proposal-won", source: "proposal", target: "won" },
  { id: "emails-won", source: "emails", target: "won" },
];

export const EDGE_BY_ID: Record<string, WorkflowEdgeSpec> = Object.fromEntries(
  EDGES.map((e) => [e.id, e]),
);

/** Fixed node order for the Run a lead animation. */
export const RUN_PATH = [
  "scanner",
  "lead",
  "proposal",
  "deck",
  "rosie",
  "granola",
  "calls",
  "tone",
  "emails",
  "won",
] as const;

/** Edge the token travels for each run step. Null for steps that start on their own. */
export const RUN_STEP_EDGES: Record<string, string | null> = {
  scanner: null,
  lead: "scanner-lead",
  proposal: "lead-proposal",
  deck: "lead-deck",
  rosie: "deck-rosie",
  granola: "rosie-granola",
  calls: "granola-calls",
  tone: null,
  emails: "tone-emails",
  won: "emails-won",
};

/** Steps that read from the knowledge base. kb pulses when these fire. */
export const KB_FED = new Set(["proposal", "deck", "emails"]);

/** Edge from kb that lights up alongside a kb-fed step. */
export const KB_EDGE_BY_TARGET: Record<string, string> = {
  proposal: "kb-proposal",
  deck: "kb-deck",
  emails: "kb-emails",
};

/** Sample output appended to the activity log when a step fires. */
export const SAMPLE_OUTPUT: Record<string, string[]> = {
  scanner: [
    "Flagged RFP: Citywide LED streetlight retrofit, City of Example.",
    "Due in 21 days. Fit score 86.",
  ],
  lead: ["New lead created. Owner: Colton. Next: draft proposal and intro deck."],
  proposal: [
    "Draft outline ready:",
    "1. Understanding of the project",
    "2. Approach and schedule",
    "3. Similar past work from the knowledge base",
    "4. Team",
    "5. Fee approach",
  ],
  deck: [
    "Slide titles drafted:",
    "Who we are",
    "What we heard",
    "Proposed approach",
    "Past results",
    "Next steps",
  ],
  rosie: ["Prep brief ready: 3 attendees, 2 open questions, last touchpoint 14 days ago."],
  granola: ["Notes captured. Action items: send case study, confirm site walk date."],
  calls: ["Follow-up queued for Thursday. Draft handed to email step."],
  tone: ["Tone set: city manager (brief, outcome first)."],
  emails: [
    "Hi Jordan, thanks for the time today.",
    "Attached is the case study we discussed and two site walk dates.",
    "We can hold either morning. Reply with what works and we will confirm.",
    "Colton",
  ],
  won: ["Proposal submitted to City of Example. Status: under review."],
};

/** Counters that tick up by one when a run completes, as nodeId.metricKey pairs. */
export const COMPLETION_TICKS: Array<{ nodeId: string; key: string }> = [
  { nodeId: "scanner", key: "rfpsFlagged" },
  { nodeId: "lead", key: "leadsThisMonth" },
  { nodeId: "proposal", key: "proposalsDrafted" },
  { nodeId: "deck", key: "decksBuilt" },
  { nodeId: "emails", key: "emailsSent" },
  { nodeId: "won", key: "submitted" },
];

/** Mock hours added to the top bar total when a run completes. */
export const HOURS_SAVED_PER_RUN = 2;
