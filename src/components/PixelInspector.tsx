import { Link } from 'react-router';
import type { PixelIndex, StatusCode } from '../types';
import { useI18n } from '../i18n';
import { fmtCoord, fmtNight, fmtNum } from '../lib/format';
import { CODE_STATUS, cellCenter, pixelIdOf, provinceOf } from '../lib/grid';
import { exitFast, m, spring } from '../motion';
import { StatusBadge } from './StatusBadge';
import { IconX } from './icons';

interface Props {
  index: PixelIndex;
  cell: number;
  status: StatusCode | null; // di slot yang sedang ditampilkan
  latestStatus: StatusCode | null; // slot terbaru malam replay; null = tidak ditampilkan
  utility: number | null | undefined; // slot terbaru; undefined = tidak ditampilkan (malam arsip)
  nSat: number | null;
  clusterId: string | null;
  history: (StatusCode | null)[]; // status sel ini per slot malam yang dibuka
  slot: number;
  isLatest: boolean;
  night: string | null; // malam arsip yang dibuka; null = malam terbaru
  onClose(): void;
}

/** Kartu inspektur piksel: menggantikan popup, juga dipakai dari hasil pencarian. */
export function PixelInspector({ index, cell, status, latestStatus, utility, nSat, clusterId, history, slot, isLatest, night, onClose }: Props) {
  const { t, lang } = useI18n();
  const [lon, lat] = cellCenter(index, cell);
  const historyLabel = night ? t('insp.history_night', { date: fmtNight(night, lang) }) : t('insp.history');
  return (
    <m.section
      className="inspector" aria-label={t('insp.title')} layout="position"
      initial={{ opacity: 0, x: -18, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1, transition: spring }}
      exit={{ opacity: 0, x: -12, scale: 0.97, transition: exitFast }} transition={spring}
    >
      <header>
        <span className="lbl">{t('insp.title')}</span>
        <button className="icon-btn sm" onClick={onClose} aria-label={t('insp.close')}><IconX size={13} /></button>
      </header>
      <p className="insp-id">{pixelIdOf(index, cell)}</p>
      <p className="muted small">{t(`prov.${provinceOf(index, cell)}`)} · {fmtCoord(lon, lat)}</p>
      <dl className="insp-facts">
        <div>
          <dt>{isLatest && !night ? t('insp.status') : t('insp.status_at')}</dt>
          <dd>{status ? <StatusBadge status={CODE_STATUS[status]} /> : '—'}</dd>
        </div>
        {!isLatest && latestStatus && (
          <div><dt>{t('insp.status_latest')}</dt><dd><StatusBadge status={CODE_STATUS[latestStatus]} /></dd></div>
        )}
        {utility !== undefined && (
          <div>
            <dt>{isLatest ? t('map.utility') : t('insp.utility_latest')}</dt>
            <dd className="mono">{utility == null ? t('map.no_value') : fmtNum(utility, 2, lang)}</dd>
          </div>
        )}
        <div><dt>{t('insp.n_sat')}</dt><dd className="mono">{nSat == null ? '—' : `${nSat}/2`}</dd></div>
      </dl>
      <div className="insp-history" aria-label={historyLabel}>
        <span className="lbl">{historyLabel}</span>
        <span className="hist-cells" style={{ ['--now' as string]: slot }}>
          {history.map((s, i) => <i key={i} className={s ? `h-${s}` : ''} />)}
        </span>
      </div>
      {clusterId && <Link className="btn primary wide" to={`/kelompok/${clusterId}`}>{t('insp.open_cluster', { id: clusterId })}</Link>}
    </m.section>
  );
}
