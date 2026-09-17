"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MorphControl } from "@/components/morph-control";
import { PlanInset } from "@/components/plan-inset";
import type { MorphState } from "@/components/scene";

const Scene = dynamic(
  () => import("@/components/scene").then((m) => m.Scene),
  {
    ssr: false,
    loading: () => (
      <div className="sheet-label flex h-full items-center justify-center">
        loading scene…
      </div>
    ),
  },
);

/** Faint sepia paper grain, tiled over the canvas. */
const GRAIN =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.29 0 0 0 0 0.26 0 0 0 0 0.21 0 0 0 0.09 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>";

/** `?morph=0..1` starts the scene already settled at that state, so headless captures are deterministic. */
function initialMorph(param: string | null) {
  const v = parseFloat(param ?? "");
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

export function Lab() {
  const initial = initialMorph(useSearchParams().get("morph"));
  const [morph, setMorph] = useState(initial);
  const morphRef = useRef<MorphState>({ target: initial, smooth: initial });

  const set = (v: number) => {
    setMorph(v);
    morphRef.current.target = v;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-[520px] overflow-hidden rounded-sm border border-border bg-background">
        <Scene morphRef={morphRef} />
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            background: `radial-gradient(ellipse at center, transparent 55%, rgb(74 68 54 / 0.16) 100%), url("${GRAIN}")`,
          }}
        />
        <div className="pointer-events-none absolute left-3 top-3 z-20 flex flex-col items-start gap-1">
          <div className="sheet-chip">
            {morph < 0.5 ? "Plan — Site Schematic" : "Massing — Extruded"}
          </div>
          <div className="sheet-label pl-0.5 text-[8px]">
            {morph < 0.5 ? "Top · North up" : "Axonometric — from the south east"}
          </div>
        </div>
        <svg
          className="pointer-events-none absolute right-3 top-3 z-20 h-10 w-10 text-foreground"
          viewBox="0 0 40 40"
          aria-label="North"
        >
          <circle cx="20" cy="20" r="18" fill="#e6e0cf" fillOpacity="0.7" stroke="currentColor" strokeWidth="0.8" />
          <path d="M20 7 L24 19 L20 16.5 L16 19 Z" fill="currentColor" />
          <path d="M20 16.5 V33" stroke="currentColor" strokeWidth="0.8" />
          <text x="26" y="31" fontSize="9" fontFamily="var(--font-eb-garamond), serif" fill="currentColor">
            N
          </text>
        </svg>
        <PlanInset className="pointer-events-none absolute bottom-3 left-3 z-20 w-[136px]" />
        <div className="pointer-events-none absolute bottom-3 right-3 z-20 sheet-label text-[8px]">
          Site metres · Rev A
        </div>
        {morph > 0.93 && (
          <div className="sheet-chip pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 normal-case tracking-normal">
            drag to orbit · right-drag to pan · scroll to zoom
          </div>
        )}
      </div>

      <div className="sheet-panel flex items-center gap-5 px-5 py-4">
        <span className="sheet-label shrink-0">Morph</span>
        <MorphControl value={morph} onChange={set} className="flex-1" />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => set(0)}>
            Flatten
          </Button>
          <Button size="sm" onClick={() => set(1)}>
            Extrude
          </Button>
        </div>
      </div>
    </div>
  );
}
