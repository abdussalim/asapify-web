import { useState } from 'react';
import { ApiError, type ClusterDetail, type Decision } from '../types';
import { api } from '../api';
import { useI18n } from '../i18n';
import { fmtNum, fmtSlot } from '../lib/format';
import { CAPTION_MAX } from '../lib/caption';
import { IconCheck, IconClock, IconSend, IconX } from './icons';

/** Label keputusan: teks + ikon, tanpa warna level. */
export function DecisionState({ decision }: { decision: Decision | null }) {
  const { t } = useI18n();
  if (!decision) return <span className="dec-state"><IconClock size={12} />{t('decision.pending')}</span>;
  return decision.action === 'publish'
    ? <span className="dec-state"><IconSend size={12} />{t('decision.published')}</span>
    : <span className="dec-state"><IconX size={12} />{t('decision.rejected')}</span>;
}

interface Props {
  cluster: ClusterDetail;
  caption: string;
  onDecided(): void;
}

type Mode = 'idle' | 'confirm' | 'reject';

/** Dua tombol saja: Terbitkan (caption bisa disunting) atau Tolak (alasan wajib). */
export function DecisionPanel({ cluster, caption: initialCaption, onDecided }: Props) {
  const { t, lang } = useI18n();
  const [caption, setCaption] = useState(initialCaption);
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<Mode>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const v = cluster.verification;
  const d = cluster.decision;
  const prov = t(`prov.${cluster.province}`);

  if (d) {
    return (
      <section className="card decision" aria-labelledby="dec-h">
        <h2 id="dec-h">{t('dec.title')}</h2>
        <p className="decided">
          {d.action === 'publish' ? <IconCheck /> : <IconX />}
          {t(d.action === 'publish' ? 'dec.published_by' : 'dec.rejected_by', { by: d.by, when: fmtSlot(d.at, lang) })}
        </p>
        {d.alert_id && <p className="muted">{t('dec.alert', { id: d.alert_id })}</p>}
        {d.reason && <blockquote>{d.reason}</blockquote>}
      </section>
    );
  }

  const tooLong = caption.length > CAPTION_MAX;

  async function submit(action: 'publish' | 'reject') {
    setError(null);
    if (action === 'reject' && !reason.trim()) { setError(t('dec.reason_required')); return; }
    if (action === 'publish' && (tooLong || !caption.trim())) { setError(t('dec.too_long')); return; }
    setBusy(true);
    try {
      await api.decide(cluster.id, {
        action,
        caption_id: action === 'publish' ? caption : null,
        reason: action === 'reject' ? reason.trim() : null,
      });
      onDecided();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
      if (e instanceof ApiError && e.code === 'ALREADY_DECIDED') onDecided();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card decision" aria-labelledby="dec-h">
      <h2 id="dec-h">{t('dec.title')}</h2>
      <div className="dec-summary">
        <span className="lbl">{t('dec.summary')}</span>
        <p>
          AWAS · U {fmtNum(cluster.utility_score, 2, lang)} · {Math.round(cluster.neighbour_support * 8)}/8 ·{' '}
          {cluster.n_sat >= 2 ? t('sat.agree') : t('sat.single')} ·{' '}
          {v ? t(v.result === 'strong_evidence' ? 'evidence.strong' : 'evidence.inconclusive') : t('evidence.none')}
        </p>
      </div>

      <label className="field-label" htmlFor="caption">
        <span>{t('dec.caption')}</span>
        <span className={tooLong ? 'over' : ''}>{t('dec.count', { n: caption.length })}</span>
      </label>
      <textarea
        id="caption" value={caption} rows={8} disabled={busy || mode === 'reject'}
        onChange={(e) => setCaption(e.target.value)} aria-invalid={tooLong}
      />

      {mode === 'reject' && (
        <>
          <label className="field-label" htmlFor="reason"><span>{t('dec.reason')}</span></label>
          <textarea id="reason" value={reason} rows={3} required autoFocus disabled={busy} onChange={(e) => setReason(e.target.value)} />
        </>
      )}

      {mode === 'confirm' && <p className="confirm" role="alert">{t('dec.confirm_publish', { prov })}</p>}

      {error && <p className="error" role="alert">{error}</p>}

      <div className="btns">
        {mode === 'idle' && (
          <>
            <button className="btn primary" disabled={busy || tooLong} onClick={() => setMode('confirm')}>
              <IconSend />{t('btn.publish')}
            </button>
            <button className="btn" disabled={busy} onClick={() => { setMode('reject'); setError(null); }}>
              <IconX />{t('btn.reject')}
            </button>
          </>
        )}
        {mode === 'confirm' && (
          <>
            <button className="btn primary" disabled={busy} onClick={() => submit('publish')}>
              <IconSend />{busy ? t('dec.sending') : t('dec.confirm')}
            </button>
            <button className="btn" disabled={busy} onClick={() => setMode('idle')}>{t('dec.cancel')}</button>
          </>
        )}
        {mode === 'reject' && (
          <>
            <button className="btn danger" disabled={busy} onClick={() => submit('reject')}>
              <IconX />{busy ? t('dec.sending') : t('dec.confirm_reject')}
            </button>
            <button className="btn" disabled={busy} onClick={() => { setMode('idle'); setError(null); }}>{t('dec.cancel')}</button>
          </>
        )}
      </div>
      <p className="muted small">{t('dec.hint')}</p>
    </section>
  );
}
