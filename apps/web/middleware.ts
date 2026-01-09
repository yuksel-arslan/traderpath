// ===========================================
// Next.js Middleware with Auth.js
// Uses edge-compatible auth config
// ===========================================

import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// Create auth middleware from edge-compatible config
const { auth } = NextAuth(authConfig);

export default auth;

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
