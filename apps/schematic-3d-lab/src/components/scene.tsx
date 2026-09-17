"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid, Html, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import site from "@/data/civic-center.json";

type Building = (typeof site.buildings)[number];
export type MorphState = { target: number; smooth: number };
type MorphRef = MutableRefObject<MorphState>;

const KIND_STYLE: Record<string, { fill: string; edge: string }> = {
  police: { fill: "#c2740a", edge: "#fde68a" },
  jail: { fill: "#0e7490", edge: "#7dd3fc" },
  parking: { fill: "#3f4a5c", edge: "#8fa3bd" },
  context: { fill: "#173250", edge: "#3c6d96" },
};

const LABELS: Record<string, string | undefined> = {
  police: "Santa Ana Police Department",
  jail: "Santa Ana City Jail",
};

const MAX_DIST = 160;
const STAGGER = 0.35;

const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** Per-building morph: nearer buildings rise first for a wave effect. */
function localMorph(smooth: number, dist: number) {
  const norm = Math.min(dist / MAX_DIST, 1);
  const t = THREE.MathUtils.clamp(smooth * (1 + STAGGER) - STAGGER * norm, 0, 1);
  return smoothstep(t);
}

function BuildingMesh({ b, morphRef }: { b: Building; morphRef: MorphRef }) {
  const inner = useRef<THREE.Group>(null);
  const labelGroup = useRef<THREE.Group>(null);

  const { geometry, edges, cx, cy, dist } = useMemo(() => {
    const shape = new THREE.Shape();
    b.footprint.forEach(([x, y], i) =>
      i === 0 ? shape.moveTo(x, y) : shape.lineTo(x, y),
    );
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: b.height,
      bevelEnabled: false,
    });
    const edges = new THREE.EdgesGeometry(geometry, 20);
    const cx =
      b.footprint.reduce((s, p) => s + p[0], 0) / b.footprint.length;
    const cy =
      b.footprint.reduce((s, p) => s + p[1], 0) / b.footprint.length;
    return { geometry, edges, cx, cy, dist: Math.hypot(cx, cy) };
  }, [b]);

  const style = KIND_STYLE[b.kind] ?? KIND_STYLE.context;
  const label = LABELS[b.kind];

  useFrame(() => {
    const m = localMorph(morphRef.current.smooth, dist);
    if (inner.current) inner.current.scale.z = Math.max(m, 0.002);
    if (labelGroup.current)
      labelGroup.current.position.y = b.height * m + 7;
  });

  return (
    <group>
      {/* Shape is built in the XY (east/north) plane; rotate into XZ, extrude up. */}
      <group rotation-x={-Math.PI / 2}>
        <group ref={inner}>
          <mesh geometry={geometry}>
            <meshStandardMaterial color={style.fill} flatShading />
          </mesh>
          <lineSegments geometry={edges}>
            <lineBasicMaterial color={style.edge} />
          </lineSegments>
        </group>
      </group>
      {label && (
        <group ref={labelGroup} position={[cx, b.height + 7, -cy]}>
          <Html center zIndexRange={[10, 0]}>
            <div className="pointer-events-none select-none whitespace-nowrap rounded border border-cyan-300/30 bg-slate-950/80 px-2 py-1 text-center font-mono text-[10px] leading-tight tracking-wide text-cyan-100 backdrop-blur-sm">
              {label}
              {b.kind === "police" && (
                <div className="text-[8px] text-cyan-300/70">
                  60 Civic Center Plaza · Santa Ana, CA 92701
                </div>
              )}
            </div>
          </Html>
        </group>
      )}
    </group>
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
  useFrame((_, dt) => {
    const s = morphRef.current;
    s.smooth = THREE.MathUtils.damp(s.smooth, s.target, 5, dt);
    const m = smoothstep(THREE.MathUtils.clamp(s.smooth, 0, 1));

    const orbitable = s.smooth > 0.93 && s.target >= 0.93;
    if (controlsRef.current) controlsRef.current.enabled = orbitable;
    if (orbitable) return;

    const r = THREE.MathUtils.lerp(430, 280, m);
    const phi = THREE.MathUtils.lerp(0.03, 0.84, m); // polar angle from zenith
    const theta = THREE.MathUtils.lerp(0, 0.6, m);
    const target = new THREE.Vector3(
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.cos(theta),
    );
    const k = 1 - Math.exp(-8 * dt);
    camera.position.lerp(target, k);
    camera.lookAt(0, 8 * m, 0);
  });
  return null;
}

export function Scene({ morphRef }: { morphRef: MorphRef }) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  return (
    <Canvas camera={{ position: [0, 430, 13], fov: 40, near: 1, far: 2000 }}>
      <color attach="background" args={["#0a1424"]} />
      <fog attach="fog" args={["#0a1424", 500, 1100]} />
      <ambientLight intensity={0.75} />
      <hemisphereLight args={["#9dc4e8", "#0a1424", 0.5]} />
      <directionalLight position={[120, 220, 80]} intensity={1.4} />
      <Grid
        position={[0, -0.2, 0]}
        args={[1200, 1200]}
        cellSize={20}
        cellColor="#14314e"
        sectionSize={100}
        sectionColor="#1f4a70"
        fadeDistance={900}
        fadeStrength={2}
      />
      {site.buildings.map((b) => (
        <BuildingMesh key={b.id} b={b} morphRef={morphRef} />
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
