// ===========================================
// Auth.js Configuration
// ===========================================

import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { Pool } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// Create Neon pool for database operations
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const { handlers, signIn, signOut, auth } = NextAuth({
  // No adapter needed - using JWT strategy with manual user handling
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
    async jwt({ token, user, account, profile }) {
      // Initial sign in with credentials
      if (user) {
        token.id = user.id;
        token.isAdmin = (user as any).isAdmin || false;
      }

      // Google OAuth sign in - find or create user
      if (account?.provider === 'google' && profile?.email) {
        try {
          // Check if user exists
          let result = await pool.query(
            'SELECT id, is_admin FROM users WHERE email = $1',
            [profile.email]
          );

          let dbUser = result.rows[0];

          // Create user if doesn't exist
          if (!dbUser) {
            const insertResult = await pool.query(
              `INSERT INTO users (id, email, name, avatar_url, created_at, updated_at)
               VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
               RETURNING id, is_admin`,
              [profile.email, profile.name, profile.picture]
            );
            dbUser = insertResult.rows[0];

            // Create credit balance for new user
            await pool.query(
              `INSERT INTO credit_balances (user_id, balance, daily_free_remaining, daily_reset_at, lifetime_earned, lifetime_spent, lifetime_purchased, updated_at)
               VALUES ($1, 25, 5, NOW(), 25, 0, 0, NOW())`,
              [dbUser.id]
            );
          }

          token.id = dbUser.id;
          token.isAdmin = dbUser.is_admin || false;

          // Update last login
          await pool.query(
            'UPDATE users SET last_login_at = NOW() WHERE id = $1',
            [dbUser.id]
          );
        } catch (e) {
          console.error('Error handling Google sign in:', e);
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
