// ===========================================
// Language Configuration
// ===========================================

export interface Language {
  code: string;           // ISO 639-1 code
  name: string;           // English name
  nativeName: string;     // Name in its own language
  direction: 'ltr' | 'rtl';
  flag: string;           // Country flag emoji
  region?: string;        // Common region/country
}

// Supported languages in TraderPath
export const SUPPORTED_LANGUAGES: Language[] = [
  // Primary languages
  { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr', flag: '🇺🇸', region: 'USA/UK' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', direction: 'ltr', flag: '🇹🇷', region: 'Turkey' },

  // European languages
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'ltr', flag: '🇪🇸', region: 'Spain' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', direction: 'ltr', flag: '🇩🇪', region: 'Germany' },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'ltr', flag: '🇫🇷', region: 'France' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', direction: 'ltr', flag: '🇮🇹', region: 'Italy' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'ltr', flag: '🇧🇷', region: 'Brazil' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', direction: 'ltr', flag: '🇳🇱', region: 'Netherlands' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', direction: 'ltr', flag: '🇵🇱', region: 'Poland' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', direction: 'ltr', flag: '🇷🇺', region: 'Russia' },

  // Middle Eastern languages
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', flag: '🇸🇦', region: 'Saudi Arabia' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', direction: 'rtl', flag: '🇮🇷', region: 'Iran' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', direction: 'rtl', flag: '🇮🇱', region: 'Israel' },

  // Asian languages
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '简体中文', direction: 'ltr', flag: '🇨🇳', region: 'China' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', flag: '🇯🇵', region: 'Japan' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', direction: 'ltr', flag: '🇰🇷', region: 'South Korea' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', direction: 'ltr', flag: '🇻🇳', region: 'Vietnam' },
  { code: 'th', name: 'Thai', nativeName: 'ภาษาไทย', direction: 'ltr', flag: '🇹🇭', region: 'Thailand' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', direction: 'ltr', flag: '🇮🇩', region: 'Indonesia' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr', flag: '🇮🇳', region: 'India' },
];

// Default language
export const DEFAULT_LANGUAGE = 'en';

// Get language by code
export function getLanguage(code: string): Language | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === code);
}

// Check if language is supported
export function isLanguageSupported(code: string): boolean {
  return SUPPORTED_LANGUAGES.some(lang => lang.code === code);
}

// Get language code from browser accept-language header
export function detectLanguageFromHeader(acceptLanguage: string | undefined): string {
  if (!acceptLanguage) return DEFAULT_LANGUAGE;

  // Parse Accept-Language header: "en-US,en;q=0.9,tr;q=0.8"
  const languages = acceptLanguage.split(',').map(part => {
    const [lang, qPart] = part.trim().split(';');
    const q = qPart ? parseFloat(qPart.replace('q=', '')) : 1;
    return { code: lang.split('-')[0].toLowerCase(), q };
  }).sort((a, b) => b.q - a.q);

  // Find first supported language
  for (const { code } of languages) {
    if (isLanguageSupported(code)) {
      return code;
    }
  }

  return DEFAULT_LANGUAGE;
}

// Language code to region mapping (for auto-detection based on IP)
export const REGION_TO_LANGUAGE: Record<string, string> = {
  // English
  'US': 'en', 'GB': 'en', 'AU': 'en', 'CA': 'en', 'NZ': 'en', 'IE': 'en',
  // Turkish
  'TR': 'tr', 'CY': 'tr',
  // Arabic
  'SA': 'ar', 'AE': 'ar', 'QA': 'ar', 'KW': 'ar', 'BH': 'ar', 'OM': 'ar',
  'EG': 'ar', 'JO': 'ar', 'LB': 'ar', 'IQ': 'ar', 'LY': 'ar', 'MA': 'ar',
  'TN': 'ar', 'DZ': 'ar', 'SD': 'ar', 'YE': 'ar', 'SY': 'ar',
  // Spanish
  'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'CL': 'es', 'PE': 'es',
  'VE': 'es', 'EC': 'es', 'BO': 'es', 'PY': 'es', 'UY': 'es', 'CR': 'es',
  'PA': 'es', 'DO': 'es', 'GT': 'es', 'HN': 'es', 'NI': 'es', 'SV': 'es',
  // German
  'DE': 'de', 'AT': 'de', 'CH': 'de', 'LI': 'de', 'LU': 'de',
  // French
  'FR': 'fr', 'BE': 'fr', 'SN': 'fr', 'CI': 'fr', 'ML': 'fr', 'CM': 'fr',
  // Italian
  'IT': 'it', 'SM': 'it', 'VA': 'it',
  // Portuguese
  'BR': 'pt', 'PT': 'pt', 'AO': 'pt', 'MZ': 'pt',
  // Dutch
  'NL': 'nl', 'SR': 'nl',
  // Polish
  'PL': 'pl',
  // Russian
  'RU': 'ru', 'BY': 'ru', 'KZ': 'ru', 'KG': 'ru',
  // Persian
  'IR': 'fa', 'AF': 'fa',
  // Hebrew
  'IL': 'he',
  // Chinese
  'CN': 'zh', 'TW': 'zh', 'HK': 'zh', 'SG': 'zh',
  // Japanese
  'JP': 'ja',
  // Korean
  'KR': 'ko',
  // Vietnamese
  'VN': 'vi',
  // Thai
  'TH': 'th',
  // Indonesian
  'ID': 'id',
  // Hindi
  'IN': 'hi',
};

// Get language from country code
export function getLanguageFromCountry(countryCode: string): string {
  return REGION_TO_LANGUAGE[countryCode.toUpperCase()] || DEFAULT_LANGUAGE;
}
