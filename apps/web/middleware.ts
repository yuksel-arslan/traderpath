import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const maintenanceMode = process.env['NEXT_PUBLIC_MAINTENANCE_MODE'] === 'true';

  if (maintenanceMode) {
    // Statik dosyalara ve API'ye dokunma
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/static') ||
      pathname === '/favicon.ico' ||
      pathname === '/maintenance.html'
    ) {
      return NextResponse.next();
    }

    // ÖNEMLİ: /maintenance.html dosyasını REWRITE ederek göster
    // Bu sayede tarayıcıdaki URL ne olursa olsun bizim hazırladığımız HTML basılır.
    return NextResponse.rewrite(new URL('/maintenance.html', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
