import type { AttrKey, Attributes } from '../types';
import { useI18n } from '../i18n';
import { fmtNum } from '../lib/format';
import { ATTR_ORDER, T_AWAS, utility } from '../lib/maut';

interface Props {
  attributes: Attributes;
  neighbourSupport: number | null;
  weights: Record<AttrKey, number>;
}

/** Nilai uᵢ per atribut + bobotnya; atribut hilang ditulis "tidak tersedia". */
export function AttributeBars({ attributes, neighbourSupport, weights }: Props) {
  const { t, lang } = useI18n();
  const values: Record<AttrKey, number | null> = { ...attributes, u_N: neighbourSupport };
  const U = utility(attributes, neighbourSupport);
  return (
    <div className="attrs">
      {ATTR_ORDER.map((k) => {
        const v = values[k];
        return (
          <div className="attr" key={k}>
            <span className="attr-name">{t(`attr.${k}`)} <code>{k}</code></span>
            <span className="attr-bar" aria-hidden="true"><i style={{ width: `${(v ?? 0) * 100}%` }} /></span>
            <b className={v == null ? 'na' : ''}>{v == null ? t('attr.na') : fmtNum(v, 2, lang)}</b>
            <small>{t('attr.weight', { w: fmtNum(weights[k], 2, lang) })}</small>
          </div>
        );
      })}
      <div className="attr total">
        <span className="attr-name">{t('attr.total')}</span>
        <span className="attr-bar" aria-hidden="true">
          <i style={{ width: `${U * 100}%` }} className={U >= T_AWAS ? 'hot' : ''} />
          <em style={{ left: `${T_AWAS * 100}%` }} />
        </span>
        <b>{fmtNum(U, 2, lang)}</b>
        <small>≥ {fmtNum(T_AWAS, 2, lang)}</small>
      </div>
    </div>
  );
}
