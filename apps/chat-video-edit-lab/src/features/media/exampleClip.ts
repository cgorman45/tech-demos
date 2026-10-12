import type { CaptionSegment } from "@/features/plan/steps";
import type { FrameSource } from "./frameSource";

export const EXAMPLE_DURATION = 15;
export const EXAMPLE_NAME = "Example clip";

export const EXAMPLE_CAPTIONS: CaptionSegment[] = [
  { from: 0.5, to: 3, text: "Scene one opens" },
  { from: 4, to: 7, text: "The counter keeps ticking" },
  { from: 8, to: 11, text: "Shapes drift across" },
  { from: 11.5, to: 14.5, text: "Scene four wraps up" },
];

const SCENES = [
  { label: "Scene 1", bgA: "#1e2a4a", bgB: "#0c1220", accent: "#5b9bff" },
  { label: "Scene 2", bgA: "#1f3a2e", bgB: "#0a1510", accent: "#4ade80" },
  { label: "Scene 3", bgA: "#3a2a1f", bgB: "#170f08", accent: "#fbbf6d" },
  { label: "Scene 4", bgA: "#35203f", bgB: "#120818", accent: "#c084fc" },
];

/**
 * Draw the procedural example frame for time t into the destination rect.
 * A pure function of t, so preview and export always agree and seeking is
 * instant. Nominal size 1280x720; everything scales with the rect.
 */
export function drawExampleFrame(
  ctx: CanvasRenderingContext2D,
  t: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const sceneLen = EXAMPLE_DURATION / SCENES.length;
  const sceneIdx = Math.min(SCENES.length - 1, Math.floor(t / sceneLen));
  const scene = SCENES[sceneIdx];
  const u = (v: number) => (v / 720) * dh; // scale against nominal 720p height

  ctx.save();
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();

  const grad = ctx.createLinearGradient(dx, dy, dx + dw, dy + dh);
  grad.addColorStop(0, scene.bgA);
  grad.addColorStop(1, scene.bgB);
  ctx.fillStyle = grad;
  ctx.fillRect(dx, dy, dw, dh);

  // Drifting circles
  for (let i = 0; i < 5; i++) {
    const phase = t * (0.25 + i * 0.09) + i * 1.7;
    const cx = dx + dw * (0.5 + 0.42 * Math.sin(phase));
    const cy = dy + dh * (0.5 + 0.34 * Math.cos(phase * 0.8 + i));
    const r = u(26 + 14 * Math.sin(t * 0.9 + i * 2));
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(u(8), r), 0, Math.PI * 2);
    ctx.fillStyle = `${scene.accent}33`;
    ctx.fill();
    ctx.lineWidth = u(2);
    ctx.strokeStyle = `${scene.accent}aa`;
    ctx.stroke();
  }

  // Sliding square
  const sq = u(70);
  const sx = dx + ((t * dw) / 6) % (dw + sq) - sq / 2;
  ctx.save();
  ctx.translate(sx, dy + dh * 0.72);
  ctx.rotate(t * 1.1);
  ctx.fillStyle = `${scene.accent}55`;
  ctx.strokeStyle = scene.accent;
  ctx.lineWidth = u(2.5);
  ctx.fillRect(-sq / 2, -sq / 2, sq, sq);
  ctx.strokeRect(-sq / 2, -sq / 2, sq, sq);
  ctx.restore();

  // Scene label
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 ${u(44)}px system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(scene.label, dx + u(36), dy + u(30));

  // Ticking counter
  const counter = t.toFixed(1);
  ctx.font = `700 ${u(64)}px ui-monospace, monospace`;
  ctx.textAlign = "right";
  ctx.fillStyle = scene.accent;
  ctx.fillText(counter, dx + dw - u(36), dy + u(26));
  ctx.font = `400 ${u(20)}px system-ui, sans-serif`;
  ctx.fillStyle = "#ffffffaa";
  ctx.fillText("seconds", dx + dw - u(36), dy + u(96));

  // Progress line
  ctx.fillStyle = `${scene.accent}cc`;
  ctx.fillRect(dx, dy + dh - u(6), dw * (t / EXAMPLE_DURATION), u(6));

  ctx.restore();
}

export function createExampleSource(): FrameSource {
  return {
    kind: "example",
    name: EXAMPLE_NAME,
    duration: EXAMPLE_DURATION,
    width: 1280,
    height: 720,
    draw(ctx, srcTime, dx, dy, dw, dh) {
      drawExampleFrame(ctx, Math.max(0, Math.min(srcTime, EXAMPLE_DURATION)), dx, dy, dw, dh);
    },
  };
}
