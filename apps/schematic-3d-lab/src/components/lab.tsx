"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MorphControl } from "@/components/morph-control";
import type { MorphState } from "@/components/scene";

const Scene = dynamic(
  () => import("@/components/scene").then((m) => m.Scene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center font-mono text-xs text-cyan-300/60">
        loading scene…
      </div>
    ),
  },
);

export function Lab() {
  const [morph, setMorph] = useState(0);
  const morphRef = useRef<MorphState>({ target: 0, smooth: 0 });

  const set = (v: number) => {
    setMorph(v);
    morphRef.current.target = v;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-[520px] overflow-hidden rounded-xl border border-cyan-900/60 bg-[#0a1424]">
        <Scene morphRef={morphRef} />
        <div className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-cyan-300/30 font-mono text-xs text-cyan-200/80">
          N↑
        </div>
        <div className="pointer-events-none absolute left-3 top-3 rounded border border-cyan-300/20 bg-slate-950/70 px-2 py-1 font-mono text-[10px] tracking-widest text-cyan-300/80">
          {morph < 0.5 ? "PLAN VIEW — SITE SCHEMATIC" : "MASSING VIEW — EXTRUDED"}
        </div>
        {morph > 0.93 && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-slate-950/70 px-2 py-1 font-mono text-[10px] text-cyan-300/70">
            drag to orbit · right-drag to pan · scroll to zoom
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-cyan-900/60 bg-slate-950/40 px-5 py-4">
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
