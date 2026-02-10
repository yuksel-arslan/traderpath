// apps/web/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const maintenanceMode = process.env['NEXT_PUBLIC_MAINTENANCE_MODE'] === 'true';

  // 1. Bakım Modu Aktifse
  if (maintenanceMode) {
    // Statik dosyalar ve bakım sayfasının kendisine izin ver
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname === '/maintenance' ||
      pathname === '/favicon.ico'
    ) {
      return NextResponse.next();
    }
    // Diğer her şeyi /maintenance sayfasına yönlendir
    return NextResponse.redirect(new URL('/maintenance', request.url));
  }

  // 2. Bakım Modu Kapalıysa ama kullanıcı /maintenance sayfasına girmeye çalışırsa ana sayfaya at
  if (!maintenanceMode && pathname === '/maintenance') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // ... (Buradan aşağısı sizin mevcut Auth mantığınız)
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
