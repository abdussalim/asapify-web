import { useI18n } from '../i18n';
import { fmtNum } from '../lib/format';
import { ATTR_ORDER, WEIGHTS } from '../lib/maut';
import { StatusBadge } from '../components/StatusBadge';
import type { Status } from '../types';

// Langkah 1–3 dijalankan aturan, 4 oleh agen AI, 5 oleh manusia; warna garis atas mengikuti pelakunya.
const STEPS: [number, 'rule' | 'ai' | 'human'][] = [[1, 'rule'], [2, 'rule'], [3, 'rule'], [4, 'ai'], [5, 'human']];
const STATUS_ROWS: [Status, string][] = [
  ['AWAS', 'about.st_awas'], ['WATCH', 'about.st_watch'], ['NO_OBSERVATION', 'about.st_noobs'], ['SAFE', 'about.st_safe'],
];
const SOURCES: [string, string][] = [
  ['Himawari-9 AHI', 'about.src_h'],
  ['GEO-KOMPSAT-2A AMI', 'about.src_g'],
  ['NASA POWER', 'about.src_power'],
  ['NASA FIRMS VIIRS', 'about.src_firms'],
  ['NASA GIBS', 'about.src_gibs'],
  ['Peta Indikatif KHG', 'about.src_khg'],
  ['ESA WorldCover v200', 'about.src_wc'],
  ['geoBoundaries IDN ADM1', 'about.src_gb'],
];

export function Tentang() {
  const { t, lang } = useI18n();
  return (
    <div className="wrap about">
      <header className="about-head">
        <h1>{t('about.title')}</h1>
        <p className="lede">{t('about.lede')}</p>
        <p>{t('about.scope')}</p>
        <p className="muted small">{t('about.name')}</p>
      </header>

      <section aria-labelledby="how-h">
        <h2 id="how-h">{t('about.how_title')}</h2>
        <ol className="steps">
          {STEPS.map(([n, who]) => (
            <li key={n} className={`step by-${who}`}>
              <span className="num">{n}</span>
              <h3>{t(`about.step${n}_t`)}</h3>
              <p>{t(`about.step${n}_d`)}</p>
            </li>
          ))}
        </ol>
        <p className="rule-line">{t('about.ai_rule')}</p>
      </section>

      <div className="grid-2">
        <section className="card" aria-labelledby="maut-h">
          <h2 id="maut-h">{t('about.maut_title')}</h2>
          <p className="muted">{t('about.maut_body')}</p>
          <div className="weights">
            {ATTR_ORDER.map((k) => (
              <div className="w-row" key={k}>
                <span>{t(`attr.${k}`)} <code>{k}</code></span>
                <span className="w-bar" aria-hidden="true"><i style={{ width: `${WEIGHTS[k] * 400}%` }} /></span>
                <b>{fmtNum(WEIGHTS[k], 2, lang)}</b>
              </div>
            ))}
          </div>
        </section>
        <section className="card" aria-labelledby="st-h">
          <h2 id="st-h">{t('about.status_title')}</h2>
          <dl className="status-def">
            {STATUS_ROWS.map(([s, k]) => (
              <div key={s}><dt><StatusBadge status={s} /></dt><dd>{t(k)}</dd></div>
            ))}
          </dl>
          {lang === 'en' && <p className="muted small">{t('about.awas_word')}</p>}
          <p className="muted small">{t('awas.note')}</p>
        </section>
      </div>

      <div className="grid-2">
        <section className="card" aria-labelledby="sat-h">
          <h2 id="sat-h">{t('about.sat_title')}</h2>
          <ul>
            <li>{t('about.sat_h')}</li>
            <li>{t('about.sat_g')}</li>
          </ul>
          <p className="muted">{t('about.sat_note')}</p>
        </section>
        <section className="card" aria-labelledby="lim-h">
          <h2 id="lim-h">{t('about.limits_title')}</h2>
          <ul>{[1, 2, 3, 4, 5].map((n) => <li key={n}>{t(`about.limit${n}`)}</li>)}</ul>
        </section>
      </div>

      <section className="card" aria-labelledby="data-h">
        <h2 id="data-h">{t('about.data_title')}</h2>
        <dl className="kv">
          {SOURCES.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{t(v)}</dd></div>)}
        </dl>
        <p className="muted small">{t('about.data_note')}</p>
      </section>
    </div>
  );
}
