import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.traderpath.io';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: { message: 'Token is required' } },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_URL}/api/auth/validate-reset-token?token=${token}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { valid: false, error: data.error || { message: 'Invalid token' } },
        { status: response.status }
      );
    }

    return NextResponse.json({ valid: true, data });
  } catch (error) {
    console.error('[validate-reset-token] Error:', error);
    return NextResponse.json(
      { valid: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
