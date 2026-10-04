import type { Meta } from '../types';
import { useI18n } from '../i18n';
import { fmtSlot } from '../lib/format';

const LATE_MIN = 40;

/** Slot terakhir + satelit; kuning bila satu satelit > 40 menit terlambat, biru untuk replay. */
export function DataBanner({ meta, cloudy }: { meta: Meta; cloudy: boolean }) {
  const { t, lang } = useI18n();
  const sats = [
    ['Himawari', meta.sats.himawari],
    ['GK2A', meta.sats.gk2a],
  ] as const;
  const late = sats.filter(([, s]) => s.last_slot == null || (s.delay_min ?? 0) > LATE_MIN);

  return (
    <div className="banners" role="status">
      <div className="banner">
        <span>{t('banner.slot', { slot: fmtSlot(meta.last_slot, lang) })}</span>
        {sats.map(([name, s]) => {
          const isLate = late.some(([n]) => n === name);
          return (
            <span key={name} className={isLate ? 'late' : 'ok'}>
              {name} {isLate ? `✕ ${t('sat.late', { min: s.delay_min ?? '?' })}` : '✓'}
            </span>
          );
        })}
      </div>
      {meta.replay && <div className="banner info">{t('banner.replay', { when: fmtSlot(meta.as_of, lang) })}</div>}
      {late.length > 0 && <div className="banner warn">{t('banner.one_sat', { sat: late.map(([n]) => n).join(' + ') })}</div>}
      {!meta.is_night && <div className="banner">{t('banner.day')}</div>}
      {cloudy && <div className="banner">{t('banner.cloudy')}</div>}
    </div>
  );
}
