import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

const _rawApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://api.traderpath.io').replace(/\/+$/, '');
const API_URL =
  process.env.NODE_ENV === 'production' && _rawApiUrl.includes('localhost')
    ? 'https://api.traderpath.io'
    : _rawApiUrl;

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_URL}/api/auth/2fa/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || { message: 'Failed to get 2FA status' } },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[2fa/status] Error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
