import type { ClusterDetail } from '../types';
import { PROVINCES } from './provinces';
import { fmtNum, fmtSlot } from './format';

export const CAPTION_MAX = 1024;

/** Templat caption Telegram (ui.html 03b). Selalu Bahasa Indonesia; angka dari data, tidak diketik ulang. */
export function buildCaption(c: ClusterDetail): string {
  const [lon, lat] = c.centroid;
  const nNbr = Math.round(c.neighbour_support * 8);
  const v = c.verification;
  const reason = v?.evidence.find((e) => e.source !== 'rule_engine')?.finding;
  const verLine = v
    ? `${v.result === 'strong_evidence' ? 'Bukti kuat' : 'Inkonklusif'}: ${reason ?? '-'}`
    : 'Belum diverifikasi agen';
  return [
    '<b>AWAS · Dugaan gambut membara</b>',
    `📍 ${PROVINCES[c.province].id} · ${lat.toFixed(2)}, ${lon.toFixed(2)} · ${c.pixels.length} piksel`,
    `🛰️ Himawari + GK2A sepakat · utility ${fmtNum(c.utility_score, 2, 'id')} · tetangga ${nNbr}/8`,
    `🔎 ${verLine}`,
    `🕙 Slot ${fmtSlot(c.trigger_slot, 'id')}`,
    'Status AWAS dari aturan satelit; bukan konfirmasi lapangan.',
  ].join('\n');
}
