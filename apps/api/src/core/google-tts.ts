// ===========================================
// Google Cloud Text-to-Speech API Client
// High-quality TTS with WaveNet/Neural2 voices
// ===========================================

// Get API key at runtime (not from config to avoid build-time detection)
const getApiKey = () => process.env['GOOGLE_TRANSLATE_API_KEY'] || '';
const GOOGLE_TTS_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// ===========================================
// Types
// ===========================================

export interface TTSRequest {
  text: string;
  language: string;
  gender?: 'MALE' | 'FEMALE';
  speakingRate?: number; // 0.25 to 4.0, default 1.0
  pitch?: number; // -20.0 to 20.0, default 0
}

export interface TTSResponse {
  audioContent: string; // Base64 encoded audio
  contentType: string;
}

interface GoogleTTSApiResponse {
  audioContent?: string;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

// Voice configurations per language
// Using WaveNet voices for better quality (fallback to Standard if not available)
const VOICE_CONFIG: Record<string, { male: string; female: string; languageCode: string }> = {
  tr: {
    languageCode: 'tr-TR',
    male: 'tr-TR-Wavenet-B',
    female: 'tr-TR-Wavenet-A',
  },
  en: {
    languageCode: 'en-US',
    male: 'en-US-Neural2-D',
    female: 'en-US-Neural2-F',
  },
  es: {
    languageCode: 'es-ES',
    male: 'es-ES-Neural2-B',
    female: 'es-ES-Neural2-A',
  },
  de: {
    languageCode: 'de-DE',
    male: 'de-DE-Neural2-B',
    female: 'de-DE-Neural2-A',
  },
  fr: {
    languageCode: 'fr-FR',
    male: 'fr-FR-Neural2-B',
    female: 'fr-FR-Neural2-A',
  },
  pt: {
    languageCode: 'pt-BR',
    male: 'pt-BR-Neural2-B',
    female: 'pt-BR-Neural2-A',
  },
  ru: {
    languageCode: 'ru-RU',
    male: 'ru-RU-Wavenet-B',
    female: 'ru-RU-Wavenet-A',
  },
  zh: {
    languageCode: 'cmn-CN',
    male: 'cmn-CN-Wavenet-B',
    female: 'cmn-CN-Wavenet-A',
  },
  ja: {
    languageCode: 'ja-JP',
    male: 'ja-JP-Neural2-C',
    female: 'ja-JP-Neural2-B',
  },
  ko: {
    languageCode: 'ko-KR',
    male: 'ko-KR-Neural2-C',
    female: 'ko-KR-Neural2-A',
  },
  ar: {
    languageCode: 'ar-XA',
    male: 'ar-XA-Wavenet-B',
    female: 'ar-XA-Wavenet-A',
  },
  it: {
    languageCode: 'it-IT',
    male: 'it-IT-Neural2-C',
    female: 'it-IT-Neural2-A',
  },
};

// ===========================================
// Main Functions
// ===========================================

/**
 * Synthesize speech using Google Cloud TTS
 * @param request - TTS request with text and language
 * @returns Base64 encoded audio content
 */
export async function synthesizeSpeech(request: TTSRequest): Promise<TTSResponse> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('GOOGLE_TTS_API_KEY is not configured');
  }

  const voiceConfig = VOICE_CONFIG[request.language] || VOICE_CONFIG.en;
  const gender = request.gender || 'MALE';
  const voiceName = gender === 'MALE' ? voiceConfig.male : voiceConfig.female;

  const body = {
    input: {
      text: request.text,
    },
    voice: {
      languageCode: voiceConfig.languageCode,
      name: voiceName,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: request.speakingRate || 1.0,
      pitch: request.pitch || 0,
      // Boost volume slightly for clearer audio
      volumeGainDb: 2.0,
    },
  };

  try {
    const response = await fetch(`${GOOGLE_TTS_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data: GoogleTTSApiResponse = await response.json();

    if (!response.ok || data.error) {
      console.error('Google TTS API error:', data.error);
      throw new Error(data.error?.message || `Google TTS API error: ${response.status}`);
    }

    if (!data.audioContent) {
      throw new Error('No audio content in response');
    }

    return {
      audioContent: data.audioContent,
      contentType: 'audio/mpeg',
    };
  } catch (error) {
    console.error('Google TTS error:', error);
    throw error;
  }
}

/**
 * Check if Google TTS is available
 */
export function isGoogleTTSAvailable(): boolean {
  return !!getApiKey();
}

/**
 * Get available voices for a language
 */
export function getVoicesForLanguage(language: string): { male: string; female: string } | null {
  const config = VOICE_CONFIG[language];
  if (!config) return null;
  return { male: config.male, female: config.female };
}

/**
 * Get supported languages
 */
export function getSupportedTTSLanguages(): string[] {
  return Object.keys(VOICE_CONFIG);
}
