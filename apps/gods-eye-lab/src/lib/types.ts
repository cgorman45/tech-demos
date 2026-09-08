export type IssPosition = {
  lat: number;
  lng: number;
  /** Altitude in km */
  alt: number;
  /** Velocity in km/h */
  velocity: number;
  /** Unix seconds */
  timestamp: number;
  visibility: string;
};

export type IssTrackPoint = {
  lat: number;
  lng: number;
  alt: number;
  timestamp: number;
};

export type IssResponse = {
  position: IssPosition;
  track: IssTrackPoint[];
};

export type Aircraft = {
  hex: string;
  flight: string;
  type: string | null;
  lat: number;
  lng: number;
  /** Barometric altitude in feet ("ground" mapped to 0) */
  altFt: number;
  /** Ground speed in knots */
  gs: number | null;
  /** True track in degrees */
  track: number | null;
};

export type AircraftResponse = {
  aircraft: Aircraft[];
  center: { lat: number; lng: number };
  radiusNm: number;
  fetchedAt: number;
};
