// ===========================================
// Translation Service
// Primary: Google Translate API (fast, cheap)
// Fallback: Gemini AI (for complex translations)
// ===========================================

import { config } from '../../core/config';
import { costService } from '../costs/cost.service';
import { callGeminiWithRetry } from '../../core/gemini';
import {
  translateRecord,
  isGoogleTranslateAvailable,
  GOOGLE_TRANSLATE_LANGUAGES,
} from '../../core/google-translate';

export interface TranslationRequest {
  texts: Record<string, string>;
  targetLanguage: string;
  userId?: string;
  useGemini?: boolean; // Force Gemini for complex translations
}

export interface TranslationResult {
  translations: Record<string, string>;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  provider: 'google' | 'gemini';
}

// Supported languages
export const SUPPORTED_LANGUAGES = {
  en: 'English',
  tr: 'Türkçe',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
  pt: 'Português',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  ar: 'العربية',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
  vi: 'Tiếng Việt',
  th: 'ไทย',
  id: 'Bahasa Indonesia',
  hi: 'हिन्दी',
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

class TranslationService {
  /**
   * Translate multiple texts at once
   * Uses Google Translate by default, falls back to Gemini if needed
   */
  async translateTexts(request: TranslationRequest): Promise<TranslationResult> {
    const { texts, targetLanguage, userId, useGemini } = request;

    // If explicitly requesting Gemini or Google Translate is not available
    if (useGemini || !isGoogleTranslateAvailable()) {
      return this.translateWithGemini(request);
    }

    // Try Google Translate first (faster, cheaper)
    try {
      return await this.translateWithGoogleApi(request);
    } catch (error) {
      console.warn('Google Translate failed, falling back to Gemini:', error);
      return this.translateWithGemini(request);
    }
  }

  /**
   * Translate using Google Cloud Translation API
   */
  private async translateWithGoogleApi(request: TranslationRequest): Promise<TranslationResult> {
    const startTime = Date.now();
    const { texts, targetLanguage, userId } = request;

    // Skip translation if target is English (source language)
    if (targetLanguage === 'en') {
      return {
        translations: texts,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        provider: 'google',
      };
    }

    const translations = await translateRecord(texts, targetLanguage, 'en');
    const durationMs = Date.now() - startTime;

    // Estimate character count for cost calculation
    const charCount = Object.values(texts).join('').length;
    // Google Translate pricing: $20 per 1M characters
    const costUsd = (charCount / 1_000_000) * 20;

    // Log the cost
    costService.logCost({
      service: 'google_translate',
      operation: 'translation',
      inputTokens: 0,
      outputTokens: 0,
      costUsd,
      userId,
      durationMs,
      metadata: {
        targetLanguage,
        textCount: Object.keys(texts).length,
        charCount,
        provider: 'google',
      },
    }).catch(err => console.error('Failed to log translation cost:', err));

    return {
      translations,
      inputTokens: 0,
      outputTokens: 0,
      costUsd,
      provider: 'google',
    };
  }

  /**
   * Translate using Gemini AI (for complex translations or fallback)
   */
  private async translateWithGemini(request: TranslationRequest): Promise<TranslationResult> {
    const apiKey = config.gemini.apiKey;

    if (!apiKey) {
      // Return original texts if no API key
      return {
        translations: request.texts,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        provider: 'gemini',
      };
    }

    const startTime = Date.now();
    const targetLang = SUPPORTED_LANGUAGES[request.targetLanguage as LanguageCode] || request.targetLanguage;

    // Build prompt with all texts
    const textEntries = Object.entries(request.texts);
    const textsToTranslate = textEntries
      .map(([key, value], index) => `[${index}] ${value}`)
      .join('\n\n');

    const prompt = `You are a professional translator. Translate the following texts to ${targetLang}.

IMPORTANT RULES:
- Maintain the same tone and style
- Keep technical terms accurate (crypto trading terminology)
- Keep numbers, prices, and symbols unchanged
- Return ONLY the translations in the exact same format: [index] translated_text
- Do NOT add explanations or notes

TEXTS TO TRANSLATE:
${textsToTranslate}`;

    try {
      // Use retry-enabled Gemini API call
      const data = await callGeminiWithRetry(
        {
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3, // Lower temperature for more consistent translations
            maxOutputTokens: 4000,
          },
        },
        5, // maxRetries - increased for rate limit resilience
        'translation'
      );

      const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse translations
      const translations: Record<string, string> = {};

      textEntries.forEach(([key], index) => {
        // Find the line starting with [index]
        const pattern = new RegExp(`\\[${index}\\]\\s*(.+)`, 's');
        const match = translatedText.match(pattern);
        if (match) {
          translations[key] = match[1].trim();
        } else {
          // Fallback to original
          translations[key] = request.texts[key];
        }
      });

      // Calculate costs
      const usageMetadata = data.usageMetadata || {};
      const inputTokens = usageMetadata.promptTokenCount || Math.ceil(prompt.length / 4);
      const outputTokens = usageMetadata.candidatesTokenCount || Math.ceil(translatedText.length / 4);
      const costUsd = costService.calculateGeminiCost(inputTokens, outputTokens);
      const durationMs = Date.now() - startTime;

      // Log the cost
      costService.logCost({
        service: 'gemini',
        operation: 'translation',
        inputTokens,
        outputTokens,
        costUsd,
        userId: request.userId,
        durationMs,
        metadata: {
          targetLanguage: request.targetLanguage,
          textCount: textEntries.length,
          provider: 'gemini',
        },
      }).catch(err => console.error('Failed to log translation cost:', err));

      return {
        translations,
        inputTokens,
        outputTokens,
        costUsd,
        provider: 'gemini',
      };
    } catch (error) {
      console.error('Gemini translation error:', error);
      return {
        translations: request.texts,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        provider: 'gemini',
      };
    }
  }

  /**
   * Simple single text translation
   */
  async translate(
    text: string,
    targetLanguage: string,
    userId?: string
  ): Promise<string> {
    const result = await this.translateTexts({
      texts: { text },
      targetLanguage,
      userId,
    });
    return result.translations.text || text;
  }

  /**
   * Get estimated cost for translation
   */
  estimateTranslationCost(textLength: number): number {
    // Google Translate is much cheaper
    if (isGoogleTranslateAvailable()) {
      return (textLength / 1_000_000) * 20; // $20 per 1M chars
    }
    // Gemini fallback
    const estimatedInputTokens = Math.ceil(textLength / 4) + 200;
    const estimatedOutputTokens = Math.ceil(textLength / 4);
    return costService.calculateGeminiCost(estimatedInputTokens, estimatedOutputTokens);
  }

  /**
   * Check which provider is available
   */
  getAvailableProvider(): 'google' | 'gemini' | null {
    if (isGoogleTranslateAvailable()) return 'google';
    if (config.gemini.apiKey) return 'gemini';
    return null;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): typeof SUPPORTED_LANGUAGES {
    return SUPPORTED_LANGUAGES;
  }
}

export const translationService = new TranslationService();
