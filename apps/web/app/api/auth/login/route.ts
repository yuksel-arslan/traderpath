// ===========================================
// Login API Route - Secure Token Management
// Uses httpOnly cookies for XSS protection
// ===========================================

import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.traderpath.io';

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

    // Call backend API
    let response: Response;
    let data: any;
    try {
      response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Backend returned non-JSON:', response.status, text.slice(0, 500));
        return NextResponse.json(
          { success: false, error: { code: 'SERVER_ERROR', message: 'Backend service unavailable. Please try again later.' } },
          { status: 502 }
        );
      }
    } catch (fetchError: any) {
      console.error('Backend fetch failed:', fetchError.message, { API_URL });
      return NextResponse.json(
        { success: false, error: { code: 'SERVER_ERROR', message: 'Cannot connect to backend. Please try again later.' } },
        { status: 502 }
      );
    }

    if (!response.ok || !data.success) {
      return NextResponse.json(
        { success: false, error: data.error || { code: 'AUTH_ERROR', message: 'Invalid credentials' } },
        { status: response.status }
      );
    }

    // Extract token, user, and login metadata from response
    // Backend returns 'token', not 'accessToken'
    const { token, user, credits, isFirstLogin, firstLoginBonus } = data.data || {};

    if (!token) {
      return NextResponse.json(
        { success: false, error: { code: 'AUTH_ERROR', message: 'No token received' } },
        { status: 500 }
      );
    }

    // Create response with user data and login metadata
    const res = NextResponse.json({
      success: true,
      data: { user, credits, isFirstLogin, firstLoginBonus },
    });

    // Set httpOnly cookie for secure token storage
    // This prevents XSS attacks from accessing the token
    res.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    // Also set a session indicator cookie (not httpOnly, so JS can check login status)
    res.cookies.set('auth-session', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return res;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Server error' } },
      { status: 500 }
    );
  }
}
