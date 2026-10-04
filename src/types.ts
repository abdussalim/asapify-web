import type { FeatureCollection, Point, Polygon } from 'geojson';

// Bentuk data mengikuti backend.html bagian 03–05. Field bertanda "FE" adalah
// usulan FE untuk isi GET /operator/clusters/{id} yang belum dirinci di sana.

export type Status = 'SAFE' | 'NO_OBSERVATION' | 'WATCH' | 'AWAS';
export type EvidenceResult = 'strong_evidence' | 'inconclusive';
export type ProvinceCode = '61' | '62' | '63' | '64' | '65';
export type LngLat = [number, number]; // GeoJSON: [lon, lat]

export interface SatState {
  last_slot: string | null; // UTC ISO
  delay_min: number | null;
}

export interface Meta {
  as_of: string;
  last_slot: string;
  is_night: boolean;
  replay: boolean;
  n_sat: 0 | 1 | 2;
  sats: { himawari: SatState; gk2a: SatState };
}

export interface PixelProps {
  pixel_id: string;
  status: Status;
  utility: number | null;
  n_sat: 0 | 1 | 2;
  cluster_id: string | null;
  province: ProvinceCode;
}
export type Grid = FeatureCollection<Point, PixelProps>;
export type PeatBoundary = FeatureCollection<Polygon>;

export type AttrKey = 'u_H' | 'u_G' | 'u_LST' | 'u_SAT' | 'u_T' | 'u_N';
export type Attributes = Record<Exclude<AttrKey, 'u_N'>, number | null>;

export interface VerificationSummary {
  result: EvidenceResult;
  viirs_within_2km_48h: number;
  tool_calls: number;
  at: string;
}

export interface Decision {
  action: 'publish' | 'reject';
  by: string;
  at: string;
  reason: string | null;
  alert_id: string | null;
}

export interface ClusterSummary {
  id: string;
  state: 'active' | 'closed';
  province: ProvinceCode;
  rep_pixel: string;
  centroid: LngLat;
  pixels: string[];
  trigger_slot: string;
  utility_score: number;
  neighbour_support: number;
  n_sat: 0 | 1 | 2;
  verification: VerificationSummary | null;
  decision: Decision | null;
}

export interface SeriesPoint {
  slot: string;
  U: number | null; // FE: null = NO_OBSERVATION
  status: Status;
}

export type NeighbourDir = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';
export interface Neighbour {
  dir: NeighbourDir;
  state: 'anomaly' | 'normal' | 'cloud' | 'non_peat';
  u0: number | null;
}

export type EvidenceSource = 'rule_engine' | 'viirs_firms' | 'viirs_image' | 'himawari_image';
export interface Evidence {
  source: EvidenceSource;
  finding: string;
  observed_at: string | null;
  age_h: number | null;
}

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  duration_ms: number;
  ok: boolean;
}

export interface EvidenceImg {
  source: 'viirs_image' | 'himawari_image';
  url: string; // signed URL crop
  layer: string;
  observed_at: string;
  age_h: number;
  marker_drawn: boolean; // false → UI menggambar penanda koordinat sendiri
}

export interface ViirsDetection {
  src: string;
  time_utc: string;
  distance_km: number;
  confidence: string;
  frp: number;
  lat: number; // FE: untuk layer peta viirs
  lon: number;
}

export interface VerificationDetail extends VerificationSummary {
  smoke_visible: boolean | null;
  evidence: Evidence[];
  summary_id: string;
  summary_en: string;
  tool_trace: ToolCall[]; // FE
  images: EvidenceImg[]; // FE
  viirs: ViirsDetection[]; // FE
}

export interface ClusterDetail extends Omit<ClusterSummary, 'verification'> {
  attributes: Attributes;
  series: SeriesPoint[];
  neighbours: Neighbour[]; // FE
  verification: VerificationDetail | null;
}

export interface DecisionRequest {
  action: 'publish' | 'reject';
  caption_id: string | null;
  reason: string | null;
}

export interface Api {
  meta(): Promise<Meta>;
  grid(asOf?: string): Promise<Grid>;
  clusters(): Promise<ClusterSummary[]>;
  cluster(id: string): Promise<ClusterDetail>;
  decide(id: string, body: DecisionRequest): Promise<void>;
  peatBoundary(): Promise<PeatBoundary>;
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
