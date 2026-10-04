import { useState } from 'react';
import type { EvidenceImg } from '../types';
import { useI18n } from '../i18n';
import { fmtNum, fmtSlot } from '../lib/format';

/** Crop ±0,2° (≈ 44 km); lingkaran = radius 5 km dari koordinat kelompok. */
export function EvidenceImage({ img }: { img: EvidenceImg }) {
  const { t, lang } = useI18n();
  const [failed, setFailed] = useState(false);
  return (
    <figure className="evimg">
      <div className="evimg-frame">
        {failed ? (
          <div className="evimg-missing">{t('ver.img_missing')}</div>
        ) : (
          <img src={img.url} alt={`${t(`ver.src.${img.source}`)} · ${fmtSlot(img.observed_at, lang)}`} loading="lazy" onError={() => setFailed(true)} />
        )}
        {!img.marker_drawn && !failed && <span className="evimg-marker" aria-hidden="true" />}
      </div>
      <figcaption>
        <b>{t(`ver.src.${img.source}`)}</b>
        <span>{img.layer}</span>
        <span>{fmtSlot(img.observed_at, lang)} · {t('ver.age', { h: fmtNum(img.age_h, 1, lang) })}</span>
      </figcaption>
    </figure>
  );
}
