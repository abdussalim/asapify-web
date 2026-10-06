import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import id from './id.json';
import en from './en.json';
import { load, save } from '../lib/storage';

export type Lang = 'id' | 'en';
type Vars = Record<string, string | number>;

const DICTS: Record<Lang, Record<string, string>> = { id, en };

interface I18n {
  lang: Lang;
  setLang(l: Lang): void;
  t(key: string, vars?: Vars): string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (load('asapify.lang') === 'id' ? 'id' : 'en'));

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = useCallback((l: Lang) => { setLangState(l); save('asapify.lang', l); }, []);

  const t = useCallback((key: string, vars?: Vars) => {
    const s = DICTS[lang][key] ?? DICTS.en[key] ?? key;
    return vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s;
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n di luar I18nProvider');
  return v;
}
