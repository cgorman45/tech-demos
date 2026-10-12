import type { Plan } from "@/features/plan/buildPlan";
import { fadeAlpha, outputToSource } from "@/features/plan/buildPlan";
import type { FrameSource } from "@/features/media/frameSource";
import { fitRect } from "@/features/media/frameSource";
import { drawOverlays, drawTitleCard } from "./overlays";

export interface DrawFrameOptions {
  ctx: CanvasRenderingContext2D;
  source: FrameSource;
  plan: Plan;
  /** Output time on the plan's timeline. */
  t: number;
  width: number;
  height: number;
  /**
   * Raw mode ignores overlays, filters, fades, and title cards: it draws the
   * plain source frame mapped from the same output time (the "before" side
   * of an A/B compare).
   */
  raw?: boolean;
  /** Video element positioned at (or near) the needed source time. */
  video?: HTMLVideoElement;
}

/** Preview and export both render through this, so they always match. */
export function drawPlanFrame(opts: DrawFrameOptions): void {
  const { ctx, source, plan, t, width, height, raw, video } = opts;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  const box = fitRect(source.width, source.height, width, height);
  const lookup = outputToSource(plan, t);

  if (lookup.kind === "title" && lookup.title && !raw) {
    drawTitleCard(ctx, lookup.title.text, box.x, box.y, box.w, box.h);
    return;
  }

  const applyFilter = !raw && plan.filter.length > 0;
  if (applyFilter) {
    ctx.save();
    ctx.filter = plan.filter;
  }
  if (lookup.kind === "title") {
    // Raw view during a title card: show black with nothing else.
    ctx.fillStyle = "#000000";
    ctx.fillRect(box.x, box.y, box.w, box.h);
  } else {
    source.draw(ctx, lookup.srcTime, box.x, box.y, box.w, box.h, video);
  }
  if (applyFilter) ctx.restore();

  if (!raw) {
    drawOverlays(ctx, plan, t, box.x, box.y, box.w, box.h);
    const alpha = fadeAlpha(plan, t);
    if (alpha < 1) {
      ctx.fillStyle = `rgba(0,0,0,${(1 - alpha).toFixed(3)})`;
      ctx.fillRect(0, 0, width, height);
    }
  }
}
