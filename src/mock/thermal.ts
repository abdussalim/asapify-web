import type { AttrDetail, AttrKey, AttrPart, Attributes, LngLat, ThermalBand, ThermalCrop } from '../types';
import { GRID_ORIGIN, GRID_STEP } from '../lib/grid';
import { T_WATCH } from '../lib/maut';
import { readingAt, thermalColor } from '../lib/thermal';
import { rand } from './rand';

// Data FIKTIF suhu per piksel di balik citra termal Himawari, dan angka terukur di balik atribut MAUT.
// Semuanya dibangun dari satu grid, jadi gambar, tooltip, dan tabel atribut selalu sepakat.

const HALF = 0.2; // crop ±0,2° (≈ 44 km), sama dengan citra VIIRS
export const CROP_CELLS = 20; // 0,4° ÷ 0,02°: satu sel = satu piksel ASAPify

/** Skala normalisasi per atribut (usulan FE): angka terukur di batas bawah → u = 0, batas atas → u = 1. */
export const ATTR_SCALES: Record<AttrKey, [number, number]> = {
  u_H: [3, 10], u_G: [3, 10], u_LST: [0, 8], u_SAT: [0, 5], u_T: [0, 3], u_N: [0, 8],
};

const r1 = (x: number) => Math.round(x * 10) / 10;

/** Elips awan (pusat dan jari-jari sebagai pecahan crop) yang menutupi sel di bawahnya. */
const CLOUDS: [number, number, number, number][] = [[0.235, 0.205, 0.27, 0.11], [0.82, 0.78, 0.235, 0.085]];
const CLOUD_NEAR: [number, number, number, number] = [0.68, 0.44, 0.13, 0.11]; // awan di sisi timur titik panas

export interface ThermalSpec {
  centre: LngLat; // pusat crop = titik berat kelompok
  pixels: LngLat[]; // piksel kelompok (pusat sel 0,02°)
  rep: LngLat; // piksel perwakilan
  targets: { himawari: number; gk2a: number }; // anomali yang diinginkan di piksel perwakilan, K
  heat: number; // 0–1: seberapa luas dan kuat titik panas di sekitar piksel kelompok
  cloudNear?: boolean;
  seed: number;
}

/** Crop ±0,2° di sekitar titik berat, digeser ke garis grid 0,02° terdekat supaya sel crop = piksel ASAPify. */
export function cropBbox([lon, lat]: LngLat): [number, number, number, number] {
  const cLon = GRID_ORIGIN[0] + Math.round((lon - GRID_ORIGIN[0]) / GRID_STEP) * GRID_STEP;
  const cLat = GRID_ORIGIN[1] - Math.round((GRID_ORIGIN[1] - lat) / GRID_STEP) * GRID_STEP;
  return [cLon - HALF, cLat - HALF, cLon + HALF, cLat + HALF].map((v) => Math.round(v * 1000) / 1000) as [number, number, number, number];
}

/** Sel (kolom, baris) crop yang memuat koordinat. */
export function cropCell(bbox: [number, number, number, number], [lon, lat]: LngLat) {
  return {
    col: Math.floor((lon - bbox[0]) / GRID_STEP + 1e-9),
    row: Math.floor((bbox[3] - lat) / GRID_STEP + 1e-9),
  };
}

const inEllipse = (fx: number, fy: number, [cx, cy, rx, ry]: [number, number, number, number]) =>
  ((fx - cx) / rx) ** 2 + ((fy - cy) / ry) ** 2 <= 1;

export function buildThermal(spec: ThermalSpec): ThermalCrop {
  const n = CROP_CELLS;
  const bbox = cropBbox(spec.centre);
  const cells = spec.pixels.map((p) => cropCell(bbox, p));
  const rep = cropCell(bbox, spec.rep);
  const cx = cells.reduce((s, c) => s + c.col, 0) / cells.length;
  const cy = cells.reduce((s, c) => s + c.row, 0) / cells.length;
  const sigma = 0.7 + 0.5 * spec.heat;

  const cloud: boolean[] = [];
  const kernel: number[] = [];
  const hot0: number[] = []; // latar kanal panas Himawari
  const ref0: number[] = []; // latar kanal acuan Himawari
  const hot1: number[] = []; // GK2A
  const ref1: number[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const fx = (c + 0.5) / n, fy = (r + 0.5) / n;
      cloud.push(CLOUDS.some((e) => inEllipse(fx, fy, e)) || (!!spec.cloudNear && inEllipse(fx, fy, CLOUD_NEAR)));
      // inti = sel kelompok (piksel perwakilan paling panas), halo = lereng suhu di sekitarnya
      let core = 0;
      cells.forEach((p, i) => { core = Math.max(core, (i === 0 ? 1 : 0.82 + 0.16 * rand(i, spec.seed, 7)) * Math.exp(-((c - p.col) ** 2 + (r - p.row) ** 2) / (2 * sigma * sigma))); });
      const halo = spec.heat * 0.5 * Math.exp(-((c - cx) ** 2 + (r - cy) ** 2) / (2 * 2.4 * 2.4));
      kernel.push(Math.max(core, halo));
      const drift = 0.9 * ((c / n - 0.5) * 0.8 + (r / n - 0.5) * 0.5); // gradasi pelan di seluruh crop
      const ref = 296.9 + drift + (rand(c, r, spec.seed) - 0.5) * 0.7;
      ref0.push(ref);
      hot0.push(ref - 1.6 + (rand(c, r, spec.seed + 1) - 0.5) * 0.9); // malam: 3,9 µm sedikit lebih dingin dari 11 µm
      ref1.push(ref - 0.3 + (rand(c, r, spec.seed + 2) - 0.5) * 0.4);
      hot1.push(ref - 1.4 + (rand(c, r, spec.seed + 3) - 0.5) * 0.6);
    }
  }
  const idx = rep.row * n + rep.col;

  // Amplitudo titik panas dicari supaya anomali di piksel perwakilan tepat sama dengan target.
  const make = (aH: number, aG: number): ThermalCrop => {
    const band = (sat: 'himawari' | 'gk2a', id: string, um: number, base: number[], amp: number): ThermalBand => ({
      sat, band: id, um,
      values: base.map((v, i) => (cloud[i] ? null : r1(v + amp * kernel[i]))),
    });
    return {
      bbox, cols: n, rows: n,
      bands: [
        band('himawari', 'B07', 3.9, hot0, aH), band('himawari', 'B14', 11.2, ref0, aH / 11),
        band('gk2a', 'SW038', 3.8, hot1, aG), band('gk2a', 'IR105', 10.5, ref1, aG / 11),
      ],
    };
  };
  let aH = spec.targets.himawari * 1.1, aG = spec.targets.gk2a * 1.1;
  let crop = make(aH, aG);
  for (let it = 0; it < 8; it++) {
    const [h, g] = readingAt(crop, rep.col, rep.row);
    aH += ((spec.targets.himawari - (h.anomaly ?? 0)) * 1.1) / kernel[idx];
    aG += ((spec.targets.gk2a - (g.anomaly ?? 0)) * 1.1) / kernel[idx];
    crop = make(aH, aG);
  }
  return crop;
}

/** Nilai u → angka terukur yang menghasilkannya; di luar 0–1 (jenuh) dilebihkan sedikit secara deterministik. */
export function rawFromU(u: number, [lo, hi]: [number, number], seed: number, over = 0.6): number {
  if (u >= 1) return hi + over + 0.8 * rand(seed, 1);
  if (u <= 0) return lo - (0.4 + 0.8 * rand(seed, 2));
  return lo + u * (hi - lo);
}

/** Citra termal mock (SVG) digambar dari grid kanal panas Himawari dengan skala warna yang sama dengan legenda. */
export function himawariImageUrl(crop: ThermalCrop, label: string, seed: number): string {
  const hot = crop.bands.find((b) => b.sat === 'himawari' && b.um < 5)!;
  const rects = hot.values.map((v, i) => {
    const c = i % crop.cols, r = Math.floor(i / crop.cols);
    const fill = thermalColor(v ?? 274 + 8 * rand(c, r, seed));
    return `<rect x='${c}' y='${r}' width='1.02' height='1.02' fill='${fill}'/>`;
  }).join('');
  const n = crop.cols;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${n} ${n}'>
<defs><filter id='b' x='0' y='0' width='${n}' height='${n}' filterUnits='userSpaceOnUse'><feGaussianBlur stdDeviation='0.32'/></filter></defs>
<rect width='${n}' height='${n}' fill='#262b31'/><g filter='url(#b)'>${rects}</g>
<text x='0.6' y='${n - 0.5}' font-family='monospace' font-size='0.85' fill='#9aa4ad'>${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

interface DetailArgs {
  attrs: Attributes;
  neighbourAnomalies: number; // jumlah tetangga U0 ≥ 0,5
  crop: ThermalCrop;
  rep: { col: number; row: number };
  nightPeaks: { night: string; peak: number }[];
  seed: number;
}

/** Angka terukur di balik tiap atribut u, diambil dari grid supaya sama dengan tooltip citra. */
export function attributeDetails({ attrs, neighbourAnomalies, crop, rep, nightPeaks, seed }: DetailArgs): Record<AttrKey, AttrDetail> {
  const [h, g] = readingAt(crop, rep.col, rep.row);
  const sat = (s: typeof h): AttrDetail => ({
    value: s.anomaly == null ? null : r1(s.anomaly),
    unit: 'K',
    scale: ATTR_SCALES[s.sat === 'himawari' ? 'u_H' : 'u_G'],
    parts: [
      { key: s.hot.band.toLowerCase(), value: s.hot.k, unit: 'K', abs: true },
      { key: s.ref.band.toLowerCase(), value: s.ref.k, unit: 'K', abs: true },
      { key: 'dt', value: s.dt == null ? null : r1(s.dt), unit: 'K' },
      { key: 'bg_dt', value: r1(s.bgDt), unit: 'K' },
      { key: 'sigma', value: r1(s.sigma), unit: 'K' },
    ],
  });

  const lst = h.ref.k; // LST dipadankan dengan kanal 11 µm di piksel perwakilan
  const surface = (key: 'u_LST' | 'u_SAT', refKey: 'ts' | 't2m'): AttrDetail => {
    const u = attrs[key];
    if (u == null || lst == null) return { value: null, unit: 'K', scale: ATTR_SCALES[key], parts: [] };
    const delta = r1(rawFromU(u, ATTR_SCALES[key], seed + (key === 'u_LST' ? 11 : 13), 0.3));
    return {
      value: delta, unit: 'K', scale: ATTR_SCALES[key],
      parts: [
        { key: 'lst', value: lst, unit: 'K', abs: true },
        { key: refKey, value: r1(lst - delta), unit: 'K', abs: true },
      ],
    };
  };

  const nights = nightPeaks.map((p): AttrPart => ({ key: 'night_peak', value: p.peak, unit: 'U', at: p.night }));
  return {
    u_H: attrs.u_H == null ? { value: null, unit: 'K', scale: ATTR_SCALES.u_H, parts: [] } : sat(h),
    u_G: attrs.u_G == null ? { value: null, unit: 'K', scale: ATTR_SCALES.u_G, parts: [] } : sat(g),
    u_LST: surface('u_LST', 'ts'),
    u_SAT: surface('u_SAT', 't2m'),
    u_T: {
      value: attrs.u_T == null ? null : nightPeaks.filter((p) => p.peak >= T_WATCH).length,
      unit: 'malam', scale: ATTR_SCALES.u_T, parts: nights,
    },
    u_N: { value: neighbourAnomalies, unit: 'piksel', scale: ATTR_SCALES.u_N, parts: [] },
  };
}
