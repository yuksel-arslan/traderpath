import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedPaths = [
  '/dashboard', '/analyze', '/reports', '/report', '/rewards', '/credits',
  '/alerts', '/settings', '/analysis', '/admin', '/ai-expert', '/concierge',
  '/scheduled', '/signals', '/methodology', '/top-coins', '/notifications',
  '/terminal', '/flow', '/screener', '/trades',
];

const authPaths = ['/login', '/register'];
const publicAuthPaths = ['/forgot-password', '/reset-password', '/verify-email', '/two-factor'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── MAINTENANCE MODE (REWRITE METHOD) ──────────────────────────
  const maintenanceMode = process.env['NEXT_PUBLIC_MAINTENANCE_MODE'] === 'true';
  
  if (maintenanceMode) {
    // Statik dosyaların ve bakım sayfasının kendisinin yüklenmesine izin ver
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/static') ||
      pathname === '/maintenance.html' ||
      pathname === '/favicon.ico'
    ) {
      return NextResponse.next();
    }

    // URL'yi DEĞİŞTİRMEDEN bakım sayfasını göster (404'ü engeller)
    return NextResponse.rewrite(new URL('/maintenance.html', request.url));
  }

  // ─── AUTH LOGIC ────────────────────────────────────────────────
  const sessionCookie = request.cookies.get('auth-session');
  const isLoggedIn = sessionCookie?.value === 'true';

  const isProtected = protectedPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  );

  const isAuthPage = authPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  );

  const isPublicAuthPage = publicAuthPaths.some(path =>
    pathname === path || pathname.startsWith(`${path}/`)
  );

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthPage && !isPublicAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // API ve statik dosyalar dışındaki her şeyi yakala
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
