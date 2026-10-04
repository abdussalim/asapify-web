import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import type { ProvinceCode, Status, StatusCode } from '../types';
import { api } from '../api';
import { useI18n } from '../i18n';
import { useLoad } from '../lib/useLoad';
import { fmtNum } from '../lib/format';
import { load, save } from '../lib/storage';
import { detectLite, loadLitePref, saveLitePref } from '../lib/device';
import { ISLANDS, PROVINCES, REGION, provincesOf } from '../lib/provinces';
import {
  STATUS_CODE, cellAt, cellByPixelId, cellCenter, decodeUtility, nightOf, nightStart, slotIndex, utilityAt,
} from '../lib/grid';
import { MapController, type LayerKey } from '../map/map';
import { StatusBadge, STATUS_KEY } from '../components/StatusBadge';
import { EvidenceBadge } from '../components/EvidenceBadge';
import { DataBanner } from '../components/DataBanner';
import { DecisionState } from '../components/DecisionPanel';
import { SlotPlayer } from '../components/SlotPlayer';
import { PixelInspector } from '../components/PixelInspector';
import { LayerControl } from '../components/LayerControl';
import { StatusIcon } from '../components/icons';

const ALL: Status[] = ['AWAS', 'WATCH', 'NO_OBSERVATION', 'SAFE'];
const COORD = /^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/;

export function PetaOperator({ dark }: { dark: boolean }) {
  const { t, lang } = useI18n();
  const mapEl = useRef<HTMLDivElement>(null);
  const ctl = useRef<MapController | null>(null);

  // ---------- mode ringan + preferensi tampilan ----------
  const liteReason = useMemo(detectLite, []);
  const [litePref, setLitePref] = useState<boolean | null>(loadLitePref);
  const lite = litePref ?? liteReason != null;
  const [basemap, setBasemap] = useState<string>(() => load('asapify.basemap') ?? (lite ? 'polos' : 'peta'));
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>({
    status: true, clusters: true, peat: true, provinces: !lite, viirs: true,
  });

  // ---------- filter + seleksi ----------
  const [statuses, setStatuses] = useState<Status[]>(ALL);
  const [province, setProvince] = useState<ProvinceCode | ''>('');
  const [selected, setSelected] = useState<string | null>(null);
  const [cell, setCell] = useState(-1);
  const [slot, setSlot] = useState<number | null>(null); // null = slot terbaru
  const [playing, setPlaying] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(true);
  const [query, setQuery] = useState('');
  const [searchMsg, setSearchMsg] = useState<string | null>(null);

  // ---------- data ----------
  const base = useLoad(
    () => Promise.all([api.meta(), api.pixels(), api.gridCompact(), api.clusters(), api.basemaps()]),
    [],
  );
  const [meta, index, compact, clusters, basemaps] = base.data ?? [];
  const nightKey = meta ? nightOf(meta.last_slot) : null;
  const night = useLoad(() => (nightKey ? api.night(nightKey) : Promise.resolve(null)), [nightKey]);
  const peat = useLoad(() => api.peatBoundary(), []);
  const provinces = useLoad(() => (layers.provinces ? api.provinces() : Promise.resolve(null)), [layers.provinces]);

  const latest = meta ? slotIndex(meta.last_slot, nightStart(meta.last_slot)) : 0;
  const cur = slot ?? latest;
  const isLatest = cur === latest;
  const statusStr = isLatest ? (compact?.status ?? null) : (night.data?.status[cur] ?? null);
  const utility = useMemo(() => (compact ? decodeUtility(compact.utility) : null), [compact]);
  const clusterOfCell = useMemo(() => {
    const m = new Map<number, string>();
    for (const [id, cells] of Object.entries(compact?.clusters ?? {})) for (const i of cells) m.set(i, id);
    return m;
  }, [compact]);

  // ---------- peta ----------
  const onCell = useRef<(i: number) => void>(() => {});
  onCell.current = (i) => {
    if (i < 0 || !statusStr) { setCell(-1); return; }
    const code = statusStr[i] as StatusCode;
    if (!statuses.some((s) => STATUS_CODE[s] === code)) return; // status sedang disembunyikan
    setCell(i);
    const id = clusterOfCell.get(i);
    if (id) setSelected(id);
    if (window.matchMedia('(max-width: 1023px)').matches) setSheetOpen(false);
  };

  useEffect(() => {
    const c = new MapController(mapEl.current!, {
      dark, lite, basemap, basemaps: [], onCell: (i) => onCell.current(i),
    });
    ctl.current = c;
    return () => { c.destroy(); ctl.current = null; };
    // peta dibuat sekali; perubahan lain lewat metode controller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { ctl.current?.setBasemap(basemap, dark, basemaps ?? []); save('asapify.basemap', basemap); }, [basemap, dark, basemaps]);
  useEffect(() => { ctl.current?.setLite(lite); }, [lite]);
  useEffect(() => { if (index) ctl.current?.setData({ index }); }, [index]);
  useEffect(() => { if (compact) ctl.current?.setData({ clusters: compact.clusters }); }, [compact]);
  useEffect(() => { if (peat.data) ctl.current?.setData({ peat: peat.data }); }, [peat.data]);
  useEffect(() => { if (provinces.data) ctl.current?.setData({ provinces: provinces.data }); }, [provinces.data]);
  useEffect(() => { ctl.current?.setStatus(statusStr); }, [statusStr]);
  useEffect(() => { ctl.current?.setStatusFilter(statuses); }, [statuses]);
  useEffect(() => { ctl.current?.setSelectedCell(cell); }, [cell]);
  useEffect(() => {
    for (const [k, on] of Object.entries(layers) as [LayerKey, boolean][]) ctl.current?.setLayer(k, on);
  }, [layers]);
  useEffect(() => {
    ctl.current?.setProvince(province);
    ctl.current?.fitBounds(province ? PROVINCES[province].bounds : REGION);
  }, [province]);

  // Titik VIIRS hanya untuk kelompok terpilih (bukti verifikasi, bukan ingest berkala).
  useEffect(() => {
    ctl.current?.setSelectedCluster(selected);
    if (!selected) { ctl.current?.setData({ viirs: [] }); return; }
    let alive = true;
    api.cluster(selected).then(
      (d) => { if (alive) ctl.current?.setData({ viirs: d.verification?.viirs ?? [] }); },
      () => { if (alive) ctl.current?.setData({ viirs: [] }); },
    );
    return () => { alive = false; };
  }, [selected]);

  // Pemutar: maju satu slot per tik sampai slot terbaru, lalu berhenti.
  const curRef = useRef(cur);
  curRef.current = cur;
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const next = curRef.current + 1;
      if (next >= latest) { setPlaying(false); setSlot(null); } else setSlot(next);
    }, lite ? 900 : 550);
    return () => clearInterval(id);
  }, [playing, latest, lite]);

  // Panel lebar/sempit berubah → ukur ulang kanvas.
  useEffect(() => { const id = setTimeout(() => ctl.current?.resize(), 220); return () => clearTimeout(id); }, [sheetOpen]);

  // ---------- turunan untuk UI ----------
  const visible = useMemo(
    () => (clusters ?? []).filter((c) => !province || c.province === province).sort((a, b) => b.utility_score - a.utility_score),
    [clusters, province],
  );
  const cloudy = useMemo(() => {
    if (!statusStr) return false;
    return (statusStr.split('N').length - 1) / statusStr.length > 0.5;
  }, [statusStr]);
  const history = useMemo(
    () => (cell >= 0 ? (night.data?.status ?? []).map((s) => (s ? (s[cell] as StatusCode) : null)) : []),
    [night.data, cell],
  );

  const toggle = (s: Status) => setStatuses((c) => (c.includes(s) ? c.filter((x) => x !== s) : [...c, s]));

  const select = (id: string, center: [number, number]) => {
    setSelected(id);
    setCell(-1);
    ctl.current?.flyTo(center);
    if (window.matchMedia('(max-width: 1023px)').matches) setSheetOpen(false);
  };

  const focusCell = (i: number) => {
    if (!index) return;
    setCell(i);
    ctl.current?.flyTo(cellCenter(index, i), 12);
    const id = clusterOfCell.get(i);
    if (id) setSelected(id);
    if (window.matchMedia('(max-width: 1023px)').matches) setSheetOpen(false);
  };

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setSearchMsg(null);
    if (!q) return;
    const c = clusters?.find((x) => x.id.toLowerCase() === q.toLowerCase());
    if (c) { select(c.id, c.centroid); return; }
    if (index) {
      const byId = cellByPixelId(index, q);
      if (byId >= 0) { focusCell(byId); return; }
      const m = COORD.exec(q);
      if (m) {
        let a = Number(m[1]), b = Number(m[2]);
        if (Math.abs(a) > Math.abs(b)) [a, b] = [b, a]; // terima "lat, lon" maupun "lon, lat"
        const [lat, lon] = [a, b];
        const [[w, s], [e2, n]] = REGION;
        if (lon < w || lon > e2 || lat < s || lat > n) { setCell(-1); setSearchMsg(t('search.outside')); return; }
        const i = cellAt(index, lon, lat);
        if (i >= 0) focusCell(i);
        else { setCell(-1); ctl.current?.flyTo([lon, lat], 11); setSearchMsg(t('search.not_peat')); }
        return;
      }
    }
    setCell(-1);
    setSearchMsg(t('search.none'));
  };

  const onPlay = (p: boolean) => {
    if (p && isLatest) setSlot(0);
    setPlaying(p);
  };

  const setLite = (on: boolean) => {
    const pref = on === (liteReason != null) ? null : on; // kembali ke otomatis bila sama dengan deteksi
    setLitePref(pref);
    saveLitePref(pref);
  };

  return (
    <div className={`map-page ${sheetOpen ? 'sheet-open' : ''} ${lite ? 'is-lite' : ''}`}>
      <aside className="panel" aria-label={t('map.panel')}>
        <button className="grab" onClick={() => setSheetOpen((o) => !o)} aria-expanded={sheetOpen} aria-label={t('map.panel')}>
          <span />
        </button>

        {meta ? <DataBanner meta={meta} cloudy={cloudy} /> : <div className="skel" style={{ height: 30 }} />}

        <form className="search" onSubmit={onSearch} role="search">
          <label htmlFor="map-q" className="lbl">{t('search.label')}</label>
          <div className="search-row">
            <input
              id="map-q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('search.placeholder')}
              autoComplete="off" spellCheck={false} enterKeyHint="search"
            />
            <button className="btn" type="submit">{t('search.go')}</button>
          </div>
          {searchMsg && <p className="search-msg" role="status">{searchMsg}</p>}
        </form>

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
              {ISLANDS.map((isl) => (
                <optgroup key={isl} label={t(`island.${isl}`)}>
                  {provincesOf(isl).map((p) => <option key={p} value={p}>{t(`prov.${p}`)}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        </div>

        <div className="list-head">
          <b>{t('map.clusters_title', { n: visible.length })}</b>
          <span className="muted">{t('map.sort')}</span>
        </div>

        {base.error && (
          <div className="error" role="alert">
            {t('load_error', { msg: base.error.message })} <button className="link-btn" onClick={base.reload}>{t('retry')}</button>
          </div>
        )}

        {base.loading && !base.data ? (
          <div className="queue">{[0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 92 }} />)}</div>
        ) : visible.length === 0 && !base.error ? (
          <p className="empty">{t('map.empty')}</p>
        ) : (
          <ul className="queue">
            {visible.map((c) => (
              <li key={c.id} className={`queue-item ${selected === c.id ? 'on' : ''} ${c.decision ? 'is-decided' : ''}`}>
                <button className="qi-main" onClick={() => select(c.id, c.centroid)} aria-pressed={selected === c.id}>
                  <span className="qi-top">
                    <b className="qi-id">{c.id}</b>
                    <span className="qi-u" aria-label={`Utility ${fmtNum(c.utility_score, 2, lang)}`}>
                      <small>U</small>{fmtNum(c.utility_score, 2, lang)}
                      <i style={{ ['--u' as string]: c.utility_score }} />
                    </span>
                  </span>
                  <span className="qi-row muted">
                    {t(`prov.${c.province}`)} · {t('map.pixels', { n: c.pixels.length })} · {t('map.nbr', { k: Math.round(c.neighbour_support * 8) })}
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
            <li><i className="lg-line thin" />{t('lc.layer_provinces')}</li>
            <li><i className="lg-line thick" />{t('map.cluster')}</li>
            <li><i className="lg-dot" />{t('map.viirs')}</li>
          </ul>
          <p className="muted small">{t('awas.note')}</p>
        </details>
      </aside>

      <div className="map-wrap">
        <div ref={mapEl} className="map" role="region" aria-label={t('map.aria')} />
        <div className="map-overlay top-left">
          <LayerControl
            basemap={basemap} basemaps={basemaps ?? []} layers={layers} lite={lite} liteReason={liteReason}
            liteAuto={litePref == null} onBasemap={setBasemap}
            onLayer={(k, on) => setLayers((l) => ({ ...l, [k]: on }))} onLite={setLite}
          />
          {index && cell >= 0 && statusStr && (
            <PixelInspector
              index={index} cell={cell}
              status={statusStr[cell] as StatusCode} latestStatus={(compact?.status[cell] as StatusCode) ?? null}
              utility={utilityAt(utility, cell)}
              nSat={isLatest ? (compact?.n_sat ?? null) : (night.data?.n_sat[cur] ?? null)}
              clusterId={clusterOfCell.get(cell) ?? null} history={history} slot={cur} isLatest={isLatest}
              onClose={() => setCell(-1)}
            />
          )}
        </div>
        {meta && (
          <div className="map-overlay bottom">
            <SlotPlayer
              meta={meta} night={night.data ?? null} slot={cur} latest={latest} playing={playing}
              onSlot={(i) => { setPlaying(false); setSlot(i === latest ? null : i); }} onPlay={onPlay}
            />
          </div>
        )}
      </div>
    </div>
  );
}
