import type { EvidenceResult } from '../types';
import { useI18n } from '../i18n';
import { IconClock, IconHelp, IconSpark } from './icons';

export function EvidenceBadge({ result }: { result: EvidenceResult | null }) {
  const { t } = useI18n();
  if (result === 'strong_evidence') return <span className="pill ai"><IconSpark size={12} />{t('evidence.strong')}</span>;
  if (result === 'inconclusive') return <span className="pill grey"><IconHelp size={12} />{t('evidence.inconclusive')}</span>;
  return <span className="pill outline"><IconClock size={12} />{t('evidence.none')}</span>;
}
