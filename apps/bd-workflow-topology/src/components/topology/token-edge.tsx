import { memo } from "react";
import { BaseEdge, getBezierPath, type Edge, type EdgeProps } from "@xyflow/react";

export type TokenEdgeData = {
  /** Edge currently carrying the run token. */
  active: boolean;
  /** Pulse from the knowledge base while a kb-fed step fires. */
  kbPulse: boolean;
  color: string;
  dimmed: boolean;
  /** Remount key so the token animation replays on every step. */
  runKey: number;
  durationMs: number;
};

export type TokenFlowEdge = Edge<TokenEdgeData, "token">;

function TokenEdgeInner({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<TokenFlowEdge>) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const active = data?.active ?? false;
  const kbPulse = data?.kbPulse ?? false;
  const color = data?.color ?? "#71717a";
  const dimmed = data?.dimmed ?? false;
  const lit = active || kbPulse;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: color,
          strokeWidth: lit ? 2.5 : 1.5,
          opacity: dimmed ? 0.25 : lit ? 1 : 0.55,
          strokeDasharray: dimmed ? "6 4" : undefined,
          transition: "opacity 200ms, stroke-width 200ms",
          filter: lit ? `drop-shadow(0 0 6px ${color})` : undefined,
        }}
      />
      {lit && (
        <circle key={`${id}-token-${data?.runKey}`} r={active ? 6 : 4} fill={color}>
          <animateMotion
            dur={`${Math.max(data?.durationMs ?? 900, 200)}ms`}
            repeatCount="1"
            fill="freeze"
            path={path}
          />
        </circle>
      )}
    </>
  );
}

export const TokenEdgeComponent = memo(TokenEdgeInner);
