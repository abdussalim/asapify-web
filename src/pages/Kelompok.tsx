import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '../types';
import { api } from '../api';
import { useI18n } from '../i18n';
import { useLoad } from '../lib/useLoad';
import { fmtCoord, fmtNum, fmtSlot } from '../lib/format';
import { T_AWAS, T_WATCH, WEIGHTS } from '../lib/maut';
import { buildCaption } from '../lib/caption';
import { StatusBadge } from '../components/StatusBadge';
import { EvidenceBadge } from '../components/EvidenceBadge';
import { UtilityChart } from '../components/UtilityChart';
import { AttributeBars } from '../components/AttributeBars';
import { NeighbourGrid } from '../components/NeighbourGrid';
import { SatelliteAgree } from '../components/SatelliteAgree';
import { EvidenceImage } from '../components/EvidenceImage';
import { ViirsList } from '../components/ViirsList';
import { ToolTrace } from '../components/ToolTrace';
import { DecisionPanel } from '../components/DecisionPanel';
import { IconAlert, IconArrowLeft } from '../components/icons';

export function Kelompok() {
  const { id = '' } = useParams();
  const { t, lang } = useI18n();
  const { data: c, error, loading, reload } = useLoad(() => api.cluster(id), [id]);
  const caption = useMemo(() => (c ? buildCaption(c) : ''), [c]);

  if (loading && !c) {
    return (
      <div className="wrap detail">
        <div className="skel" style={{ height: 64 }} />
        <div className="detail-grid">
          <div className="col">{[220, 260, 180].map((h, i) => <div key={i} className="skel" style={{ height: h }} />)}</div>
          <div className="col">{[420, 280].map((h, i) => <div key={i} className="skel" style={{ height: h }} />)}</div>
        </div>
      </div>
    );
  }

  if (error || !c) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="wrap detail">
        <Link className="back" to="/"><IconArrowLeft />{t('cluster.back')}</Link>
        <p className="error" role="alert">
          {notFound ? t('cluster.not_found') : t('load_error', { msg: error?.message ?? '' })}{' '}
          {!notFound && <button className="link-btn" onClick={reload}>{t('retry')}</button>}
        </p>
      </div>
    );
  }

  const v = c.verification;
  const [lon, lat] = c.centroid;

  return (
    <div className="wrap detail">
      <header className="detail-head">
        <Link className="back" to="/"><IconArrowLeft />{t('cluster.back')}</Link>
        <div className="title-row">
          <h1 className="mono">{c.id}</h1>
          {c.state === 'closed' ? <span className="pill grey">{t('cluster.closed')}</span> : <StatusBadge status="AWAS" />}
          <SatelliteAgree nSat={c.n_sat} agree={c.n_sat >= 2} />
        </div>
        <p className="muted">
          {t(`prov.${c.province}`)} · {fmtCoord(lon, lat)} · {t('cluster.pixels', { n: c.pixels.length })} ·{' '}
          {t('cluster.trigger', { slot: fmtSlot(c.trigger_slot, lang) })}
        </p>
        <p className="callout"><IconAlert size={14} /> {t('awas.note')}</p>
      </header>

      <div className="detail-grid">
        <div className="col">
          <section className="card" aria-labelledby="chart-h">
            <h2 id="chart-h">{t('chart.title')}</h2>
            <UtilityChart series={c.series} thresholds={{ watch: T_WATCH, awas: T_AWAS }} triggerSlot={c.trigger_slot} />
          </section>
          <section className="card" aria-labelledby="attr-h">
            <h2 id="attr-h">{t('attr.title')}</h2>
            <AttributeBars attributes={c.attributes} neighbourSupport={c.neighbour_support} weights={WEIGHTS} />
          </section>
          <section className="card" aria-labelledby="nbr-h">
            <h2 id="nbr-h">{t('nbr.title')}</h2>
            <NeighbourGrid neighbours={c.neighbours} />
          </section>
        </div>

        <div className="col">
          <section className="card" aria-labelledby="ver-h">
            <div className="card-head">
              <h2 id="ver-h">{t('ver.title')}</h2>
              <EvidenceBadge result={v?.result ?? null} />
            </div>
            {!v ? (
              <p className="muted">{t('ver.pending')}</p>
            ) : (
              <>
                <p>{lang === 'id' ? v.summary_id : v.summary_en}</p>
                <p className="muted small">{t('ver.at', { when: fmtSlot(v.at, lang) })}</p>
                <div className="evimgs">{v.images.map((img) => <EvidenceImage key={img.source} img={img} />)}</div>

                <h3>{t('ver.viirs_title')}</h3>
                <ViirsList detections={v.viirs} />

                <h3>{t('ver.evidence')}</h3>
                <ul className="evidence">
                  {v.evidence.map((e, i) => (
                    <li key={i}>
                      <span className="lbl">{t(`ver.src.${e.source}`)}</span>
                      <span>{e.finding}</span>
                      {e.observed_at && (
                        <span className="muted small">
                          {fmtSlot(e.observed_at, lang)}{e.age_h != null && ` · ${t('ver.age', { h: fmtNum(e.age_h, 1, lang) })}`}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {v.smoke_visible !== true && <p className="callout info small">{t('ver.no_smoke_note')}</p>}
                <ToolTrace calls={v.tool_trace} />
              </>
            )}
          </section>

          <DecisionPanel key={`${c.id}-${c.decision?.at ?? 'open'}`} cluster={c} caption={caption} onDecided={reload} />
        </div>
      </div>
    </div>
  );
}
