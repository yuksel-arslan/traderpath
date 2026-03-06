// ===========================================
// Twitter/X OAuth 2.0 Callback
// ===========================================

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const _rawApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://api.traderpath.io').replace(/\/+$/, '');
const API_URL =
  process.env.NODE_ENV === 'production' && _rawApiUrl.includes('localhost')
    ? 'https://api.traderpath.io'
    : _rawApiUrl;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${error}`, baseUrl));
  }

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', baseUrl));
  }

  try {
    const cookieStore = await cookies();
    const codeVerifier = cookieStore.get('twitter_code_verifier')?.value;
    const storedState = cookieStore.get('twitter_state')?.value;

    if (!codeVerifier || !storedState || storedState !== state) {
      return NextResponse.redirect(new URL('/login?error=invalid_state', baseUrl));
    }

    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    const redirectUri = `${baseUrl}/api/auth/twitter/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/login?error=oauth_not_configured', baseUrl));
    }

    // Exchange code for access token
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      console.error('Twitter token exchange failed:', tokens);
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', baseUrl));
    }

    // Get user info from Twitter
    const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const userData = await userResponse.json();
    const twitterUser = userData.data;

    if (!twitterUser) {
      return NextResponse.redirect(new URL('/login?error=no_user_data', baseUrl));
    }

    // Twitter doesn't provide email directly, use username@twitter.com as placeholder
    // In production, you'd want to handle this differently
    const email = `${twitterUser.username}@x.com`;

    // Send to backend for OAuth login/register
    const backendResponse = await fetch(`${API_URL}/api/auth/oauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'twitter',
        providerId: twitterUser.id,
        email,
        name: twitterUser.name,
        image: twitterUser.profile_image_url?.replace('_normal', ''),
      }),
    });

    const backendData = await backendResponse.json();

    if (!backendResponse.ok || !backendData.success) {
      console.error('Backend OAuth failed:', backendData);
      return NextResponse.redirect(new URL('/login?error=backend_error', baseUrl));
    }

    const { accessToken } = backendData.data || {};

    if (!accessToken) {
      return NextResponse.redirect(new URL('/login?error=no_token', baseUrl));
    }

    // Create response with redirect to dashboard
    const response = NextResponse.redirect(new URL('/dashboard', baseUrl));

    // Clear PKCE cookies
    response.cookies.set('twitter_code_verifier', '', { maxAge: 0 });
    response.cookies.set('twitter_state', '', { maxAge: 0 });

    // Set auth cookies
    response.cookies.set('auth-token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    response.cookies.set('auth-session', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Twitter OAuth error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_error', baseUrl));
  }
}
