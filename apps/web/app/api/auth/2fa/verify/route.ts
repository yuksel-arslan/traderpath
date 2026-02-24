import { NextRequest, NextResponse } from 'next/server';

const _rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.traderpath.io';
const API_URL =
  process.env.NODE_ENV === 'production' && _rawApiUrl.includes('localhost')
    ? 'https://api.traderpath.io'
    : _rawApiUrl;

export async function POST(request: NextRequest) {
  try {
    const { userId, code } = await request.json();

    if (!userId || !code) {
      return NextResponse.json(
        { success: false, error: { message: 'User ID and code are required' } },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_URL}/api/auth/2fa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, code }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || { message: 'Invalid code' } },
        { status: response.status }
      );
    }

    // Set auth cookies on successful 2FA verification
    if (data.accessToken) {
      const res = NextResponse.json({ success: true, data });

      // Set httpOnly cookie for the token
      res.cookies.set('auth-token', data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      // Set a non-httpOnly cookie to indicate auth status
      res.cookies.set('auth-session', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return res;
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[2fa/verify] Error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
