import { useSyncExternalStore } from 'react';

/** Mengikuti media query; dipakai untuk membedakan panel samping (lebar) dan bottom sheet (sempit). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', notify);
      return () => mq.removeEventListener('change', notify);
    },
    () => window.matchMedia(query).matches,
  );
}
