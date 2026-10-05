import type { ViirsDetection } from '../types';
import { useI18n } from '../i18n';
import { fmtC, fmtNum, fmtNumM, fmtSigned, fmtSlot } from '../lib/format';
import { SAT_NAME, thermalColor, type SatReading } from '../lib/thermal';
import { IconCloud, IconCrosshair } from './icons';

const COLD = '#8f9aa5'; // swatch sel berawan

export const satLabel = (src: string) =>
  src.includes('NOAA20') ? 'NOAA-20' : src.includes('NOAA21') ? 'NOAA-21' : src.includes('SNPP') ? 'S-NPP' : src;

interface ThermalProps {
  readings: SatReading[];
  pixelId: string;
  lon: number;
  lat: number;
  km: number; // jarak dari penanda
  member: boolean;
  rep: boolean;
  /** Anomali (K) mulai dihitung panas; dari skala atribut u_H. Tanpa ini dipakai z ≥ 3. */
  hotFrom?: number;
}

/** Isi tooltip citra termal: suhu tiap kanal kedua satelit di sel yang ditunjuk. */
export function ThermalTip({ readings, pixelId, lon, lat, km, member, rep, hotFrom }: ThermalProps) {
  const { t, lang } = useI18n();
  const observed = readings.filter((r) => r.hot.k != null || r.ref.k != null);
  const first = readings.find((r) => r.hot.k != null);
  const k1 = (v: number) => fmtNum(v, 1, lang);
  const isHot = (r: SatReading) => r.anomaly != null && (hotFrom != null ? r.anomaly >= hotFrom : r.z != null && r.z >= 3);
  const temp = (k: number | null, band: string) => (k == null
    ? <span className="muted">—</span>
    : <><b>{fmtC(k, lang)}</b><small>{band} · {k1(k)} K</small></>);

  return (
    <>
      <div className="tip-head">
        <i className="tip-sw" style={{ background: first?.hot.k != null ? thermalColor(first.hot.k) : COLD }} aria-hidden="true" />
        <b className="mono">{pixelId}</b>
        {(rep || member) && <span className="tip-tag">{t(rep ? 'probe.rep' : 'probe.member')}</span>}
      </div>
      <div className="tip-sub">{fmtNumM(lat, 3, lang)}°, {fmtNumM(lon, 3, lang)}° · {t('probe.from_marker', { km: fmtNum(km, 1, lang) })}</div>
      {!readings.length ? (
        <p className="tip-cloud">{t('probe.no_data')}</p>
      ) : !observed.length ? (
        <p className="tip-cloud"><IconCloud size={13} />{t('probe.cloud')}</p>
      ) : (
        <>
          <div className="tip-grid" style={{ ['--cols' as string]: readings.length }}>
            <span />
            {readings.map((r) => <span key={r.sat} className="tip-th">{SAT_NAME[r.sat]}</span>)}

            <span className="tip-row">{t('probe.row_hot')}</span>
            {readings.map((r) => <span key={r.sat} className="tip-cell">{temp(r.hot.k, r.hot.band)}</span>)}

            <span className="tip-row">{t('probe.row_ref')}</span>
            {readings.map((r) => <span key={r.sat} className="tip-cell">{temp(r.ref.k, r.ref.band)}</span>)}

            <span className="tip-row">{t('probe.row_dt')}</span>
            {readings.map((r) => (
              <span key={r.sat} className="tip-cell">{r.dt == null ? <span className="muted">—</span> : <b>{fmtSigned(r.dt, 1, lang)} K</b>}</span>
            ))}

            <span className="tip-row">{t('probe.row_anom')}</span>
            {readings.map((r) => (
              <span key={r.sat} className={`tip-cell${isHot(r) ? ' hot' : ''}`}>
                {r.anomaly == null || r.z == null
                  ? <span className="muted">—</span>
                  : <><b>{fmtSigned(r.anomaly, 1, lang)} K</b><small>{t('probe.z', { z: fmtNum(r.z, 1, lang) })}</small></>}
              </span>
            ))}

            <span className="tip-row">{t('probe.row_bg')}</span>
            {readings.map((r) => (
              <span key={r.sat} className="tip-cell"><b>{fmtSigned(r.bgDt, 1, lang)} K</b><small>σ {fmtNum(r.sigma, 2, lang)} K</small></span>
            ))}
          </div>
          <div className="tip-foot">{t('probe.note')}</div>
        </>
      )}
    </>
  );
}

/** Tooltip koordinat di citra VIIRS. */
export function CoordTip({ lon, lat, km }: { lon: number; lat: number; km: number }) {
  const { t, lang } = useI18n();
  return (
    <>
      <div className="tip-head"><IconCrosshair size={13} /><b className="mono">{fmtNumM(lat, 3, lang)}°, {fmtNumM(lon, 3, lang)}°</b></div>
      <div className="tip-sub">{t('probe.from_marker', { km: fmtNum(km, 1, lang) })}</div>
    </>
  );
}

/** Tooltip satu titik deteksi VIIRS. */
export function ViirsTip({ d }: { d: ViirsDetection }) {
  const { t, lang } = useI18n();
  return (
    <>
      <div className="tip-head"><i className={`tip-dot${d.distance_km <= 2 ? ' near' : ''}`} aria-hidden="true" /><b>{t('probe.viirs_pt', { sat: satLabel(d.src) })}</b></div>
      <div className="tip-sub">{fmtSlot(d.time_utc, lang)}</div>
      <div className="tip-facts">
        <span>{t('probe.from_marker', { km: fmtNum(d.distance_km, 1, lang) })}</span>
        <span>{t('probe.conf', { c: t(`probe.conf_${d.confidence}`) })}</span>
        <span>{t('probe.frp', { v: fmtNum(d.frp, 1, lang) })}</span>
      </div>
    </>
  );
}
