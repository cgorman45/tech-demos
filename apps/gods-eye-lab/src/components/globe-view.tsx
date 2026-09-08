"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import * as THREE from "three";
import type { Aircraft, IssResponse } from "@/lib/types";

const EARTH_RADIUS_KM = 6371;
const FT_TO_KM = 0.0003048;
// Real altitudes are visually flat at globe scale; exaggerate for legibility.
const AIRCRAFT_ALT_EXAGGERATION = 6;

type GlobeViewProps = {
  iss: IssResponse | null;
  aircraft: Aircraft[];
  showIss: boolean;
  showAircraft: boolean;
  /** Increment to fly the camera to the current ISS position. */
  focusIssTick: number;
};

function altitudeColor(altFt: number): string {
  // Amber near the ground fading to cyan at cruise altitude.
  const t = Math.min(Math.max(altFt / 40000, 0), 1);
  const hue = 40 + t * 150;
  return `hsl(${hue}, 95%, 60%)`;
}

export default function GlobeView({
  iss,
  aircraft,
  showIss,
  showAircraft,
  focusIssTick,
}: GlobeViewProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const initializedRef = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const measure = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    const globe = globeRef.current;
    // Run once when the globe first mounts; window resizes must not
    // reset the camera or restart the showcase spin.
    if (!globe || initializedRef.current) return;
    initializedRef.current = true;
    const controls = globe.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.4;
    globe.pointOfView({ lat: 30, lng: 10, altitude: 2.2 }, 0);
    // Idle showcase spin only: stop as soon as the user takes control.
    const stopSpin = () => {
      controls.autoRotate = false;
    };
    const dom = globe.renderer().domElement;
    dom.addEventListener("pointerdown", stopSpin);
    return () => dom.removeEventListener("pointerdown", stopSpin);
  }, [size.width]);

  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || focusIssTick === 0 || !iss) return;
    globe.controls().autoRotate = false;
    globe.pointOfView(
      { lat: iss.position.lat, lng: iss.position.lng, altitude: 1.6 },
      1200,
    );
  }, [focusIssTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const issObject = useMemo(() => {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.35,
      }),
    );
    group.add(core, glow);
    return group;
  }, []);

  const issObjects = showIss && iss ? [iss.position] : [];
  const issPaths =
    showIss && iss && iss.track.length > 1
      ? [iss.track.map((p) => [p.lat, p.lng, p.alt / EARTH_RADIUS_KM])]
      : [];
  const issLabels = showIss && iss ? [iss.position] : [];
  const planePoints = showAircraft ? aircraft : [];

  if (size.width === 0) return null;

  return (
    <Globe
      ref={globeRef}
      width={size.width}
      height={size.height}
      globeImageUrl="/textures/earth-blue-marble.jpg"
      bumpImageUrl="/textures/earth-topology.png"
      backgroundImageUrl="/textures/night-sky.png"
      showAtmosphere
      atmosphereColor="#88ccff"
      atmosphereAltitude={0.18}
      // ISS marker
      objectsData={issObjects}
      objectLat="lat"
      objectLng="lng"
      objectAltitude={(d) =>
        (d as { alt: number }).alt / EARTH_RADIUS_KM
      }
      objectThreeObject={issObject}
      // ISS ground track
      pathsData={issPaths}
      pathPoints={(p) => p as [number, number, number][]}
      pathPointLat={(p) => (p as number[])[0]}
      pathPointLng={(p) => (p as number[])[1]}
      pathPointAlt={(p) => (p as number[])[2]}
      pathColor={() => ["rgba(125, 211, 252, 0.15)", "rgba(125, 211, 252, 0.9)"]}
      pathStroke={2.5}
      pathTransitionDuration={0}
      // ISS label
      labelsData={issLabels}
      labelLat="lat"
      labelLng="lng"
      labelAltitude={(d) =>
        (d as { alt: number }).alt / EARTH_RADIUS_KM + 0.02
      }
      labelText={() => "ISS"}
      labelSize={1.4}
      labelDotRadius={0}
      labelColor={() => "rgba(224, 242, 254, 0.95)"}
      // Aircraft
      pointsData={planePoints}
      pointLat="lat"
      pointLng="lng"
      pointAltitude={(d) =>
        ((d as Aircraft).altFt * FT_TO_KM * AIRCRAFT_ALT_EXAGGERATION) /
        EARTH_RADIUS_KM
      }
      pointColor={(d) => altitudeColor((d as Aircraft).altFt)}
      pointRadius={0.09}
      pointsTransitionDuration={0}
    />
  );
}
