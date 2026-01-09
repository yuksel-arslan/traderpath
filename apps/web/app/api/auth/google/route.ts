// ===========================================
// Google OAuth - Redirect to Google
// ===========================================

import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.NEXTAUTH_URL
    ? `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
    : 'http://localhost:3000/api/auth/google/callback';

  if (!clientId) {
    return NextResponse.redirect(new URL('/login?error=oauth_not_configured', process.env.NEXTAUTH_URL || 'http://localhost:3000'));
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
