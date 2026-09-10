"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MLMap, type LngLat } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { lidarStyle, satelliteStyle, PRESETS } from "@/lib/terrain";

export interface CursorInfo {
  lngLat: LngLat;
  /** True (non-exaggerated) elevation in meters, if terrain is loaded. */
  elevation: number | null;
}

interface CompareMapsProps {
  onReady: (terrainMap: MLMap, satelliteMap: MLMap) => void;
  onCursor: (info: CursorInfo | null) => void;
  /** Ref holding the current vertical exaggeration (used to de-exaggerate readouts). */
  exaggerationRef: React.RefObject<number>;
}

/** Keep two maps' cameras in lockstep. `jumpTo` is synchronous, so the guard works. */
function syncMaps(a: MLMap, b: MLMap) {
  let syncing = false;
  const mirror = (src: MLMap, dst: MLMap) => () => {
    if (syncing) return;
    syncing = true;
    dst.jumpTo({
      center: src.getCenter(),
      zoom: src.getZoom(),
      bearing: src.getBearing(),
      pitch: src.getPitch(),
    });
    syncing = false;
  };
  a.on("move", mirror(a, b));
  b.on("move", mirror(b, a));
}

export function CompareMaps({ onReady, onCursor, exaggerationRef }: CompareMapsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terrainDivRef = useRef<HTMLDivElement>(null);
  const satelliteDivRef = useRef<HTMLDivElement>(null);
  const terrainMapRef = useRef<MLMap | null>(null);
  const [splitPct, setSplitPct] = useState(62);
  const draggingRef = useRef(false);

  useEffect(() => {
    if (!terrainDivRef.current || !satelliteDivRef.current) return;

    const start = PRESETS[0];
    const shared = {
      center: start.center as [number, number],
      zoom: start.zoom,
      bearing: start.bearing,
      pitch: start.pitch,
      maxPitch: 80,
      attributionControl: { compact: true },
    };

    const terrainMap = new MLMap({
      container: terrainDivRef.current,
      style: lidarStyle(),
      ...shared,
    });
    const satelliteMap = new MLMap({
      container: satelliteDivRef.current,
      style: satelliteStyle(),
      ...shared,
    });
    terrainMapRef.current = terrainMap;

    syncMaps(terrainMap, satelliteMap);
    onReady(terrainMap, satelliteMap);

    return () => {
      terrainMap.remove();
      satelliteMap.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swipe divider drag handling on the whole container.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const pctFromEvent = (clientX: number) => {
      const rect = el.getBoundingClientRect();
      return Math.min(98, Math.max(2, ((clientX - rect.left) / rect.width) * 100));
    };
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      e.preventDefault();
      setSplitPct(pctFromEvent(e.clientX));
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  // Cursor elevation readout.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      if (draggingRef.current) return;
      const map = terrainMapRef.current;
      if (!map) return;
      const rect = el.getBoundingClientRect();
      const lngLat = map.unproject([e.clientX - rect.left, e.clientY - rect.top]);
      const raw = map.queryTerrainElevation(lngLat);
      const exaggeration = exaggerationRef.current || 1;
      onCursor({ lngLat, elevation: raw == null ? null : raw / exaggeration });
    };
    const onLeave = () => onCursor(null);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {/* Bottom map: LiDAR-style terrain */}
      <div ref={terrainDivRef} className="absolute inset-0" />
      {/* Top map: satellite imagery, clipped to the right of the divider.
          clip-path also clips hit-testing, so each side stays interactive. */}
      <div
        ref={satelliteDivRef}
        className="absolute inset-0"
        style={{ clipPath: `inset(0 0 0 ${splitPct}%)` }}
      />
      {/* Swipe divider */}
      <div
        className="absolute inset-y-0 z-20 w-0.5 -translate-x-1/2 cursor-ew-resize bg-white/70 shadow-[0_0_12px_rgba(0,0,0,0.8)]"
        style={{ left: `${splitPct}%` }}
        onPointerDown={(e) => {
          e.preventDefault();
          draggingRef.current = true;
        }}
      >
        <div className="absolute top-1/2 left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/30 bg-black/70 text-sm text-white shadow-lg backdrop-blur select-none">
          ⇆
        </div>
      </div>
    </div>
  );
}
