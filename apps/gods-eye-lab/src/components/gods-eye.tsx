"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { ControlPanel } from "@/components/control-panel";
import type { AircraftResponse, IssResponse } from "@/lib/types";

const GlobeView = dynamic(() => import("@/components/globe-view"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-black text-sm text-slate-500">
      Spinning up the globe…
    </div>
  ),
});

const ISS_POLL_MS = 3000;
const AIRCRAFT_POLL_MS = 12000;
const AIRCRAFT_REGION = "the North Sea / Benelux";

export function GodsEye() {
  const [showIss, setShowIss] = useState(true);
  const [showAircraft, setShowAircraft] = useState(true);
  const [iss, setIss] = useState<IssResponse | null>(null);
  const [aircraft, setAircraft] = useState<AircraftResponse | null>(null);
  const [focusIssTick, setFocusIssTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/iss");
        if (!res.ok) return;
        const data = (await res.json()) as IssResponse;
        if (!cancelled) setIss(data);
      } catch {
        // transient network error; next poll retries
      }
    };
    poll();
    const id = setInterval(poll, ISS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/aircraft");
        if (!res.ok) return;
        const data = (await res.json()) as AircraftResponse;
        if (!cancelled) setAircraft(data);
      } catch {
        // transient network error; next poll retries
      }
    };
    poll();
    const id = setInterval(poll, AIRCRAFT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const handleFocusIss = useCallback(() => {
    setFocusIssTick((t) => t + 1);
  }, []);

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      <GlobeView
        iss={iss}
        aircraft={aircraft?.aircraft ?? []}
        showIss={showIss}
        showAircraft={showAircraft}
        focusIssTick={focusIssTick}
      />
      <div className="pointer-events-none absolute left-4 top-4 z-10">
        <ControlPanel
          showIss={showIss}
          showAircraft={showAircraft}
          onToggleIss={setShowIss}
          onToggleAircraft={setShowAircraft}
          onFocusIss={handleFocusIss}
          iss={iss}
          aircraftCount={aircraft?.aircraft.length ?? 0}
          aircraftRegion={AIRCRAFT_REGION}
        />
      </div>
    </main>
  );
}
