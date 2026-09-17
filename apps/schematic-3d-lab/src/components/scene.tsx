"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import site from "@/data/civic-center.json";

type Building = (typeof site.buildings)[number];
type BuildingKind = "police" | "jail" | "parking" | "context";
type Footprint = number[][];
export type MorphState = { target: number; smooth: number };
type MorphRef = MutableRefObject<MorphState>;

const PAPER = "#d8d2c0";
const INK = "#4a4436";
const GROUND_Y = -0.4;
const PLAZA_Y = -0.2;
const PLANT_Y = 0.15;

type MaterialSpec = {
  wall: string;
  roof: string;
  ink: string;
  roughness: number;
  /** One horizontal band per floor (glazing strip / open deck), repeated up the facade. */
  band?: { color: string; frac: number; floor: number; mullion?: number };
  /** Parapet inset in metres, drawn as an inner ink outline on the roof. */
  parapet?: number;
  /** Tile faint parking-stall hatching over the roof. */
  stalls?: boolean;
};

const MATERIALS: Record<BuildingKind, MaterialSpec> = {
  police: {
    wall: "#c9b691",
    roof: "#d4c8ae",
    ink: INK,
    roughness: 0.85,
    band: { color: "#7f8b8f", frac: 0.38, floor: 4, mullion: 3 },
    parapet: 1.4,
  },
  jail: {
    wall: "#a4a8a1",
    roof: "#b8bbb2",
    ink: INK,
    roughness: 0.9,
    band: { color: "#767d80", frac: 0.14, floor: 4 },
    parapet: 1.4,
  },
  parking: {
    wall: "#cdc4b3",
    roof: "#c7bfae",
    ink: INK,
    roughness: 0.95,
    band: { color: "#655d52", frac: 0.56, floor: 3, mullion: 8 },
    parapet: 1.2,
    stalls: true,
  },
  context: { wall: "#e0d9c6", roof: "#e8e2d1", ink: "#8b8270", roughness: 1 },
};

const kindOf = (b: Building): BuildingKind =>
  b.kind in MATERIALS ? (b.kind as BuildingKind) : "context";

function canvasTexture(draw: (g: CanvasRenderingContext2D, size: number) => void, size = 256) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Facade tile = one floor (`floor` m tall, `mullion` m wide); UVs on extrusion sides are metres. */
function facadeTexture(spec: MaterialSpec) {
  const band = spec.band!;
  const t = canvasTexture((g, s) => {
    g.fillStyle = spec.wall;
    g.fillRect(0, 0, s, s);
    g.fillStyle = band.color;
    const h = Math.round(s * band.frac);
    g.fillRect(0, Math.round(s * 0.28), s, h);
    if (band.mullion) {
      g.fillStyle = "rgba(60, 55, 45, 0.45)";
      g.fillRect(0, Math.round(s * 0.28), 6, h);
    }
    g.fillStyle = "rgba(60, 55, 45, 0.18)";
    g.fillRect(0, 0, s, 4);
  });
  t.repeat.set(1 / (band.mullion ?? 4), 1 / band.floor);
  return t;
}

/** Roof tile = 24 m: two rows of 2.7 m stalls either side of a drive aisle; cap UVs are metres. */
function stallTexture(base: string) {
  const tile = 24;
  const t = canvasTexture((g, s) => {
    const px = s / tile;
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.globalAlpha = 0.14;
    for (const [y0, y1] of [
      [1, 6.5],
      [17.5, 23],
    ]) {
      g.beginPath();
      for (let x = 0.5; x < tile; x += 2.7) {
        g.moveTo(Math.round(x * px) + 0.5, y0 * px);
        g.lineTo(Math.round(x * px) + 0.5, y1 * px);
      }
      g.moveTo(0, Math.round(y0 * px) + 0.5);
      g.lineTo(s, Math.round(y0 * px) + 0.5);
      g.moveTo(0, Math.round(y1 * px) + 0.5);
      g.lineTo(s, Math.round(y1 * px) + 0.5);
      g.stroke();
    }
  }, 512);
  t.repeat.set(1 / tile, 1 / tile);
  return t;
}

function gridTexture(base: string, cells: number, alpha: number) {
  return canvasTexture((g, s) => {
    g.fillStyle = base;
    g.fillRect(0, 0, s, s);
    g.strokeStyle = INK;
    g.lineWidth = 2;
    g.globalAlpha = alpha;
    for (let i = 1; i < cells; i++) {
      const p = Math.round((i * s) / cells) + 0.5;
      g.beginPath();
      g.moveTo(p, 0);
      g.lineTo(p, s);
      g.moveTo(0, p);
      g.lineTo(s, p);
      g.stroke();
    }
    g.globalAlpha = alpha * 1.8;
    g.strokeRect(1, 1, s - 2, s - 2);
  });
}

type KindMaterials = { mesh: [THREE.Material, THREE.Material]; ink: THREE.Material };

function buildMaterials(): Record<BuildingKind, KindMaterials> {
  const out = {} as Record<BuildingKind, KindMaterials>;
  for (const kind of Object.keys(MATERIALS) as BuildingKind[]) {
    const spec = MATERIALS[kind];
    // Polygon offset pushes faces back a hair so ink outlines and parapet lines win the depth test.
    const offset = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
    const roof = new THREE.MeshStandardMaterial({
      color: spec.stalls ? "#ffffff" : spec.roof,
      map: spec.stalls ? stallTexture(spec.roof) : null,
      roughness: spec.roughness,
      ...offset,
    });
    const wall = new THREE.MeshStandardMaterial({
      color: spec.band ? "#ffffff" : spec.wall,
      map: spec.band ? facadeTexture(spec) : null,
      roughness: spec.roughness,
      ...offset,
    });
    // ExtrudeGeometry groups: 0 = caps, 1 = side walls.
    out[kind] = { mesh: [roof, wall], ink: new THREE.LineBasicMaterial({ color: spec.ink }) };
  }
  return out;
}

// Plan coords are [east, north] metres; scene x = east, z = -north.
const centroid = (fp: Footprint): [number, number] => [
  fp.reduce((s, p) => s + p[0], 0) / fp.length,
  fp.reduce((s, p) => s + p[1], 0) / fp.length,
];

const signedArea = (fp: Footprint) =>
  fp.reduce((s, [x1, y1], i) => {
    const [x2, y2] = fp[(i + 1) % fp.length];
    return s + x1 * y2 - x2 * y1;
  }, 0) / 2;
const area = (fp: Footprint) => Math.abs(signedArea(fp));

/** Miter offset: push every edge inward by `d` and re-intersect neighbouring edges. */
function insetPolygon(fp: Footprint, d: number): Footprint {
  const n = fp.length;
  const inward = signedArea(fp) > 0 ? 1 : -1;
  const lines = fp.map(([ax, ay], i) => {
    const [bx, by] = fp[(i + 1) % n];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = (-(by - ay) / len) * inward;
    const ny = ((bx - ax) / len) * inward;
    return { nx, ny, c: ax * nx + ay * ny + d };
  });
  return fp.map(([x, y], i) => {
    const a = lines[(i - 1 + n) % n];
    const b = lines[i];
    const det = a.nx * b.ny - a.ny * b.nx;
    if (Math.abs(det) < 1e-3) return [x + b.nx * d, y + b.ny * d];
    return [(a.c * b.ny - b.c * a.ny) / det, (a.nx * b.c - b.nx * a.c) / det];
  });
}

function pointInPolygon(fp: Footprint, x: number, y: number) {
  let inside = false;
  for (let i = 0, j = fp.length - 1; i < fp.length; j = i++) {
    const [xi, yi] = fp[i];
    const [xj, yj] = fp[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function distanceToPolygon(fp: Footprint, x: number, y: number) {
  let best = Infinity;
  for (let i = 0, j = fp.length - 1; i < fp.length; j = i++) {
    const [ax, ay] = fp[i];
    const [bx, by] = fp[j];
    const l2 = (bx - ax) ** 2 + (by - ay) ** 2;
    const t = l2 ? THREE.MathUtils.clamp(((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / l2, 0, 1) : 0;
    best = Math.min(best, Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))));
  }
  return best;
}

function shapeFrom(fp: Footprint) {
  const shape = new THREE.Shape();
  fp.forEach(([x, y], i) => (i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y)));
  shape.closePath();
  return shape;
}

const MAX_DIST = 160;
const STAGGER = 0.35;

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** Per-object morph: nearer objects rise first for a wave effect. */
function localMorph(smooth: number, dist: number) {
  const norm = Math.min(dist / MAX_DIST, 1);
  const t = THREE.MathUtils.clamp(smooth * (1 + STAGGER) - STAGGER * norm, 0, 1);
  return smoothstep(t);
}

const PLAZA: Footprint = [
  [-92, -128],
  [84, -128],
  [84, 60],
  [-92, 60],
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Planter = { x: number; y: number; w: number; d: number };
const planterLength = mulberry32(7);
const vary = (w: number) => w * (0.6 + 0.8 * planterLength());
const PLANTERS: Planter[] = [
  ...[30, 5, -20, -45, -70, -95].map((y) => ({ x: 62, y, w: vary(12), d: 2.4 })),
  ...[-62, -30, 2, 34].map((x) => ({ x, y: 53, w: vary(14), d: 2.4 })),
];
const planterFootprint = ({ x, y, w, d }: Planter): Footprint => [
  [x - w / 2, y - d / 2],
  [x + w / 2, y - d / 2],
  [x + w / 2, y + d / 2],
  [x - w / 2, y + d / 2],
];

type Tree = { x: number; z: number; scale: number; tone: number };

const SPECIMEN: [number, number] = [1.6, 2];
/** Planting zones as [x0, x1, y0, y1, candidates, canopy scale range] in plan metres. */
const PLANTING: [number, number, number, number, number, [number, number]?][] = [
  // Specimen trees claim the plaza corners before the general planting runs.
  [-90, -72, 40, 58, 2, SPECIMEN],
  [64, 82, 40, 58, 2, SPECIMEN],
  [-90, -72, -126, -108, 1, SPECIMEN],
  [62, 82, -126, -108, 1, SPECIMEN],
  [-88, 80, 45, 58, 20],
  [44, 80, -122, 42, 22],
  [-104, -96, -120, 60, 10],
  [-88, 80, -140, -130, 12],
  [-150, -100, -100, 60, 8],
  [30, 110, 70, 150, 10],
  [-70, 20, 116, 150, 8],
];

function plantTrees(seed: number): Tree[] {
  const rand = mulberry32(seed);
  const obstacles = [...site.buildings.map((b) => b.footprint), ...PLANTERS.map(planterFootprint)];
  const trees: Tree[] = [];
  for (const [x0, x1, y0, y1, n, range = [0.7, 1.3]] of PLANTING) {
    for (let i = 0; i < n; i++) {
      const x = THREE.MathUtils.lerp(x0, x1, rand());
      const y = THREE.MathUtils.lerp(y0, y1, rand());
      const scale = THREE.MathUtils.lerp(range[0], range[1], rand());
      const tone = rand();
      const blocked =
        obstacles.some((fp) => pointInPolygon(fp, x, y) || distanceToPolygon(fp, x, y) < 4) ||
        trees.some((t) => Math.hypot(t.x - x, -t.z - y) < 3 * (t.scale + scale));
      if (!blocked) trees.push({ x, z: -y, scale, tone });
    }
  }
  return trees;
}

const TREES = plantTrees(1337);

type Shrub = { x: number; z: number; r: number; tone: number };
/** Low shrub clusters as [x, y, count]: foundation planting at the jail's east entry and SAPD's south courts. */
const SHRUB_CLUSTERS: [number, number, number][] = [
  [38, -88, 5],
  [40, -104, 4],
  [-16, -57, 4],
  [18, -60, 4],
];

function plantShrubs(seed: number): Shrub[] {
  const rand = mulberry32(seed);
  return SHRUB_CLUSTERS.flatMap(([cx, cy, n]) =>
    Array.from({ length: n }, () => ({
      x: cx + (rand() - 0.5) * 7,
      z: -(cy + (rand() - 0.5) * 3),
      r: 0.9 + rand() * 0.7,
      tone: rand(),
    })),
  );
}

const SHRUBS = plantShrubs(41);
const SHRUB_TONES = ["#5f7a3e", "#728a4f", "#87955c"];
const CANOPY_TONES = ["#7d8a4a", "#98a274", "#6b8a48", "#8a9660"];
/** Canopy blobs as [dx, dy, dz, radius] in units of the tree's canopy radius; dy is above the trunk top. */
const BLOBS: [number, number, number, number][] = [
  [0, 0.7, 0, 1],
  [0.55, 1.1, 0.25, 0.68],
  [-0.5, 1.25, -0.3, 0.6],
];

type Annotation = {
  title: string;
  sub?: string;
  anchor: [number, number];
  /** Metres the anchor rises to at full extrude (roof height, 0 for ground). */
  height: number;
  /** Leader elbow offset from the anchor in px: [right, up]. The label sits on the elbow. */
  lead: [number, number];
  /** Length in px of a final horizontal run into the label (elbow leader). */
  run?: number;
};

const byKind = (kind: BuildingKind) => site.buildings.filter((b) => b.kind === kind);
const police = byKind("police")[0];
const jail = byKind("jail")[0];
const parking = byKind("parking").sort((a, b) => area(b.footprint) - area(a.footprint))[0];

type RoofBlock = { x: number; y: number; w: number; d: number; h: number };
/** Rooftop mechanical blocks by building id, in plan metres. */
const ROOF_BLOCKS: Record<number, RoofBlock[]> = {
  [police.id]: [
    { x: 10, y: -30, w: 10, d: 6, h: 2.8 },
    { x: -6, y: 20, w: 6, d: 5, h: 2.2 },
  ],
};

// Lead offsets are tuned against the deterministic camera path so no label sits on trees, buildings,
// another label or its leader at morph 0, 0.5 or 1.
const ANNOTATIONS: Annotation[] = [
  {
    title: police.name ?? "Police Department",
    sub: site.address,
    anchor: centroid(police.footprint),
    height: police.height,
    lead: [-8, 150],
  },
  {
    title: jail.name ?? "City Jail",
    anchor: centroid(jail.footprint),
    height: jail.height,
    lead: [-48, -138],
  },
  {
    title: "Parking Structure",
    anchor: centroid(parking.footprint),
    height: parking.height,
    lead: [96, -58],
    run: 24,
  },
  // Anchored on the open paving west of the jail, clear of the hedge planters.
  { title: "Civic Center Plaza", anchor: [-80, -70], height: 0, lead: [-112, 10] },
];

function BuildingMesh({
  b,
  mats,
  morphRef,
}: {
  b: Building;
  mats: KindMaterials;
  morphRef: MorphRef;
}) {
  const inner = useRef<THREE.Group>(null);
  const { geometry, edges, parapet, blocks, dist } = useMemo(() => {
    const geometry = new THREE.ExtrudeGeometry(shapeFrom(b.footprint), {
      depth: b.height,
      bevelEnabled: false,
    });
    const inset = MATERIALS[kindOf(b)].parapet;
    return {
      geometry,
      edges: new THREE.EdgesGeometry(geometry, 20),
      parapet: inset
        ? new THREE.BufferGeometry().setFromPoints(
            insetPolygon(b.footprint, inset).map(([x, y]) => new THREE.Vector3(x, y, b.height)),
          )
        : null,
      blocks: (ROOF_BLOCKS[b.id] ?? []).map((blk) => {
        const box = new THREE.BoxGeometry(blk.w, blk.d, blk.h).translate(blk.x, blk.y, b.height + blk.h / 2);
        return { box, edges: new THREE.EdgesGeometry(box) };
      }),
      dist: Math.hypot(...centroid(b.footprint)),
    };
  }, [b]);

  useFrame(() => {
    if (inner.current)
      inner.current.scale.z = Math.max(localMorph(morphRef.current.smooth, dist), 0.002);
  });

  return (
    // Shape is built in the XY (east/north) plane; rotate into XZ, extrude up.
    <group rotation-x={-Math.PI / 2}>
      <group ref={inner}>
        <mesh geometry={geometry} material={mats.mesh} castShadow receiveShadow />
        <lineSegments geometry={edges} material={mats.ink} />
        {parapet && <lineLoop geometry={parapet} material={mats.ink} />}
        {blocks.map((blk, i) => (
          <group key={i}>
            <mesh geometry={blk.box} material={mats.mesh[0]} castShadow />
            <lineSegments geometry={blk.edges} material={mats.ink} />
          </group>
        ))}
      </group>
    </group>
  );
}

function Leader({ a, morphRef }: { a: Annotation; morphRef: MorphRef }) {
  const group = useRef<THREE.Group>(null);
  const dist = Math.hypot(...a.anchor);
  const [dx, dy] = a.lead;
  const elbow = a.run ? `L${dx + (dx >= 0 ? -a.run : a.run)} ${-dy} ` : "";

  useFrame(() => {
    if (group.current)
      group.current.position.y = a.height * localMorph(morphRef.current.smooth, dist) + 0.3;
  });

  return (
    <group ref={group} position={[a.anchor[0], 0.3, -a.anchor[1]]}>
      <Html zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div className="relative h-0 w-0 select-none" data-anchor={a.title}>
          <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1}>
            <circle r={2.5} fill={INK} />
            <path d={`M0 0 ${elbow}L${dx} ${-dy}`} stroke={INK} strokeWidth={1} fill="none" />
          </svg>
          <div
            data-label={a.title}
            className="absolute whitespace-nowrap border-b border-[#4a4436] bg-[#e6e0cf]/85 px-1.5 pb-0.5 pt-1 font-mono text-[9px] uppercase leading-tight tracking-[0.14em] text-[#3f3a2e]"
            style={dx >= 0 ? { left: dx, bottom: dy } : { right: -dx, bottom: dy }}
          >
            {a.title}
            {a.sub && <div className="text-[7.5px] tracking-[0.08em] text-[#6f6757]">{a.sub}</div>}
          </div>
        </div>
      </Html>
    </group>
  );
}

/** Soft radial contact-shade decal, tinted by the material colour. */
function shadeTexture() {
  const t = canvasTexture((g, s) => {
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.45, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  }, 128);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

/** Horizontal direction shadows fall in (light comes from the north-west). */
const SHADOW_DIR: [number, number] = [0.81, 0.58];

function Trees({ morphRef }: { morphRef: MorphRef }) {
  const trunk = useRef<THREE.InstancedMesh>(null);
  const canopy = useRef<THREE.InstancedMesh>(null);
  const shade = useRef<THREE.InstancedMesh>(null);
  const shrub = useRef<THREE.InstancedMesh>(null);
  const last = useRef(-1);
  const { trunkGeo, canopyGeo, shadeGeo, shadeMap, m4, pos, scl, q } = useMemo(
    () => ({
      trunkGeo: new THREE.CylinderGeometry(0.7, 1, 1, 6).translate(0, 0.5, 0),
      canopyGeo: new THREE.IcosahedronGeometry(1, 1),
      shadeGeo: new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2),
      shadeMap: shadeTexture(),
      m4: new THREE.Matrix4(),
      pos: new THREE.Vector3(),
      scl: new THREE.Vector3(),
      q: new THREE.Quaternion(),
    }),
    [],
  );

  useEffect(() => {
    const color = new THREE.Color();
    TREES.forEach((t, i) =>
      BLOBS.forEach((_, j) => {
        color.set(CANOPY_TONES[Math.floor(t.tone * CANOPY_TONES.length)]);
        color.offsetHSL(0, 0, (j - 1) * 0.03 + (t.tone - 0.5) * 0.04);
        canopy.current!.setColorAt(i * BLOBS.length + j, color);
      }),
    );
    canopy.current!.instanceColor!.needsUpdate = true;
    SHRUBS.forEach((s, i) => {
      color.set(SHRUB_TONES[Math.floor(s.tone * SHRUB_TONES.length)]);
      shrub.current!.setColorAt(i, color);
    });
    shrub.current!.instanceColor!.needsUpdate = true;
  }, []);

  useFrame(() => {
    const s = morphRef.current.smooth;
    if (Math.abs(s - last.current) < 1e-4 || !trunk.current || !canopy.current) return;
    last.current = s;
    TREES.forEach((t, i) => {
      const m = Math.max(localMorph(s, Math.hypot(t.x, t.z)), 0.002);
      const trunkH = 3 * t.scale;
      const R = 3.4 * t.scale;
      m4.compose(pos.set(t.x, PLANT_Y, t.z), q, scl.set(0.3 * t.scale, trunkH * m, 0.3 * t.scale));
      trunk.current!.setMatrixAt(i, m4);
      BLOBS.forEach(([bx, by, bz, br], j) => {
        const r = br * R;
        m4.compose(
          pos.set(t.x + bx * R, PLANT_Y + (trunkH + by * R) * m, t.z + bz * R),
          q,
          scl.set(r, r * 0.72 * m, r),
        );
        canopy.current!.setMatrixAt(i * BLOBS.length + j, m4);
      });
      // Contact shade stays hidden under the flat canopy in plan and slides south-east as the tree rises.
      const sr = R * (1 + 0.4 * m);
      m4.compose(
        pos.set(t.x + SHADOW_DIR[0] * R * 0.3 * m, PLANT_Y - 0.03, t.z + SHADOW_DIR[1] * R * 0.3 * m),
        q,
        scl.set(sr, 1, sr),
      );
      shade.current!.setMatrixAt(i, m4);
    });
    SHRUBS.forEach((b, i) => {
      const m = Math.max(localMorph(s, Math.hypot(b.x, b.z)), 0.002);
      m4.compose(pos.set(b.x, PLANT_Y, b.z), q, scl.set(b.r, b.r * 0.65 * m, b.r));
      shrub.current!.setMatrixAt(i, m4);
    });
    trunk.current.instanceMatrix.needsUpdate = true;
    canopy.current.instanceMatrix.needsUpdate = true;
    shade.current!.instanceMatrix.needsUpdate = true;
    shrub.current!.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={trunk} args={[trunkGeo, undefined, TREES.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial color="#5b4a36" roughness={1} />
      </instancedMesh>
      <instancedMesh
        ref={canopy}
        args={[canopyGeo, undefined, TREES.length * BLOBS.length]}
        castShadow
        receiveShadow
        frustumCulled={false}
      >
        <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
      </instancedMesh>
      <instancedMesh ref={shade} args={[shadeGeo, undefined, TREES.length]} frustumCulled={false}>
        <meshBasicMaterial map={shadeMap} color="#4d3f2a" transparent opacity={0.38} depthWrite={false} />
      </instancedMesh>
      <instancedMesh ref={shrub} args={[canopyGeo, undefined, SHRUBS.length]} castShadow frustumCulled={false}>
        <meshStandardMaterial color="#ffffff" roughness={1} flatShading />
      </instancedMesh>
    </>
  );
}

function Planters({ morphRef }: { morphRef: MorphRef }) {
  const group = useRef<THREE.Group>(null);
  const { geo, mats } = useMemo(() => {
    const side = new THREE.MeshStandardMaterial({ color: "#bfb39c", roughness: 1 });
    const hedge = new THREE.MeshStandardMaterial({ color: "#6f8447", roughness: 1 });
    return {
      geo: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
      // BoxGeometry groups: +x, -x, +y (top), -y, +z, -z.
      mats: [side, side, hedge, side, side, side],
    };
  }, []);

  useFrame(() => {
    group.current?.children.forEach((c) => {
      c.scale.y = Math.max(localMorph(morphRef.current.smooth, Math.hypot(c.position.x, c.position.z)), 0.002);
    });
  });

  return (
    <group ref={group}>
      {PLANTERS.map((p, i) => (
        <mesh
          key={i}
          geometry={geo}
          material={mats}
          position={[p.x, PLANT_Y, -p.y]}
          scale={[p.w, 1, p.d]}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}

/** Site grid drawn once over a finite plot, dissolving radially so the far field reads as plain paper. */
const GRID_PLOT = { size: 1040, center: [0, 30] as [number, number], full: 220, fade: 500 };

function gridPlotTexture() {
  const t = canvasTexture((g, s) => {
    const px = s / GRID_PLOT.size;
    g.strokeStyle = INK;
    g.lineWidth = 2;
    for (let m = 20; m < GRID_PLOT.size; m += 20) {
      const p = Math.round(m * px) + 0.5;
      g.globalAlpha = m % 100 === 0 ? 0.13 : 0.06;
      g.beginPath();
      g.moveTo(p, 0);
      g.lineTo(p, s);
      g.moveTo(0, p);
      g.lineTo(s, p);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = "destination-in";
    const fall = g.createRadialGradient(s / 2, s / 2, GRID_PLOT.full * px, s / 2, s / 2, GRID_PLOT.fade * px);
    fall.addColorStop(0, "rgba(0,0,0,1)");
    fall.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = fall;
    g.fillRect(0, 0, s, s);
  }, 2048);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

function Ground() {
  const { grid, plaza, plazaGeo } = useMemo(() => {
    const plaza = gridTexture("#e3ddcc", 1, 0.1);
    plaza.repeat.set(1 / 8, 1 / 8);
    return { grid: gridPlotTexture(), plaza, plazaGeo: new THREE.ShapeGeometry(shapeFrom(PLAZA)) };
  }, []);
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position-y={GROUND_Y} receiveShadow>
        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial color="#d1c8ae" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[GRID_PLOT.center[0], GROUND_Y + 0.02, GRID_PLOT.center[1]]}>
        <planeGeometry args={[GRID_PLOT.size, GRID_PLOT.size]} />
        <meshBasicMaterial map={grid} transparent depthWrite={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={PLAZA_Y} geometry={plazaGeo} receiveShadow>
        <meshStandardMaterial map={plaza} roughness={1} />
      </mesh>
    </>
  );
}

/**
 * Narrow FOV for an axonometric feel. The m = 0 radius is scaled ~2.2x to keep the plan framing;
 * the m = 1 radius is pulled back further so the jail and the parking structure both sit inside
 * the frame with a paper margin.
 */
const FOV = 19;
const PATH_RADIUS: [number, number] = [935, 880];
/** Plan point the camera looks at; south-east of the origin so the jail and east parking share the frame. */
const LOOK_AT: [number, number] = [15, 30];

/** Camera path on a sphere around LOOK_AT; the slight southward tilt at m = 0 keeps north up. */
function pathPosition(m: number, out: THREE.Vector3) {
  const r = THREE.MathUtils.lerp(PATH_RADIUS[0], PATH_RADIUS[1], m);
  const phi = THREE.MathUtils.lerp(0.03, 0.84, m); // polar angle from zenith
  const theta = THREE.MathUtils.lerp(0, 0.6, m);
  return out.set(
    LOOK_AT[0] + r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
    LOOK_AT[1] + r * Math.sin(phi) * Math.cos(theta),
  );
}

const CAMERA_START = pathPosition(0, new THREE.Vector3());
/** Metres spanned by the canvas height in the flat plan view (m = 0). */
export const PLAN_VIEW_HEIGHT_M = 2 * PATH_RADIUS[0] * Math.tan((FOV / 2) * (Math.PI / 180));

/** Drives morph smoothing and the 2D→3D camera path; hands off to orbit at the end. */
function Rig({
  morphRef,
  controlsRef,
}: {
  morphRef: MorphRef;
  controlsRef: MutableRefObject<OrbitControlsImpl | null>;
}) {
  const { camera } = useThree();
  const goal = useMemo(() => new THREE.Vector3(), []);
  const orbiting = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    // Dev-only hook for the headless annotation-collision check (projects trees/planters per morph state).
    Object.assign(window, {
      __sheet: {
        camera,
        TREES,
        PLANTERS,
        PLANT_Y,
        get smooth() {
          return morphRef.current.smooth;
        },
      },
    });
  }, [camera, morphRef]);

  useEffect(() => {
    // Start on the path so a pre-set morph (?morph=1) doesn't lerp in from the default camera.
    const m = smoothstep(THREE.MathUtils.clamp(morphRef.current.smooth, 0, 1));
    camera.position.copy(pathPosition(m, goal));
    camera.lookAt(LOOK_AT[0], 8 * m, LOOK_AT[1]);
  }, [camera, goal, morphRef]);

  useFrame((_, dt) => {
    const s = morphRef.current;
    s.smooth = THREE.MathUtils.damp(s.smooth, s.target, 5, dt);
    const m = smoothstep(THREE.MathUtils.clamp(s.smooth, 0, 1));
    pathPosition(m, goal);

    // Hand off to orbit past 0.93 only once the camera has arrived, so one slow frame that jumps
    // the morph past the threshold cannot strand the camera at the top-down view.
    if (s.target < 0.93) orbiting.current = false;
    else if (s.smooth > 0.93 && camera.position.distanceTo(goal) < 1) orbiting.current = true;
    if (controlsRef.current) controlsRef.current.enabled = orbiting.current;
    if (orbiting.current) return;

    camera.position.lerp(goal, 1 - Math.exp(-8 * dt));
    camera.lookAt(LOOK_AT[0], 8 * m, LOOK_AT[1]);
  });
  return null;
}

/** 0–50–100 m bar matching the flat plan's scale; fades as the sheet tilts into 3D. */
function ScaleBar({ morphRef }: { morphRef: MorphRef }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const h = el.parentElement?.clientHeight ?? 600;
        el.style.width = `${(100 * h) / PLAN_VIEW_HEIGHT_M}px`;
        el.style.opacity = String(1 - THREE.MathUtils.smoothstep(morphRef.current.smooth, 0.05, 0.4));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [morphRef]);
  return (
    <div
      ref={ref}
      className="pointer-events-none absolute bottom-8 right-3 z-20 font-mono text-[8px] uppercase tracking-[0.14em] text-[#6f6757]"
    >
      <div className="flex justify-between leading-none">
        <span>0</span>
        <span>50</span>
        <span>100 m</span>
      </div>
      <div className="mt-0.5 flex h-1.5 border border-[#4a4436]">
        <div className="w-1/2 bg-[#4a4436]" />
      </div>
    </div>
  );
}

export function Scene({ morphRef }: { morphRef: MorphRef }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const materials = useMemo(() => buildMaterials(), []);
  return (
    <>
      <Canvas
        flat
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ position: CAMERA_START.toArray(), fov: FOV, near: 40, far: 3500 }}
      >
        <color attach="background" args={[PAPER]} />
        <fog attach="fog" args={[PAPER, 1000, 2000]} />
        <hemisphereLight args={["#fff3dc", "#b39c74", 1.1]} />
        <ambientLight color="#efdab4" intensity={0.3} />
        {/* Key light from the north-west so shadows fall south-east, towards the axonometric camera. */}
        <directionalLight
          color="#fff1d6"
          position={[-140, 260, -100]}
          intensity={2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-radius={10}
          shadow-intensity={0.75}
          shadow-bias={-0.0004}
          shadow-normalBias={0.05}
        >
          <orthographicCamera attach="shadow-camera" args={[-230, 230, 230, -230, 10, 900]} />
        </directionalLight>
        {/* Low fill from the camera side lifts the shaded south/east facades without touching shadow contrast. */}
        <directionalLight color="#f6e9d2" position={[220, 110, 260]} intensity={0.7} />
        <Ground />
        {site.buildings.map((b) => (
          <BuildingMesh key={b.id} b={b} mats={materials[kindOf(b)]} morphRef={morphRef} />
        ))}
        <Planters morphRef={morphRef} />
        <Trees morphRef={morphRef} />
        {ANNOTATIONS.map((a) => (
          <Leader key={a.title} a={a} morphRef={morphRef} />
        ))}
        <Rig morphRef={morphRef} controlsRef={controlsRef} />
        <OrbitControls
          ref={controlsRef}
          enabled={false}
          enablePan
          minDistance={180}
          maxDistance={1500}
          maxPolarAngle={Math.PI / 2.1}
          target={[LOOK_AT[0], 8, LOOK_AT[1]]}
        />
      </Canvas>
      <ScaleBar morphRef={morphRef} />
    </>
  );
}
