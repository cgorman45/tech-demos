import { cn } from "@/lib/utils";
import site from "@/data/civic-center.json";

const FILL: Record<string, string> = {
  police: "#c9b691",
  jail: "#a4a8a1",
  parking: "#bdb4a3",
  context: "none",
};

const PAD = 10;
const pts = site.buildings.flatMap((b) => b.footprint);
const minX = Math.min(...pts.map((p) => p[0])) - PAD;
const maxX = Math.max(...pts.map((p) => p[0])) + PAD;
const minY = Math.min(...pts.map((p) => p[1])) - PAD;
const maxY = Math.max(...pts.map((p) => p[1])) + PAD;

// North up: flip plan y into SVG y.
const path = (fp: number[][]) =>
  fp.map(([x, y], i) => `${i ? "L" : "M"}${x - minX} ${maxY - y}`).join(" ") + "Z";

/** Static key plan of the site footprints, in the sheet's corner-inset style. */
export function PlanInset({ className }: { className?: string }) {
  return (
    <div className={cn("sheet-panel p-2", className)}>
      <div className="sheet-label mb-1 text-[8px]">Plan — Site</div>
      <svg viewBox={`0 0 ${maxX - minX} ${maxY - minY}`} className="w-full">
        {site.buildings.map((b) => (
          <path
            key={b.id}
            d={path(b.footprint)}
            fill={FILL[b.kind] ?? "none"}
            stroke={b.kind === "context" ? "#8b8270" : "#4a4436"}
            strokeWidth={b.kind === "context" ? 0.8 : 1.2}
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}
