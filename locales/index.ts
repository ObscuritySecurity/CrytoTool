import type { Translations, TranslationKey, Language } from './types';

export type { Translations, TranslationKey, Language };

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', capital: 'London', country: 'United Kingdom' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', capital: 'Beijing', country: 'China' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', capital: 'New Delhi', country: 'India' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', capital: 'Madrid', country: 'Spain' },
  { code: 'fr', name: 'French', nativeName: 'Français', capital: 'Paris', country: 'France' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', capital: 'Riyadh', country: 'Saudi Arabia' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', capital: 'Lisbon', country: 'Portugal' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', capital: 'Dhaka', country: 'Bangladesh' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', capital: 'Moscow', country: 'Russia' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', capital: 'Tokyo', country: 'Japan' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', capital: 'Chandigarh', country: 'India' },
  { code: 'jv', name: 'Javanese', nativeName: 'Basa Jawa', capital: 'Jakarta', country: 'Indonesia' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', capital: 'Berlin', country: 'Germany' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', capital: 'Seoul', country: 'South Korea' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', capital: 'Rome', country: 'Italy' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', capital: 'Chennai', country: 'India' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', capital: 'Ankara', country: 'Turkey' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', capital: 'Hanoi', country: 'Vietnam' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', capital: 'Islamabad', country: 'Pakistan' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', capital: 'Tehran', country: 'Iran' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', capital: 'Warsaw', country: 'Poland' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', capital: 'Kyiv', country: 'Ukraine' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', capital: 'Kuala Lumpur', country: 'Malaysia' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', capital: 'Amsterdam', country: 'Netherlands' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', capital: 'Athens', country: 'Greece' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', capital: 'Jerusalem', country: 'Israel' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', capital: 'Bangkok', country: 'Thailand' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', capital: 'Stockholm', country: 'Sweden' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', capital: 'Prague', country: 'Czech Republic' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', capital: 'Bucharest', country: 'Romania' },
  { code: 'hu', name: 'Hungarian', nativeName: 'Magyar', capital: 'Budapest', country: 'Hungary' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', capital: 'Copenhagen', country: 'Denmark' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', capital: 'Helsinki', country: 'Finland' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', capital: 'Oslo', country: 'Norway' },
  { code: 'sk', name: 'Slovak', nativeName: 'Slovenčina', capital: 'Bratislava', country: 'Slovakia' },
  { code: 'bg', name: 'Bulgarian', nativeName: 'Български', capital: 'Sofia', country: 'Bulgaria' },
  { code: 'sr', name: 'Serbian', nativeName: 'Српски', capital: 'Belgrade', country: 'Serbia' },
  { code: 'hr', name: 'Croatian', nativeName: 'Hrvatski', capital: 'Zagreb', country: 'Croatia' },
  { code: 'lt', name: 'Lithuanian', nativeName: 'Lietuvių', capital: 'Vilnius', country: 'Lithuania' },
  { code: 'sl', name: 'Slovenian', nativeName: 'Slovenščina', capital: 'Ljubljana', country: 'Slovenia' },
  { code: 'lv', name: 'Latvian', nativeName: 'Latviešu', capital: 'Riga', country: 'Latvia' },
  { code: 'et', name: 'Estonian', nativeName: 'Eesti', capital: 'Tallinn', country: 'Estonia' },
  { code: 'sq', name: 'Albanian', nativeName: 'Shqip', capital: 'Tirana', country: 'Albania' },
  { code: 'mk', name: 'Macedonian', nativeName: 'Македонски', capital: 'Skopje', country: 'North Macedonia' },
  { code: 'bs', name: 'Bosnian', nativeName: 'Bosanski', capital: 'Sarajevo', country: 'Bosnia and Herzegovina' },
  { code: 'ca', name: 'Catalan', nativeName: 'Català', capital: 'Barcelona', country: 'Spain' },
  { code: 'eu', name: 'Basque', nativeName: 'Euskara', capital: 'Vitoria-Gasteiz', country: 'Spain' },
  { code: 'gl', name: 'Galician', nativeName: 'Galego', capital: 'Santiago de Compostela', country: 'Spain' },
  { code: 'is', name: 'Icelandic', nativeName: 'Íslenska', capital: 'Reykjavik', country: 'Iceland' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', capital: 'Jakarta', country: 'Indonesia' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', capital: 'Thiruvananthapuram', country: 'India' },
];

const langModules = import.meta.glob<Translations>(['./*.ts', '!./types.ts', '!./index.ts'], {
  import: 'translations',
  eager: false,
});

const cache = new Map<string, Translations>();

export async function loadTranslations(code: string): Promise<Translations> {
  if (cache.has(code)) return cache.get(code)!;

  const path = `./${code}.ts`;
  const loader = langModules[path];
  if (!loader) {
    if (code === 'en') {
      cache.set('en', {});
      return {};
    }
    return loadTranslations('en');
  }
  try {
    const translations = await loader();
    cache.set(code, translations);
    return translations;
  } catch {
    if (code === 'en') {
      cache.set('en', {});
      return {};
    }
    return loadTranslations('en');
  }
}

export const getTranslation = (langCode: string, key: TranslationKey): string => {
  const t = cache.get(langCode);
  if (t && t[key]) return t[key];
  const en = cache.get('en');
  return en?.[key] || key;
};

export async function preloadLanguage(code: string): Promise<void> {
  await loadTranslations(code);
}

export const PRIORITY_LANGUAGES = new Set(['en', 'ro', 'es']);

export const COMPLETION_PERCENTAGES: Record<string, number> = {
  en: 100, ro: 89.5, es: 93.6, fr: 91.3, de: 92.4, it: 91.9,
  pt: 93.9, ru: 94.8, zh: 65.4, ja: 92.4, ko: 94.8, ar: 94.5,
  hi: 95.6, bn: 65.4, pa: 65.1, jv: 91.6, ta: 64.2, tr: 94.5,
  vi: 65.1, ur: 65.4, fa: 65.4, pl: 93.9, uk: 95.4, ms: 94.5,
  nl: 92.7, el: 65.1, he: 92.4, th: 65.1, sv: 64.2, cs: 93.6,
  hu: 65.1, da: 63.1, fi: 65.1, no: 64.5, sk: 94.5, bg: 94.2,
  sr: 94.8, hr: 92.2, lt: 65.1, sl: 94.2, lv: 65.1, et: 65.1,
  sq: 64.8, mk: 65.1, bs: 92.7, ca: 92.7, eu: 94.2, gl: 94.8,
  is: 65.1, id: 93.3, ml: 65.4,
};

export interface LanguageOption {
  label: string;
  value: string;
  desc: string;
  capital: string;
  country: string;
  completion: number;
  locked: boolean;
}

export const getLanguageOptions = (): LanguageOption[] => {
  return LANGUAGES.map(lang => ({
    label: lang.nativeName,
    value: lang.code,
    desc: lang.name,
    capital: lang.capital,
    country: lang.country,
    completion: COMPLETION_PERCENTAGES[lang.code] ?? 0,
    locked: !PRIORITY_LANGUAGES.has(lang.code),
  }));
};
