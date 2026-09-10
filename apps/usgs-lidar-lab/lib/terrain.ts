import type {
  ExpressionSpecification,
  RasterDEMSourceSpecification,
  SkySpecification,
  StyleSpecification,
} from "maplibre-gl";

/**
 * Terrain Tiles on AWS Open Data (Terrarium PNG encoding). Over the
 * continental US this dataset is built from USGS 3DEP — the best publicly
 * tiled form of the USGS LiDAR-derived elevation data. Free, keyless.
 */
export const TERRARIUM_TILES =
  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";

/** USGS The National Map — imagery-only basemap tiles. Free, keyless. */
export const USGS_IMAGERY_TILES =
  "https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}";

const TERRAIN_ATTRIBUTION =
  '<a href="https://registry.opendata.aws/terrain-tiles/" target="_blank">Terrain Tiles</a> (USGS 3DEP)';
const IMAGERY_ATTRIBUTION =
  '<a href="https://www.usgs.gov/programs/national-geospatial-program/national-map" target="_blank">USGS The National Map</a>';

export const DEFAULT_EXAGGERATION = 1.5;
export const PITCH_3D = 62;

function demSource(): RasterDEMSourceSpecification {
  return {
    type: "raster-dem",
    tiles: [TERRARIUM_TILES],
    encoding: "terrarium",
    tileSize: 256,
    maxzoom: 15,
    attribution: TERRAIN_ATTRIBUTION,
  };
}

/** Hypsometric tint tuned for a dark "LiDAR lab" look. Input is meters. */
const RELIEF_RAMP: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["elevation"],
  -3000, "#04070e",
  -50, "#0b2436",
  0, "#123c46",
  150, "#1d5c49",
  400, "#3d7c4b",
  800, "#7fa051",
  1300, "#c2b260",
  1900, "#c98f4e",
  2600, "#a86440",
  3200, "#9d7c6a",
  3800, "#d8cfc5",
  4400, "#ffffff",
];

const SKY: SkySpecification = {
  "sky-color": "#0b1420",
  "horizon-color": "#26445e",
  "fog-color": "#0a0f14",
  "sky-horizon-blend": 0.6,
  "horizon-fog-blend": 0.6,
  "fog-ground-blend": 0.85,
  "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 12, 0.4],
};

export function lidarStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      dem: demSource(),
      terrain: demSource(),
    },
    layers: [
      {
        id: "bg",
        type: "background",
        paint: { "background-color": "#05080c" },
      },
      {
        id: "relief",
        type: "color-relief",
        source: "dem",
        paint: {
          "color-relief-color": RELIEF_RAMP,
          "color-relief-opacity": 0.85,
        },
      },
      {
        id: "hillshade",
        type: "hillshade",
        source: "dem",
        paint: {
          "hillshade-method": "igor",
          "hillshade-exaggeration": 0.7,
          "hillshade-shadow-color": "#020508",
          "hillshade-highlight-color": "#e8f2ff",
          "hillshade-accent-color": "#0c1622",
          "hillshade-illumination-direction": 315,
          "hillshade-illumination-anchor": "viewport",
        },
      },
    ],
    terrain: { source: "terrain", exaggeration: DEFAULT_EXAGGERATION },
    sky: SKY,
  };
}

export function satelliteStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      imagery: {
        type: "raster",
        tiles: [USGS_IMAGERY_TILES],
        tileSize: 256,
        maxzoom: 16,
        attribution: IMAGERY_ATTRIBUTION,
      },
      terrain: demSource(),
    },
    layers: [
      {
        id: "bg",
        type: "background",
        paint: { "background-color": "#05080c" },
      },
      {
        id: "imagery",
        type: "raster",
        source: "imagery",
        paint: { "raster-fade-duration": 150 },
      },
    ],
    terrain: { source: "terrain", exaggeration: DEFAULT_EXAGGERATION },
    sky: SKY,
  };
}

export interface Preset {
  name: string;
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
}

export const PRESETS: Preset[] = [
  { name: "Grand Canyon", center: [-112.115, 36.1], zoom: 12.3, bearing: 35, pitch: PITCH_3D },
  { name: "Mount Rainier", center: [-121.7603, 46.8523], zoom: 11.6, bearing: -25, pitch: PITCH_3D },
  { name: "Half Dome", center: [-119.5332, 37.7459], zoom: 13, bearing: 75, pitch: PITCH_3D },
  { name: "Crater Lake", center: [-122.109, 42.9446], zoom: 11.4, bearing: 0, pitch: 55 },
  { name: "Mt. St. Helens", center: [-122.1956, 46.1914], zoom: 12, bearing: 160, pitch: PITCH_3D },
];
