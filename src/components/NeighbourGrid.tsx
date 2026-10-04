import type { Neighbour, NeighbourDir } from '../types';
import { useI18n } from '../i18n';
import { fmtNum } from '../lib/format';
import { IconCloud } from './icons';

const LAYOUT: (NeighbourDir | 'c')[] = ['nw', 'n', 'ne', 'w', 'c', 'e', 'sw', 's', 'se'];

/** Mini-grid 3 × 3 di sekitar piksel perwakilan. */
export function NeighbourGrid({ neighbours }: { neighbours: Neighbour[] }) {
  const { t, lang } = useI18n();
  const byDir = new Map(neighbours.map((n) => [n.dir, n]));
  const k = neighbours.filter((n) => n.state === 'anomaly').length;
  const label = (n: Neighbour) => t(`nbr.${n.state}`);

  return (
    <div className="nbfig">
      <div className="nbg" role="group" aria-label={t('nbr.title')}>
        {LAYOUT.map((d) => {
          if (d === 'c') return <span key="c" className="p" aria-label={t('nbr.center')}>P</span>;
          const n = byDir.get(d);
          if (!n) return <span key={d} className="x" />;
          return (
            <span key={d} className={n.state} aria-label={`${d.toUpperCase()}: ${label(n)}`} title={label(n)}>
              {n.state === 'cloud' ? <IconCloud size={13} /> : n.state === 'non_peat' ? '—' : n.u0 != null ? fmtNum(n.u0, 1, lang) : ''}
            </span>
          );
        })}
      </div>
      <div className="nb-legend">
        <span><i className="anomaly" />{t('nbr.anomaly')}</span>
        <span><i className="normal" />{t('nbr.normal')}</span>
        <span><i className="cloud" />{t('nbr.cloud')}</span>
        <span><i className="non_peat" />{t('nbr.non_peat')}</span>
      </div>
      <code className="nb-formula">{t('nbr.formula', { k, v: fmtNum(k / 8, 3, lang) })}</code>
    </div>
  );
}
