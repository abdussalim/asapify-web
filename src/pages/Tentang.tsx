import { useI18n } from '../i18n';
import { fmtNum } from '../lib/format';
import { ATTR_ORDER, WEIGHTS } from '../lib/maut';
import { StatusBadge } from '../components/StatusBadge';
import type { Status } from '../types';

const STEPS = [1, 2, 3, 4, 5];
const STATUS_ROWS: [Status, string][] = [
  ['AWAS', 'about.st_awas'], ['WATCH', 'about.st_watch'], ['NO_OBSERVATION', 'about.st_noobs'], ['SAFE', 'about.st_safe'],
];
const SOURCES: [string, string][] = [
  ['Himawari-9 AHI', 'NOAA open data · B07 + B14 · 10 min'],
  ['GEO-KOMPSAT-2A AMI', 'NOAA open data · SW038 + IR105 · 10 min'],
  ['NASA POWER hourly', 'TS + T2M baseline · 0,5° × 0,625°'],
  ['NASA FIRMS VIIRS', 'S-NPP, NOAA-20, NOAA-21 · 375 m · on demand'],
  ['NASA GIBS', 'VIIRS true colour · ~250 m'],
  ['Peta Indikatif KHG', 'Dit. PKG KLHK · REST BIG'],
  ['ESA WorldCover v200', 'built-up mask'],
  ['geoBoundaries IDN ADM1', 'batas provinsi / provinces'],
];

export function Tentang() {
  const { t, lang } = useI18n();
  return (
    <div className="wrap about">
      <header className="about-head">
        <div className="dict" aria-label={`asap: ${t('about.dict_en')}`}>
          <p className="dict-word">asap <span className="dict-pron">{t('about.dict_pron')}</span> <i>{t('about.dict_pos')}</i></p>
          <p className="dict-def">{t('about.dict_def')} <span className="dict-en">EN: {t('about.dict_en')}</span></p>
        </div>
        <span className="eyebrow">{t('about.eyebrow')}</span>
        <h1>{t('about.title')}</h1>
        <p className="lede">{t('about.lede')}</p>
        <p className="tagline">“{t('about.tagline')}”</p>
      </header>

      <section aria-labelledby="how-h">
        <h2 id="how-h">{t('about.how_title')}</h2>
        <ol className="steps">
          {STEPS.map((n) => (
            <li key={n} className={`step s${n}`}>
              <span className="num">{n}</span>
              <h3>{t(`about.step${n}_t`)}</h3>
              <p>{t(`about.step${n}_d`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="ai-callout" aria-labelledby="ai-h">
        <h2 id="ai-h">{t('about.ai_title')}</h2>
        <p>{t('about.ai_body')}</p>
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
          {SOURCES.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        <p className="callout info small">{t('about.data_note')}</p>
      </section>
    </div>
  );
}
