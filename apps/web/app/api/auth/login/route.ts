// ===========================================
// Login API Route - Secure Token Management
// Uses httpOnly cookies for XSS protection
// ===========================================

import { NextRequest, NextResponse } from 'next/server';

// Allow Vercel serverless function to run up to 60s (Pro plan)
// Hobby plan caps at 10s, Pro plan caps at 60s
export const maxDuration = 60;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.traderpath.io';

// Timeout per backend request attempt (12 seconds)
// Two attempts = max 25s total (well within Vercel limits)
const BACKEND_TIMEOUT_MS = 12_000;

// Transient HTTP status codes that warrant a retry
const TRANSIENT_STATUS_CODES = [502, 503, 504];

/**
 * Parse error from ANY backend response format:
 * - App format: { success: false, error: { code, message } }
 * - Fastify default: { statusCode, error, message }
 * - Railway/proxy: { statusCode, message } or plain text
 * - Unknown: any other JSON
 */
function parseBackendError(data: Record<string, any>, httpStatus: number): { code: string; message: string } {
  // App's standard format
  if (data?.error?.code && data?.error?.message) {
    return { code: data.error.code, message: data.error.message };
  }

  // App format with only message (no code)
  if (data?.error?.message) {
    return { code: 'SERVER_ERROR', message: data.error.message };
  }

  // Fastify default format: { statusCode, error: "Internal Server Error", message: "..." }
  if (data?.statusCode && typeof data?.error === 'string') {
    return { code: `HTTP_${data.statusCode}`, message: data.message || data.error };
  }

  // Proxy format: { statusCode, message }
  if (data?.statusCode && data?.message) {
    return { code: `HTTP_${data.statusCode}`, message: data.message };
  }

  // Plain message field
  if (data?.message) {
    return { code: `HTTP_${httpStatus}`, message: data.message };
  }

  // Totally unknown format
  return { code: 'SERVER_ERROR', message: `Server returned an error (HTTP ${httpStatus})` };
}

/**
 * Determine if the error is a backend/server error vs an authentication error.
 * Server errors (5xx, connection issues) should not say "Invalid credentials".
 */
function isServerError(httpStatus: number, errorCode: string): boolean {
  if (httpStatus >= 500) return true;
  if (errorCode.startsWith('HTTP_5')) return true;
  if (errorCode === 'SERVER_ERROR' || errorCode.startsWith('INTERNAL_')) return true;
  return false;
}

/**
 * Fetch with timeout using AbortController
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email and password required' } },
        { status: 400 }
      );
    }

    // Backend URL logged only in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Login] Calling backend at: ${API_URL}/api/auth/login`);
    }

    // Call backend API with timeout and retry
    let response: Response | undefined;
    let data: Record<string, any> | undefined;
    let lastError: string = '';

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        response = await fetchWithTimeout(
          `${API_URL}/api/auth/login`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          },
          BACKEND_TIMEOUT_MS
        );

        // Check if response is JSON
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          console.error(`[Login] Backend returned non-JSON (attempt ${attempt + 1}):`, response.status, text.slice(0, 300));

          // Retry transient errors on first attempt
          if (attempt === 0 && TRANSIENT_STATUS_CODES.includes(response.status)) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          return NextResponse.json(
            { success: false, error: { code: 'SERVER_ERROR', message: 'Backend service is temporarily unavailable. Please try again in a moment.' } },
            { status: 502 }
          );
        }

        // Retry transient HTTP errors on first attempt
        if (attempt === 0 && TRANSIENT_STATUS_CODES.includes(response.status)) {
          console.warn(`[Login] Transient error ${response.status}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // Got a definitive response, break out of retry loop
        break;
      } catch (fetchError: unknown) {
        const err = fetchError instanceof Error ? fetchError : new Error('Connection failed');
        lastError = err.name === 'AbortError'
          ? 'Request timed out'
          : err.message || 'Connection failed';

        console.error(`[Login] Backend fetch failed (attempt ${attempt + 1}):`, lastError);

        // Retry on first attempt for connection errors
        if (attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'SERVER_ERROR',
              message: err.name === 'AbortError'
                ? 'Server is taking too long to respond. Please try again.'
                : 'Cannot connect to server. Please try again later.',
            },
          },
          { status: 502 }
        );
      }
    }

    // Safety check - if we exited the loop without data (shouldn't happen but be safe)
    if (!data || !response) {
      return NextResponse.json(
        { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to get a response from the server. Please try again.' } },
        { status: 502 }
      );
    }

    // Handle error responses
    if (!response.ok || !data.success) {
      const parsed = parseBackendError(data, response.status);

      // Don't mask server errors as "Invalid credentials"
      if (isServerError(response.status, parsed.code)) {
        console.error('[Login] Backend server error, status:', response.status);
        return NextResponse.json(
          { success: false, error: { code: 'SERVER_ERROR', message: 'Server is temporarily unavailable. Please try again in a moment.' } },
          { status: 502 }
        );
      }

      // Auth/validation errors - pass through the backend's response
      return NextResponse.json(
        { success: false, error: { code: parsed.code, message: parsed.message } },
        { status: response.status }
      );
    }

    // Extract token, user, and login metadata from response
    const responseData = (data.data ?? {}) as Record<string, any>;
    const { token, user, credits, isFirstLogin, firstLoginBonus } = responseData;

    if (!token) {
      console.error('[Login] Backend returned success but no token in response');
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: 'Authentication failed. Please try again.' } },
        { status: 500 }
      );
    }

    // Create response with user data and login metadata
    const res = NextResponse.json({
      success: true,
      data: { user, credits, isFirstLogin, firstLoginBonus },
    });

    // Set httpOnly cookie for secure token storage
    res.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Set session indicator cookie (not httpOnly, so JS can check login status)
    res.cookies.set('auth-session', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Login] Unhandled error:', message);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'An unexpected error occurred. Please try again.' } },
      { status: 500 }
    );
  }
}
