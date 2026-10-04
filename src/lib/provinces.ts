import type { ProvinceCode } from '../types';

type Bounds = [[number, number], [number, number]];

export const KALIMANTAN: Bounds = [[108.5, -4.4], [119.4, 4.5]];

// Kotak kasar untuk fitBounds saat filter provinsi; bukan batas administrasi.
export const PROVINCES: Record<ProvinceCode, { id: string; en: string; bounds: Bounds }> = {
  '61': { id: 'Kalimantan Barat', en: 'West Kalimantan', bounds: [[108.5, -3.1], [114.2, 2.1]] },
  '62': { id: 'Kalimantan Tengah', en: 'Central Kalimantan', bounds: [[110.7, -3.6], [116.0, 0.8]] },
  '63': { id: 'Kalimantan Selatan', en: 'South Kalimantan', bounds: [[114.3, -4.2], [116.6, -1.3]] },
  '64': { id: 'Kalimantan Timur', en: 'East Kalimantan', bounds: [[113.8, -2.5], [119.1, 2.6]] },
  '65': { id: 'Kalimantan Utara', en: 'North Kalimantan', bounds: [[114.6, 1.1], [118.0, 4.4]] },
};
export const PROVINCE_CODES = Object.keys(PROVINCES) as ProvinceCode[];
