// ===========================================
// Next.js Middleware - Cookie-based Auth Check
// Simple and secure authentication middleware
// ===========================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that require authentication
const protectedPaths = [
  '/dashboard',
  '/analyze',
  '/reports',
  '/report',
  '/rewards',
  '/credits',
  '/alerts',
  '/settings',
  '/analysis',
  '/admin',
  '/ai-expert',
  '/concierge',
  '/scheduled',
  '/signals',
  '/methodology',
  '/top-coins',
  '/notifications',
  '/terminal',
  '/flow',
  '/screener',
  '/trades',
];

// Routes that should redirect to dashboard if already authenticated
const authPaths = ['/login', '/register'];

// Auth pages that should be accessible even when logged in
const publicAuthPaths = ['/forgot-password', '/reset-password', '/verify-email', '/two-factor'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Maintenance Mode Gate ─────────────────────────────────────
  // Set NEXT_PUBLIC_MAINTENANCE_MODE=true in Vercel / .env to enable.
  // Only the /maintenance page itself (and static assets) are allowed through.
  const maintenanceMode = process.env['NEXT_PUBLIC_MAINTENANCE_MODE'] === 'true';
  if (maintenanceMode && pathname !== '/maintenance') {
    const maintenanceUrl = new URL('/maintenance', request.url);
    return NextResponse.redirect(maintenanceUrl);
  }
  // If maintenance mode is OFF but someone navigates to /maintenance, redirect home
  if (!maintenanceMode && pathname === '/maintenance') {
    const homeUrl = new URL('/', request.url);
    return NextResponse.redirect(homeUrl);
  }

  // Check for our auth session cookie
  const sessionCookie = request.cookies.get('auth-session');
  const authTokenCookie = request.cookies.get('auth-token');
  const isLoggedIn = sessionCookie?.value === 'true';

  // Debug: Log auth state for protected routes
  if (process.env.NODE_ENV === 'development') {
    const isProtectedPath = protectedPaths.some(
      p => pathname === p || pathname.startsWith(`${p}/`)
    );
    if (isProtectedPath) {
      console.log(`[Middleware] Path: ${pathname}, auth-session: ${sessionCookie?.value}, auth-token: ${authTokenCookie ? 'present' : 'missing'}, isLoggedIn: ${isLoggedIn}`);
    }
  }

  // Check if current path is protected
  const isProtected = protectedPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  );

  // Check if current path is auth route (login/register only)
  const isAuthPage = authPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  );

  // Check if current path is a public auth page (accessible to everyone)
  const isPublicAuthPage = publicAuthPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  );

  // Redirect to login if accessing protected route without authentication
  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if accessing login/register while authenticated
  // (but not for public auth pages like forgot-password, verify-email, etc.)
  if (isAuthPage && !isPublicAuthPage && isLoggedIn) {
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
