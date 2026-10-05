import type { ViirsDetection } from '../types';
import { useI18n } from '../i18n';
import { fmtC, fmtNum, fmtSigned, fmtSlot } from '../lib/format';
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
}

/** Isi tooltip citra termal: suhu tiap kanal kedua satelit di sel yang ditunjuk. */
export function ThermalTip({ readings, pixelId, lon, lat, km, member, rep }: ThermalProps) {
  const { t, lang } = useI18n();
  const observed = readings.filter((r) => r.hot.k != null || r.ref.k != null);
  const first = readings.find((r) => r.hot.k != null);
  const k1 = (v: number) => fmtNum(v, 1, lang);
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
      <div className="tip-sub">{fmtNum(lat, 3, lang)}°, {fmtNum(lon, 3, lang)}° · {t('probe.from_marker', { km: fmtNum(km, 1, lang) })}</div>
      {!observed.length ? (
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
              <span key={r.sat} className={`tip-cell${r.z != null && r.z >= 3 ? ' hot' : ''}`}>
                {r.anomaly == null || r.z == null
                  ? <span className="muted">—</span>
                  : <><b>{fmtSigned(r.anomaly, 1, lang)} K</b><small>{t('probe.z', { z: fmtNum(r.z, 1, lang) })}</small></>}
              </span>
            ))}
          </div>
          {first && <div className="tip-foot">{t('probe.bg', { dt: fmtSigned(first.bgDt, 1, lang), sigma: k1(first.sigma) })}</div>}
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
      <div className="tip-head"><IconCrosshair size={13} /><b className="mono">{fmtNum(lat, 3, lang)}°, {fmtNum(lon, 3, lang)}°</b></div>
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
