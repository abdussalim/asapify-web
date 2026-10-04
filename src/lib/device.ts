import { load, save } from './storage';

export type LiteReason = 'save_data' | 'memory' | 'cpu' | 'motion';

/** Tanda device lemah / hemat data. null = tidak terdeteksi. */
export function detectLite(): LiteReason | null {
  const n = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
  const mem = n.deviceMemory ?? 8; // Safari/Firefox tidak melaporkan RAM
  const cores = n.hardwareConcurrency ?? 8;
  if (n.connection?.saveData) return 'save_data';
  if (mem <= 2) return 'memory';
  // 4 inti saja bukan tanda lemah (banyak laptop menengah); 4 inti + RAM ≤ 4 GB biasanya HP kelas bawah.
  if (cores <= 2 || (cores <= 4 && mem <= 4)) return 'cpu';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'motion';
  return null;
}

const KEY = 'asapify.lite';

/** Pilihan operator menimpa deteksi otomatis. */
export function loadLitePref(): boolean | null {
  const v = load(KEY);
  return v === '1' ? true : v === '0' ? false : null;
}
export function saveLitePref(v: boolean | null) { save(KEY, v == null ? null : v ? '1' : '0'); }
