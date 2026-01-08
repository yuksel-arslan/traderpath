// ===========================================
// Next.js Middleware
// Protects dashboard routes - redirects to welcome page if not authenticated
// ===========================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedRoutes = [
  '/dashboard',
  '/analyze',
  '/reports',
  '/rewards',
  '/credits',
  '/alerts',
  '/settings',
  '/analysis',
  '/admin',
  '/ai-expert',
];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login', '/register', '/forgot-password'];

// Helper to check if token is present (basic validation)
function hasValidToken(request: NextRequest): boolean {
  const accessToken = request.cookies.get('accessToken')?.value;

  if (!accessToken) {
    return false;
  }

  // Basic JWT format validation (should have 3 parts separated by dots)
  const parts = accessToken.split('.');
  if (parts.length !== 3) {
    return false;
  }

  // Check if token is not expired (basic check)
  try {
    // Decode the payload part (middle section)
    const payload = JSON.parse(
      Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token validity
  const isAuthenticated = hasValidToken(request);

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Check if current path is auth route
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Redirect to welcome page if accessing protected route without valid token
  if (isProtectedRoute && !isAuthenticated) {
    // Clear invalid token cookie
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('accessToken');
    return response;
  }

  // Redirect to dashboard if accessing auth route with valid token
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled by backend)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};
