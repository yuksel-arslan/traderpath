// ===========================================
// Google OAuth Callback
// Handles the OAuth callback and logs in the user
// ===========================================

import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
      console.error('Token exchange failed:', tokens);
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

    // Send to backend for OAuth login/register
    console.log('Sending to backend:', { API_URL, email: googleUser.email, providerId: googleUser.id });

    const backendResponse = await fetch(`${API_URL}/api/auth/oauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'google',
        providerId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        image: googleUser.picture,
      }),
    });

    const backendData = await backendResponse.json();
    console.log('Backend response:', { status: backendResponse.status, data: backendData });

    if (!backendResponse.ok || !backendData.success) {
      console.error('Backend OAuth failed:', backendData);
      const errorCode = backendData.error?.code || 'backend_error';
      return NextResponse.redirect(new URL(`/login?error=${errorCode}`, baseUrl));
    }

    const { accessToken } = backendData.data || {};

    if (!accessToken) {
      return NextResponse.redirect(new URL('/login?error=no_token', baseUrl));
    }

    // Create response with redirect to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', baseUrl));

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
    console.error('Google OAuth error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_error', baseUrl));
  }
}
