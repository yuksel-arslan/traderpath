// ===========================================
// Gemini API Client with Retry Logic
// Handles rate limits (429) with exponential backoff
// ===========================================

import { config } from './config';
import { redis } from './cache';

const GEMINI_API_KEY = config.gemini.apiKey;
// Available models: gemini-2.5-flash-preview-05-20, gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-pro
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-preview-05-20';
const GEMINI_SETTINGS_KEY = 'admin:gemini:settings';

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

// Build API URL for a given model
function buildGeminiApiUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

// Legacy export for backward compatibility
const GEMINI_MODEL = DEFAULT_GEMINI_MODEL;
const GEMINI_API_URL = buildGeminiApiUrl(DEFAULT_GEMINI_MODEL);

// Timeouts and limits
const FETCH_TIMEOUT_MS = 30000; // 30 seconds max for API call
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
}

interface GeminiError {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: Array<{
      '@type'?: string;
      retryDelay?: string;
    }>;
  };
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Parse retry delay from Gemini error response
 * Looks for retryDelay in error details or parses from message
 */
function parseRetryDelay(errorBody: GeminiError): number {
  // Try to get from error details (RetryInfo)
  if (errorBody.error?.details) {
    for (const detail of errorBody.error.details) {
      if (detail['@type']?.includes('RetryInfo') && detail.retryDelay) {
        // Parse "56s" or "56.993352611s" format
        const match = detail.retryDelay.match(/(\d+\.?\d*)/);
        if (match) {
          return Math.ceil(parseFloat(match[1]) * 1000); // Convert to ms
        }
      }
    }
  }

  // Try to parse from message (e.g., "Please retry in 56.993352611s")
  if (errorBody.error?.message) {
    const match = errorBody.error.message.match(/retry in (\d+\.?\d*)s/i);
    if (match) {
      return Math.ceil(parseFloat(match[1]) * 1000); // Convert to ms
    }
  }

  return 0; // No specific delay found
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

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
  return 10000; // Default to 10 seconds (reduced from 60)
}

// ===========================================
// Main API Function
// ===========================================

/**
 * Make a Gemini API request with retry logic and rate limit handling
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
 * - 30 second timeout per request
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
  const model = await getGeminiModel(modelType);
  const apiUrl = buildGeminiApiUrl(model);

  let lastError: Error = new Error(`Gemini API failed after ${maxRetries} attempts`);
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;

    try {
      const response = await fetchWithTimeout(
        `${apiUrl}?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        },
        FETCH_TIMEOUT_MS
      );

      // Success - return the response
      if (response.ok) {
        return await response.json();
      }

      // Parse error response
      const errorText = await response.text();
      let errorBody: GeminiError = {};
      try {
        errorBody = JSON.parse(errorText);
      } catch {
        // Not JSON, use as-is
      }

      const errorMessage = errorBody.error?.message || errorText || `HTTP ${response.status}`;
      lastError = new Error(`Gemini API error (${response.status}): ${errorMessage}`);

      // Rate limit error (429) - retry with backoff
      if (response.status === 429) {
        // Get retry delay from response or calculate exponential backoff
        const apiRetryDelay = parseRetryDelay(errorBody);
        const exponentialDelay = Math.min(2000 * Math.pow(2, attempt - 1), MAX_WAIT_TIME_MS);
        const jitter = Math.random() * 1000; // Add 0-1s jitter

        // Use API-suggested delay if available, otherwise use exponential backoff
        // Cap at MAX_WAIT_TIME_MS to prevent excessive waits
        const waitTime = apiRetryDelay > 0
          ? Math.min(apiRetryDelay + jitter, MAX_WAIT_TIME_MS)
          : exponentialDelay + jitter;

        console.warn(
          `[Gemini Rate Limit] ${operation} - Attempt ${attempt}/${maxRetries}. ` +
          `Waiting ${Math.round(waitTime / 1000)}s before retry. ` +
          `Status: ${errorBody.error?.status || 'RESOURCE_EXHAUSTED'}`
        );

        // If we have more retries, wait and continue
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        // Last attempt failed - will throw lastError after loop
      }

      // Service unavailable (503) - also retry
      if (response.status === 503) {
        const waitTime = Math.min(2000 * attempt + Math.random() * 1000, MAX_WAIT_TIME_MS);

        console.warn(
          `[Gemini Unavailable] ${operation} - Attempt ${attempt}/${maxRetries}. ` +
          `Waiting ${Math.round(waitTime / 1000)}s before retry.`
        );

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      // Don't retry on other client errors (4xx except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw lastError;
      }

    } catch (error) {
      // Timeout error
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new Error(`Gemini API timeout after ${FETCH_TIMEOUT_MS / 1000}s`);
        console.warn(
          `[Gemini Timeout] ${operation} - Attempt ${attempt}/${maxRetries}. Request timed out.`
        );

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }

      // Network errors - retry
      if (error instanceof TypeError && error.message.includes('fetch')) {
        lastError = new Error(`Gemini network error: ${error.message}`);
        console.warn(
          `[Gemini Network Error] ${operation} - Attempt ${attempt}/${maxRetries}. ` +
          `Error: ${error.message}`
        );

        if (attempt < maxRetries) {
          const waitTime = 1000 * attempt + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      // Re-throw if it's our error
      if (error instanceof Error && error.message.startsWith('Gemini API error')) {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error(String(error));
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

  const response = await fetchWithTimeout(
    `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    },
    FETCH_TIMEOUT_MS
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  return response.json();
}

// Export model and URL for reference
export { GEMINI_MODEL, GEMINI_API_URL, getGeminiModel, buildGeminiApiUrl };
