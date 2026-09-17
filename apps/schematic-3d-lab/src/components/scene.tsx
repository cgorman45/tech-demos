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
};

const MATERIALS: Record<BuildingKind, MaterialSpec> = {
  police: {
    wall: "#c9b691",
    roof: "#d4c8ae",
    ink: INK,
    roughness: 0.85,
    band: { color: "#7f8b8f", frac: 0.38, floor: 4, mullion: 3 },
  },
  jail: {
    wall: "#a4a8a1",
    roof: "#b8bbb2",
    ink: INK,
    roughness: 0.9,
    band: { color: "#767d80", frac: 0.14, floor: 4 },
  },
  parking: {
    wall: "#bdb4a3",
    roof: "#c7bfae",
    ink: INK,
    roughness: 0.95,
    band: { color: "#867d70", frac: 0.5, floor: 3, mullion: 8 },
  },
  context: { wall: "#e0d9c6", roof: "#e8e2d1", ink: "#8b8270", roughness: 1 },
};

const kindOf = (b: Building): BuildingKind =>
  b.kind in MATERIALS ? (b.kind as BuildingKind) : "context";

function canvasTexture(draw: (g: CanvasRenderingContext2D, size: number) => void) {
  const size = 256;
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
    const roof = new THREE.MeshStandardMaterial({ color: spec.roof, roughness: spec.roughness });
    const wall = new THREE.MeshStandardMaterial({
      color: spec.band ? "#ffffff" : spec.wall,
      map: spec.band ? facadeTexture(spec) : null,
      roughness: spec.roughness,
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

const area = (fp: Footprint) =>
  Math.abs(
    fp.reduce((s, [x1, y1], i) => {
      const [x2, y2] = fp[(i + 1) % fp.length];
      return s + x1 * y2 - x2 * y1;
    }, 0) / 2,
  );

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

type Planter = { x: number; y: number; w: number; d: number };
const PLANTERS: Planter[] = [
  ...[30, 5, -20, -45, -70, -95].map((y) => ({ x: 62, y, w: 12, d: 2.4 })),
  ...[-62, -30, 2, 34].map((x) => ({ x, y: 53, w: 14, d: 2.4 })),
];
const planterFootprint = ({ x, y, w, d }: Planter): Footprint => [
  [x - w / 2, y - d / 2],
  [x + w / 2, y - d / 2],
  [x + w / 2, y + d / 2],
  [x - w / 2, y + d / 2],
];

type Tree = { x: number; z: number; scale: number; tone: number };

/** Planting zones as [x0, x1, y0, y1, candidates] in plan metres. */
const PLANTING: [number, number, number, number, number][] = [
  [-88, 80, 45, 58, 20],
  [44, 80, -122, 42, 22],
  [-104, -96, -120, 60, 10],
  [-88, 80, -140, -130, 12],
  [-150, -100, -100, 60, 8],
  [30, 110, 70, 150, 10],
  [-70, 20, 116, 150, 8],
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

function plantTrees(seed: number): Tree[] {
  const rand = mulberry32(seed);
  const obstacles = [...site.buildings.map((b) => b.footprint), ...PLANTERS.map(planterFootprint)];
  const trees: Tree[] = [];
  for (const [x0, x1, y0, y1, n] of PLANTING) {
    for (let i = 0; i < n; i++) {
      const x = THREE.MathUtils.lerp(x0, x1, rand());
      const y = THREE.MathUtils.lerp(y0, y1, rand());
      const scale = 0.8 + rand() * 0.5;
      const tone = rand();
      const blocked =
        obstacles.some((fp) => pointInPolygon(fp, x, y) || distanceToPolygon(fp, x, y) < 4) ||
        trees.some((t) => Math.hypot(t.x - x, -t.z - y) < 6);
      if (!blocked) trees.push({ x, z: -y, scale, tone });
    }
  }
  return trees;
}

const TREES = plantTrees(1337);
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
};

const byKind = (kind: BuildingKind) => site.buildings.filter((b) => b.kind === kind);
const police = byKind("police")[0];
const jail = byKind("jail")[0];
const parking = byKind("parking").sort((a, b) => area(b.footprint) - area(a.footprint))[0];
// The parking deck is wide and off to the east; anchor between its centroid and its campus-side edge.
const parkingCentroid = centroid(parking.footprint);
const parkingNearEdge = parking.footprint.reduce((a, p) => (Math.hypot(...p) < Math.hypot(...a) ? p : a));

const ANNOTATIONS: Annotation[] = [
  {
    title: police.name ?? "Police Department",
    sub: site.address,
    anchor: centroid(police.footprint),
    height: police.height,
    lead: [80, 64],
  },
  {
    title: jail.name ?? "City Jail",
    anchor: centroid(jail.footprint),
    height: jail.height,
    lead: [-70, 56],
  },
  {
    title: "Parking Structure",
    anchor: [
      (parkingCentroid[0] + parkingNearEdge[0]) / 2,
      (parkingCentroid[1] + parkingNearEdge[1]) / 2,
    ],
    height: parking.height,
    lead: [40, 72],
  },
  { title: "Civic Center Plaza", anchor: [60, -20], height: 0, lead: [50, -40] },
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
  const { geometry, edges, dist } = useMemo(() => {
    const geometry = new THREE.ExtrudeGeometry(shapeFrom(b.footprint), {
      depth: b.height,
      bevelEnabled: false,
    });
    return {
      geometry,
      edges: new THREE.EdgesGeometry(geometry, 20),
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
      </group>
    </group>
  );
}

function Leader({ a, morphRef }: { a: Annotation; morphRef: MorphRef }) {
  const group = useRef<THREE.Group>(null);
  const dist = Math.hypot(...a.anchor);
  const [dx, dy] = a.lead;

  useFrame(() => {
    if (group.current)
      group.current.position.y = a.height * localMorph(morphRef.current.smooth, dist) + 0.3;
  });

  return (
    <group ref={group} position={[a.anchor[0], 0.3, -a.anchor[1]]}>
      <Html zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div className="relative h-0 w-0 select-none">
          <svg className="absolute left-0 top-0 overflow-visible" width={1} height={1}>
            <circle r={2.5} fill={INK} />
            <path d={`M0 0 L${dx} ${-dy}`} stroke={INK} strokeWidth={1} fill="none" />
          </svg>
          <div
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

function Trees({ morphRef }: { morphRef: MorphRef }) {
  const trunk = useRef<THREE.InstancedMesh>(null);
  const canopy = useRef<THREE.InstancedMesh>(null);
  const last = useRef(-1);
  const { trunkGeo, canopyGeo, m4, pos, scl, q } = useMemo(
    () => ({
      trunkGeo: new THREE.CylinderGeometry(0.7, 1, 1, 6).translate(0, 0.5, 0),
      canopyGeo: new THREE.IcosahedronGeometry(1, 1),
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
    });
    trunk.current.instanceMatrix.needsUpdate = true;
    canopy.current.instanceMatrix.needsUpdate = true;
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

function Ground() {
  const { ground, plaza, plazaGeo } = useMemo(() => {
    const ground = gridTexture("#cdc6b1", 5, 0.12);
    ground.repeat.set(30, 30);
    const plaza = gridTexture("#e3ddcc", 1, 0.1);
    plaza.repeat.set(1 / 8, 1 / 8);
    return { ground, plaza, plazaGeo: new THREE.ShapeGeometry(shapeFrom(PLAZA)) };
  }, []);
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position-y={GROUND_Y} receiveShadow>
        <planeGeometry args={[3000, 3000]} />
        <meshStandardMaterial map={ground} roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position-y={PLAZA_Y} geometry={plazaGeo} receiveShadow>
        <meshStandardMaterial map={plaza} roughness={1} />
      </mesh>
    </>
  );
}

function pathPosition(m: number, out: THREE.Vector3) {
  const r = THREE.MathUtils.lerp(430, 280, m);
  const phi = THREE.MathUtils.lerp(0.03, 0.84, m); // polar angle from zenith
  const theta = THREE.MathUtils.lerp(0, 0.6, m);
  return out.set(
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.cos(theta),
  );
}

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

  useEffect(() => {
    // Start on the path so a pre-set morph (?morph=1) doesn't lerp in from the default camera.
    const m = smoothstep(THREE.MathUtils.clamp(morphRef.current.smooth, 0, 1));
    camera.position.copy(pathPosition(m, goal));
    camera.lookAt(0, 8 * m, 0);
  }, [camera, goal, morphRef]);

  useFrame((_, dt) => {
    const s = morphRef.current;
    s.smooth = THREE.MathUtils.damp(s.smooth, s.target, 5, dt);
    const m = smoothstep(THREE.MathUtils.clamp(s.smooth, 0, 1));

    const orbitable = s.smooth > 0.93 && s.target >= 0.93;
    if (controlsRef.current) controlsRef.current.enabled = orbitable;
    if (orbitable) return;

    camera.position.lerp(pathPosition(m, goal), 1 - Math.exp(-8 * dt));
    camera.lookAt(0, 8 * m, 0);
  });
  return null;
}

export function Scene({ morphRef }: { morphRef: MorphRef }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const materials = useMemo(() => buildMaterials(), []);
  return (
    <Canvas
      flat
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: [0, 430, 13], fov: 40, near: 1, far: 2000 }}
    >
      <color attach="background" args={[PAPER]} />
      <fog attach="fog" args={[PAPER, 500, 1300]} />
      <hemisphereLight args={["#fff6e4", "#c9bda3", 1.7]} />
      <ambientLight color="#fff8ec" intensity={0.45} />
      <directionalLight
        color="#fff1d6"
        position={[170, 300, 120]}
        intensity={1.3}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={8}
        shadow-intensity={0.8}
        shadow-bias={-0.0004}
        shadow-normalBias={0.05}
      >
        <orthographicCamera attach="shadow-camera" args={[-230, 230, 230, -230, 10, 900]} />
      </directionalLight>
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
        minDistance={80}
        maxDistance={700}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 8, 0]}
      />
    </Canvas>
  );
}
