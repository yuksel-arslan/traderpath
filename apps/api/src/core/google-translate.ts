// ===========================================
// Google Cloud Translation API Client
// Fast, reliable translation for UI text
// ===========================================

// Get API key at runtime (not from config to avoid build-time detection)
const getApiKey = () => process.env['GOOGLE_TRANSLATE_API_KEY'] || '';
const GOOGLE_TRANSLATE_URL = 'https://translation.googleapis.com/language/translate/v2';

// ===========================================
// Types
// ===========================================

export interface TranslateRequest {
  text: string | string[];
  targetLanguage: string;
  sourceLanguage?: string;
}

export interface TranslateResponse {
  translations: Array<{
    translatedText: string;
    detectedSourceLanguage?: string;
  }>;
}

interface GoogleTranslateApiResponse {
  data?: {
    translations?: Array<{
      translatedText: string;
      detectedSourceLanguage?: string;
    }>;
  };
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

// Language code mapping (ISO 639-1)
export const GOOGLE_TRANSLATE_LANGUAGES: Record<string, string> = {
  en: 'en',
  tr: 'tr',
  es: 'es',
  de: 'de',
  fr: 'fr',
  pt: 'pt',
  ru: 'ru',
  zh: 'zh-CN', // Simplified Chinese
  ja: 'ja',
  ko: 'ko',
  ar: 'ar',
  it: 'it',
  nl: 'nl',
  pl: 'pl',
  vi: 'vi',
  th: 'th',
  id: 'id',
  hi: 'hi',
};

// ===========================================
// Main Functions
// ===========================================

/**
 * Translate text using Google Cloud Translation API
 * @param request - Translation request with text and target language
 * @returns Translated text(s)
 */
export async function translateWithGoogle(
  request: TranslateRequest
): Promise<TranslateResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('GOOGLE_TRANSLATE_API_KEY is not configured');
  }

  const texts = Array.isArray(request.text) ? request.text : [request.text];
  const targetLang = GOOGLE_TRANSLATE_LANGUAGES[request.targetLanguage] || request.targetLanguage;
  const sourceLang = request.sourceLanguage
    ? (GOOGLE_TRANSLATE_LANGUAGES[request.sourceLanguage] || request.sourceLanguage)
    : undefined;

  // Build request body
  const body: Record<string, unknown> = {
    q: texts,
    target: targetLang,
    format: 'text',
  };

  if (sourceLang) {
    body.source = sourceLang;
  }

  try {
    const response = await fetch(
      `${GOOGLE_TRANSLATE_URL}?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    const data: GoogleTranslateApiResponse = await response.json();

    if (!response.ok || data.error) {
      throw new Error(
        data.error?.message || `Google Translate API error: ${response.status}`
      );
    }

    if (!data.data?.translations) {
      throw new Error('Invalid response from Google Translate API');
    }

    return {
      translations: data.data.translations,
    };
  } catch (error) {
    console.error('Google Translate API error:', error);
    throw error;
  }
}

/**
 * Translate a single text string
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string> {
  const result = await translateWithGoogle({
    text,
    targetLanguage,
    sourceLanguage,
  });
  return result.translations[0]?.translatedText || text;
}

/**
 * Translate multiple texts in batch (more efficient)
 */
export async function translateBatch(
  texts: string[],
  targetLanguage: string,
  sourceLanguage?: string
): Promise<string[]> {
  if (texts.length === 0) return [];

  const result = await translateWithGoogle({
    text: texts,
    targetLanguage,
    sourceLanguage,
  });

  return result.translations.map((t, i) => t.translatedText || texts[i]);
}

/**
 * Translate a Record of key-value pairs
 */
export async function translateRecord(
  record: Record<string, string>,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<Record<string, string>> {
  const keys = Object.keys(record);
  const values = Object.values(record);

  if (values.length === 0) return {};

  const translatedValues = await translateBatch(values, targetLanguage, sourceLanguage);

  const result: Record<string, string> = {};
  keys.forEach((key, i) => {
    result[key] = translatedValues[i];
  });

  return result;
}

/**
 * Check if Google Translate API is available
 */
export function isGoogleTranslateAvailable(): boolean {
  return !!getApiKey();
}

/**
 * Detect the language of a text
 */
export async function detectLanguage(text: string): Promise<string | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2/detect?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ q: text }),
      }
    );

    const data = await response.json();
    return data.data?.detections?.[0]?.[0]?.language || null;
  } catch (error) {
    console.error('Language detection error:', error);
    return null;
  }
}
