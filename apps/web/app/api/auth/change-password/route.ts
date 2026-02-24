import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const _rawApiUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://api.traderpath.io').replace(/\/+$/, '');
const API_URL =
  process.env.NODE_ENV === 'production' && _rawApiUrl.includes('localhost')
    ? 'https://api.traderpath.io'
    : _rawApiUrl;

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: { message: 'Current and new password are required' } },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: { message: 'New password must be at least 8 characters' } },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || { message: 'Failed to change password' } },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[change-password] Error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
