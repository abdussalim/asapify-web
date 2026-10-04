// Dipisah dari fixtures.ts supaya topbar bisa membaca skenario tanpa ikut memuat data mock.
export const SCENARIOS = ['normal', 'kosong', 'awan', 'satu_satelit', 'siang'] as const;
export type Scenario = (typeof SCENARIOS)[number];

const isScenario = (s: string | null): s is Scenario => !!s && (SCENARIOS as readonly string[]).includes(s);

/** ?skenario=… dipakai untuk mendemokan keadaan layar; diingat selama tab terbuka. */
export function currentScenario(): Scenario {
  const q = new URLSearchParams(location.search).get('skenario');
  try {
    if (isScenario(q)) sessionStorage.setItem('asapify.skenario', q);
    const s = sessionStorage.getItem('asapify.skenario');
    if (isScenario(s)) return s;
  } catch { /* sessionStorage diblokir */ }
  return isScenario(q) ? q : 'normal';
}
