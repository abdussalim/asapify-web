import type { LngLat, ThermalBand, ThermalCrop } from '../types';

export type Sat = 'himawari' | 'gk2a';
export const SAT_NAME: Record<Sat, string> = { himawari: 'Himawari-9', gk2a: 'GK2A' };

export const kToC = (k: number) => k - 273.15;

// Skala warna citra termal kanal panas (3,8–3,9 µm), suhu kecerahan K: awan dingin (abu terang) → tanah
// malam (gelap) → panas (oranye → putih). Dipakai citra mock, legenda, dan penanda di tooltip.
export const THERMAL_STOPS: [number, string][] = [
  [270, '#d8dee4'], [282, '#8f9aa5'], [290, '#3c434b'], [298, '#262b31'], [304, '#5b2a1d'],
  [310, '#a8380f'], [316, '#ff6a00'], [324, '#ffb347'], [332, '#fff1bf'], [340, '#ffffff'],
];

const hex = (c: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number];
const STOPS_RGB = THERMAL_STOPS.map(([k, c]) => [k, hex(c)] as const);

export function thermalColor(k: number): string {
  const first = STOPS_RGB[0], last = STOPS_RGB[STOPS_RGB.length - 1];
  const rgb = k <= first[0] ? first[1] : k >= last[0] ? last[1] : (() => {
    const i = STOPS_RGB.findIndex(([sk]) => sk >= k);
    const [k0, c0] = STOPS_RGB[i - 1], [k1, c1] = STOPS_RGB[i];
    const f = (k - k0) / (k1 - k0);
    return c0.map((v, j) => v + (c1[j] - v) * f);
  })();
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
}

/** Gradien CSS untuk legenda, dari `lo` sampai `hi` K. */
export function thermalGradient(lo: number, hi: number): string {
  const n = 12;
  return `linear-gradient(90deg, ${Array.from({ length: n + 1 }, (_, i) => `${thermalColor(lo + ((hi - lo) * i) / n)} ${(i / n) * 100}%`).join(', ')})`;
}

function median(v: number[]): number {
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Sepasang kanal satu satelit: panas (< 5 µm) dan acuan (≥ 5 µm), dengan latar selisihnya di seluruh crop. */
export interface SatChannels {
  sat: Sat;
  hot: ThermalBand;
  ref: ThermalBand;
  bgDt: number; // median selisih (panas − acuan) di sel teramati: latar crop
  sigma: number; // simpangan latar (MAD × 1,4826), dengan lantai 0,3 K
}

const memo = new WeakMap<ThermalCrop, SatChannels[]>();

export function channelsOf(crop: ThermalCrop): SatChannels[] {
  let out = memo.get(crop);
  if (out) return out;
  out = [];
  for (const sat of ['himawari', 'gk2a'] as const) {
    const bands = crop.bands.filter((b) => b.sat === sat);
    const hot = bands.find((b) => b.um < 5), ref = bands.find((b) => b.um >= 5);
    if (!hot || !ref) continue;
    const dts: number[] = [];
    for (let i = 0; i < hot.values.length; i++) {
      const h = hot.values[i], r = ref.values[i];
      if (h != null && r != null) dts.push(h - r);
    }
    if (!dts.length) continue;
    const bgDt = median(dts);
    const mad = median(dts.map((d) => Math.abs(d - bgDt)));
    out.push({ sat, hot, ref, bgDt, sigma: Math.max(0.3, mad * 1.4826) });
  }
  memo.set(crop, out);
  return out;
}

export interface SatReading {
  sat: Sat;
  hot: { band: string; um: number; k: number | null };
  ref: { band: string; um: number; k: number | null };
  dt: number | null; // panas − acuan
  anomaly: number | null; // dt − latar
  z: number | null; // anomali ÷ simpangan latar
  bgDt: number;
  sigma: number;
}

/** Bacaan semua satelit di sel (col, row); k null = tertutup awan. */
export function readingAt(crop: ThermalCrop, col: number, row: number): SatReading[] {
  const i = row * crop.cols + col;
  return channelsOf(crop).map((c) => {
    const h = c.hot.values[i] ?? null, r = c.ref.values[i] ?? null;
    const dt = h != null && r != null ? h - r : null;
    return {
      sat: c.sat,
      hot: { band: c.hot.band, um: c.hot.um, k: h },
      ref: { band: c.ref.band, um: c.ref.um, k: r },
      dt,
      anomaly: dt == null ? null : dt - c.bgDt,
      z: dt == null ? null : (dt - c.bgDt) / c.sigma,
      bgDt: c.bgDt,
      sigma: c.sigma,
    };
  });
}

/** Titik tengah sel (col, row) sebagai [lon, lat]. */
export function cellLonLat(crop: ThermalCrop, col: number, row: number): LngLat {
  const [w, s, e, n] = crop.bbox;
  return [w + ((col + 0.5) * (e - w)) / crop.cols, n - ((row + 0.5) * (n - s)) / crop.rows];
}

/** Sel di pecahan (0–1) lebar/tinggi citra. */
export function cellOf(crop: ThermalCrop, fx: number, fy: number): { col: number; row: number } {
  const clamp = (v: number, n: number) => Math.min(n - 1, Math.max(0, Math.floor(v * n)));
  return { col: clamp(fx, crop.cols), row: clamp(fy, crop.rows) };
}

/** Rentang suhu kecerahan kanal panas satelit pertama, untuk legenda. */
export function hotRange(crop: ThermalCrop): [number, number] | null {
  const hot = channelsOf(crop)[0]?.hot.values.filter((v): v is number => v != null);
  return hot?.length ? [Math.min(...hot), Math.max(...hot)] : null;
}
