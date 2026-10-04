import type { ReactNode } from 'react';
import { BrowserRouter, Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router';
import { I18nProvider, useI18n } from './i18n';
import { signOut, useUser } from './auth';
import { useTheme } from './lib/theme';
import { API_MODE } from './api';
import { currentScenario } from './mock/fixtures';
import { Masuk } from './pages/Masuk';
import { PetaOperator } from './pages/PetaOperator';
import { Kelompok } from './pages/Kelompok';
import { Tentang } from './pages/Tentang';
import { KontrakApi } from './pages/KontrakApi';

function RequireAuth({ children }: { children: ReactNode }) {
  const user = useUser();
  const loc = useLocation();
  if (!user) return <Navigate to="/masuk" replace state={{ from: loc.pathname + loc.search }} />;
  return children;
}

function TopBar({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const { t, lang, setLang } = useI18n();
  const user = useUser();
  const nav = useNavigate();
  return (
    <header className="topnav">
      <div className="topnav-in">
        <Link className="brand" to={user ? '/' : '/tentang'}>
          <i aria-hidden="true" />ASAPify <small>{t('app.role')}</small>
        </Link>
        {API_MODE === 'mock' && (
          <span className="mock-badge" title={t('mock.title', { sc: currentScenario() })}>{t('mock.badge')}</span>
        )}
        <nav className="navlinks" aria-label="Navigasi">
          {user && <NavLink to="/" end>{t('nav.map')}</NavLink>}
          <NavLink to="/tentang">{t('nav.about')}</NavLink>
          <NavLink to="/kontrak-api">
            <span className="nl-full">{t('nav.api')}</span><span className="nl-short">{t('nav.api_short')}</span>
          </NavLink>
        </nav>
        <div className="tools">
          <div className="seg" role="group" aria-label={t('lang.switch')}>
            <button aria-pressed={lang === 'id'} onClick={() => setLang('id')}>ID</button>
            <button aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
          </div>
          <button className="icon-btn" onClick={theme.cycle} title={t(`theme.${theme.pref}`)} aria-label={t(`theme.${theme.pref}`)}>
            {theme.pref === 'auto' ? '◐' : theme.pref === 'light' ? '☀' : '☾'}
          </button>
          {user ? (
            <button className="link-btn" onClick={() => { signOut(); nav('/masuk'); }} title={user.email}>{t('nav.signout')}</button>
          ) : (
            <NavLink className="link-btn" to="/masuk">{t('nav.signin')}</NavLink>
          )}
        </div>
      </div>
    </header>
  );
}

function Shell({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const loc = useLocation();
  return (
    <>
      <TopBar theme={theme} />
      <main className={loc.pathname === '/' ? 'main-map' : 'main'}>
        <Outlet />
      </main>
    </>
  );
}

function Root() {
  const theme = useTheme();
  return (
    <Routes>
      <Route element={<Shell theme={theme} />}>
        <Route path="/masuk" element={<Masuk />} />
        <Route path="/tentang" element={<Tentang />} />
        <Route path="/kontrak-api" element={<KontrakApi />} />
        <Route path="/" element={<RequireAuth><PetaOperator dark={theme.dark} /></RequireAuth>} />
        <Route path="/kelompok/:id" element={<RequireAuth><Kelompok /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </I18nProvider>
  );
}
