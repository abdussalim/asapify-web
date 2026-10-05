import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig } from 'motion/react';

// Elemen `initial={{ opacity: 0 }}` baru terlihat setelah fitur gerak termuat. Bila chunk-nya gagal diambil
// (jaringan putus, atau tab lama setelah deploy baru), tandai <html> supaya CSS menampilkan semuanya tanpa gerak.
const loadFeatures = () =>
  import('./features').then(
    (m) => m.default,
    (err) => {
      document.documentElement.classList.add('no-motion');
      throw err;
    },
  );

/**
 * Satu pembungkus untuk seluruh aplikasi. Hanya komponen `m` (bukan `motion`) yang dipakai: intinya ikut
 * bundel awal (±17 KB gzip), fitur gerak (animasi, gestur, layout, drag; ±20 KB gzip) dimuat belakangan.
 * `reducedMotion="user"` mematikan gerak transform dan layout bila sistem meminta (opacity tetap).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

/** Mode ringan (HP lemah / penghemat data) mematikan gerak transform seperti reduced-motion. */
export function LiteMotion({ lite, children }: { lite: boolean; children: ReactNode }) {
  return <MotionConfig reducedMotion={lite ? 'always' : 'user'}>{children}</MotionConfig>;
}
