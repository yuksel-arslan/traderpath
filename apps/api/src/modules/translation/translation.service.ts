// ===========================================
// Translation Service
// Translates report content using Gemini AI
// ===========================================

import { config } from '../../core/config';
import { costService } from '../costs/cost.service';

export interface TranslationRequest {
  texts: Record<string, string>;
  targetLanguage: string;
  userId?: string;
}

export interface TranslationResult {
  translations: Record<string, string>;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
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
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

class TranslationService {
  // Translate multiple texts at once for efficiency
  async translateTexts(request: TranslationRequest): Promise<TranslationResult> {
    const apiKey = config.gemini.apiKey;

    if (!apiKey) {
      // Return original texts if no API key
      return {
        translations: request.texts,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
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
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.3, // Lower temperature for more consistent translations
              maxOutputTokens: 4000,
            },
          }),
        }
      );

      if (!response.ok) {
        console.error('Gemini API error:', response.statusText);
        return {
          translations: request.texts,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 0,
        };
      }

      const data = await response.json();
      const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Parse translations
      const translations: Record<string, string> = {};
      const lines = translatedText.split('\n').filter((line: string) => line.trim());

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
        metadata: { targetLanguage: request.targetLanguage, textCount: textEntries.length },
      }).catch(err => console.error('Failed to log translation cost:', err));

      return {
        translations,
        inputTokens,
        outputTokens,
        costUsd,
      };
    } catch (error) {
      console.error('Translation error:', error);
      return {
        translations: request.texts,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      };
    }
  }

  // Get estimated cost for translation
  estimateTranslationCost(textLength: number): number {
    // Rough estimate: input + output tokens
    const estimatedInputTokens = Math.ceil(textLength / 4) + 200; // +200 for prompt
    const estimatedOutputTokens = Math.ceil(textLength / 4);
    return costService.calculateGeminiCost(estimatedInputTokens, estimatedOutputTokens);
  }
}

export const translationService = new TranslationService();
