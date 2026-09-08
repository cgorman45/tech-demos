import { NextRequest, NextResponse } from "next/server";
import type { Aircraft, AircraftResponse } from "@/lib/types";

// Dense airspace over the Benelux / SE England makes for a lively demo.
const DEFAULT_CENTER = { lat: 51.5, lng: 2.5 };
const DEFAULT_RADIUS_NM = 250; // adsb.lol max
const CACHE_MS = 10 * 1000;

const cache = new Map<string, { body: AircraftResponse; fetchedAt: number }>();

type AdsbAc = {
  hex?: string;
  flight?: string;
  t?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
  gs?: number;
  track?: number;
};

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const lat = Number(params.get("lat") ?? DEFAULT_CENTER.lat);
  const lng = Number(params.get("lng") ?? DEFAULT_CENTER.lng);
  const radiusNm = Math.min(
    Number(params.get("radius") ?? DEFAULT_RADIUS_NM),
    250,
  );

  const key = `${lat.toFixed(1)},${lng.toFixed(1)},${radiusNm}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.fetchedAt < CACHE_MS) {
    return NextResponse.json(hit.body);
  }

  try {
    const res = await fetch(
      `https://api.adsb.lol/v2/point/${lat}/${lng}/${radiusNm}`,
      {
        cache: "no-store",
        // adsb.lol rejects requests without a User-Agent.
        headers: { "User-Agent": "gods-eye-lab/0.1 (tech demo)" },
      },
    );
    if (!res.ok) throw new Error(`adsb.lol: ${res.status}`);
    const data = (await res.json()) as { ac?: AdsbAc[] };

    const aircraft: Aircraft[] = (data.ac ?? [])
      .filter((ac) => typeof ac.lat === "number" && typeof ac.lon === "number")
      .map((ac) => ({
        hex: ac.hex ?? "",
        flight: (ac.flight ?? "").trim(),
        type: ac.t ?? null,
        lat: ac.lat as number,
        lng: ac.lon as number,
        altFt: ac.alt_baro === "ground" ? 0 : (ac.alt_baro ?? 0),
        gs: ac.gs ?? null,
        track: ac.track ?? null,
      }));

    const body: AircraftResponse = {
      aircraft,
      center: { lat, lng },
      radiusNm,
      fetchedAt: Date.now(),
    };
    cache.set(key, { body, fetchedAt: Date.now() });
    return NextResponse.json(body);
  } catch (err) {
    // Serve stale data over an error if we have it.
    if (hit) return NextResponse.json(hit.body);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "ADS-B fetch failed" },
      { status: 502 },
    );
  }
}
