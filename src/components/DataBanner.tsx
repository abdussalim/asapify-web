import type { Meta, SatState } from '../types';
import { useI18n } from '../i18n';
import { fmtDate, fmtSlot, fmtTime } from '../lib/format';

const LATE_MIN = 40;
const SLOTS = 54; // 20.00–04.50 WIB = 13.00–21.50 UTC, tiap 10 menit
const SLOT_MS = 600_000;

/** Awal malam (13.00 UTC = 20.00 WIB) yang memuat slot ini. */
function nightStart(iso: string): number {
  const d = new Date(iso);
  const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 13);
  return d.getTime() >= start ? start : start - 86_400_000;
}

const slotIndex = (iso: string | null, start: number) =>
  iso == null ? -1 : Math.min(SLOTS - 1, Math.floor((Date.parse(iso) - start) / SLOT_MS));

/** Pita malam: satu baris per satelit, terisi sampai slot terakhir yang filenya ada. */
function NightRibbon({ meta }: { meta: Meta }) {
  const { t, lang } = useI18n();
  const start = nightStart(meta.last_slot);
  const now = slotIndex(meta.last_slot, start);
  const rows: [string, SatState][] = [['H', meta.sats.himawari], ['G', meta.sats.gk2a]];
  const upTo = (s: SatState) => (s.last_slot ? fmtTime(s.last_slot, lang) : t('ribbon.none'));
  const ticks = [0, 12, 24, 36, 48].map((i) => ({ i, label: fmtTime(new Date(start + i * SLOT_MS).toISOString(), lang) }));

  return (
    <figure className="ribbon" aria-label={t('ribbon.aria', { h: upTo(meta.sats.himawari), g: upTo(meta.sats.gk2a) })}>
      <figcaption>{t('ribbon.title', { date: fmtDate(new Date(start).toISOString(), lang) })}</figcaption>
      <div className="ribbon-rows" style={{ ['--now' as string]: now }}>
        {rows.map(([k, s]) => {
          const last = slotIndex(s.last_slot, start);
          const late = s.last_slot == null || (s.delay_min ?? 0) > LATE_MIN;
          return (
            <div className="ribbon-row" key={k}>
              <b>{k}</b>
              <span className="ribbon-cells" aria-hidden="true">
                {Array.from({ length: SLOTS }, (_, i) => (
                  <i key={i} className={i <= last ? (late ? 'have late' : 'have') : i <= now ? 'gap' : ''} />
                ))}
              </span>
            </div>
          );
        })}
        <span className="ribbon-now" aria-hidden="true" />
      </div>
      <div className="ribbon-axis" aria-hidden="true">
        {ticks.map((x) => <span key={x.i} style={{ ['--i' as string]: x.i }}>{x.label}</span>)}
      </div>
    </figure>
  );
}

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
      <div className="banner slot">
        <span className="slot-time">{t('banner.slot', { slot: fmtSlot(meta.last_slot, lang) })}</span>
        <span className="slot-sats">
          {sats.map(([name, s]) => {
            const isLate = late.some(([n]) => n === name);
            return (
              <span key={name} className={isLate ? 'late' : 'ok'}>
                {name} {isLate ? `✕ ${t('sat.late', { min: s.delay_min ?? '?' })}` : '✓'}
              </span>
            );
          })}
        </span>
        <NightRibbon meta={meta} />
      </div>
      {meta.replay && <div className="banner info">{t('banner.replay', { when: fmtSlot(meta.as_of, lang) })}</div>}
      {late.length > 0 && <div className="banner warn">{t('banner.one_sat', { sat: late.map(([n]) => n).join(' + ') })}</div>}
      {!meta.is_night && <div className="banner">{t('banner.day')}</div>}
      {cloudy && <div className="banner">{t('banner.cloudy')}</div>}
    </div>
  );
}
