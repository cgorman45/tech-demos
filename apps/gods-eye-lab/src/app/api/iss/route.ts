import { NextResponse } from "next/server";
import type { IssResponse, IssTrackPoint } from "@/lib/types";

const ISS_API = "https://api.wheretheiss.at/v1/satellites/25544";

// The positions endpoint accepts up to 10 timestamps per request.
// 30 points spanning -30min..+60min gives a smooth ~full-orbit track.
const TRACK_POINTS = 30;
const TRACK_START_OFFSET_S = -30 * 60;
const TRACK_END_OFFSET_S = 60 * 60;
const TRACK_CACHE_MS = 5 * 60 * 1000;

let cachedTrack: { points: IssTrackPoint[]; fetchedAt: number } | null = null;

type WtiPosition = {
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  timestamp: number;
  visibility: string;
};

async function fetchTrack(): Promise<IssTrackPoint[]> {
  if (cachedTrack && Date.now() - cachedTrack.fetchedAt < TRACK_CACHE_MS) {
    return cachedTrack.points;
  }

  const now = Math.floor(Date.now() / 1000);
  const step = (TRACK_END_OFFSET_S - TRACK_START_OFFSET_S) / (TRACK_POINTS - 1);
  const timestamps = Array.from({ length: TRACK_POINTS }, (_, i) =>
    Math.round(now + TRACK_START_OFFSET_S + i * step),
  );

  const points: IssTrackPoint[] = [];
  // Sequential requests of 10 timestamps each to stay under the
  // wheretheiss.at rate limit (~1 req/s).
  for (let i = 0; i < timestamps.length; i += 10) {
    const batch = timestamps.slice(i, i + 10);
    const res = await fetch(
      `${ISS_API}/positions?timestamps=${batch.join(",")}&units=kilometers`,
      { cache: "no-store" },
    );
    if (!res.ok) throw new Error(`wheretheiss positions: ${res.status}`);
    const data = (await res.json()) as WtiPosition[];
    for (const p of data) {
      points.push({
        lat: p.latitude,
        lng: p.longitude,
        alt: p.altitude,
        timestamp: p.timestamp,
      });
    }
  }

  cachedTrack = { points, fetchedAt: Date.now() };
  return points;
}

export async function GET() {
  try {
    const posRes = await fetch(`${ISS_API}?units=kilometers`, {
      cache: "no-store",
    });
    if (!posRes.ok) throw new Error(`wheretheiss position: ${posRes.status}`);
    const pos = (await posRes.json()) as WtiPosition;

    let track: IssTrackPoint[] = [];
    try {
      track = await fetchTrack();
    } catch {
      // Track is decorative; keep serving the live position if it fails.
      track = cachedTrack?.points ?? [];
    }

    const body: IssResponse = {
      position: {
        lat: pos.latitude,
        lng: pos.longitude,
        alt: pos.altitude,
        velocity: pos.velocity,
        timestamp: pos.timestamp,
        visibility: pos.visibility,
      },
      track,
    };
    return NextResponse.json(body);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ISS fetch failed" },
      { status: 502 },
    );
  }
}
