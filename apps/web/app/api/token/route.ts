// ===========================================
// Token API Route - Provide Token for API Calls
// Returns the JWT from httpOnly cookie for use in API requests
// ===========================================

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, error: { code: 'NO_TOKEN', message: 'Not authenticated' } },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { token },
  });
}
