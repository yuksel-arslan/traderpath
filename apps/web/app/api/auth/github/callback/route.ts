// ===========================================
// GitHub OAuth Callback
// ===========================================

import { NextRequest, NextResponse } from 'next/server';

const _rawApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://api.traderpath.io').replace(/\/+$/, '');
const API_URL =
  process.env.NODE_ENV === 'production' && _rawApiUrl.includes('localhost')
    ? 'https://api.traderpath.io'
    : _rawApiUrl;

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
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/login?error=oauth_not_configured', baseUrl));
    }

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      console.error('GitHub token exchange failed:', tokens);
      return NextResponse.redirect(new URL('/login?error=token_exchange_failed', baseUrl));
    }

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/json',
      },
    });

    const githubUser = await userResponse.json();

    // Get user's email (may need separate call if email is private)
    let email = githubUser.email;
    if (!email) {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: 'application/json',
        },
      });
      const emails = await emailsResponse.json();
      const primaryEmail = emails.find((e: { primary: boolean; verified: boolean }) => e.primary && e.verified);
      email = primaryEmail?.email || emails[0]?.email;
    }

    if (!email) {
      return NextResponse.redirect(new URL('/login?error=no_email', baseUrl));
    }

    // Send to backend for OAuth login/register
    const backendResponse = await fetch(`${API_URL}/api/auth/oauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'github',
        providerId: String(githubUser.id),
        email,
        name: githubUser.name || githubUser.login,
        image: githubUser.avatar_url,
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

    // Create response with redirect to terminal
    const response = NextResponse.redirect(new URL('/terminal', baseUrl));

    // Set cookies
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
    console.error('GitHub OAuth error:', error);
    return NextResponse.redirect(new URL('/login?error=oauth_error', baseUrl));
  }
}
