import type { LngLat, PixelIndex, ProvinceCode, Status, StatusCode } from '../types';

export const CODE_STATUS: Record<StatusCode, Status> = { S: 'SAFE', N: 'NO_OBSERVATION', W: 'WATCH', A: 'AWAS' };
export const STATUS_CODE: Record<Status, StatusCode> = { SAFE: 'S', NO_OBSERVATION: 'N', WATCH: 'W', AWAS: 'A' };

export const NIGHT_SLOTS = 54; // 20.00–04.50 WIB = 13.00–21.50 UTC
export const SLOT_MS = 600_000;

/** Awal malam (13.00 UTC = 20.00 WIB) yang memuat waktu ini, dalam ms. */
export function nightStart(iso: string): number {
  const t = Date.parse(iso);
  const d = new Date(t);
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 13);
  return t >= start ? start : start - 86_400_000;
}

/** Tanggal WIB saat malam dimulai, YYYY-MM-DD. */
export const nightOf = (iso: string) => new Date(nightStart(iso)).toISOString().slice(0, 10);

/** Indeks slot 0–53 dalam malamnya; -1 bila null. */
export function slotIndex(iso: string | null, start: number): number {
  if (iso == null) return -1;
  return Math.max(-1, Math.min(NIGHT_SLOTS - 1, Math.floor((Date.parse(iso) - start) / SLOT_MS)));
}

export function decodeUtility(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodeUtility(values: (number | null)[]): string {
  let bin = '';
  for (const v of values) bin += String.fromCharCode(v == null ? 255 : Math.round(Math.min(1, Math.max(0, v)) * 250));
  return btoa(bin);
}

export const utilityAt = (u: Uint8Array | null, i: number) => (!u || u[i] === 255 ? null : u[i] / 250);

export function cellCenter(ix: PixelIndex, i: number): LngLat {
  return [ix.origin[0] + (ix.cols[i] + 0.5) * ix.step, ix.origin[1] - (ix.rows[i] + 0.5) * ix.step];
}

export const pixelIdOf = (ix: PixelIndex, i: number) => `p${ix.rows[i]}_${ix.cols[i]}`;
export const provinceOf = (ix: PixelIndex, i: number) => `6${ix.province[i]}` as ProvinceCode;

const lookups = new WeakMap<PixelIndex, Map<number, number>>();
function lookup(ix: PixelIndex) {
  let m = lookups.get(ix);
  if (!m) {
    m = new Map();
    for (let i = 0; i < ix.rows.length; i++) m.set(ix.rows[i] * 100_000 + ix.cols[i], i);
    lookups.set(ix, m);
  }
  return m;
}

/** Indeks sel gambut di koordinat ini, atau -1. */
export function cellAt(ix: PixelIndex, lon: number, lat: number): number {
  const row = Math.floor((ix.origin[1] - lat) / ix.step);
  const col = Math.floor((lon - ix.origin[0]) / ix.step);
  return lookup(ix).get(row * 100_000 + col) ?? -1;
}

export function cellByPixelId(ix: PixelIndex, id: string): number {
  const m = /^p(\d+)_(\d+)$/.exec(id.trim());
  return m ? (lookup(ix).get(Number(m[1]) * 100_000 + Number(m[2])) ?? -1) : -1;
}

/** Kotak pembatas sekumpulan sel: [[w, s], [e, n]]. */
export function cellsBounds(ix: PixelIndex, cells: number[]): [[number, number], [number, number]] {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const i of cells) {
    const [x, y] = cellCenter(ix, i);
    w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y);
  }
  const h = ix.step / 2;
  return [[w - h, s - h], [e + h, n + h]];
}
