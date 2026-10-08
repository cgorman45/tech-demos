import { useEffect, useRef, useState } from "react";
import { easeInOut, seg } from "@/components/drafting/timeline";

/**
 * The animated proposal drafting flowchart. Everything on screen derives
 * from the clock value `t` (seconds at 1x), so pause, speed, and stage
 * jumps are handled by the parent overlay.
 */

export const BLUE = "#818cf8";
export const RED = "#f87171";
export const GREEN = "#34d399";
const IDLE = "#334155";
const TEXT = "#e2e8f0";
const MUTED = "#8ea0b8";
const CARD = "#0b1322";

type NodeState = "idle" | "active" | "done" | "sentback";

function stateColor(state: NodeState): string {
  switch (state) {
    case "active":
      return BLUE;
    case "done":
      return GREEN;
    case "sentback":
      return RED;
    default:
      return "#475569";
  }
}

function FlowPath({
  d,
  progress,
  color = BLUE,
  dashed = false,
  width = 3,
  setRef,
}: {
  d: string;
  progress: number;
  color?: string;
  dashed?: boolean;
  width?: number;
  setRef?: (el: SVGPathElement | null) => void;
}) {
  return (
    <>
      <path
        d={d}
        fill="none"
        stroke={IDLE}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? "6 6" : undefined}
        opacity={0.8}
        ref={setRef}
      />
      {progress > 0 && (
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray={dashed ? "0.04 0.04" : "1 1"}
          strokeDashoffset={dashed ? undefined : 1 - progress}
          opacity={dashed ? progress : 1}
        />
      )}
    </>
  );
}

function CircleNode({
  x,
  y,
  r = 15,
  state,
  label,
  sub,
  labelY = "below",
  anchor = "middle",
}: {
  x: number;
  y: number;
  r?: number;
  state: NodeState;
  label?: string;
  sub?: string;
  labelY?: "above" | "below";
  anchor?: "start" | "middle" | "end";
}) {
  const color = stateColor(state);
  const ly = labelY === "below" ? y + r + 20 : y - r - 22;
  const sy = labelY === "below" ? ly + 15 : ly + 15;
  return (
    <g>
      {state === "active" && (
        <circle cx={x} cy={y} r={r + 7} fill="none" stroke={color} strokeWidth={1.5} opacity={0.35} className="animate-pulse" />
      )}
      <circle cx={x} cy={y} r={r} fill={CARD} stroke={color} strokeWidth={3} />
      {(state === "done" || state === "active" || state === "sentback") && (
        <circle cx={x} cy={y} r={r * 0.42} fill={color} />
      )}
      {label && (
        <text x={x} y={ly} textAnchor={anchor} fontSize={13} fontWeight={600} fill={TEXT}>
          {label}
        </text>
      )}
      {sub && (
        <text x={x} y={sy} textAnchor={anchor} fontSize={10} fill={MUTED}>
          {sub}
        </text>
      )}
    </g>
  );
}

function SpokeNode({
  hub,
  x,
  y,
  state,
  label,
  status,
}: {
  hub: { x: number; y: number };
  x: number;
  y: number;
  state: NodeState;
  label: string;
  status?: string;
}) {
  const color = stateColor(state);
  const lineColor = state === "idle" ? IDLE : color;
  const right = x >= hub.x;
  const tx = right ? x + 16 : x - 16;
  return (
    <g>
      <line x1={hub.x} y1={hub.y} x2={x} y2={y} stroke={lineColor} strokeWidth={2.5} opacity={state === "idle" ? 0.7 : 1} />
      <circle cx={x} cy={y} r={9} fill={CARD} stroke={color} strokeWidth={2.5} />
      {state !== "idle" && <circle cx={x} cy={y} r={3.5} fill={color} />}
      <text x={tx} y={y + 4} textAnchor={right ? "start" : "end"} fontSize={12} fontWeight={600} fill={TEXT}>
        {label}
      </text>
      {status && (
        <text x={tx} y={y + 19} textAnchor={right ? "start" : "end"} fontSize={10} fill={state === "done" ? GREEN : state === "sentback" ? RED : MUTED} fontFamily="monospace">
          {status}
        </text>
      )}
    </g>
  );
}

function Chip({
  x,
  y,
  width,
  label,
  progress,
}: {
  x: number;
  y: number;
  width: number;
  label: string;
  progress: number;
}) {
  if (progress <= 0) return null;
  const done = progress >= 1;
  const color = done ? GREEN : BLUE;
  return (
    <g opacity={Math.min(1, progress * 2)}>
      <rect x={x - width / 2} y={y - 12} width={width} height={24} rx={12} fill={CARD} stroke={color} strokeWidth={1.5} />
      <circle cx={x - width / 2 + 14} cy={y} r={4} fill={color} />
      <text x={x - width / 2 + 26} y={y + 4} fontSize={11} fill={TEXT} fontFamily="monospace">
        {label}
      </text>
    </g>
  );
}

/** Pill ride segments: which path carries the ticket pill and when. */
const PILL_SEGMENTS: Array<{ path: string; start: number; end: number }> = [
  { path: "intake", start: 0.2, end: 2.6 },
  { path: "kb-draft", start: 8.0, end: 9.0 },
  { path: "draft-critic", start: 9.0, end: 10.0 },
  { path: "revise", start: 10.6, end: 11.6 },
  { path: "draft-critic", start: 11.8, end: 12.8 },
  { path: "revise", start: 13.4, end: 14.4 },
  { path: "draft-critic", start: 14.6, end: 15.6 },
  { path: "critic-split", start: 18.4, end: 19.0 },
  { path: "track-mid", start: 19.2, end: 22.2 },
  { path: "assemble-review", start: 25.0, end: 26.2 },
  { path: "review-signoff", start: 35.0, end: 36.3 },
  { path: "signoff-submit", start: 36.6, end: 37.6 },
];

const SPOKES: Array<{ x: number; y: number; label: string; start: number; end: number }> = [
  { x: 650, y: 438, label: "Compliance matrix", start: 26.4, end: 27.4 },
  { x: 622, y: 540, label: "Past performance", start: 27.5, end: 28.5 },
  { x: 676, y: 630, label: "Tone", start: 28.6, end: 29.4 },
  { x: 890, y: 628, label: "Page limits", start: 31.9, end: 32.7 },
  { x: 942, y: 540, label: "Pricing check", start: 32.8, end: 33.6 },
];

const HUB = { x: 790, y: 528 };
const FIX = { x: 886, y: 420 };
// Formatting is the spoke that gets sent back to Fix once before approval.
const FORMATTING = { x: 930, y: 468 };

const TRACKS = [
  {
    id: "track-top",
    d: "M 700 210 C 745 210 745 104 795 104 L 925 104 C 975 104 975 210 1019 210",
    nx: 860,
    ny: 104,
    label: "Technical approach",
    ly: 80,
    doneAt: 21.8,
  },
  {
    id: "track-mid",
    d: "M 700 210 L 1019 210",
    nx: 860,
    ny: 210,
    label: "Team qualifications",
    ly: 245,
    doneAt: 22.1,
  },
  {
    id: "track-bottom",
    d: "M 700 210 C 745 210 745 316 795 316 L 925 316 C 975 316 975 210 1019 210",
    nx: 860,
    ny: 316,
    label: "Pricing",
    ly: 350,
    doneAt: 22.4,
  },
];

const CHIPS = [
  { label: "3 similar proposals found", width: 196, start: 3.2 },
  { label: "2 SOQs matched", width: 196, start: 4.4 },
  { label: "1 RFQ response reused", width: 196, start: 5.6 },
];

function nodeState(activeFrom: number, doneAt: number, t: number): NodeState {
  if (t >= doneAt) return "done";
  if (t >= activeFrom) return "active";
  return "idle";
}

export function DraftingScene({ t }: { t: number }) {
  const pathRefs = useRef(new Map<string, SVGPathElement>());
  const setPathRef = (id: string) => (el: SVGPathElement | null) => {
    if (el) pathRefs.current.set(id, el);
  };

  // Re-render once after the paths are in the DOM so the pill can measure
  // them even when the clock starts paused (deep link) or pinned (reduced
  // motion).
  const [, setMounted] = useState(false);
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect
    setMounted(true);
  }, []);

  // Ticket pill position along the active segment. The pill needs
  // getPointAtLength from the rendered path, so the ref is read during
  // render on purpose; the animation loop re-renders every frame anyway.
  let pill: { x: number; y: number } | null = null;
  for (const segment of PILL_SEGMENTS) {
    if (t >= segment.start && t <= segment.end) {
      // oxlint-disable-next-line react/refs
      const el = pathRefs.current.get(segment.path);
      if (el) {
        const p = easeInOut(seg(t, segment.start, segment.end));
        const point = el.getPointAtLength(p * el.getTotalLength());
        pill = { x: point.x, y: point.y };
      }
      break;
    }
  }

  // Draft loop state.
  const round = t >= 16 ? 3 : t >= 14.6 ? 3 : t >= 11.8 ? 2 : t >= 9 ? 1 : 0;
  const approved = t >= 16;
  const badge = approved
    ? "approved in round 3"
    : round > 0
      ? `round ${round} of 5`
      : "waiting";
  const version = round > 0 ? `draft v${round}` : "";
  const reviseActive = (t >= 10.6 && t <= 11.6) || (t >= 13.4 && t <= 14.4);
  const reviseProgress = t >= 13.4 ? seg(t, 13.4, 14.4) : seg(t, 10.6, 11.6);

  // Formatting spoke: sent back to Fix, then reviewed again and approved.
  const fixActive = t >= 29.5 && t < 31.0;
  const formattingState: NodeState =
    t >= 31.8 ? "done" : t >= 31.0 ? "active" : fixActive ? "sentback" : t >= 29.2 ? "active" : "idle";

  const reviewDone = t >= 34;
  const submitted = t >= 37.6;

  return (
    <svg
      viewBox="0 0 1200 700"
      className="h-full w-full"
      role="img"
      aria-label="Animated flowchart of how a proposal gets drafted"
    >
      {/* Stage 1: intake */}
      <rect x={66} y={175} width={9} height={70} rx={4.5} fill={TEXT} />
      <text x={60} y={268} fontSize={13} fontWeight={600} fill={TEXT}>Ticket in</text>
      <text x={60} y={284} fontSize={10} fill={MUTED}>from New lead</text>
      <FlowPath d="M 78 210 L 243 210" progress={seg(t, 0.2, 2.6)} setRef={setPathRef("intake")} />

      {/* Stage 2: knowledge base with match chips */}
      <CircleNode
        x={262}
        y={210}
        state={nodeState(2.6, 8, t)}
        label="Alex's knowledge base"
        sub="past proposals, SOQs, RFQs"
        labelY="above"
      />
      <line x1={262} y1={226} x2={262} y2={252} stroke={t >= 3.2 ? BLUE : IDLE} strokeWidth={2} opacity={0.7} />
      {CHIPS.map((chip, i) => (
        <Chip
          key={chip.label}
          x={262}
          y={272 + i * 32}
          width={chip.width}
          label={chip.label}
          progress={seg(t, chip.start, chip.start + 1)}
        />
      ))}

      {/* Stage 3: draft and critique loop */}
      <FlowPath d="M 278 210 L 417 210" progress={seg(t, 8.0, 9.0)} setRef={setPathRef("kb-draft")} />
      <CircleNode x={433} y={210} state={nodeState(9, 16, t)} label="Claude drafts" sub="writes the draft" />
      <CircleNode x={643} y={210} state={nodeState(10, 16, t)} label="Reviewer grades" sub="grades the draft" />
      <FlowPath d="M 449 210 L 627 210" progress={seg(t, 9.0, 10.0)} setRef={setPathRef("draft-critic")} />
      <FlowPath
        d="M 630 196 C 590 118 486 118 446 196"
        progress={reviseActive ? Math.max(reviseProgress, 0.05) : 0}
        color={RED}
        dashed
        width={2.5}
        setRef={setPathRef("revise")}
      />
      {t >= 10.4 && !approved && (
        <text x={538} y={148} textAnchor="middle" fontSize={11} fontWeight={600} fill={RED}>revise</text>
      )}
      {version !== "" && (
        <text x={395} y={168} textAnchor="middle" fontSize={11} fill={MUTED} fontFamily="monospace">{version}</text>
      )}
      {approved && (
        <text x={643} y={168} textAnchor="middle" fontSize={12} fontWeight={700} fill={GREEN} fontFamily="monospace">9/10</text>
      )}
      {round > 0 && (
        <g>
          <rect
            x={538 - (approved ? 86 : 60)}
            y={88}
            width={approved ? 172 : 120}
            height={24}
            rx={12}
            fill={CARD}
            stroke={approved ? GREEN : RED}
            strokeWidth={1.5}
          />
          <text
            x={538}
            y={104}
            textAnchor="middle"
            fontSize={11}
            fill={approved ? GREEN : RED}
            fontFamily="monospace"
          >
            {badge}
          </text>
        </g>
      )}

      {/* Stage 4: parallel sections */}
      <FlowPath d="M 659 210 L 700 210" progress={seg(t, 18.4, 19.0)} setRef={setPathRef("critic-split")} />
      {TRACKS.map((track) => (
        <g key={track.id}>
          <FlowPath d={track.d} progress={seg(t, 19.2, 22.2)} setRef={setPathRef(track.id)} />
          <CircleNode x={track.nx} y={track.ny} r={10} state={nodeState(20.2, track.doneAt, t)} />
          <text x={track.nx} y={track.ly} textAnchor="middle" fontSize={12} fontWeight={600} fill={TEXT}>
            {track.label}
          </text>
        </g>
      ))}
      <CircleNode
        x={1035}
        y={210}
        state={nodeState(22.2, 24.5, t)}
        label="Assemble"
        sub={t >= 24.5 ? "sections merged" : t >= 22.2 ? "assembling..." : "sections merge"}
      />

      {/* Stage 5: review hub */}
      <FlowPath
        d="M 1051 210 C 1130 210 1140 320 1110 400 C 1082 474 950 510 828 522"
        progress={seg(t, 25.0, 26.2)}
        setRef={setPathRef("assemble-review")}
      />
      {SPOKES.map((spoke) => {
        const state: NodeState =
          t >= spoke.end ? "done" : t >= spoke.start ? "active" : "idle";
        const status = state === "done" ? "approved" : state === "active" ? "reviewing..." : undefined;
        return (
          <SpokeNode key={spoke.label} hub={HUB} x={spoke.x} y={spoke.y} state={state} label={spoke.label} status={status} />
        );
      })}
      <SpokeNode
        hub={HUB}
        x={FORMATTING.x}
        y={FORMATTING.y}
        state={formattingState}
        label="Formatting"
        status={
          formattingState === "done"
            ? "approved"
            : formattingState === "sentback"
              ? "sent back"
              : formattingState === "active"
                ? "reviewing..."
                : undefined
        }
      />
      {/* Fix node with a double red spoke, like the reference */}
      <g opacity={t >= 29.2 ? 1 : 0.55}>
        <line x1={HUB.x + 10} y1={HUB.y - 26} x2={FIX.x - 4} y2={FIX.y + 10} stroke={fixActive ? RED : t >= 31 ? IDLE : IDLE} strokeWidth={2.5} />
        <line x1={HUB.x + 20} y1={HUB.y - 20} x2={FIX.x + 5} y2={FIX.y + 15} stroke={fixActive ? RED : IDLE} strokeWidth={2.5} />
        <circle cx={FIX.x} cy={FIX.y} r={10} fill={CARD} stroke={fixActive ? RED : "#475569"} strokeWidth={2.5} />
        {fixActive && <circle cx={FIX.x} cy={FIX.y} r={4} fill={RED} />}
        <text x={FIX.x + 18} y={FIX.y} fontSize={12} fontWeight={700} fill={fixActive ? RED : MUTED}>Fix</text>
        <text x={FIX.x + 18} y={FIX.y + 15} fontSize={10} fill={MUTED}>then review again</text>
      </g>
      <circle cx={HUB.x} cy={HUB.y} r={34} fill={CARD} stroke={reviewDone ? GREEN : t >= 26.2 ? BLUE : "#475569"} strokeWidth={3} />
      <text x={HUB.x} y={HUB.y + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill={TEXT}>Review</text>

      {/* Stage 6: sign-off and submit */}
      <FlowPath d="M 756 528 L 395 528" progress={seg(t, 35.0, 36.3)} setRef={setPathRef("review-signoff")} />
      <CircleNode
        x={376}
        y={528}
        state={nodeState(36.3, 36.8, t)}
        label="Colton signs off"
        sub="final read before it goes out"
      />
      <FlowPath d="M 360 528 L 232 528" progress={seg(t, 36.6, 37.6)} setRef={setPathRef("signoff-submit")} />
      <rect
        x={212}
        y={493}
        width={9}
        height={70}
        rx={4.5}
        fill={submitted ? GREEN : TEXT}
        opacity={submitted ? 1 : 0.85}
      />
      <text x={206} y={586} fontSize={13} fontWeight={600} fill={submitted ? GREEN : TEXT} textAnchor="start">
        Submitted
      </text>
      <text x={206} y={602} fontSize={10} fill={MUTED}>proposal out the door</text>
      {submitted && (
        <circle cx={216} cy={528} r={22} fill="none" stroke={GREEN} strokeWidth={1.5} opacity={0.4} className="animate-pulse" />
      )}

      {/* Ticket pill riding the paths */}
      {pill && (
        <g transform={`translate(${pill.x}, ${pill.y})`}>
          <rect x={-34} y={-11} width={68} height={22} rx={11} fill={BLUE} />
          <text x={0} y={4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0b1322" fontFamily="monospace">
            RFP-2417
          </text>
        </g>
      )}
    </svg>
  );
}
