/** Acak deterministik 0–1 dari tiga bilangan bulat (data mock harus sama di tiap muat ulang). */
export function rand(a: number, b: number, s = 0): number {
  let h = (a * 374761393 + b * 668265263 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
