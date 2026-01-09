// ===========================================
// Auth.js Edge-Compatible Configuration
// This file is used by middleware (Edge runtime)
// NO OAuth providers here - they don't work in Edge
// ===========================================

import type { NextAuthConfig } from 'next-auth';

export const authConfig: NextAuthConfig = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  // No providers in edge config - they're added in auth.ts
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

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

      const authPaths = ['/login', '/register', '/forgot-password'];

      const isProtected = protectedPaths.some(path =>
        nextUrl.pathname === path || nextUrl.pathname.startsWith(`${path}/`)
      );

      const isAuthPage = authPaths.some(path =>
        nextUrl.pathname === path || nextUrl.pathname.startsWith(`${path}/`)
      );

      if (isProtected && !isLoggedIn) {
        return false; // Redirect to login
      }

      if (isAuthPage && isLoggedIn) {
        return Response.redirect(new URL('/dashboard', nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = (user as any).isAdmin || false;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string || token.sub as string;
        (session.user as any).isAdmin = token.isAdmin || false;
      }
      return session;
    },
  },
  trustHost: true,
};
