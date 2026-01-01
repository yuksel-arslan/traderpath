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
  '/rewards',
  '/credits',
  '/alerts',
  '/settings',
  '/analysis',
];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login', '/register', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for access token in cookies (set by auth flow)
  const accessToken = request.cookies.get('accessToken')?.value;

  // Check if current path is protected
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Check if current path is auth route
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Redirect to welcome page if accessing protected route without token
  if (isProtectedRoute && !accessToken) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Redirect to dashboard if accessing auth route with token
  if (isAuthRoute && accessToken) {
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
