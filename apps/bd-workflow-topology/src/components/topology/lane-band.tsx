import { memo } from "react";
import type { Node, NodeProps } from "@xyflow/react";
import { LANE_BY_ID, type LaneId } from "@/data/workflow";

export type LaneBandNode = Node<{ laneId: LaneId; width: number; height: number }, "lane">;

function LaneBandInner({ data }: NodeProps<LaneBandNode>) {
  const lane = LANE_BY_ID[data.laneId];
  return (
    <div
      className="pointer-events-none rounded-2xl border"
      style={{
        width: data.width,
        height: data.height,
        backgroundColor: `${lane.color}0a`,
        borderColor: `${lane.color}26`,
      }}
    >
      <div
        className="px-5 pt-3 text-[11px] font-semibold uppercase tracking-[0.22em]"
        style={{ color: `${lane.color}cc` }}
      >
        {lane.name}
      </div>
    </div>
  );
}

export const LaneBandComponent = memo(LaneBandInner);
