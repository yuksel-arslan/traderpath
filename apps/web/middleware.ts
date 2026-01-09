// ===========================================
// Next.js Middleware - Simple Cookie Check
// Auth.js doesn't work well in Edge, use simple cookie check
// ===========================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedPaths = [
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
const authPaths = ['/login', '/register', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for Auth.js session cookie
  // Auth.js uses 'authjs.session-token' or 'next-auth.session-token'
  const sessionCookie = request.cookies.get('authjs.session-token') ||
                        request.cookies.get('next-auth.session-token') ||
                        request.cookies.get('__Secure-authjs.session-token') ||
                        request.cookies.get('__Secure-next-auth.session-token');

  const isLoggedIn = !!sessionCookie?.value;

  // Check if current path is protected
  const isProtected = protectedPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  );

  // Check if current path is auth route
  const isAuthPage = authPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  );

  // Redirect to login if accessing protected route without authentication
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if accessing auth route while authenticated
  if (isAuthPage && isLoggedIn) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
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
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
};
