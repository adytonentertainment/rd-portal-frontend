import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import translations, { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './translations';

// Portal language, chosen by the writer.
//
// The choice is written to localStorage immediately (so the UI never waits on
// the network) and mirrored to the writer's contact record, so it follows them
// to a phone or a new machine instead of being re-picked every time.
//
// Deliberately hand-rolled rather than pulling in i18next: the portal has one
// namespace and two languages, and a dependency that ships a plural engine and
// a loader for that is more surface than the problem deserves.

const STORAGE_KEY = 'portalLanguage';

const LanguageContext = createContext(null);

const normalize = (value) => {
  const v = (value || '').trim().toLowerCase().slice(0, 2);
  return SUPPORTED_LANGUAGES.includes(v) ? v : null;
};

const readStored = () => {
  try {
    return normalize(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
};

// Someone whose browser is set to Spanish should not have to find the switch.
const fromBrowser = () => {
  if (typeof navigator === 'undefined') return null;
  const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];
  for (const l of langs || []) {
    const hit = normalize(l);
    if (hit) return hit;
  }
  return null;
};

export const LanguageProvider = ({ children, persist }) => {
  const [lang, setLangState] = useState(() => readStored() || fromBrowser() || DEFAULT_LANGUAGE);

  useEffect(() => {
    // Screen readers and browser translation prompts key off this.
    if (typeof document !== 'undefined') document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback(
    (next) => {
      const value = normalize(next);
      if (!value) return;
      setLangState(value);
      try {
        localStorage.setItem(STORAGE_KEY, value);
      } catch {
        /* private mode — the in-memory choice still applies for this session */
      }
      // Saving the preference server-side is a nicety; failing to reach the
      // API must never undo a switch the writer just made and can see.
      if (persist) Promise.resolve(persist(value)).catch(() => {});
    },
    [persist]
  );

  const t = useCallback(
    (key, vars) => {
      const table = translations[lang] || translations[DEFAULT_LANGUAGE];
      let out = table[key];
      if (out == null) out = translations[DEFAULT_LANGUAGE][key];
      if (out == null) return key;
      if (!vars) return out;
      return Object.keys(vars).reduce((acc, k) => acc.split(`{${k}}`).join(String(vars[k])), out);
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

// Usable outside the provider so a component can be dropped anywhere without
// crashing the page — it just renders English.
export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (ctx) return ctx;
  return {
    lang: DEFAULT_LANGUAGE,
    setLang: () => {},
    t: (key, vars) => {
      const out = translations[DEFAULT_LANGUAGE][key];
      if (out == null) return key;
      if (!vars) return out;
      return Object.keys(vars).reduce((acc, k) => acc.split(`{${k}}`).join(String(vars[k])), out);
    },
  };
};

export default LanguageContext;
