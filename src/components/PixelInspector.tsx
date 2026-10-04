import { Link } from 'react-router';
import type { PixelIndex, StatusCode } from '../types';
import { useI18n } from '../i18n';
import { fmtCoord, fmtNum } from '../lib/format';
import { CODE_STATUS, cellCenter, pixelIdOf, provinceOf } from '../lib/grid';
import { StatusBadge } from './StatusBadge';
import { IconX } from './icons';

interface Props {
  index: PixelIndex;
  cell: number;
  status: StatusCode | null; // di slot yang sedang ditampilkan
  latestStatus: StatusCode | null;
  utility: number | null; // slot terbaru
  nSat: number | null;
  clusterId: string | null;
  history: (StatusCode | null)[]; // status sel ini per slot malam ini
  slot: number;
  isLatest: boolean;
  onClose(): void;
}

/** Kartu inspektur piksel: menggantikan popup, juga dipakai dari hasil pencarian. */
export function PixelInspector({ index, cell, status, latestStatus, utility, nSat, clusterId, history, slot, isLatest, onClose }: Props) {
  const { t, lang } = useI18n();
  const [lon, lat] = cellCenter(index, cell);
  return (
    <section className="inspector" aria-label={t('insp.title')}>
      <header>
        <span className="lbl">{t('insp.title')}</span>
        <button className="icon-btn sm" onClick={onClose} aria-label={t('insp.close')}><IconX size={13} /></button>
      </header>
      <p className="insp-id">{pixelIdOf(index, cell)}</p>
      <p className="muted small">{t(`prov.${provinceOf(index, cell)}`)} · {fmtCoord(lon, lat)}</p>
      <dl className="insp-facts">
        <div>
          <dt>{isLatest ? t('insp.status') : t('insp.status_at')}</dt>
          <dd>{status ? <StatusBadge status={CODE_STATUS[status]} /> : '—'}</dd>
        </div>
        {!isLatest && (
          <div><dt>{t('insp.status_latest')}</dt><dd>{latestStatus ? <StatusBadge status={CODE_STATUS[latestStatus]} /> : '—'}</dd></div>
        )}
        <div>
          <dt>{isLatest ? t('map.utility') : t('insp.utility_latest')}</dt>
          <dd className="mono">{utility == null ? t('map.no_value') : fmtNum(utility, 2, lang)}</dd>
        </div>
        <div><dt>{t('insp.n_sat')}</dt><dd className="mono">{nSat == null ? '—' : `${nSat}/2`}</dd></div>
      </dl>
      <div className="insp-history" aria-label={t('insp.history')}>
        <span className="lbl">{t('insp.history')}</span>
        <span className="hist-cells" style={{ ['--now' as string]: slot }}>
          {history.map((s, i) => <i key={i} className={s ? `h-${s}` : ''} />)}
        </span>
      </div>
      {clusterId && <Link className="btn primary wide" to={`/kelompok/${clusterId}`}>{t('map.open_detail')} {clusterId} →</Link>}
    </section>
  );
}
