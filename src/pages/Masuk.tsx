import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { signIn, useUser } from '../auth';
import { useI18n } from '../i18n';

export function Masuk() {
  const { t } = useI18n();
  const user = useUser();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  if (user) return <Navigate to={from} replace />;

  return (
    <div className="login">
      <div className="card login-card">
        <span className="brand big"><i aria-hidden="true" />ASAPify</span>
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
