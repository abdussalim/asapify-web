import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { signIn, useUser } from '../auth';
import { useI18n } from '../i18n';
import type { Neighbour } from '../types';
import { NeighbourGrid } from '../components/NeighbourGrid';

// Ilustrasi aturan: piksel pusat + 3/8 tetangga panas, satu berawan, satu bukan gambut.
const RULE_DEMO: Neighbour[] = [
  { dir: 'nw', state: 'normal', u0: 0.1 }, { dir: 'n', state: 'anomaly', u0: 0.6 }, { dir: 'ne', state: 'non_peat', u0: null },
  { dir: 'w', state: 'normal', u0: 0.2 }, { dir: 'e', state: 'anomaly', u0: 0.7 },
  { dir: 'sw', state: 'cloud', u0: null }, { dir: 's', state: 'normal', u0: 0.1 }, { dir: 'se', state: 'anomaly', u0: 0.8 },
];

export function Masuk() {
  const { t } = useI18n();
  const user = useUser();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  if (user) return <Navigate to={from} replace />;

  return (
    <div className="login">
      <section className="login-aside" aria-labelledby="rule-h">
        <span className="brand big"><i aria-hidden="true" />ASAPify</span>
        <h2 id="rule-h">{t('login.rule_t')}</h2>
        <p>{t('login.rule')}</p>
        <NeighbourGrid neighbours={RULE_DEMO} />
      </section>
      <div className="card login-card">
        <h1>{t('login.title')}</h1>
        <p className="muted">{t('login.lede')}</p>
        <button className="btn primary wide" onClick={() => { signIn(); nav(from, { replace: true }); }}>
          {t('login.btn')}
        </button>
        <p className="callout info small">{t('login.note')}</p>
        <Link to="/tentang">{t('login.about')} →</Link>
      </div>
    </div>
  );
}
