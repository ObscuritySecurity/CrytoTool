import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { translations as enFallback } from './en';
import { LANGUAGES, TranslationKey, loadTranslations, getLanguageOptions } from './index';

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: TranslationKey) => string;
  languages: typeof LANGUAGES;
  languageOptions: ReturnType<typeof getLanguageOptions>;
  loading: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    return localStorage.getItem('app_language') || 'en';
  });
  const { current: fallback } = useRef(enFallback);
  const [currentTranslations, setCurrentTranslations] = useState(fallback);
  const [loading, setLoading] = useState(false);

  const loadLang = useCallback(async (code: string) => {
    setLoading(true);
    try {
      const t = await loadTranslations(code);
      setCurrentTranslations(t);
    } catch {
      setCurrentTranslations(fallback);
    } finally {
      setLoading(false);
    }
  }, [fallback]);

  useEffect(() => {
    if (language !== 'en') {
      loadLang(language);
    } else {
      setCurrentTranslations(fallback);
    }
  }, [language, loadLang, fallback]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = useCallback((key: TranslationKey): string => {
    return currentTranslations[key] || fallback[key] || key;
  }, [currentTranslations, fallback]);

  return (
    <I18nContext.Provider value={{
      language,
      setLanguage,
      t,
      languages: LANGUAGES,
      languageOptions: getLanguageOptions(),
      loading,
    }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
