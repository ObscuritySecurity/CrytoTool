import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LANGUAGES, TranslationKey, translations, getLanguageOptions } from './i18n';

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: TranslationKey) => string;
  languages: typeof LANGUAGES;
  languageOptions: ReturnType<typeof getLanguageOptions>;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<string>(() => {
    return localStorage.getItem('app_language') || 'ro';
  });

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: TranslationKey): string => {
    const langTranslations = translations[language] || translations['en'];
    return langTranslations[key] || translations['en'][key] || key;
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <I18nContext.Provider value={{ 
      language, 
      setLanguage, 
      t, 
      languages: LANGUAGES,
      languageOptions: getLanguageOptions()
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
