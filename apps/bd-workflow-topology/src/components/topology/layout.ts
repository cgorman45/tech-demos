import type { FitViewOptions } from "@xyflow/react";
import { LANES, NODES, type LaneId } from "@/data/workflow";

/**
 * Shared by the initial fitView and the Fit view button. The extra bottom
 * padding reserves the bottom strip of the viewport so the minimap in the
 * bottom-right corner never sits on a node.
 */
export const FIT_VIEW_OPTIONS: FitViewOptions = {
  padding: { top: 0.06, right: 0.05, bottom: 0.16, left: 0.05 },
  maxZoom: 1,
};

export const NODE_WIDTH = 240;
export const NODE_HEIGHT = 108;
export const KB_WIDTH = 280;
export const KB_HEIGHT = 132;
export const PILL_HEIGHT = 96;

interface LaneGeometry {
  x: number;
  width: number;
}

/**
 * Manual lane columns. The Claude lane is twice as wide and holds two
 * sub-columns: kb centered on the left, its consumers stacked on the right.
 * The Won lane holds a single centered node so the bottom-right corner of
 * the canvas stays empty for the minimap.
 */
const LANE_GEOMETRY: Record<LaneId, LaneGeometry> = {
  find: { x: 0, width: 300 },
  lead: { x: 320, width: 300 },
  claude: { x: 640, width: 660 },
  meet: { x: 1320, width: 300 },
  won: { x: 1640, width: 320 },
};

export const CANVAS_TOP = 0;
export const CANVAS_HEIGHT = 790;
const BAND_TITLE_SPACE = 52;

function centered(lane: LaneId, width: number): number {
  const geometry = LANE_GEOMETRY[lane];
  return geometry.x + (geometry.width - width) / 2;
}

const POSITIONS: Record<string, { x: number; y: number }> = {
  scanner: { x: centered("find", NODE_WIDTH), y: 120 },
  council: { x: centered("find", NODE_WIDTH), y: 330 },
  grants: { x: centered("find", NODE_WIDTH), y: 540 },
  lead: { x: centered("lead", NODE_WIDTH), y: 336 },
  kb: { x: LANE_GEOMETRY.claude.x + 30, y: 300 },
  proposal: { x: LANE_GEOMETRY.claude.x + 390, y: 90 },
  deck: { x: LANE_GEOMETRY.claude.x + 390, y: 260 },
  emails: { x: LANE_GEOMETRY.claude.x + 390, y: 620 },
  tone: { x: LANE_GEOMETRY.claude.x + 30, y: 620 },
  rosie: { x: centered("meet", NODE_WIDTH), y: 120 },
  granola: { x: centered("meet", NODE_WIDTH), y: 300 },
  calls: { x: centered("meet", NODE_WIDTH), y: 480 },
  won: { x: centered("won", NODE_WIDTH), y: 330 },
};

export function nodeSize(id: string): { width: number; height: number } {
  const spec = NODES.find((n) => n.id === id);
  if (spec?.emphasis) return { width: KB_WIDTH, height: KB_HEIGHT };
  if (spec?.pill) return { width: NODE_WIDTH, height: PILL_HEIGHT };
  return { width: NODE_WIDTH, height: NODE_HEIGHT };
}

export function layoutPositions(): Record<string, { x: number; y: number }> {
  return POSITIONS;
}

export interface LaneBandGeometry {
  laneId: LaneId;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function laneBands(): LaneBandGeometry[] {
  return LANES.map((lane) => ({
    laneId: lane.id,
    x: LANE_GEOMETRY[lane.id].x,
    y: CANVAS_TOP - BAND_TITLE_SPACE,
    width: LANE_GEOMETRY[lane.id].width,
    height: CANVAS_HEIGHT + BAND_TITLE_SPACE,
  }));
}
