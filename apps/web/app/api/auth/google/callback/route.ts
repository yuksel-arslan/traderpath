// ===========================================
// Google OAuth Callback
// Handles the OAuth callback and logs in the user
// Robust error handling for backend failures
// ===========================================

import { NextRequest, NextResponse } from 'next/server';

// Allow Vercel serverless function to run up to 60s (Pro plan)
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
 */
function parseBackendErrorCode(data: any, httpStatus: number): string {
  // App's standard format - has error.code
  if (data?.error?.code && typeof data.error.code === 'string') {
    return data.error.code;
  }

  // Fastify default format: { statusCode, error: "Internal Server Error", message }
  // Here data.error is a STRING, not an object - this was the root cause bug
  if (data?.statusCode && typeof data?.error === 'string') {
    return httpStatus >= 500 ? 'server_error' : `http_${data.statusCode}`;
  }

  // Proxy format or unknown
  if (httpStatus >= 500) {
    return 'server_error';
  }

  return 'backend_error';
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${error}`, baseUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', baseUrl));
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/login?error=oauth_not_configured', baseUrl));
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      console.error('[OAuth] Token exchange failed:', tokens);
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', baseUrl));
    }

    // Get user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const googleUser = await userInfoResponse.json();

    if (!googleUser.email) {
      return NextResponse.redirect(new URL('/login?error=no_email', baseUrl));
    }

    // Send to backend for OAuth login/register with timeout and retry
    let backendResponse: Response | undefined;
    let backendData: any;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        backendResponse = await fetchWithTimeout(
          `${API_URL}/api/auth/oauth`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: 'google',
              providerId: googleUser.id,
              email: googleUser.email,
              name: googleUser.name,
              image: googleUser.picture,
            }),
          },
          BACKEND_TIMEOUT_MS
        );

        // Check if response is JSON
        const contentType = backendResponse.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          backendData = await backendResponse.json();
        } else {
          const text = await backendResponse.text();
          console.error(`[OAuth] Backend returned non-JSON (attempt ${attempt + 1}):`, backendResponse.status, text.slice(0, 300));

          // Retry transient errors on first attempt
          if (attempt === 0 && TRANSIENT_STATUS_CODES.includes(backendResponse.status)) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }

          return NextResponse.redirect(new URL('/login?error=server_error&detail=non_json', baseUrl));
        }

        // Retry transient HTTP errors on first attempt
        if (attempt === 0 && TRANSIENT_STATUS_CODES.includes(backendResponse.status)) {
          console.warn(`[OAuth] Transient error ${backendResponse.status}, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        // Got a definitive response, break out of retry loop
        break;
      } catch (fetchError: any) {
        const errorMsg = fetchError.name === 'AbortError'
          ? 'Request timed out'
          : fetchError.message || 'Connection failed';

        console.error(`[OAuth] Backend fetch failed (attempt ${attempt + 1}):`, errorMsg, { API_URL });

        // Retry on first attempt
        if (attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }

        const detail = fetchError.name === 'AbortError' ? 'timeout' : 'fetch_failed';
        return NextResponse.redirect(new URL(`/login?error=server_error&detail=${detail}`, baseUrl));
      }
    }

    // Safety check
    if (!backendData || !backendResponse) {
      return NextResponse.redirect(new URL('/login?error=server_error&detail=no_response', baseUrl));
    }

    if (!backendResponse.ok || !backendData.success) {
      console.error('[OAuth] Backend OAuth failed:', { status: backendResponse.status, data: backendData });

      // Parse the error code properly - handles ALL backend response formats
      const errorCode = parseBackendErrorCode(backendData, backendResponse.status);
      return NextResponse.redirect(new URL(`/login?error=${errorCode}`, baseUrl));
    }

    const { accessToken, isFirstLogin, firstLoginBonus } = backendData.data || {};

    if (!accessToken) {
      return NextResponse.redirect(new URL('/login?error=no_token', baseUrl));
    }

    // Create response with redirect to capital-flow
    // If first login, add query params so the frontend can show welcome modal
    const redirectUrl = new URL('/capital-flow', baseUrl);
    if (isFirstLogin && firstLoginBonus) {
      redirectUrl.searchParams.set('firstLogin', 'true');
      redirectUrl.searchParams.set('bonus', String(firstLoginBonus));
    }
    const response = NextResponse.redirect(redirectUrl);

    // Set httpOnly cookie for secure token storage
    response.cookies.set('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Set session indicator cookie
    response.cookies.set('auth-session', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error('[OAuth] Unhandled error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_error', baseUrl));
  }
}
