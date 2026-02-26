// ===========================================
// Debug Health Check - Backend Connectivity Test
// Use this endpoint to diagnose "Server unavailable" errors.
// GET /api/debug/health
// ===========================================

import { NextResponse } from 'next/server';

// Resolve backend URL with the same logic as login/route.ts
const _rawApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://api.traderpath.io').replace(/\/+$/, '');
const API_URL =
  process.env.NODE_ENV === 'production' && _rawApiUrl.includes('localhost')
    ? 'https://api.traderpath.io'
    : _rawApiUrl;

export async function GET() {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    resolvedApiUrl: API_URL,
    rawApiUrl: _rawApiUrl,
    envVarSet: !!process.env.NEXT_PUBLIC_API_URL,
  };

  // Test 1: Backend /health endpoint
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const healthRes = await fetch(`${API_URL}/health`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeout);

    const contentType = healthRes.headers.get('content-type') || '';
    let body: unknown;
    if (contentType.includes('application/json')) {
      body = await healthRes.json();
    } else {
      body = await healthRes.text();
    }

    results.healthCheck = {
      status: healthRes.status,
      ok: healthRes.ok,
      contentType,
      body,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    results.healthCheck = {
      error: error.message,
      errorName: error.name,
      isTimeout: error.name === 'AbortError',
    };
  }

  // Test 2: Try POST to /api/auth/login with empty body to see if route exists
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const loginRes = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'health-check@test.invalid', password: 'x' }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const contentType = loginRes.headers.get('content-type') || '';
    let body: unknown;
    if (contentType.includes('application/json')) {
      body = await loginRes.json();
    } else {
      const text = await loginRes.text();
      body = { raw: text.slice(0, 300), contentType };
    }

    results.loginEndpoint = {
      status: loginRes.status,
      contentType,
      // A 401 means the endpoint works (bad credentials is expected).
      // A 400/422 means validation error (endpoint works).
      // A 500 means backend has an internal error.
      // A non-JSON response means we're hitting the wrong server.
      reachable: loginRes.status < 500,
      body,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    results.loginEndpoint = {
      error: error.message,
      errorName: error.name,
      isTimeout: error.name === 'AbortError',
    };
  }

  // Overall verdict
  const healthOk = (results.healthCheck as Record<string, unknown>)?.ok === true;
  const loginReachable = (results.loginEndpoint as Record<string, unknown>)?.reachable === true;

  results.verdict = healthOk && loginReachable
    ? 'BACKEND_OK'
    : healthOk && !loginReachable
    ? 'BACKEND_HEALTHY_BUT_LOGIN_BROKEN'
    : !healthOk && loginReachable
    ? 'HEALTH_ENDPOINT_ISSUE'
    : 'BACKEND_UNREACHABLE';

  return NextResponse.json(results, { status: 200 });
}
