import {
  ApiError,
  type Api, type Attributes, type ClusterDetail, type ClusterSummary, type Decision, type Grid,
  type LngLat, type Meta, type Neighbour, type NeighbourDir, type PeatBoundary, type SeriesPoint,
  type Status, type VerificationDetail,
} from '../types';
import { T_AWAS, T_WATCH, utility } from '../lib/maut';

// Data FIKTIF untuk demo tanpa backend: replay backtest Kalteng 24 Sep 2023
// (BACKTEST_BBOX 113.5,-2.6,114.3,-1.9). Bentuk mengikuti backend.html.

export const SCENARIOS = ['normal', 'kosong', 'awan', 'satu_satelit', 'siang'] as const;
export type Scenario = (typeof SCENARIOS)[number];

const isScenario = (s: string | null): s is Scenario => !!s && (SCENARIOS as readonly string[]).includes(s);

/** ?skenario=… dipakai untuk mendemokan keadaan layar; diingat selama tab terbuka. */
export function currentScenario(): Scenario {
  const q = new URLSearchParams(location.search).get('skenario');
  try {
    if (isScenario(q)) sessionStorage.setItem('asapify.skenario', q);
    const s = sessionStorage.getItem('asapify.skenario');
    if (isScenario(s)) return s;
  } catch { /* sessionStorage diblokir */ }
  return isScenario(q) ? q : 'normal';
}

const AS_OF = '2023-09-24T15:10:00Z'; // 22.10 WIB
const STEP = 0.02;
const BBOX = { w: 113.5, s: -2.6, e: 114.3, n: -1.9 };

const PEAT: LngLat[][] = [
  [[113.55, -1.95], [113.80, -1.93], [113.98, -2.05], [114.00, -2.30], [113.88, -2.42],
    [113.70, -2.50], [113.56, -2.35], [113.52, -2.15], [113.55, -1.95]],
  [[114.05, -2.30], [114.25, -2.28], [114.29, -2.45], [114.22, -2.58], [114.06, -2.57],
    [114.02, -2.45], [114.05, -2.30]],
];

// ---------- util ----------

function rand(a: number, b: number, s = 0): number {
  let h = (a * 374761393 + b * 668265263 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const r2 = (x: number) => Math.round(x * 100) / 100;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const iso = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');

function inPoly([x, y]: LngLat, ring: LngLat[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Indeks grid 0,02° Kalimantan (asal 108.5 BT, 4.5 LU). */
function cell([lon, lat]: LngLat) {
  return { row: Math.round((4.5 - lat) / STEP - 0.5), col: Math.round((lon - 108.5) / STEP - 0.5) };
}
const pixelId = (p: LngLat) => { const { row, col } = cell(p); return `p${row}_${col}`; };

const DIRS: NeighbourDir[] = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];

const GIBS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
function gibsUrl([lon, lat]: LngLat, day: string, sat = 'NOAA20'): string {
  const p = new URLSearchParams({
    SERVICE: 'WMS', REQUEST: 'GetMap', VERSION: '1.3.0',
    LAYERS: `VIIRS_${sat}_CorrectedReflectance_TrueColor`, CRS: 'EPSG:4326',
    BBOX: [lat - 0.2, lon - 0.2, lat + 0.2, lon + 0.2].map((v) => v.toFixed(3)).join(','),
    WIDTH: '512', HEIGHT: '512', FORMAT: 'image/jpeg', TIME: day,
  });
  return `${GIBS}?${p}`;
}

/** Crop termal Himawari tiruan (SVG); backend asli menyajikan PNG dari crops/. */
function himawariSvg(strength: number): string {
  const r = 10 + strength * 16;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 256 256'>
<defs><radialGradient id='g' cx='45%' cy='40%' r='75%'><stop offset='0' stop-color='#454b52'/><stop offset='1' stop-color='#14171b'/></radialGradient>
<radialGradient id='h'><stop offset='0' stop-color='#fff8dc'/><stop offset='.4' stop-color='#ffb347'/><stop offset='1' stop-color='#ff6a00' stop-opacity='0'/></radialGradient></defs>
<rect width='256' height='256' fill='url(#g)'/>
<ellipse cx='60' cy='52' rx='70' ry='28' fill='#cfd5da' opacity='.35'/>
<ellipse cx='210' cy='200' rx='60' ry='22' fill='#cfd5da' opacity='.25'/>
<circle cx='128' cy='128' r='${r.toFixed(0)}' fill='url(#h)' opacity='${(0.5 + strength / 2).toFixed(2)}'/>
<text x='8' y='246' font-family='monospace' font-size='11' fill='#9aa4ad'>Himawari-9 B07 · ilustrasi mock</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ---------- deret utility 3 malam ----------

interface Night { date: string; from: number; to: number; end?: number; peakAt?: number; clouds?: [number, number][] }

function buildSeries(nights: Night[], seed: number): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  nights.forEach((n, ni) => {
    const end = n.end ?? 47;
    const peak = n.peakAt ?? end;
    const t0 = Date.parse(`${n.date}T13:00:00Z`); // 20.00 WIB
    for (let i = 0; i <= end; i++) {
      const slot = iso(t0 + i * 600_000);
      if (n.clouds?.some(([a, b]) => i >= a && i <= b)) {
        out.push({ slot, U: null, status: 'NO_OBSERVATION' });
        continue;
      }
      const noise = (rand(ni, i, seed) - 0.5) * 0.05;
      const U = r2(clamp01(i === peak ? n.to : i < peak ? n.from + ((n.to - n.from) * i) / peak + noise : n.to - 0.05 + noise));
      out.push({ slot, U, status: U >= T_AWAS ? 'AWAS' : U >= T_WATCH ? 'WATCH' : 'SAFE' });
    }
  });
  return out;
}

// ---------- kelompok ----------

interface ClusterDef {
  id: string;
  pixels: LngLat[];
  attrs: Attributes;
  neighbours: Neighbour['state'][]; // urutan DIRS
  trigger: string;
  nights: Night[];
  verification: VerificationDetail;
}

/** Dua panggilan tool pertama agen (konteks piksel + VIIRS FIRMS). */
function firstCalls(c: LngLat, asOf: string, ms: number) {
  return [
    { tool: 'get_pixel_context', args: { pixel_id: pixelId(c), as_of: asOf }, duration_ms: 180, ok: true },
    { tool: 'get_latest_viirs', args: { lat: c[1], lon: c[0], as_of: asOf, radius_km: 10, hours: 48 }, duration_ms: ms, ok: true },
  ];
}

const C002: LngLat[] = [[113.91, -2.21], [113.93, -2.21], [113.91, -2.23], [113.93, -2.19]];
const C001: LngLat[] = [[114.13, -2.45], [114.15, -2.45], [114.13, -2.47]];
const C923: LngLat[] = [[113.67, -2.05], [113.69, -2.05], [113.71, -2.05], [113.67, -2.07], [113.69, -2.07], [113.69, -2.03]];

const DEFS: ClusterDef[] = [
  {
    id: 'C-0924-002',
    pixels: C002,
    attrs: { u_H: 1.0, u_G: 1.0, u_LST: 0.5, u_SAT: 0.0, u_T: 0.67 },
    neighbours: ['normal', 'anomaly', 'non_peat', 'normal', 'anomaly', 'cloud', 'normal', 'anomaly'],
    trigger: AS_OF,
    nights: [
      { date: '2023-09-22', from: 0.16, to: 0.29, clouds: [[20, 30]] },
      { date: '2023-09-23', from: 0.28, to: 0.48, clouds: [[5, 9]] },
      { date: '2023-09-24', from: 0.45, to: 0.73, end: 13 },
    ],
    verification: {
      result: 'strong_evidence', smoke_visible: true, viirs_within_2km_48h: 1, tool_calls: 5, at: '2023-09-24T15:14:00Z',
      evidence: [
        { source: 'rule_engine', finding: 'U 0,73; 3/8 tetangga U0 ≥ 0,5; Himawari + GK2A sepakat', observed_at: AS_OF, age_h: 0 },
        { source: 'viirs_firms', finding: '1 deteksi VIIRS NOAA-20 pada 1,4 km (confidence nominal)', observed_at: '2023-09-23T18:42:00Z', age_h: 20.5 },
        { source: 'viirs_image', finding: 'Asap tipis mengarah ke barat laut, berasal ≤ 5 km dari penanda', observed_at: '2023-09-24T06:30:00Z', age_h: 8.7 },
        { source: 'himawari_image', finding: 'Titik terang B07 tepat di penanda', observed_at: AS_OF, age_h: 0 },
      ],
      summary_id: 'Bukti kuat. Asap tipis terlihat di citra VIIRS NOAA-20 24 Sep, berasal ≤ 5 km dari koordinat, dan ada 1 deteksi VIIRS pada 1,4 km dalam 48 jam.',
      summary_en: 'Strong evidence. Thin smoke is visible in the NOAA-20 VIIRS image of 24 Sep, originating within 5 km of the coordinate, and 1 VIIRS detection lies 1.4 km away within 48 hours.',
      tool_trace: [
        ...firstCalls(C002[0], AS_OF, 2310),
        { tool: 'fetch_viirs_image', args: { lat: -2.21, lon: 113.92, as_of: AS_OF }, duration_ms: 3420, ok: true },
        { tool: 'fetch_himawari_image', args: { lat: -2.21, lon: 113.92, as_of: AS_OF, mode: 'thermal' }, duration_ms: 2890, ok: true },
        { tool: 'save_verification', args: { result: 'strong_evidence', viirs_within_2km_48h: 1 }, duration_ms: 95, ok: true },
      ],
      images: [
        { source: 'viirs_image', url: gibsUrl([113.92, -2.21], '2023-09-24'), layer: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', observed_at: '2023-09-24T06:30:00Z', age_h: 8.7, marker_drawn: false },
        { source: 'himawari_image', url: himawariSvg(1), layer: 'Himawari-9 B07', observed_at: AS_OF, age_h: 0, marker_drawn: false },
      ],
      viirs: [
        { src: 'VIIRS_NOAA20_SP', time_utc: '2023-09-23T18:42:00Z', distance_km: 1.4, confidence: 'n', frp: 3.2, lat: -2.198, lon: 113.932 },
        { src: 'VIIRS_SNPP_SP', time_utc: '2023-09-24T06:05:00Z', distance_km: 6.8, confidence: 'l', frp: 1.9, lat: -2.17, lon: 113.975 },
      ],
    },
  },
  {
    id: 'C-0924-001',
    pixels: C001,
    attrs: { u_H: 1.0, u_G: 0.85, u_LST: 0.4, u_SAT: 0.2, u_T: 1.0 },
    neighbours: ['normal', 'normal', 'normal', 'normal', 'anomaly', 'normal', 'anomaly', 'non_peat'],
    trigger: AS_OF,
    nights: [
      { date: '2023-09-22', from: 0.12, to: 0.2, clouds: [[38, 47]] },
      { date: '2023-09-23', from: 0.24, to: 0.42 },
      { date: '2023-09-24', from: 0.4, to: 0.71, end: 13, clouds: [[2, 4]] },
    ],
    verification: {
      result: 'inconclusive', smoke_visible: false, viirs_within_2km_48h: 0, tool_calls: 5, at: '2023-09-24T15:15:00Z',
      evidence: [
        { source: 'rule_engine', finding: 'U 0,71; 2/8 tetangga U0 ≥ 0,5; Himawari + GK2A sepakat', observed_at: AS_OF, age_h: 0 },
        { source: 'viirs_firms', finding: 'Tidak ada deteksi VIIRS dalam radius 10 km, 48 jam', observed_at: null, age_h: null },
        { source: 'viirs_image', finding: 'Area tertutup awan tipis; asap tidak terlihat', observed_at: '2023-09-24T06:30:00Z', age_h: 8.7 },
        { source: 'himawari_image', finding: 'Titik hangat lemah di penanda', observed_at: AS_OF, age_h: 0 },
      ],
      summary_id: 'Inkonklusif. Tidak ada deteksi VIIRS dalam 10 km selama 48 jam dan citra VIIRS 24 Sep tertutup awan tipis. Tidak terlihatnya asap bukan bukti negatif.',
      summary_en: 'Inconclusive. No VIIRS detection within 10 km in 48 hours and the 24 Sep VIIRS image is covered by thin cloud. Absence of visible smoke is not negative evidence.',
      tool_trace: [
        ...firstCalls(C001[0], AS_OF, 2050),
        { tool: 'fetch_viirs_image', args: { lat: -2.46, lon: 114.14, as_of: AS_OF }, duration_ms: 3610, ok: true },
        { tool: 'fetch_himawari_image', args: { lat: -2.46, lon: 114.14, as_of: AS_OF, mode: 'thermal' }, duration_ms: 2740, ok: true },
        { tool: 'save_verification', args: { result: 'inconclusive', viirs_within_2km_48h: 0 }, duration_ms: 88, ok: true },
      ],
      images: [
        { source: 'viirs_image', url: gibsUrl([114.14, -2.46], '2023-09-24'), layer: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', observed_at: '2023-09-24T06:30:00Z', age_h: 8.7, marker_drawn: false },
        { source: 'himawari_image', url: himawariSvg(0.3), layer: 'Himawari-9 B07', observed_at: AS_OF, age_h: 0, marker_drawn: false },
      ],
      viirs: [],
    },
  },
  {
    id: 'C-0923-001',
    pixels: C923,
    attrs: { u_H: 1.0, u_G: 1.0, u_LST: 0.8, u_SAT: 0.5, u_T: 1.0 },
    neighbours: ['normal', 'anomaly', 'anomaly', 'normal', 'anomaly', 'normal', 'anomaly', 'normal'],
    trigger: '2023-09-23T16:40:00Z',
    nights: [
      { date: '2023-09-22', from: 0.3, to: 0.55 },
      { date: '2023-09-23', from: 0.5, to: 0.86, peakAt: 22, clouds: [[40, 44]] },
      { date: '2023-09-24', from: 0.76, to: 0.82, end: 13 },
    ],
    verification: {
      result: 'strong_evidence', smoke_visible: true, viirs_within_2km_48h: 2, tool_calls: 5, at: '2023-09-23T16:44:00Z',
      evidence: [
        { source: 'rule_engine', finding: 'U 0,86; 4/8 tetangga U0 ≥ 0,5; Himawari + GK2A sepakat', observed_at: '2023-09-23T16:40:00Z', age_h: 0 },
        { source: 'viirs_firms', finding: '2 deteksi VIIRS ≤ 2 km (NOAA-20 0,9 km; S-NPP 1,6 km)', observed_at: '2023-09-23T06:12:00Z', age_h: 10.5 },
        { source: 'viirs_image', finding: 'Kepulan asap jelas berasal dari dekat penanda, mengarah ke barat', observed_at: '2023-09-23T06:30:00Z', age_h: 10.2 },
        { source: 'himawari_image', finding: 'Titik terang B07 di penanda', observed_at: '2023-09-23T16:40:00Z', age_h: 0 },
      ],
      summary_id: 'Bukti kuat. Ada 2 deteksi VIIRS ≤ 2 km dalam 48 jam dan kepulan asap terlihat di citra VIIRS 23 Sep.',
      summary_en: 'Strong evidence. There are 2 VIIRS detections within 2 km in 48 hours and a smoke plume is visible in the 23 Sep VIIRS image.',
      tool_trace: [
        ...firstCalls(C923[0], '2023-09-23T16:40:00Z', 2480),
        { tool: 'fetch_viirs_image', args: { lat: -2.05, lon: 113.69, as_of: '2023-09-23T16:40:00Z' }, duration_ms: 3150, ok: true },
        { tool: 'fetch_himawari_image', args: { lat: -2.05, lon: 113.69, as_of: '2023-09-23T16:40:00Z', mode: 'thermal' }, duration_ms: 2660, ok: true },
        { tool: 'save_verification', args: { result: 'strong_evidence', viirs_within_2km_48h: 2 }, duration_ms: 102, ok: true },
      ],
      images: [
        { source: 'viirs_image', url: gibsUrl([113.69, -2.05], '2023-09-23'), layer: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', observed_at: '2023-09-23T06:30:00Z', age_h: 10.2, marker_drawn: false },
        { source: 'himawari_image', url: himawariSvg(0.8), layer: 'Himawari-9 B07', observed_at: '2023-09-23T16:40:00Z', age_h: 0, marker_drawn: false },
      ],
      viirs: [
        { src: 'VIIRS_NOAA20_SP', time_utc: '2023-09-23T06:12:00Z', distance_km: 0.9, confidence: 'n', frp: 6.4, lat: -2.046, lon: 113.697 },
        { src: 'VIIRS_SNPP_SP', time_utc: '2023-09-23T05:48:00Z', distance_km: 1.6, confidence: 'n', frp: 4.1, lat: -2.062, lon: 113.678 },
      ],
    },
  },
];

const decisions = new Map<string, Decision>([
  ['C-0923-001', { action: 'publish', by: 'operator@contoh.id', at: '2023-09-23T17:02:00Z', reason: null, alert_id: 'A-0923-001' }],
]);

function centroid(px: LngLat[]): LngLat {
  const n = px.length;
  return [r2(px.reduce((s, p) => s + p[0], 0) / n), r2(px.reduce((s, p) => s + p[1], 0) / n)];
}

function toDetail(d: ClusterDef): ClusterDetail {
  const uN = d.neighbours.filter((s) => s === 'anomaly').length / 8;
  return {
    id: d.id,
    state: 'active',
    province: '62',
    rep_pixel: pixelId(d.pixels[0]),
    centroid: centroid(d.pixels),
    pixels: d.pixels.map(pixelId),
    trigger_slot: d.trigger,
    utility_score: r2(utility(d.attrs, uN)),
    neighbour_support: uN,
    n_sat: 2,
    attributes: d.attrs,
    series: buildSeries(d.nights, d.pixels.length),
    neighbours: d.neighbours.map((state, i) => ({
      dir: DIRS[i], state,
      u0: state === 'anomaly' ? r2(0.5 + rand(i, 3) * 0.4) : state === 'normal' ? r2(rand(i, 5) * 0.4) : null,
    })),
    verification: d.verification,
    decision: decisions.get(d.id) ?? null,
  };
}

function toSummary(d: ClusterDetail): ClusterSummary {
  const { attributes: _a, series: _s, neighbours: _n, verification: v, ...rest } = d;
  return {
    ...rest,
    verification: v && { result: v.result, viirs_within_2km_48h: v.viirs_within_2km_48h, tool_calls: v.tool_calls, at: v.at },
  };
}

// ---------- grid ----------

function buildGrid(sc: Scenario): Grid {
  const clusterPx = new Map<string, { id: string; U: number }>();
  if (sc !== 'kosong') {
    for (const d of DEFS) {
      const U = toDetail(d).utility_score;
      d.pixels.forEach((p, i) => {
        const { row, col } = cell(p);
        clusterPx.set(`${row}_${col}`, { id: d.id, U: Math.max(T_AWAS + 0.01, r2(U - i * 0.02)) });
      });
    }
  }
  const allPx = DEFS.flatMap((d) => d.pixels);
  const near = (p: LngLat, dist: number) => allPx.some((q) => Math.abs(q[0] - p[0]) <= dist && Math.abs(q[1] - p[1]) <= dist);

  const features: Grid['features'] = [];
  const rows = Math.round((BBOX.n - BBOX.s) / STEP);
  const cols = Math.round((BBOX.e - BBOX.w) / STEP);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p: LngLat = [r2(BBOX.w + (c + 0.5) * STEP), r2(BBOX.n - (r + 0.5) * STEP)];
      if (!PEAT.some((ring) => inPoly(p, ring))) continue;
      const { row, col } = cell(p);
      const k = rand(row, col);
      const cl = clusterPx.get(`${row}_${col}`);
      const cloudy = sc === 'awan'
        ? !near(p, 0.05) && rand(row, col, 7) < 0.85
        : ((p[0] - 113.66) / 0.08) ** 2 + ((p[1] + 2.36) / 0.06) ** 2 <= 1;
      let status: Status;
      let U: number | null;
      if (cl) {
        U = cl.U;
        status = sc === 'satu_satelit' ? 'WATCH' : 'AWAS'; // satu satelit: AWAS tidak mungkin
      } else if (cloudy) {
        status = 'NO_OBSERVATION'; U = null;
      } else if ((near(p, 0.03) && k < 0.55) || k < 0.025) {
        status = 'WATCH'; U = r2(T_WATCH + k * 0.5);
      } else {
        status = 'SAFE'; U = r2(k * 0.25);
      }
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: p },
        properties: {
          pixel_id: `p${row}_${col}`, status, utility: U,
          n_sat: status === 'NO_OBSERVATION' ? 0 : sc === 'satu_satelit' ? 1 : 2,
          cluster_id: cl?.id ?? null, province: '62',
        },
      });
    }
  }
  return { type: 'FeatureCollection', features };
}

function buildMeta(sc: Scenario): Meta {
  const late = sc === 'satu_satelit';
  return {
    as_of: sc === 'siang' ? '2023-09-25T03:00:00Z' : AS_OF,
    last_slot: AS_OF,
    is_night: sc !== 'siang',
    replay: true,
    n_sat: late ? 1 : 2,
    sats: {
      himawari: { last_slot: AS_OF, delay_min: 18 },
      gk2a: late ? { last_slot: '2023-09-24T14:20:00Z', delay_min: 55 } : { last_slot: AS_OF, delay_min: 22 },
    },
  };
}

// ---------- Api ----------

const wait = <T>(v: T, ms = 300): Promise<T> =>
  new Promise((res) => setTimeout(() => res(structuredClone(v)), ms + Math.random() * 200));

export const mockApi: Api = {
  meta: () => wait(buildMeta(currentScenario()), 150),
  grid: () => wait(buildGrid(currentScenario()), 400),
  clusters: () => {
    const sc = currentScenario();
    return wait(sc === 'kosong' ? [] : DEFS.map((d) => toSummary(toDetail(d))));
  },
  cluster: async (id) => {
    const sc = currentScenario();
    const d = sc === 'kosong' ? undefined : DEFS.find((x) => x.id === id);
    if (!d) { await wait(null); throw new ApiError(404, 'NOT_FOUND', `Kelompok ${id} tidak ditemukan.`); }
    return wait(toDetail(d));
  },
  decide: async (id, body) => {
    await wait(null, 500);
    if (!DEFS.some((d) => d.id === id)) throw new ApiError(404, 'NOT_FOUND', `Kelompok ${id} tidak ditemukan.`);
    if (decisions.has(id)) throw new ApiError(409, 'ALREADY_DECIDED', 'Kelompok ini sudah diputuskan oleh operator lain.');
    if (body.action === 'reject' && !body.reason?.trim()) throw new ApiError(422, 'REASON_REQUIRED', 'Alasan penolakan wajib diisi.');
    if (body.action === 'publish' && (!body.caption_id || body.caption_id.length > 1024)) {
      throw new ApiError(422, 'CAPTION_INVALID', 'Caption kosong atau melebihi 1.024 karakter.');
    }
    const n = [...decisions.values()].filter((x) => x.alert_id).length + 1;
    decisions.set(id, {
      action: body.action, by: 'operator@contoh.id', at: iso(Date.parse(AS_OF) + 20 * 60_000),
      reason: body.reason, alert_id: body.action === 'publish' ? `A-0924-${String(n).padStart(3, '0')}` : null,
    });
  },
  peatBoundary: () => wait<PeatBoundary>({
    type: 'FeatureCollection',
    features: PEAT.map((ring) => ({ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } })),
  }, 100),
};

/** Contoh respons untuk tab Kontrak API — dari data yang sama dengan UI (skenario normal). */
export function contractExamples() {
  const grid = buildGrid('normal');
  const pick = (s: Status) => grid.features.find((f) => f.properties.status === s)!;
  const detail = (id: string) => toDetail(DEFS.find((d) => d.id === id)!);
  return {
    meta: buildMeta('normal'),
    grid: { type: 'FeatureCollection' as const, features: [pick('AWAS'), pick('NO_OBSERVATION')] },
    gridCount: grid.features.length,
    clusters: [toSummary(detail('C-0923-001')), toSummary(detail('C-0924-001'))],
    cluster: detail('C-0924-002'),
    peat: { type: 'FeatureCollection' as const, features: [{ type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [PEAT[1]] } }] },
  };
}
