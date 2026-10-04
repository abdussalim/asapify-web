import { useState } from 'react';
import type { Basemap } from '../types';
import type { LiteReason } from '../lib/device';
import type { LayerKey } from '../map/layers';
import { LAYER_KEYS } from '../map/layers';
import { useI18n } from '../i18n';
import { IconX } from './icons';

interface Props {
  basemap: string;
  basemaps: Basemap[];
  layers: Record<LayerKey, boolean>;
  lite: boolean;
  liteReason: LiteReason | null;
  liteAuto: boolean;
  onBasemap(id: string): void;
  onLayer(key: LayerKey, on: boolean): void;
  onLite(on: boolean): void;
}

const IconLayers = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 2l6 3.2-6 3.2-6-3.2z" /><path d="M2 8.2l6 3.2 6-3.2" /><path d="M2 11l6 3.2 6-3.2" />
  </svg>
);

export function LayerControl({ basemap, basemaps, layers, lite, liteReason, liteAuto, onBasemap, onLayer, onLite }: Props) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const options = [
    { id: 'peta', label: t('lc.base_map') },
    ...basemaps.map((b) => ({ id: b.id, label: lang === 'id' ? b.label_id : b.label_en })),
    { id: 'polos', label: t('lc.base_plain') },
  ];

  return (
    <div className="layer-ctl">
      <button className="map-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="layer-panel">
        <IconLayers /><span>{t('lc.title')}</span>
      </button>
      {open && (
        <div className="layer-panel" id="layer-panel" role="dialog" aria-label={t('lc.title')}>
          <header>
            <b>{t('lc.title')}</b>
            <button className="icon-btn sm" onClick={() => setOpen(false)} aria-label={t('insp.close')}><IconX size={13} /></button>
          </header>
          <fieldset>
            <legend>{t('lc.basemap')}</legend>
            {options.map((o) => (
              <label key={o.id} className="opt">
                <input type="radio" name="basemap" checked={basemap === o.id} onChange={() => onBasemap(o.id)} />
                <span>{o.label}</span>
              </label>
            ))}
            <p className="muted small">{t('lc.base_note')}</p>
          </fieldset>
          <fieldset>
            <legend>{t('lc.layers')}</legend>
            {LAYER_KEYS.map((k) => (
              <label key={k} className="opt">
                <input type="checkbox" checked={layers[k]} onChange={(e) => onLayer(k, e.target.checked)} />
                <span>{t(`lc.layer_${k}`)}</span>
              </label>
            ))}
          </fieldset>
          <fieldset>
            <legend>{t('lc.performance')}</legend>
            <label className="opt">
              <input type="checkbox" checked={lite} onChange={(e) => onLite(e.target.checked)} />
              <span>{t('lc.lite')}</span>
            </label>
            <p className="muted small">
              {liteAuto && liteReason ? t('lc.lite_auto', { why: t(`lc.why_${liteReason}`) }) : t('lc.lite_note')}
            </p>
          </fieldset>
        </div>
      )}
    </div>
  );
}
