import type { ViirsDetection } from '../types';
import { useI18n } from '../i18n';
import { fmtNum, fmtSlot } from '../lib/format';

const satName = (src: string) =>
  src.includes('NOAA20') ? 'NOAA-20' : src.includes('NOAA21') ? 'NOAA-21' : src.includes('SNPP') ? 'S-NPP' : src;

export function ViirsList({ detections }: { detections: ViirsDetection[] }) {
  const { t, lang } = useI18n();
  if (!detections.length) return <p className="muted">{t('ver.viirs_empty')}</p>;
  return (
    <ul className="viirs">
      {detections.map((d) => (
        <li key={`${d.src}-${d.time_utc}`}>
          <span>{satName(d.src)} · {fmtSlot(d.time_utc, lang)}</span>
          <b className={d.distance_km <= 2 ? 'near' : ''}>{fmtNum(d.distance_km, 1, lang)} km</b>
        </li>
      ))}
    </ul>
  );
}
