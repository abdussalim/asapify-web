import type { LngLat } from '../types';

const R_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

/** Jarak lingkaran besar (haversine) antara dua titik [lon, lat], km. */
export function distKm([lon1, lat1]: LngLat, [lon2, lat2]: LngLat): number {
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.sqrt(a));
}
