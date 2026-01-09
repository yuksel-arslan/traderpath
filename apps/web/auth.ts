// ===========================================
// Auth.js Configuration
// ===========================================

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { NeonAdapter } from '@auth/neon-adapter';
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// Create Neon pool for database operations
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: NeonAdapter(pool),
  session: {
    strategy: 'jwt', // Use JWT for session (works with Edge runtime)
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        // Query user from database
        const result = await pool.query(
          'SELECT id, email, password_hash, name, avatar_url as image, is_admin FROM users WHERE email = $1',
          [email]
        );

        const user = result.rows[0];

        if (!user) {
          throw new Error('Invalid email or password');
        }

        if (!user.password_hash) {
          throw new Error('Please sign in with Google');
        }

        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
          throw new Error('Invalid email or password');
        }

        // Update last login
        await pool.query(
          'UPDATE users SET last_login_at = NOW() WHERE id = $1',
          [user.id]
        );

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          isAdmin: user.is_admin,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.isAdmin = (user as any).isAdmin || false;
      }

      // For OAuth, fetch admin status from DB
      if (account && account.provider !== 'credentials') {
        try {
          const result = await pool.query(
            'SELECT is_admin FROM users WHERE id = $1',
            [token.id || token.sub]
          );
          if (result.rows[0]) {
            token.isAdmin = result.rows[0].is_admin;
          }
        } catch (e) {
          console.error('Error fetching admin status:', e);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string || token.sub as string;
        (session.user as any).isAdmin = token.isAdmin || false;
      }
      return session;
    },
    async signIn({ user, account }) {
      // For OAuth providers, create credit balance if new user
      if (account?.provider === 'google') {
        const result = await pool.query(
          'SELECT id FROM credit_balances WHERE user_id = $1',
          [user.id]
        );

        if (result.rows.length === 0) {
          await pool.query(
            `INSERT INTO credit_balances (user_id, balance, daily_free_remaining, daily_reset_at, lifetime_earned, lifetime_spent, lifetime_purchased, updated_at)
             VALUES ($1, 25, 5, NOW(), 25, 0, 0, NOW())`,
            [user.id]
          );
        }
      }
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      // Create credit balance for new users
      if (user.id) {
        await pool.query(
          `INSERT INTO credit_balances (user_id, balance, daily_free_remaining, daily_reset_at, lifetime_earned, lifetime_spent, lifetime_purchased, updated_at)
           VALUES ($1, 25, 5, NOW(), 25, 0, 0, NOW())
           ON CONFLICT (user_id) DO NOTHING`,
          [user.id]
        );
      }
    },
  },
  trustHost: true,
});

// Type augmentation for session
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin?: boolean;
    };
  }
}
