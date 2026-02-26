// ===========================================
// Auth Health Check - Diagnostic Endpoint
// Tests Vercel → Backend connectivity
// Usage: GET /api/auth/health-check
// ===========================================

import { NextResponse } from 'next/server';

const _rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.traderpath.io';
const API_URL =
  process.env.NODE_ENV === 'production' && _rawApiUrl.includes('localhost')
    ? 'https://api.traderpath.io'
    : _rawApiUrl;

export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    apiUrl: API_URL,
    rawApiUrl: _rawApiUrl,
    envVarSet: !!process.env.NEXT_PUBLIC_API_URL,
  };

  // Step 1: Test backend health endpoint
  try {
    const start = Date.now();
    const healthRes = await fetch(`${API_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    });
    const elapsed = Date.now() - start;
    const contentType = healthRes.headers.get('content-type') || '';

    diagnostics.healthCheck = {
      status: healthRes.status,
      statusText: healthRes.statusText,
      contentType,
      elapsed: `${elapsed}ms`,
      isJson: contentType.includes('application/json'),
    };

    if (contentType.includes('application/json')) {
      diagnostics.healthBody = await healthRes.json();
    } else {
      const text = await healthRes.text();
      diagnostics.healthBody = text.slice(0, 500);
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    diagnostics.healthCheck = {
      error: error.message,
      name: error.name,
      isTimeout: error.name === 'AbortError' || error.name === 'TimeoutError',
    };
  }

  // Step 2: Test login endpoint with dummy data (expects 401, not 500)
  try {
    const start = Date.now();
    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'healthcheck@test.invalid', password: 'x' }),
      signal: AbortSignal.timeout(10_000),
    });
    const elapsed = Date.now() - start;
    const contentType = loginRes.headers.get('content-type') || '';

    diagnostics.loginTest = {
      status: loginRes.status,
      statusText: loginRes.statusText,
      contentType,
      elapsed: `${elapsed}ms`,
      isJson: contentType.includes('application/json'),
      // 401 = healthy (user not found), 500 = DB/server problem
      healthy: loginRes.status === 401 || loginRes.status === 400,
    };

    if (contentType.includes('application/json')) {
      diagnostics.loginBody = await loginRes.json();
    } else {
      const text = await loginRes.text();
      diagnostics.loginBody = text.slice(0, 500);
    }
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    diagnostics.loginTest = {
      error: error.message,
      name: error.name,
      isTimeout: error.name === 'AbortError' || error.name === 'TimeoutError',
    };
  }

  // Verdict
  const healthOk = (diagnostics.healthCheck as Record<string, unknown>)?.status === 200;
  const loginOk = (diagnostics.loginTest as Record<string, unknown>)?.healthy === true;

  return NextResponse.json({
    success: true,
    verdict: healthOk && loginOk
      ? 'ALL_OK'
      : healthOk && !loginOk
      ? 'BACKEND_UP_BUT_LOGIN_BROKEN'
      : !healthOk
      ? 'BACKEND_UNREACHABLE'
      : 'UNKNOWN',
    diagnostics,
  });
}
