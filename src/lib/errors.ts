import { ApiError } from '../types';

/**
 * Teks galat dalam bahasa UI: dari `code` bila dikenal, selain itu `message` server.
 * Galat jaringan (fetch gagal) memakai teks umum agar pesan bawaan browser tidak tampil.
 */
export function errorText(e: unknown, t: (key: string) => string): string {
  if (e instanceof ApiError) {
    const key = `err.${e.code}`;
    const s = t(key);
    return s === key ? e.message : s;
  }
  return t('err.network');
}
