import { useEffect, useRef, useState } from "react";
import { easeInOut, seg } from "@/components/drafting/timeline";

/**
 * The animated proposal drafting flowchart. Everything on screen derives
 * from the clock value `t` (seconds at 1x), so pause, speed, and stage
 * jumps are handled by the parent overlay. Every text is a label id
 * resolved through LabelCtx, which also carries the inline rename state
 * used by the overlay's Edit mode.
 */

export const BLUE = "#818cf8";
export const RED = "#f87171";
export const GREEN = "#34d399";
const IDLE = "#334155";
const TEXT = "#e2e8f0";
const MUTED = "#8ea0b8";
const CARD = "#0b1322";

export interface LabelCtx {
  editMode: boolean;
  get: (id: string) => string;
  editingId: string | null;
  beginEdit: (id: string) => void;
  commitEdit: (id: string, value: string) => void;
  cancelEdit: () => void;
}

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

function truncate(text: string, maxChars: number): string {
  return text.length > maxChars ? `${text.slice(0, Math.max(1, maxChars - 1))}\u2026` : text;
}

function EditBox({
  id,
  x,
  y,
  width,
  anchor,
  ctx,
}: {
  id: string;
  x: number;
  y: number;
  width: number;
  anchor: "start" | "middle" | "end";
  ctx: LabelCtx;
}) {
  const [value, setValue] = useState(ctx.get(id));
  const left = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  return (
    <foreignObject x={left} y={y - 19} width={width} height={28}>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => ctx.commitEdit(id, value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            ctx.commitEdit(id, value);
          } else if (e.key === "Escape") {
            e.stopPropagation();
            ctx.cancelEdit();
          }
        }}
        aria-label={`Rename ${ctx.get(id)}`}
        className="h-full w-full rounded border border-indigo-400/70 bg-[#0b1322] px-1.5 text-xs text-foreground outline-none"
      />
    </foreignObject>
  );
}

function SceneText({
  id,
  x,
  y,
  ctx,
  anchor = "middle",
  fontSize = 13,
  fontWeight,
  fill = TEXT,
  mono = false,
  maxChars = 26,
}: {
  id: string;
  x: number;
  y: number;
  ctx: LabelCtx;
  anchor?: "start" | "middle" | "end";
  fontSize?: number;
  fontWeight?: number;
  fill?: string;
  mono?: boolean;
  maxChars?: number;
}) {
  if (ctx.editingId === id) {
    return (
      <EditBox
        id={id}
        x={x}
        y={y}
        width={Math.min(250, Math.max(130, maxChars * 7.5 + 20))}
        anchor={anchor}
        ctx={ctx}
      />
    );
  }
  const text = ctx.get(id);
  const shown = truncate(text, maxChars);
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fontSize={fontSize}
      fontWeight={fontWeight}
      fill={fill}
      fontFamily={mono ? "monospace" : undefined}
      onClick={ctx.editMode ? () => ctx.beginEdit(id) : undefined}
      style={
        ctx.editMode
          ? { cursor: "text", textDecoration: "underline dotted" }
          : undefined
      }
    >
      {shown !== text && <title>{text}</title>}
      {shown}
    </text>
  );
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
  labelId,
  subId,
  ctx,
  labelY = "below",
  anchor = "middle",
}: {
  x: number;
  y: number;
  r?: number;
  state: NodeState;
  labelId?: string;
  subId?: string;
  ctx: LabelCtx;
  labelY?: "above" | "below";
  anchor?: "start" | "middle" | "end";
}) {
  const color = stateColor(state);
  const ly = labelY === "below" ? y + r + 20 : y - r - 22;
  const sy = ly + 15;
  return (
    <g>
      {state === "active" && (
        <circle cx={x} cy={y} r={r + 7} fill="none" stroke={color} strokeWidth={1.5} opacity={0.35} className="animate-pulse" />
      )}
      <circle cx={x} cy={y} r={r} fill={CARD} stroke={color} strokeWidth={3} />
      {(state === "done" || state === "active" || state === "sentback") && (
        <circle cx={x} cy={y} r={r * 0.42} fill={color} />
      )}
      {labelId && (
        <SceneText id={labelId} x={x} y={ly} ctx={ctx} anchor={anchor} fontSize={13} fontWeight={600} maxChars={24} />
      )}
      {subId && (
        <SceneText id={subId} x={x} y={sy} ctx={ctx} anchor={anchor} fontSize={10} fill={MUTED} maxChars={32} />
      )}
    </g>
  );
}

function SpokeNode({
  hub,
  x,
  y,
  state,
  labelId,
  statusId,
  ctx,
}: {
  hub: { x: number; y: number };
  x: number;
  y: number;
  state: NodeState;
  labelId: string;
  statusId?: string;
  ctx: LabelCtx;
}) {
  const color = stateColor(state);
  const lineColor = state === "idle" ? IDLE : color;
  const right = x >= hub.x;
  const tx = right ? x + 16 : x - 16;
  const anchor = right ? ("start" as const) : ("end" as const);
  return (
    <g>
      <line x1={hub.x} y1={hub.y} x2={x} y2={y} stroke={lineColor} strokeWidth={2.5} opacity={state === "idle" ? 0.7 : 1} />
      <circle cx={x} cy={y} r={9} fill={CARD} stroke={color} strokeWidth={2.5} />
      {state !== "idle" && <circle cx={x} cy={y} r={3.5} fill={color} />}
      <SceneText id={labelId} x={tx} y={y + 4} ctx={ctx} anchor={anchor} fontSize={12} fontWeight={600} maxChars={20} />
      {statusId && (
        <SceneText
          id={statusId}
          x={tx}
          y={y + 19}
          ctx={ctx}
          anchor={anchor}
          fontSize={10}
          fill={state === "done" ? GREEN : state === "sentback" ? RED : MUTED}
          mono
          maxChars={16}
        />
      )}
    </g>
  );
}

function Chip({
  x,
  y,
  labelId,
  progress,
  ctx,
}: {
  x: number;
  y: number;
  labelId: string;
  progress: number;
  ctx: LabelCtx;
}) {
  if (progress <= 0 && !ctx.editMode) return null;
  const done = progress >= 1;
  const color = done ? GREEN : BLUE;
  const text = truncate(ctx.get(labelId), 28);
  const width = Math.min(230, Math.max(120, text.length * 6.6 + 36));
  return (
    <g opacity={ctx.editMode ? 1 : Math.min(1, progress * 2)}>
      <rect x={x - width / 2} y={y - 12} width={width} height={24} rx={12} fill={CARD} stroke={color} strokeWidth={1.5} />
      <circle cx={x - width / 2 + 14} cy={y} r={4} fill={color} />
      <SceneText
        id={labelId}
        x={x - width / 2 + 26}
        y={y + 4}
        ctx={ctx}
        anchor="start"
        fontSize={11}
        mono
        maxChars={28}
      />
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

const SPOKES: Array<{ x: number; y: number; labelId: string; start: number; end: number }> = [
  { x: 650, y: 438, labelId: "spoke.compliance", start: 26.4, end: 27.4 },
  { x: 622, y: 540, labelId: "spoke.past", start: 27.5, end: 28.5 },
  { x: 676, y: 630, labelId: "spoke.tone", start: 28.6, end: 29.4 },
  { x: 890, y: 628, labelId: "spoke.pagelimits", start: 31.9, end: 32.7 },
  { x: 942, y: 540, labelId: "spoke.pricing", start: 32.8, end: 33.6 },
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
    labelId: "track.top",
    ly: 80,
    doneAt: 21.8,
  },
  {
    id: "track-mid",
    d: "M 700 210 L 1019 210",
    nx: 860,
    ny: 210,
    labelId: "track.mid",
    ly: 245,
    doneAt: 22.1,
  },
  {
    id: "track-bottom",
    d: "M 700 210 C 745 210 745 316 795 316 L 925 316 C 975 316 975 210 1019 210",
    nx: 860,
    ny: 316,
    labelId: "track.bottom",
    ly: 350,
    doneAt: 22.4,
  },
];

const CHIPS = [
  { labelId: "chip.1", start: 3.2 },
  { labelId: "chip.2", start: 4.4 },
  { labelId: "chip.3", start: 5.6 },
];

function nodeState(activeFrom: number, doneAt: number, t: number): NodeState {
  if (t >= doneAt) return "done";
  if (t >= activeFrom) return "active";
  return "idle";
}

export function DraftingScene({ t, ctx }: { t: number; ctx: LabelCtx }) {
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
  const round = t >= 14.6 ? 3 : t >= 11.8 ? 2 : t >= 9 ? 1 : 0;
  const approved = t >= 16;
  const badgeId = approved ? "loop.approved" : round > 0 ? `loop.round${round}` : null;
  const versionId = round > 0 ? `loop.v${round}` : null;
  const reviseActive = (t >= 10.6 && t <= 11.6) || (t >= 13.4 && t <= 14.4);
  const reviseProgress = t >= 13.4 ? seg(t, 13.4, 14.4) : seg(t, 10.6, 11.6);

  // Formatting spoke: sent back to Fix, then reviewed again and approved.
  const fixActive = t >= 29.5 && t < 31.0;
  const formattingState: NodeState =
    t >= 31.8 ? "done" : t >= 31.0 ? "active" : fixActive ? "sentback" : t >= 29.2 ? "active" : "idle";

  const reviewDone = t >= 34;
  const submitted = t >= 37.6;

  const pillText = truncate(ctx.get("pill"), 14);
  const pillWidth = Math.max(68, pillText.length * 6.9 + 20);
  const badgeText = badgeId ? truncate(ctx.get(badgeId), 30) : "";
  const badgeWidth = Math.max(120, badgeText.length * 6.6 + 26);

  const assembleSubId =
    t >= 24.5 ? "assemble.sub.done" : t >= 22.2 ? "assemble.sub.active" : "assemble.sub.idle";

  return (
    <svg
      viewBox="0 0 1200 700"
      className="h-full w-full"
      role="img"
      aria-label="Animated flowchart of how a proposal gets drafted"
    >
      {/* Stage 1: intake */}
      <rect x={66} y={175} width={9} height={70} rx={4.5} fill={TEXT} />
      <SceneText id="intake.title" x={60} y={268} ctx={ctx} anchor="start" fontSize={13} fontWeight={600} maxChars={16} />
      <SceneText id="intake.sub" x={60} y={284} ctx={ctx} anchor="start" fontSize={10} fill={MUTED} maxChars={16} />
      <FlowPath d="M 78 210 L 243 210" progress={seg(t, 0.2, 2.6)} setRef={setPathRef("intake")} />

      {/* Stage 2: knowledge base with match chips */}
      <CircleNode
        x={262}
        y={210}
        state={nodeState(2.6, 8, t)}
        labelId="kb.title"
        subId="kb.sub"
        ctx={ctx}
        labelY="above"
      />
      <line x1={262} y1={226} x2={262} y2={252} stroke={t >= 3.2 ? BLUE : IDLE} strokeWidth={2} opacity={0.7} />
      {CHIPS.map((chip, i) => (
        <Chip
          key={chip.labelId}
          x={262}
          y={272 + i * 32}
          labelId={chip.labelId}
          progress={seg(t, chip.start, chip.start + 1)}
          ctx={ctx}
        />
      ))}

      {/* Stage 3: draft and critique loop */}
      <FlowPath d="M 278 210 L 417 210" progress={seg(t, 8.0, 9.0)} setRef={setPathRef("kb-draft")} />
      <CircleNode x={433} y={210} state={nodeState(9, 16, t)} labelId="draft.title" subId="draft.sub" ctx={ctx} />
      <CircleNode x={643} y={210} state={nodeState(10, 16, t)} labelId="critic.title" subId="critic.sub" ctx={ctx} />
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
        <SceneText id="loop.revise" x={538} y={148} ctx={ctx} fontSize={11} fontWeight={600} fill={RED} maxChars={14} />
      )}
      {versionId && (
        <SceneText id={versionId} x={395} y={168} ctx={ctx} fontSize={11} fill={MUTED} mono maxChars={16} />
      )}
      {approved && (
        <SceneText id="loop.score" x={643} y={168} ctx={ctx} fontSize={12} fontWeight={700} fill={GREEN} mono maxChars={8} />
      )}
      {badgeId && (
        <g>
          <rect
            x={538 - badgeWidth / 2}
            y={88}
            width={badgeWidth}
            height={24}
            rx={12}
            fill={CARD}
            stroke={approved ? GREEN : RED}
            strokeWidth={1.5}
          />
          <SceneText
            id={badgeId}
            x={538}
            y={104}
            ctx={ctx}
            fontSize={11}
            fill={approved ? GREEN : RED}
            mono
            maxChars={30}
          />
        </g>
      )}

      {/* Stage 4: parallel sections */}
      <FlowPath d="M 659 210 L 700 210" progress={seg(t, 18.4, 19.0)} setRef={setPathRef("critic-split")} />
      {TRACKS.map((track) => (
        <g key={track.id}>
          <FlowPath d={track.d} progress={seg(t, 19.2, 22.2)} setRef={setPathRef(track.id)} />
          <CircleNode x={track.nx} y={track.ny} r={10} state={nodeState(20.2, track.doneAt, t)} ctx={ctx} />
          <SceneText id={track.labelId} x={track.nx} y={track.ly} ctx={ctx} fontSize={12} fontWeight={600} maxChars={24} />
        </g>
      ))}
      <CircleNode
        x={1035}
        y={210}
        state={nodeState(22.2, 24.5, t)}
        labelId="assemble.title"
        subId={assembleSubId}
        ctx={ctx}
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
        const statusId =
          state === "done" ? "status.approved" : state === "active" ? "status.reviewing" : undefined;
        return (
          <SpokeNode
            key={spoke.labelId}
            hub={HUB}
            x={spoke.x}
            y={spoke.y}
            state={state}
            labelId={spoke.labelId}
            statusId={statusId}
            ctx={ctx}
          />
        );
      })}
      <SpokeNode
        hub={HUB}
        x={FORMATTING.x}
        y={FORMATTING.y}
        state={formattingState}
        labelId="spoke.formatting"
        statusId={
          formattingState === "done"
            ? "status.approved"
            : formattingState === "sentback"
              ? "status.sentback"
              : formattingState === "active"
                ? "status.reviewing"
                : undefined
        }
        ctx={ctx}
      />
      {/* Fix node with a double red spoke, like the reference */}
      <g opacity={t >= 29.2 ? 1 : 0.55}>
        <line x1={HUB.x + 10} y1={HUB.y - 26} x2={FIX.x - 4} y2={FIX.y + 10} stroke={fixActive ? RED : IDLE} strokeWidth={2.5} />
        <line x1={HUB.x + 20} y1={HUB.y - 20} x2={FIX.x + 5} y2={FIX.y + 15} stroke={fixActive ? RED : IDLE} strokeWidth={2.5} />
        <circle cx={FIX.x} cy={FIX.y} r={10} fill={CARD} stroke={fixActive ? RED : "#475569"} strokeWidth={2.5} />
        {fixActive && <circle cx={FIX.x} cy={FIX.y} r={4} fill={RED} />}
        <SceneText id="fix.title" x={FIX.x + 18} y={FIX.y} ctx={ctx} anchor="start" fontSize={12} fontWeight={700} fill={fixActive ? RED : MUTED} maxChars={14} />
        <SceneText id="fix.sub" x={FIX.x + 18} y={FIX.y + 15} ctx={ctx} anchor="start" fontSize={10} fill={MUTED} maxChars={20} />
      </g>
      <circle cx={HUB.x} cy={HUB.y} r={34} fill={CARD} stroke={reviewDone ? GREEN : t >= 26.2 ? BLUE : "#475569"} strokeWidth={3} />
      <SceneText id="review.title" x={HUB.x} y={HUB.y + 5} ctx={ctx} fontSize={14} fontWeight={700} maxChars={9} />

      {/* Stage 6: sign-off and submit */}
      <FlowPath d="M 756 528 L 395 528" progress={seg(t, 35.0, 36.3)} setRef={setPathRef("review-signoff")} />
      <CircleNode
        x={376}
        y={528}
        state={nodeState(36.3, 36.8, t)}
        labelId="signoff.title"
        subId="signoff.sub"
        ctx={ctx}
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
      <SceneText
        id="submit.title"
        x={206}
        y={586}
        ctx={ctx}
        anchor="start"
        fontSize={13}
        fontWeight={600}
        fill={submitted ? GREEN : TEXT}
        maxChars={16}
      />
      <SceneText id="submit.sub" x={206} y={602} ctx={ctx} anchor="start" fontSize={10} fill={MUTED} maxChars={24} />
      {submitted && (
        <circle cx={216} cy={528} r={22} fill="none" stroke={GREEN} strokeWidth={1.5} opacity={0.4} className="animate-pulse" />
      )}

      {/* Ticket pill riding the paths */}
      {pill && (
        <g transform={`translate(${pill.x}, ${pill.y})`}>
          <rect x={-pillWidth / 2} y={-11} width={pillWidth} height={22} rx={11} fill={BLUE} />
          {ctx.editingId === "pill" ? (
            <EditBox id="pill" x={0} y={4} width={130} anchor="middle" ctx={ctx} />
          ) : (
            <text
              x={0}
              y={4}
              textAnchor="middle"
              fontSize={11}
              fontWeight={700}
              fill="#0b1322"
              fontFamily="monospace"
              onClick={ctx.editMode ? () => ctx.beginEdit("pill") : undefined}
              style={ctx.editMode ? { cursor: "text", textDecoration: "underline dotted" } : undefined}
            >
              {pillText !== ctx.get("pill") && <title>{ctx.get("pill")}</title>}
              {pillText}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}
