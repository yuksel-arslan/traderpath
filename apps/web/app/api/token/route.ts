// ===========================================
// Token API - Returns Auth.js JWT for API calls
// ===========================================

import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the raw JWT token from Auth.js
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      raw: true, // Get the raw JWT string
    });

    if (!token) {
      return NextResponse.json(
        { success: false, error: { message: 'Not authenticated' } },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { token },
    });
  } catch (error) {
    console.error('Token API error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Failed to get token' } },
      { status: 500 }
    );
  }
}
