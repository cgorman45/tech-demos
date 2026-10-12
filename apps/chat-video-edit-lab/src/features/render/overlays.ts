import type { Plan } from "@/features/plan/buildPlan";

/** Draw captions and corner text active at output time t into the dest rect. */
export function drawOverlays(
  ctx: CanvasRenderingContext2D,
  plan: Plan,
  t: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const u = (v: number) => (v / 720) * dh;
  for (const o of plan.overlays) {
    if (t < o.from || t > o.to) continue;
    if (o.kind === "caption") {
      ctx.font = `500 ${u(30)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const metrics = ctx.measureText(o.text);
      const padX = u(18);
      const padY = u(10);
      const boxW = Math.min(metrics.width + padX * 2, dw - u(20));
      const boxH = u(30) + padY * 2;
      const bx = dx + dw / 2 - boxW / 2;
      const by = dy + dh - boxH - u(28);
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      roundRect(ctx, bx, by, boxW, boxH, u(8));
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(o.text, dx + dw / 2, by + boxH - padY - u(6), dw - u(40));
    } else {
      ctx.font = `600 ${u(26)}px system-ui, sans-serif`;
      ctx.textBaseline = "top";
      const pad = u(24);
      const top = o.corner.startsWith("top");
      const left = o.corner.endsWith("left");
      ctx.textAlign = left ? "left" : "right";
      const x = left ? dx + pad : dx + dw - pad;
      const y = top ? dy + pad : dy + dh - pad - u(26);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      const w = ctx.measureText(o.text).width;
      roundRect(ctx, left ? x - u(10) : x - w - u(10), y - u(6), w + u(20), u(26) + u(12), u(6));
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(o.text, x, y);
    }
  }
}

export function drawTitleCard(
  ctx: CanvasRenderingContext2D,
  text: string,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const u = (v: number) => (v / 720) * dh;
  const grad = ctx.createLinearGradient(dx, dy, dx, dy + dh);
  grad.addColorStop(0, "#15181f");
  grad.addColorStop(1, "#05060a");
  ctx.fillStyle = grad;
  ctx.fillRect(dx, dy, dw, dh);
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = u(1.5);
  ctx.strokeRect(dx + u(36), dy + u(36), dw - u(72), dh - u(72));
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 ${u(64)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  wrapText(ctx, text, dx + dw / 2, dy + dh / 2, dw - u(160), u(76));
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  cy: number,
  maxWidth: number,
  lineHeight: number,
): void {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const probe = line ? `${line} ${word}` : word;
    if (ctx.measureText(probe).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = probe;
    }
  }
  if (line) lines.push(line);
  const startY = cy - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, startY + i * lineHeight, maxWidth));
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
