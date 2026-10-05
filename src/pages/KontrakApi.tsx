import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useI18n } from '../i18n';
import { contractExamples } from '../mock/fixtures';
import {
  CONVENTIONS, ENDPOINTS, ERRORS, INTERNAL, SCHEMAS, STATIC_EXAMPLES,
  type Endpoint, type ExampleKey, type Field, type Origin, type Schema, type Txt,
} from '../contract/spec';

const SCHEMA_NAMES = new Set(SCHEMAS.map((s) => s.name));
const BASE = '/api/v1';

/** `kode` di teks spesifikasi → <code>. */
function rich(s: string): ReactNode {
  return s.split('`').map((part, i) => (i % 2 ? <code key={i}>{part}</code> : <Fragment key={i}>{part}</Fragment>));
}

/** Nama skema di kolom tipe → tautan ke skema. */
function typeCell(type: string): ReactNode {
  return type.split(/\b([A-Z][A-Za-z]+)\b/).map((part, i) =>
    SCHEMA_NAMES.has(part) ? <a key={i} href={`#sc-${part}`}>{part}</a> : <Fragment key={i}>{part}</Fragment>,
  );
}

/** Larik dan string panjang dipotong agar contoh tetap terbaca. */
function trim(v: unknown, note: (n: number) => string): unknown {
  if (typeof v === 'string' && v.length > 96) return `${v.slice(0, 64)}… (+${v.length - 64})`;
  if (Array.isArray(v)) {
    const head = v.slice(0, 3).map((x) => trim(x, note));
    return v.length > 4 ? [...head, note(v.length - 3)] : v.map((x) => trim(x, note));
  }
  if (v && typeof v === 'object') {
    const keep = new Set(['coordinates', 'tiles', 'url']); // URL dan koordinat tetap utuh, kecuali data: URI (citra mock)
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, keep.has(k) && !(typeof x === 'string' && x.startsWith('data:')) ? x : trim(x, note)]));
  }
  return v;
}

function JsonBlock({ value, label }: { value: unknown; label: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const text = JSON.stringify(value, null, 2);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard diblokir */ }
  };
  return (
    <div className="json">
      <div className="json-head">
        <span>{label}</span>
        <button className="link-btn" onClick={copy}>{copied ? t('api.copied') : t('api.copy')}</button>
      </div>
      <pre>{text}</pre>
    </div>
  );
}

function OriginTag({ origin }: { origin: Origin }) {
  const { t } = useI18n();
  return origin === 'fe' ? <span className="tag fe">{t('api.fe_tag')}</span> : null;
}

function FieldTable({ fields, origin }: { fields: Field[]; origin: Origin }) {
  const { t, lang } = useI18n();
  return (
    <div className="table-wrap">
      <table className="fields">
        <thead>
          <tr><th>{t('api.field')}</th><th>{t('api.type')}</th><th>{t('api.req')}</th><th>{t('api.desc')}</th></tr>
        </thead>
        <tbody>
          {fields.map((f) => (
            <tr key={f.name}>
              {/* Skema usulan FE sudah bertanda di judul; baris hanya ditandai bila beda dari skemanya. */}
              <th scope="row"><code>{f.name}</code> {origin !== 'fe' && <OriginTag origin={f.origin ?? origin} />}</th>
              <td className="type">{typeCell(f.type)}</td>
              <td>{f.req ? t('api.yes') : t('api.no')}</td>
              <td>{rich(f.desc[lang])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EndpointCard({ ep, examples }: { ep: Endpoint; examples: Record<string, unknown> }) {
  const { t, lang } = useI18n();
  const L = (x: Txt) => x[lang];
  const note = (n: number) => `… +${n} ${t('api.trimmed')}`;
  const ex = (k?: ExampleKey) => (k && k in examples ? trim(examples[k], note) : undefined);
  return (
    <article className="ep" id={`ep-${ep.id}`}>
      <header className="ep-head">
        <span className={`m m-${ep.method.toLowerCase()}`}>{ep.method}</span>
        <code className="ep-path">{BASE}{ep.path}</code>
        <span className={`auth ${ep.auth}`}>{t(`api.${ep.auth}`)}</span>
      </header>
      <h3>{L(ep.title)}</h3>
      <p>{rich(L(ep.purpose))}</p>
      {ep.usedBy
        ? <p className="used"><b>{t('api.used_by')}:</b> {L(ep.usedBy)}</p>
        : <p className="used none">{t('api.not_used')}</p>}

      {ep.params && (
        <>
          <h4>{t('api.params')}</h4>
          <FieldTable fields={ep.params} origin="backend" />
        </>
      )}

      {ep.body && (
        <>
          <h4>{t('api.body')} · <a href={`#sc-${ep.body.schema}`}>{ep.body.schema}</a></h4>
          <JsonBlock value={ex(ep.body.example)} label={`${t('api.example')} · ${t('api.request')}`} />
        </>
      )}

      <h4>{t('api.response')}</h4>
      {ep.responses.map((r) => (
        <div className="resp" key={`${r.code}-${r.schema}`}>
          <p>
            <span className={`code c${String(r.code)[0]}`}>{r.code}</span>{' '}
            <a href={`#sc-${r.schema}`}>{r.schema}</a>
            {r.note && <span className="muted"> · {rich(L(r.note))}</span>}
          </p>
          {r.example && <JsonBlock value={ex(r.example)} label={`${t('api.example')} · ${r.code}`} />}
        </div>
      ))}
      {ep.id === 'grid' && <p className="muted small">{t('api.grid_count', { n: String(examples.gridCount) })}</p>}

      {ep.errors.length > 0 && (
        <p className="ep-errors">
          <b>{t('api.errors_short')}:</b>{' '}
          {ep.errors.map((c) => <a key={c} href="#galat" className="tag">{c}</a>)}
        </p>
      )}
    </article>
  );
}

function SchemaCard({ s }: { s: Schema }) {
  const { lang } = useI18n();
  return (
    <article className="schema" id={`sc-${s.name}`}>
      <h3><code>{s.name}</code> <OriginTag origin={s.origin} /></h3>
      <p className="muted">{rich(s.desc[lang])}</p>
      <FieldTable fields={s.fields} origin={s.origin} />
    </article>
  );
}

export function KontrakApi() {
  const { t, lang } = useI18n();
  const examples = useMemo(() => {
    const fx = contractExamples();
    return { ...STATIC_EXAMPLES, ...fx } as Record<string, unknown>;
  }, []);

  // Tautan langsung ke #ep-… dibuka sebelum React merender, jadi browser tidak bisa menggulir sendiri.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  return (
    <div className="wrap contract">
      <header className="contract-head">
        <h1>{t('api.title')}</h1>
        <p className="lede">{t('api.lede')}</p>
        <div className="legend-tags">
          <span><span className="tag">backend.html</span> {t('api.legend_backend')}</span>
          <span><span className="tag fe">{t('api.fe_tag')}</span> {t('api.legend_fe')}</span>
          <span className="muted">{t('api.count', { e: ENDPOINTS.length, s: SCHEMAS.length })}</span>
        </div>
      </header>

      <div className="contract-grid">
        <nav className="toc" aria-label={t('api.toc')}>
          <a href="#konvensi">{t('api.conventions')}</a>
          <a href="#galat">{t('api.errors')}</a>
          <span className="toc-h">{t('api.endpoints')}</span>
          {ENDPOINTS.map((e) => (
            <a key={e.id} href={`#ep-${e.id}`} className="toc-ep">
              <span className={`m m-${e.method.toLowerCase()}`}>{e.method}</span><code>{e.path}</code>
            </a>
          ))}
          <span className="toc-h">{t('api.schemas')}</span>
          {SCHEMAS.map((s) => <a key={s.name} href={`#sc-${s.name}`} className="toc-sc"><code>{s.name}</code></a>)}
          <a href="#internal">{t('api.internal')}</a>
        </nav>

        <div className="contract-body">
          <section id="konvensi" aria-labelledby="konv-h">
            <h2 id="konv-h">{t('api.conventions')}</h2>
            <div className="conv">
              {CONVENTIONS.map((c) => (
                <div key={c.title.id} className="conv-item">
                  <h3>{rich(c.title[lang])}</h3>
                  <p>{rich(c.body[lang])}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="galat" aria-labelledby="galat-h">
            <h2 id="galat-h">{t('api.errors')}</h2>
            <div className="table-wrap">
              <table className="fields">
                <thead><tr><th>{t('api.code')}</th><th>{t('api.http')}</th><th>{t('api.when')}</th></tr></thead>
                <tbody>
                  {ERRORS.map((e) => (
                    <tr key={e.code}><th scope="row"><code>{e.code}</code></th><td className="type">{e.http}</td><td>{rich(e.when[lang])}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="ep-h">
            <h2 id="ep-h">{t('api.endpoints')}</h2>
            {ENDPOINTS.map((e) => <EndpointCard key={e.id} ep={e} examples={examples} />)}
          </section>

          <section aria-labelledby="sc-h">
            <h2 id="sc-h">{t('api.schemas')}</h2>
            {SCHEMAS.map((s) => <SchemaCard key={s.name} s={s} />)}
            <JsonBlock value={trim(examples.peat, (n) => `… +${n}`)} label={`${t('api.example')} · PeatBoundary`} />
          </section>

          <section id="internal" aria-labelledby="int-h">
            <h2 id="int-h">{t('api.internal')}</h2>
            <p className="muted">{t('api.internal_note')}</p>
            <ul className="internal">
              {INTERNAL.map((i) => (
                <li key={i.path}><span className="m m-post">{i.method}</span> <code>{i.path}</code> · {i.desc[lang]}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
