import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: { message: 'Email is required' } },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    // Always return success to prevent email enumeration
    // Backend should handle this similarly
    if (!response.ok && response.status !== 404) {
      return NextResponse.json(
        { success: false, error: data.error || { message: 'Failed to process request' } },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    console.error('[forgot-password] Error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
