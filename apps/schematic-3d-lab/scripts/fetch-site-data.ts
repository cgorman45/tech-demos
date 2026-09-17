/**
 * One-shot extractor: pulls public OpenStreetMap building footprints around
 * the Santa Ana Police Department (60 Civic Center Plaza, Santa Ana, CA 92701)
 * and writes src/data/civic-center.json in local meter coordinates.
 *
 * Run with: bun run scripts/fetch-site-data.ts
 *
 * Data © OpenStreetMap contributors, ODbL 1.0 — https://www.openstreetmap.org/copyright
 * Only exterior footprints are used. Heights for the named civic buildings are
 * estimates from public imagery (no OSM height tag exists for them); context
 * building heights come straight from OSM `height` tags where mapped.
 */

const SAPD_WAY_ID = 205740155;
const BBOX = "-117.8830,33.7490,-117.8775,33.7528";
const CONTEXT_RADIUS_M = 150;

// Estimated heights (meters) for buildings with no OSM height tag.
const HEIGHT_ESTIMATES: Record<number, { h: number; kind: string }> = {
  [SAPD_WAY_ID]: { h: 20, kind: "police" }, // SAPD HQ, ~4 stories
  205740158: { h: 16, kind: "jail" }, // Santa Ana City Jail
  205739729: { h: 12, kind: "parking" }, // parking structure
  1080559270: { h: 10, kind: "parking" }, // parking structure
};
const DEFAULT_CONTEXT_HEIGHT = 4;

type OsmNode = { type: "node"; id: number; lat: number; lon: number };
type OsmWay = {
  type: "way";
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
};

const res = await fetch(
  `https://api.openstreetmap.org/api/0.6/map.json?bbox=${BBOX}`,
  { headers: { "User-Agent": "schematic-3d-lab/1.0 (tech demo)" } },
);
if (!res.ok) throw new Error(`OSM API ${res.status}`);
const data = (await res.json()) as { elements: (OsmNode | OsmWay)[] };

const nodes = new Map<number, [number, number]>();
for (const e of data.elements)
  if (e.type === "node") nodes.set(e.id, [e.lat, e.lon]);

const ways = data.elements.filter(
  (e): e is OsmWay => e.type === "way" && !!e.tags?.building,
);

const sapd = ways.find((w) => w.id === SAPD_WAY_ID);
if (!sapd) throw new Error("SAPD footprint not found in extract");

const centroid = (w: OsmWay) => {
  const pts = w.nodes.map((n) => nodes.get(n)!);
  return [
    pts.reduce((s, p) => s + p[0], 0) / pts.length,
    pts.reduce((s, p) => s + p[1], 0) / pts.length,
  ] as const;
};
const [clat, clon] = centroid(sapd);
const M_PER_DEG = 111320;
const cosLat = Math.cos((clat * Math.PI) / 180);
// Local ENU-ish frame: x = meters east, y = meters north of the SAPD centroid.
const toLocal = ([lat, lon]: [number, number]) => [
  +((lon - clon) * M_PER_DEG * cosLat).toFixed(2),
  +((lat - clat) * M_PER_DEG).toFixed(2),
];

const buildings = ways
  .map((w) => {
    const [wlat, wlon] = centroid(w);
    const [dx, dy] = toLocal([wlat, wlon]);
    const dist = Math.hypot(dx, dy);
    const est = HEIGHT_ESTIMATES[w.id];
    const osmHeight = w.tags?.height ? parseFloat(w.tags.height) : undefined;
    return {
      id: w.id,
      dist,
      name: w.tags?.name ?? null,
      kind: est?.kind ?? "context",
      height: osmHeight ?? est?.h ?? DEFAULT_CONTEXT_HEIGHT,
      heightSource: osmHeight ? "osm" : est ? "estimate" : "default",
      // drop the closing duplicate node
      footprint: w.nodes.slice(0, -1).map((n) => toLocal(nodes.get(n)!)),
    };
  })
  .filter((b) => b.kind !== "context" || b.dist <= CONTEXT_RADIUS_M)
  .sort((a, b) => a.dist - b.dist)
  .map((b) => ({
    id: b.id,
    name: b.name,
    kind: b.kind,
    height: b.height,
    heightSource: b.heightSource,
    footprint: b.footprint,
  }));

const out = {
  site: "Santa Ana Police Department / Civic Center",
  address: "60 Civic Center Plaza, Santa Ana, CA 92701",
  origin: { lat: +clat.toFixed(7), lon: +clon.toFixed(7) },
  attribution:
    "Building footprints © OpenStreetMap contributors (ODbL 1.0), extracted from api.openstreetmap.org. Exterior footprints only; no interior data.",
  buildings,
};

await Bun.write(
  new URL("../src/data/civic-center.json", import.meta.url),
  JSON.stringify(out, null, 1),
);
console.log(`Wrote ${buildings.length} buildings (origin ${clat}, ${clon})`);
