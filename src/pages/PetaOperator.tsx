import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Popup, type LngLatLike } from 'maplibre-gl';
import type { PixelProps, ProvinceCode, Status } from '../types';
import { api } from '../api';
import { useI18n } from '../i18n';
import { useLoad } from '../lib/useLoad';
import { fmtNum } from '../lib/format';
import { KALIMANTAN, PROVINCES, PROVINCE_CODES } from '../lib/provinces';
import { MapController } from '../map/map';
import { StatusBadge, STATUS_KEY } from '../components/StatusBadge';
import { EvidenceBadge } from '../components/EvidenceBadge';
import { DataBanner } from '../components/DataBanner';
import { DecisionState } from '../components/DecisionPanel';
import { StatusIcon } from '../components/icons';

const ALL: Status[] = ['AWAS', 'WATCH', 'NO_OBSERVATION', 'SAFE'];

export function PetaOperator({ dark }: { dark: boolean }) {
  const { t, lang } = useI18n();
  const nav = useNavigate();
  const mapEl = useRef<HTMLDivElement>(null);
  const ctl = useRef<MapController | null>(null);
  const popup = useRef<Popup | null>(null);

  const [statuses, setStatuses] = useState<Status[]>(ALL);
  const [province, setProvince] = useState<ProvinceCode | ''>('');
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(true);

  const { data, error, loading, reload } = useLoad(
    () => Promise.all([api.meta(), api.grid(), api.clusters(), api.peatBoundary()]),
    [],
  );
  const [meta, grid, clusters, peat] = data ?? [];

  // Handler klik peta selalu membaca state terbaru.
  const onPixel = useRef<(p: PixelProps, at: LngLatLike) => void>(() => {});
  onPixel.current = (p, at) => {
    const el = document.createElement('div');
    el.className = 'popup';
    const head = document.createElement('b');
    head.textContent = `${t(STATUS_KEY[p.status])} · ${p.pixel_id}`;
    const body = document.createElement('span');
    body.textContent = `${t('map.utility')} ${p.utility == null ? t('map.no_value') : fmtNum(p.utility, 2, lang)} · ${t('map.n_sat')} ${p.n_sat}`;
    el.append(head, body);
    if (p.cluster_id) {
      const id = p.cluster_id;
      const a = document.createElement('button');
      a.className = 'link-btn';
      a.textContent = `${t('map.open_detail')} ${id} →`;
      a.onclick = () => nav(`/kelompok/${id}`);
      el.append(a);
      setSelected(id);
    }
    popup.current?.remove();
    popup.current = new Popup({ closeButton: true, maxWidth: '260px' }).setLngLat(at).setDOMContent(el).addTo(ctl.current!.map);
  };

  useEffect(() => {
    const c = new MapController(mapEl.current!, dark, { onPixel: (p, at) => onPixel.current(p, at) });
    ctl.current = c;
    return () => { popup.current?.remove(); c.destroy(); ctl.current = null; };
    // peta dibuat sekali; tema diubah lewat setDark
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { ctl.current?.setDark(dark); }, [dark]);
  useEffect(() => { if (grid && peat) ctl.current?.setData({ grid, peat }); }, [grid, peat]);
  useEffect(() => { ctl.current?.setFilter(statuses, province, selected); }, [statuses, province, selected]);
  useEffect(() => { ctl.current?.fitBounds(province ? PROVINCES[province].bounds : KALIMANTAN); }, [province]);

  // Titik VIIRS hanya untuk kelompok terpilih (bukti verifikasi, bukan ingest berkala).
  useEffect(() => {
    if (!selected) { ctl.current?.setData({ viirs: [] }); return; }
    let alive = true;
    api.cluster(selected).then(
      (d) => { if (alive) ctl.current?.setData({ viirs: d.verification?.viirs ?? [] }); },
      () => { if (alive) ctl.current?.setData({ viirs: [] }); },
    );
    return () => { alive = false; };
  }, [selected]);

  // Panel lebar/sempit berubah → ukur ulang kanvas.
  useEffect(() => { const id = setTimeout(() => ctl.current?.resize(), 220); return () => clearTimeout(id); }, [sheetOpen]);

  const visible = useMemo(
    () => (clusters ?? []).filter((c) => !province || c.province === province).sort((a, b) => b.utility_score - a.utility_score),
    [clusters, province],
  );
  const cloudy = useMemo(() => {
    if (!grid?.features.length) return false;
    const n = grid.features.filter((f) => f.properties.status === 'NO_OBSERVATION').length;
    return n / grid.features.length > 0.5;
  }, [grid]);

  const toggle = (s: Status) =>
    setStatuses((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const select = (id: string, center: [number, number]) => {
    setSelected(id);
    ctl.current?.flyTo(center);
    if (window.matchMedia('(max-width: 1023px)').matches) setSheetOpen(false);
  };

  return (
    <div className={`map-page ${sheetOpen ? 'sheet-open' : ''}`}>
      <aside className="panel" aria-label={t('map.panel')}>
        <button className="grab" onClick={() => setSheetOpen((o) => !o)} aria-expanded={sheetOpen} aria-label={t('map.panel')}>
          <span />
        </button>

        {meta ? <DataBanner meta={meta} cloudy={cloudy} /> : <div className="skel" style={{ height: 30 }} />}

        <div className="filters">
          <div className="chips" role="group" aria-label={t('map.filter_status')}>
            {ALL.map((s) => (
              <button key={s} className={`chip st-${s.toLowerCase()}`} aria-pressed={statuses.includes(s)} onClick={() => toggle(s)}>
                <StatusIcon status={s} size={12} />{t(STATUS_KEY[s])}
              </button>
            ))}
          </div>
          <label className="select">
            <span className="lbl">{t('map.filter_province')}</span>
            <select value={province} onChange={(e) => setProvince(e.target.value as ProvinceCode | '')}>
              <option value="">{t('map.all_provinces')}</option>
              {PROVINCE_CODES.map((p) => <option key={p} value={p}>{t(`prov.${p}`)}</option>)}
            </select>
          </label>
        </div>

        <div className="list-head">
          <b>{t('map.clusters_title', { n: visible.length })}</b>
          <span className="muted">{t('map.sort')}</span>
        </div>

        {error && (
          <div className="error" role="alert">
            {t('load_error', { msg: error.message })} <button className="link-btn" onClick={reload}>{t('retry')}</button>
          </div>
        )}

        {loading && !data ? (
          <div className="queue">{[0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 92 }} />)}</div>
        ) : visible.length === 0 && !error ? (
          <p className="empty">{t('map.empty')}</p>
        ) : (
          <ul className="queue">
            {visible.map((c) => (
              <li key={c.id} className={`queue-item ${selected === c.id ? 'on' : ''}`}>
                <button className="qi-main" onClick={() => select(c.id, c.centroid)} aria-pressed={selected === c.id}>
                  <span className="qi-row"><StatusBadge status="AWAS" /><b className="mono">{c.id}</b></span>
                  <span className="qi-row muted">
                    {t(`prov.${c.province}`)} · {t('map.pixels', { n: c.pixels.length })} · U {fmtNum(c.utility_score, 2, lang)}
                  </span>
                  <span className="qi-row"><EvidenceBadge result={c.verification?.result ?? null} /><DecisionState decision={c.decision} /></span>
                </button>
                <Link className="qi-link" to={`/kelompok/${c.id}`}>{t('map.open_detail')} →</Link>
              </li>
            ))}
          </ul>
        )}

        <details className="legend">
          <summary>{t('map.legend')}</summary>
          <ul>
            {ALL.map((s) => <li key={s}><StatusBadge status={s} /></li>)}
            <li><i className="lg-line dash" />{t('map.peat')}</li>
            <li><i className="lg-line thick" />{t('map.cluster')}</li>
            <li><i className="lg-dot" />{t('map.viirs')}</li>
          </ul>
          <p className="muted small">{t('awas.note')}</p>
        </details>
      </aside>

      <div className="map-wrap">
        <div ref={mapEl} className="map" role="region" aria-label={t('map.aria')} />
      </div>
    </div>
  );
}
