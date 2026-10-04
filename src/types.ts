import type { FeatureCollection, MultiPolygon, Point, Polygon } from 'geojson';

// Bentuk data mengikuti backend.html bagian 03–05. Field bertanda "FE" adalah
// usulan FE untuk isi GET /operator/clusters/{id} yang belum dirinci di sana.

export type Status = 'SAFE' | 'NO_OBSERVATION' | 'WATCH' | 'AWAS';
export type EvidenceResult = 'strong_evidence' | 'inconclusive';
// Kode BPS: 10 provinsi Sumatra + 5 provinsi Kalimantan.
export type ProvinceCode =
  | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '21'
  | '61' | '62' | '63' | '64' | '65';
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
  nights: { first: string; last: string }; // FE: malam arsip, YYYY-MM-DD (tanggal WIB awal malam)
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
  finding: string; // Bahasa Indonesia
  finding_en: string; // FE
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

// ---------- format ringkas peta (usulan FE) ----------

/** Daftar piksel gambut statis; urutannya = indeks sel di semua respons ringkas. */
export interface PixelIndex {
  version: string;
  origin: LngLat; // pojok kiri atas grid gabungan Sumatra + Kalimantan: [94.9, 6.2]
  step: number; // 0.02
  rows: number[];
  cols: number[];
  province: number[]; // kode BPS provinsi per sel, mis. 16 = Sumatera Selatan
}

export type StatusCode = 'S' | 'N' | 'W' | 'A';

/** Status semua piksel pada satu slot. */
export interface GridCompact {
  pixels_version: string;
  slot: string;
  n_sat: 0 | 1 | 2;
  status: string; // satu StatusCode per sel
  utility: string; // base64 Uint8 per sel: round(U × 250); 255 = null
  clusters: Record<string, number[]>; // cluster_id → indeks sel
}

/** Status per slot untuk satu malam (pemutar slot). */
export interface NightCompact {
  pixels_version: string;
  night: string; // tanggal WIB saat malam dimulai, YYYY-MM-DD
  slots: string[]; // 54 slot UTC, 13.00–21.50
  status: (string | null)[]; // per slot; null = belum dievaluasi / tidak ada data
  n_sat: (0 | 1 | 2 | null)[];
  clusters: Record<string, number[]>; // kelompok yang AWAS malam itu → indeks sel
}

export interface Basemap {
  id: string;
  label_id: string;
  label_en: string;
  tiles: string[]; // template XYZ raster {z}/{x}/{y}
  tile_size: number;
  maxzoom: number;
  attribution: string;
}

export type ProvinceBoundary = FeatureCollection<MultiPolygon, { code: ProvinceCode; name: string }>;

export interface Api {
  meta(): Promise<Meta>;
  pixels(): Promise<PixelIndex>;
  gridCompact(asOf?: string): Promise<GridCompact>;
  night(night: string): Promise<NightCompact>;
  basemaps(): Promise<Basemap[]>;
  clusters(night?: string): Promise<ClusterSummary[]>; // tanpa night = kelompok aktif
  cluster(id: string): Promise<ClusterDetail>;
  decide(id: string, body: DecisionRequest): Promise<void>;
  peatBoundary(): Promise<PeatBoundary>;
  provinces(): Promise<ProvinceBoundary>;
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
