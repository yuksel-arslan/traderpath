// ===========================================
// Auth.js Edge-Compatible Configuration
// This file is used by middleware (Edge runtime)
// ===========================================

import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';

export const authConfig: NextAuthConfig = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Credentials provider placeholder for Edge
    // Real implementation is in auth.ts
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: () => null, // Actual auth happens in auth.ts
    }),
  ],
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
