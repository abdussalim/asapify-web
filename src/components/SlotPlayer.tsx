import { useMemo } from 'react';
import type { Meta, NightCompact, SatState } from '../types';
import { useI18n } from '../i18n';
import { fmtDate, fmtTime } from '../lib/format';
import { NIGHT_SLOTS, SLOT_MS, nightStart, slotIndex } from '../lib/grid';

interface Props {
  meta: Meta;
  night: NightCompact | null;
  slot: number;
  latest: number;
  playing: boolean;
  onSlot(i: number): void;
  onPlay(playing: boolean): void;
}

const LATE_MIN = 40;

/**
 * Pita malam yang bisa diputar: baris ▲ = jumlah piksel AWAS per slot, baris H/G = file satelit
 * yang tersedia. Penggeser (input range) berada di atas pita agar bisa dipakai dengan keyboard.
 */
export function SlotPlayer({ meta, night, slot, latest, playing, onSlot, onPlay }: Props) {
  const { t, lang } = useI18n();
  const start = nightStart(meta.last_slot);
  const slotIso = (i: number) => new Date(start + i * SLOT_MS).toISOString();

  // Jumlah AWAS per slot dihitung sekali per data malam.
  const awas = useMemo(() => night?.status.map((s) => (s == null ? null : s.split('A').length - 1)) ?? [], [night]);
  const maxAwas = Math.max(1, ...awas.map((n) => n ?? 0));

  const sats: [string, SatState][] = [['H', meta.sats.himawari], ['G', meta.sats.gk2a]];
  const ticks = [0, 12, 24, 36, 48];
  const isLatest = slot === latest;

  return (
    <div className="player" role="group" aria-label={t('player.title', { date: fmtDate(slotIso(0), lang) })}>
      <div className="player-head">
        <button
          className="play-btn" onClick={() => onPlay(!playing)} disabled={!night || latest < 1}
          aria-label={playing ? t('player.pause') : t('player.play')} title={playing ? t('player.pause') : t('player.play')}
        >
          {playing ? '❚❚' : '▶'}
        </button>
        <span className="player-slot">
          <b>{fmtTime(slotIso(slot), lang)} WIB</b>
          <small>{isLatest ? t('player.latest') : t('player.replaying')}</small>
        </span>
        <span className="player-night">{t('player.title', { date: fmtDate(slotIso(0), lang) })}</span>
        <button className="link-btn" onClick={() => onSlot(latest)} disabled={isLatest}>{t('player.to_latest')}</button>
      </div>

      <div className="ribbon" style={{ ['--now' as string]: slot }}>
        <div className="ribbon-row awas-row">
          <b aria-hidden="true">▲</b>
          <span className="ribbon-cells" aria-hidden="true">
            {Array.from({ length: NIGHT_SLOTS }, (_, i) => {
              const n = awas[i];
              return (
                <i key={i} className={n == null ? '' : n > 0 ? 'hot' : 'zero'}
                  style={n ? { ['--a' as string]: 0.35 + (0.65 * n) / maxAwas } : undefined} />
              );
            })}
          </span>
        </div>
        {sats.map(([k, s]) => {
          const last = slotIndex(s.last_slot, start);
          const late = s.last_slot == null || (s.delay_min ?? 0) > LATE_MIN;
          return (
            <div className="ribbon-row" key={k}>
              <b aria-hidden="true">{k}</b>
              <span className="ribbon-cells" aria-hidden="true">
                {Array.from({ length: NIGHT_SLOTS }, (_, i) => (
                  <i key={i} className={i <= last ? (late ? 'have late' : 'have') : i <= latest ? 'gap' : ''} />
                ))}
              </span>
            </div>
          );
        })}
        <span className="ribbon-now" aria-hidden="true" />
        <input
          className="ribbon-range" type="range" min={0} max={Math.max(0, latest)} step={1} value={slot}
          onChange={(e) => onSlot(Number(e.target.value))}
          aria-label={t('player.slider')} aria-valuetext={`${fmtTime(slotIso(slot), lang)} WIB`}
          style={{ ['--latest' as string]: latest }}
        />
      </div>
      <div className="ribbon-axis" aria-hidden="true">
        {ticks.map((i) => <span key={i} style={{ ['--i' as string]: i }}>{fmtTime(slotIso(i), lang)}</span>)}
      </div>
    </div>
  );
}
