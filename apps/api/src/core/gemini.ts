// ===========================================
// Gemini API Client using @google/genai SDK
// Handles rate limits with exponential backoff
// ===========================================

import { config } from './config';
import { redis } from './cache';
import { logger } from './logger';
// @ts-ignore - SDK types may not be fully compatible
import { GoogleGenAI } from '@google/genai';

const GEMINI_API_KEY = config.gemini.apiKey;
// Available models: gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_SETTINGS_KEY = 'admin:gemini:settings';

// Initialize the Genai client lazily - only when actually needed
// This prevents crashes during startup when GEMINI_API_KEY is not set
let _genai: InstanceType<typeof GoogleGenAI> | null = null;
function getGenAI(): GoogleGenAI {
  if (!_genai) {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured. AI features are unavailable.');
    }
    _genai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }
  return _genai;
}

// Cache for settings to avoid Redis calls on every request
let cachedSettings: { model: string; expertModel: string; conciergeModel: string; cachedAt: number } | null = null;
const SETTINGS_CACHE_TTL = 60000; // 1 minute cache

// Get Gemini model from admin settings (with caching)
async function getGeminiModel(type: 'default' | 'expert' | 'concierge' = 'default'): Promise<string> {
  try {
    // Check cache first
    if (cachedSettings && Date.now() - cachedSettings.cachedAt < SETTINGS_CACHE_TTL) {
      if (type === 'expert') return cachedSettings.expertModel;
      if (type === 'concierge') return cachedSettings.conciergeModel;
      return cachedSettings.model;
    }

    // Fetch from Redis
    const settingsJson = await redis.get(GEMINI_SETTINGS_KEY);
    if (settingsJson) {
      const settings = JSON.parse(settingsJson);
      cachedSettings = {
        model: settings.model || DEFAULT_GEMINI_MODEL,
        expertModel: settings.expertModel || DEFAULT_GEMINI_MODEL,
        conciergeModel: settings.conciergeModel || DEFAULT_GEMINI_MODEL,
        cachedAt: Date.now(),
      };
      if (type === 'expert') return cachedSettings.expertModel;
      if (type === 'concierge') return cachedSettings.conciergeModel;
      return cachedSettings.model;
    }
  } catch {
    // Redis error - fall back to env/default
  }
  return DEFAULT_GEMINI_MODEL;
}

// Build API URL for a given model (for backward compatibility)
function buildGeminiApiUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

// Legacy exports for backward compatibility
const GEMINI_MODEL = DEFAULT_GEMINI_MODEL;
const GEMINI_API_URL = buildGeminiApiUrl(DEFAULT_GEMINI_MODEL);

// Timeouts and limits
const MAX_WAIT_TIME_MS = 20000; // 20 seconds max wait between retries
const DEFAULT_MAX_RETRIES = 3;

// ===========================================
// Types
// ===========================================

export interface GeminiRequestOptions {
  contents: Array<{ role?: string; parts: Array<{ text: string }> }>;
  generationConfig: {
    temperature: number;
    topP?: number;
    topK?: number;
    maxOutputTokens: number;
  };
  safetySettings?: Array<{ category: string; threshold: string }>;
}

export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  // Also include text getter for new SDK
  text?: string;
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Check if error is a rate limit error
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('429') ||
      message.includes('rate limit') ||
      message.includes('resource_exhausted') ||
      message.includes('quota')
    );
  }
  return false;
}

/**
 * Extract retry delay from error message (in milliseconds)
 */
export function extractRetryDelay(error: unknown): number {
  if (error instanceof Error) {
    const match = error.message.match(/retry in (\d+\.?\d*)s/i);
    if (match) {
      return Math.ceil(parseFloat(match[1]) * 1000);
    }
  }
  return 10000; // Default to 10 seconds
}

/**
 * Convert SDK response to our GeminiResponse format
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertResponse(response: any): GeminiResponse {
  // New SDK provides .text getter directly
  if (response.text) {
    return {
      candidates: [{
        content: {
          parts: [{ text: response.text }],
        },
      }],
      usageMetadata: response.usageMetadata ? {
        promptTokenCount: response.usageMetadata.promptTokenCount,
        candidatesTokenCount: response.usageMetadata.candidatesTokenCount,
      } : undefined,
      text: response.text,
    };
  }

  // Fallback to legacy format
  return {
    candidates: response.candidates?.map((candidate: { content?: { parts?: Array<{ text?: string }> } }) => ({
      content: {
        parts: candidate.content?.parts?.map((part: { text?: string }) => ({
          text: part.text,
        })),
      },
    })),
    usageMetadata: response.usageMetadata ? {
      promptTokenCount: response.usageMetadata.promptTokenCount,
      candidatesTokenCount: response.usageMetadata.candidatesTokenCount,
    } : undefined,
  };
}

// ===========================================
// Main API Function
// ===========================================

/**
 * Make a Gemini API request with retry logic and rate limit handling
 * Uses @google/genai SDK
 *
 * @param options - The Gemini API request options
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param operation - Operation name for logging (default: 'gemini_request')
 * @returns Promise<GeminiResponse>
 *
 * Features:
 * - Retries up to maxRetries times on rate limit (429) errors
 * - Uses exponential backoff with jitter
 * - Respects retry-after delay from API response (capped at 20s)
 * - Handles 503 (service unavailable) errors
 * - Network error resilience
 */
export async function callGeminiWithRetry(
  options: GeminiRequestOptions,
  maxRetries: number = DEFAULT_MAX_RETRIES,
  operation: string = 'gemini_request',
  modelType: 'default' | 'expert' | 'concierge' = 'default'
): Promise<GeminiResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  // Get model from admin settings
  const modelName = await getGeminiModel(modelType);

  let lastError: Error = new Error(`Gemini API failed after ${maxRetries} attempts`);
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;

    try {
      // Build the prompt from contents
      const prompt = options.contents
        .map(content => content.parts.map(part => part.text).join('\n'))
        .join('\n\n');

      // Call the SDK
      const response = await getGenAI().models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          temperature: options.generationConfig.temperature,
          topP: options.generationConfig.topP,
          topK: options.generationConfig.topK,
          maxOutputTokens: options.generationConfig.maxOutputTokens,
        },
      });

      // Convert to our format and return
      return convertResponse(response);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMessage = lastError.message.toLowerCase();

      // Rate limit error (429) - retry with backoff
      if (
        errorMessage.includes('429') ||
        errorMessage.includes('rate limit') ||
        errorMessage.includes('resource_exhausted') ||
        errorMessage.includes('quota')
      ) {
        // Calculate exponential backoff with jitter
        const exponentialDelay = Math.min(2000 * Math.pow(2, attempt - 1), MAX_WAIT_TIME_MS);
        const jitter = Math.random() * 1000;
        const waitTime = exponentialDelay + jitter;

        // Try to extract delay from error message
        const apiRetryDelay = extractRetryDelay(error);
        const finalWaitTime = apiRetryDelay > 0
          ? Math.min(apiRetryDelay + jitter, MAX_WAIT_TIME_MS)
          : waitTime;

        logger.warn(
          { operation, attempt, maxRetries, waitMs: finalWaitTime },
          `[Gemini Rate Limit] Waiting ${Math.round(finalWaitTime / 1000)}s before retry`
        );

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, finalWaitTime));
          continue;
        }
      }

      // Service unavailable (503) - also retry
      if (errorMessage.includes('503') || errorMessage.includes('unavailable')) {
        const waitTime = Math.min(2000 * attempt + Math.random() * 1000, MAX_WAIT_TIME_MS);

        logger.warn(
          { operation, attempt, maxRetries, waitMs: waitTime },
          `[Gemini Unavailable] Waiting ${Math.round(waitTime / 1000)}s before retry`
        );

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      // Network errors - retry
      if (
        errorMessage.includes('network') ||
        errorMessage.includes('econnreset') ||
        errorMessage.includes('timeout')
      ) {
        logger.warn(
          { operation, attempt, maxRetries, error: lastError.message },
          '[Gemini Network Error] Retrying after network failure'
        );

        if (attempt < maxRetries) {
          const waitTime = 1000 * attempt + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      // Don't retry on other errors
      logger.error({ operation, error: lastError.message }, '[Gemini Error] Non-retryable error');
      throw lastError;
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Simple Gemini API call without retry (for backwards compatibility)
 */
export async function callGemini(options: GeminiRequestOptions): Promise<GeminiResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const prompt = options.contents
    .map(content => content.parts.map(part => part.text).join('\n'))
    .join('\n\n');

  const response = await getGenAI().models.generateContent({
    model: DEFAULT_GEMINI_MODEL,
    contents: prompt,
    config: {
      temperature: options.generationConfig.temperature,
      topP: options.generationConfig.topP,
      topK: options.generationConfig.topK,
      maxOutputTokens: options.generationConfig.maxOutputTokens,
    },
  });

  return convertResponse(response);
}

// Export the SDK client getter for direct access if needed
export { getGenAI as genai };

// Export model and URL for reference
export { GEMINI_MODEL, GEMINI_API_URL, getGeminiModel, buildGeminiApiUrl };
