"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { CompareMaps, type CursorInfo } from "@/components/compare-maps";
import { SearchBox, type SearchResult } from "@/components/search-box";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";
import { DEFAULT_EXAGGERATION, PITCH_3D, PRESETS, type Preset } from "@/lib/terrain";

export function ElevationLab() {
  const terrainMapRef = useRef<MLMap | null>(null);
  const satelliteMapRef = useRef<MLMap | null>(null);
  const exaggerationRef = useRef(DEFAULT_EXAGGERATION);
  const orbitFrameRef = useRef<number | null>(null);

  const [cursor, setCursor] = useState<CursorInfo | null>(null);
  const [exaggeration, setExaggeration] = useState(DEFAULT_EXAGGERATION);
  const [is3D, setIs3D] = useState(true);
  const [orbiting, setOrbiting] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(PRESETS[0].name);

  const stopOrbit = useCallback(() => {
    if (orbitFrameRef.current != null) cancelAnimationFrame(orbitFrameRef.current);
    orbitFrameRef.current = null;
    setOrbiting(false);
  }, []);

  const onReady = useCallback(
    (terrainMap: MLMap, satelliteMap: MLMap) => {
      terrainMapRef.current = terrainMap;
      satelliteMapRef.current = satelliteMap;
      // Any manual interaction cancels the orbit animation.
      for (const map of [terrainMap, satelliteMap]) {
        map.on("mousedown", stopOrbit);
        map.on("wheel", stopOrbit);
        map.on("touchstart", stopOrbit);
      }
    },
    [stopOrbit]
  );

  const applyExaggeration = useCallback((value: number) => {
    setExaggeration(value);
    exaggerationRef.current = value;
    for (const map of [terrainMapRef.current, satelliteMapRef.current]) {
      map?.setTerrain({ source: "terrain", exaggeration: value });
    }
  }, []);

  const flyTo = useCallback(
    (opts: { center: [number, number]; zoom: number; bearing?: number; pitch?: number }) => {
      stopOrbit();
      terrainMapRef.current?.flyTo({
        center: opts.center,
        zoom: opts.zoom,
        bearing: opts.bearing ?? 0,
        pitch: opts.pitch ?? (is3D ? PITCH_3D : 0),
        duration: 3000,
        essential: true,
      });
    },
    [is3D, stopOrbit]
  );

  const goToPreset = useCallback(
    (preset: Preset) => {
      setActivePreset(preset.name);
      setIs3D(true);
      flyTo(preset);
    },
    [flyTo]
  );

  const onSearchSelect = useCallback(
    (result: SearchResult) => {
      setActivePreset(null);
      setIs3D(true);
      flyTo({ center: [result.lon, result.lat], zoom: 13, pitch: PITCH_3D });
    },
    [flyTo]
  );

  const toggle3D = useCallback(
    (pressed: boolean) => {
      setIs3D(pressed);
      stopOrbit();
      terrainMapRef.current?.easeTo({ pitch: pressed ? PITCH_3D : 0, duration: 900 });
    },
    [stopOrbit]
  );

  const toggleOrbit = useCallback(() => {
    if (orbiting) {
      stopOrbit();
      return;
    }
    setOrbiting(true);
    setIs3D(true);
    terrainMapRef.current?.easeTo({ pitch: PITCH_3D, duration: 600 });
    let last = performance.now();
    const spin = (now: number) => {
      const map = terrainMapRef.current;
      if (!map) return;
      const dt = now - last;
      last = now;
      map.setBearing(map.getBearing() + dt * 0.012);
      orbitFrameRef.current = requestAnimationFrame(spin);
    };
    orbitFrameRef.current = requestAnimationFrame(spin);
  }, [orbiting, stopOrbit]);

  useEffect(() => () => stopOrbit(), [stopOrbit]);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#05080c] text-foreground">
      <CompareMaps onReady={onReady} onCursor={setCursor} exaggerationRef={exaggerationRef} />

      {/* Side labels */}
      <Badge
        variant="secondary"
        className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-[calc(100%+3rem)] bg-black/60 text-white/90 backdrop-blur"
      >
        LiDAR terrain · USGS 3DEP
      </Badge>
      <Badge
        variant="secondary"
        className="pointer-events-none absolute top-3 left-1/2 z-10 translate-x-12 bg-black/60 text-white/90 backdrop-blur"
      >
        Satellite · USGS imagery
      </Badge>

      {/* Header + search + presets */}
      <Card className="absolute top-4 left-4 z-10 w-80 gap-3 border-white/10 bg-black/60 py-4 backdrop-blur-md">
        <CardContent className="flex flex-col gap-3 px-4">
          <div>
            <h1 className="text-base font-semibold tracking-tight text-white">
              USGS LiDAR Elevation Lab
            </h1>
            <p className="text-xs text-white/60">
              3D terrain from USGS 3DEP — swipe to compare with satellite imagery.
            </p>
          </div>
          <SearchBox onSelect={onSearchSelect} />
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <Button
                key={preset.name}
                size="sm"
                variant={activePreset === preset.name ? "default" : "secondary"}
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => goToPreset(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* View controls */}
      <Card className="absolute right-4 bottom-8 z-10 w-64 gap-2 border-white/10 bg-black/60 py-4 backdrop-blur-md">
        <CardContent className="flex flex-col gap-4 px-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span>Vertical exaggeration</span>
              <span className="font-mono text-white">{exaggeration.toFixed(1)}×</span>
            </div>
            <Slider
              min={1}
              max={3}
              step={0.1}
              value={[exaggeration]}
              onValueChange={([v]) => applyExaggeration(v)}
            />
          </div>
          <div className="flex gap-2">
            <Toggle
              pressed={is3D}
              onPressedChange={toggle3D}
              variant="outline"
              className="flex-1 text-white data-[state=on]:bg-white/20"
            >
              3D view
            </Toggle>
            <Toggle
              pressed={orbiting}
              onPressedChange={toggleOrbit}
              variant="outline"
              className="flex-1 text-white data-[state=on]:bg-white/20"
            >
              {orbiting ? "Stop orbit" : "Orbit"}
            </Toggle>
          </div>
        </CardContent>
      </Card>

      {/* Cursor elevation readout */}
      {cursor && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-4 py-1.5 font-mono text-xs text-white/90 backdrop-blur">
          {cursor.elevation != null ? (
            <>
              <span className="text-white">{Math.round(cursor.elevation).toLocaleString()} m</span>
              <span className="text-white/50"> · {Math.round(cursor.elevation * 3.28084).toLocaleString()} ft</span>
            </>
          ) : (
            <span className="text-white/50">elevation loading…</span>
          )}
          <span className="text-white/40">
            {"  —  "}
            {cursor.lngLat.lat.toFixed(4)}°, {cursor.lngLat.lng.toFixed(4)}°
          </span>
        </div>
      )}
    </main>
  );
}
