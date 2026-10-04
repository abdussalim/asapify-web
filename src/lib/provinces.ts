import type { ProvinceCode } from '../types';

type Bounds = [[number, number], [number, number]];
export type Island = 'sumatra' | 'kalimantan';

/** Wilayah pantau: gambut Sumatra + Kalimantan. */
export const REGION: Bounds = [[94.9, -6.1], [119.4, 6.0]];

// Kotak pembatas dari batas provinsi geoBoundaries (untuk fitBounds saat filter), bukan batas resmi.
export const PROVINCES: Record<ProvinceCode, { id: string; en: string; island: Island; bounds: Bounds }> = {
  '11': { id: 'Aceh', en: 'Aceh', island: 'sumatra', bounds: [[95.01, 2.0], [98.29, 5.91]] },
  '12': { id: 'Sumatera Utara', en: 'North Sumatra', island: 'sumatra', bounds: [[97.06, -0.6], [100.44, 4.3]] },
  '13': { id: 'Sumatera Barat', en: 'West Sumatra', island: 'sumatra', bounds: [[98.6, -3.35], [101.89, 0.9]] },
  '14': { id: 'Riau', en: 'Riau', island: 'sumatra', bounds: [[100.07, -1.12], [103.81, 2.56]] },
  '15': { id: 'Jambi', en: 'Jambi', island: 'sumatra', bounds: [[101.12, -2.77], [104.49, -0.75]] },
  '16': { id: 'Sumatera Selatan', en: 'South Sumatra', island: 'sumatra', bounds: [[102.06, -4.92], [106.1, -1.63]] },
  '17': { id: 'Bengkulu', en: 'Bengkulu', island: 'sumatra', bounds: [[101.03, -5.51], [103.78, -2.28]] },
  '18': { id: 'Lampung', en: 'Lampung', island: 'sumatra', bounds: [[103.6, -5.94], [105.92, -3.72]] },
  '19': { id: 'Kepulauan Bangka Belitung', en: 'Bangka Belitung Islands', island: 'sumatra', bounds: [[105.11, -3.27], [108.98, -1.5]] },
  '21': { id: 'Kepulauan Riau', en: 'Riau Islands', island: 'sumatra', bounds: [[103.31, -0.68], [109.12, 4.77]] },
  '61': { id: 'Kalimantan Barat', en: 'West Kalimantan', island: 'kalimantan', bounds: [[108.84, -3.04], [114.21, 2.08]] },
  '62': { id: 'Kalimantan Tengah', en: 'Central Kalimantan', island: 'kalimantan', bounds: [[110.73, -3.54], [115.85, 0.8]] },
  '63': { id: 'Kalimantan Selatan', en: 'South Kalimantan', island: 'kalimantan', bounds: [[114.35, -4.18], [116.55, -1.3]] },
  '64': { id: 'Kalimantan Timur', en: 'East Kalimantan', island: 'kalimantan', bounds: [[113.84, -2.42], [118.99, 2.61]] },
  '65': { id: 'Kalimantan Utara', en: 'North Kalimantan', island: 'kalimantan', bounds: [[114.56, 1.05], [118.0, 4.41]] },
};
export const PROVINCE_CODES = Object.keys(PROVINCES).sort() as ProvinceCode[];
export const ISLANDS: Island[] = ['sumatra', 'kalimantan'];
export const provincesOf = (island: Island) => PROVINCE_CODES.filter((c) => PROVINCES[c].island === island);
