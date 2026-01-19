// ===========================================
// Gemini API Client with Retry Logic
// Handles rate limits (429) with exponential backoff
// ===========================================

import { config } from './config';

const GEMINI_API_KEY = config.gemini.apiKey;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
  return 60000; // Default to 60 seconds
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
 * - Respects retry-after delay from API response
 * - Handles 503 (service unavailable) errors
 * - Network error resilience
 */
export async function callGeminiWithRetry(
  options: GeminiRequestOptions,
  maxRetries: number = 3,
  operation: string = 'gemini_request'
): Promise<GeminiResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;

    try {
      const response = await fetch(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(options),
        }
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

      // Rate limit error (429) - retry with backoff
      if (response.status === 429) {
        // Get retry delay from response or calculate exponential backoff
        const apiRetryDelay = parseRetryDelay(errorBody);
        const exponentialDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30s
        const jitter = Math.random() * 1000; // Add 0-1s jitter

        // Use API-suggested delay if available, otherwise use exponential backoff
        const waitTime = apiRetryDelay > 0
          ? Math.min(apiRetryDelay + jitter, 60000) // Cap at 60s
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
      }

      // Service unavailable (503) - also retry
      if (response.status === 503) {
        const waitTime = 2000 * attempt + Math.random() * 1000;

        console.warn(
          `[Gemini Unavailable] ${operation} - Attempt ${attempt}/${maxRetries}. ` +
          `Waiting ${Math.round(waitTime / 1000)}s before retry.`
        );

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }

      // Other errors - throw with details
      const errorMessage = errorBody.error?.message || errorText || `HTTP ${response.status}`;
      lastError = new Error(`Gemini API error: ${errorMessage}`);

      // Don't retry on client errors (4xx except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw lastError;
      }

    } catch (error) {
      // Network errors - retry
      if (error instanceof TypeError && error.message.includes('fetch')) {
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
      if (error instanceof Error && error.message.startsWith('Gemini API error:')) {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  // All retries exhausted
  throw lastError || new Error(`Gemini API failed after ${maxRetries} attempts`);
}

/**
 * Simple Gemini API call without retry (for backwards compatibility)
 */
export async function callGemini(options: GeminiRequestOptions): Promise<GeminiResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const response = await fetch(
    `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  return response.json();
}

// Export model and URL for reference
export { GEMINI_MODEL, GEMINI_API_URL };
