import type { Transition, Variants } from 'motion/react';

/** Pegas bawaan: cukup kencang untuk kontrol kecil (dropdown, kenop, indikator yang meluncur). */
export const spring: Transition = { type: 'spring', stiffness: 520, damping: 38, mass: 0.75 };
/** Pegas lebih lembut untuk panel dan kartu yang masuk. */
export const springSoft: Transition = { type: 'spring', stiffness: 300, damping: 30, mass: 0.9 };
/** Pegas bottom sheet: tidak memantul berlebihan saat dilepas dari seretan. */
export const springSheet: Transition = { type: 'spring', stiffness: 420, damping: 40, mass: 0.9 };
/** Untuk tinggi `auto`: pegas bisa melewati 0 dan membuat tinggi negatif, jadi pakai kurva biasa. */
export const expandEase: Transition = { duration: 0.28, ease: [0.32, 0.72, 0, 1] };
export const exitFast: Transition = { duration: 0.12, ease: 'easeIn' };

/** Muncul naik sedikit; `custom` = urutan untuk jeda antaranggota (stagger). */
export const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { ...springSoft, delay: Math.min(i, 8) * 0.055 } }),
};

/** Props siap sebar untuk elemen yang muncul saat masuk layar (sekali saja). */
export const reveal = (i = 0) => ({
  variants: rise,
  custom: i,
  initial: 'hidden' as const,
  whileInView: 'show' as const,
  viewport: { once: true, margin: '0px 0px -40px 0px' },
});
