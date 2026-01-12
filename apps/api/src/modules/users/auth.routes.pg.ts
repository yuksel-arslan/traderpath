// ===========================================
// Authentication Routes (PostgreSQL Direct)
// Fallback when Prisma binaries unavailable
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { OAuth2Client } from 'google-auth-library';
import { pgDb, transaction } from '../../core/pg-database';
import { config } from '../../core/config';

// Admin emails with free unlimited access
const ADMIN_EMAILS = ['contact@yukselarslan.com'];

// Google OAuth client for token verification
const googleClient = config.google.clientId
  ? new OAuth2Client(config.google.clientId)
  : null;

// Password validation schema with complexity requirements
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => /[0-9]/.test(password),
    'Password must contain at least one number'
  );

export default async function authRoutesPg(app: FastifyInstance) {
  /**
   * POST /api/auth/register
   * Register a new user with email and password
   */
  const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: passwordSchema,
    name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name must be less than 50 characters'),
    referralCode: z.string().optional(),
  });

  app.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = registerSchema.parse(request.body);

      // Check if email exists
      const existing = await pgDb.users.findByEmail(body.email);

      if (existing) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'AUTH_EMAIL_EXISTS',
            message: 'An account with this email already exists',
          },
        });
      }

      // Hash password with bcrypt (cost factor 12)
      const passwordHash = await bcrypt.hash(body.password, 12);

      // Generate unique referral code
      const referralCode = nanoid(8).toUpperCase();

      // Find referrer if code provided
      let referredById: string | undefined;
      if (body.referralCode) {
        const referrer = await pgDb.users.findByReferralCode(body.referralCode);
        if (referrer) {
          referredById = referrer.id;
        }
      }

      // Create user in transaction
      const user = await transaction(async (client) => {
        // Create user
        const { rows: [newUser] } = await client.query(
          `INSERT INTO users (email, password_hash, name, referral_code, referred_by_id)
           VALUES (LOWER($1), $2, $3, $4, $5)
           RETURNING *`,
          [body.email, passwordHash, body.name, referralCode, referredById || null]
        );

        // Create credit balance with welcome bonus
        const isAdmin = ADMIN_EMAILS.includes(body.email.toLowerCase());
        const initialBalance = isAdmin ? 999999 : 25;
        await client.query(
          `INSERT INTO credit_balances (user_id, balance, lifetime_earned)
           VALUES ($1, $2, $2)`,
          [newUser.id, initialBalance]
        );

        // Handle referral bonus
        if (referredById) {
          await client.query(
            `INSERT INTO referrals (referrer_id, referred_id, status, referrer_credits_earned, referred_credits_earned)
             VALUES ($1, $2, 'REGISTERED', 20, 20)`,
            [referredById, newUser.id]
          );

          // Add referral bonus to referrer
          await client.query(
            `UPDATE credit_balances
             SET balance = balance + 20, lifetime_earned = lifetime_earned + 20, updated_at = NOW()
             WHERE user_id = $1`,
            [referredById]
          );

          // Add referral bonus to new user
          await client.query(
            `UPDATE credit_balances
             SET balance = balance + 20, lifetime_earned = lifetime_earned + 20, updated_at = NOW()
             WHERE user_id = $1`,
            [newUser.id]
          );
        }

        return newUser;
      });

      // Generate JWT token
      const token = app.jwt.sign(
        { id: user.id, email: user.email, name: user.name || '', level: user.level || 1 },
        { expiresIn: config.jwtExpiresIn }
      );

      const isAdmin = ADMIN_EMAILS.includes(user.email);

      return reply.status(201).send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            level: user.level || 1,
            isAdmin,
          },
          token,
          credits: isAdmin ? 999999 : 25 + (referredById ? 20 : 0),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid input',
            details: error.errors,
          },
        });
      }
      console.error('Register error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An error occurred during registration',
        },
      });
    }
  });

  /**
   * POST /api/auth/login
   * Login with email and password
   */
  const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  });

  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);

      // Find user by email
      const user = await pgDb.users.findByEmail(body.email);

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'AUTH_INVALID',
            message: 'Invalid email or password',
          },
        });
      }

      if (!user.password_hash) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'AUTH_GOOGLE_ONLY',
            message: 'This account uses Google Sign-In. Please login with Google.',
          },
        });
      }

      // Verify password
      const valid = await bcrypt.compare(body.password, user.password_hash);
      if (!valid) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'AUTH_INVALID',
            message: 'Invalid email or password',
          },
        });
      }

      // Update last login
      await pgDb.users.updateLastLogin(user.id);

      // Generate JWT token
      const token = app.jwt.sign(
        { id: user.id, email: user.email, name: user.name || '', level: user.level || 1 },
        { expiresIn: config.jwtExpiresIn }
      );

      const isAdmin = ADMIN_EMAILS.includes(user.email);

      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            level: user.level || 1,
            avatarUrl: user.avatar_url,
            isAdmin,
          },
          token,
          credits: isAdmin ? 999999 : user.credit_balance || 0,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid input',
          },
        });
      }
      console.error('Login error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An error occurred during login',
        },
      });
    }
  });

  /**
   * POST /api/auth/google
   * Login/Register with Google OAuth
   */
  const googleSchema = z.object({
    credential: z.string().min(1, 'Credential is required'),
  });

  app.post('/google', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = googleSchema.parse(request.body);

      if (!googleClient) {
        return reply.status(503).send({
          success: false,
          error: {
            code: 'GOOGLE_NOT_CONFIGURED',
            message: 'Google Sign-In is not configured. Please use email/password.',
          },
        });
      }

      // Verify the Google JWT token
      let payload;
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: body.credential,
          audience: config.google.clientId,
        });
        payload = ticket.getPayload();
      } catch (verifyError) {
        console.error('Google token verification failed:', verifyError);
        return reply.status(401).send({
          success: false,
          error: {
            code: 'GOOGLE_TOKEN_INVALID',
            message: 'Invalid or expired Google credential. Please try again.',
          },
        });
      }

      if (!payload) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'GOOGLE_TOKEN_EMPTY',
            message: 'Could not get user information from Google.',
          },
        });
      }

      const { email, name, picture, sub: googleId } = payload;

      if (!email) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'GOOGLE_EMAIL_MISSING',
            message: 'Email not provided by Google. Please allow email access.',
          },
        });
      }

      // Check if user exists by Google ID or email
      let user = await pgDb.users.findByGoogleId(googleId);
      let isNewUser = false;

      if (!user) {
        // Check by email
        user = await pgDb.users.findByEmail(email);

        if (user) {
          // Link Google account to existing user
          await pgDb.query(
            `UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2), updated_at = NOW() WHERE id = $3`,
            [googleId, picture, user.id]
          );
        } else {
          // Create new user
          isNewUser = true;
          const referralCode = nanoid(8).toUpperCase();

          user = await transaction(async (client) => {
            const { rows: [newUser] } = await client.query(
              `INSERT INTO users (email, name, google_id, avatar_url, referral_code)
               VALUES (LOWER($1), $2, $3, $4, $5)
               RETURNING *`,
              [email, name || email.split('@')[0], googleId, picture, referralCode]
            );

            const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
            await client.query(
              `INSERT INTO credit_balances (user_id, balance, lifetime_earned)
               VALUES ($1, $2, $2)`,
              [newUser.id, isAdmin ? 999999 : 25]
            );

            return newUser;
          });
        }
      }

      // Update last login
      await pgDb.users.updateLastLogin(user.id);

      // Get current credit balance
      const creditBalance = await pgDb.credits.getBalance(user.id);

      // Generate JWT token
      const token = app.jwt.sign(
        { id: user.id, email: user.email, name: user.name || '', level: user.level || 1 },
        { expiresIn: config.jwtExpiresIn }
      );

      const isAdmin = ADMIN_EMAILS.includes(user.email);

      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            level: user.level || 1,
            avatarUrl: user.avatar_url || picture,
            isAdmin,
          },
          token,
          credits: isAdmin ? 999999 : creditBalance?.balance || 25,
          isNewUser,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid input',
          },
        });
      }
      console.error('Google auth error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An error occurred during Google sign-in',
        },
      });
    }
  });

  /**
   * GET /api/auth/me
   * Get current authenticated user
   */
  app.get('/me', {
    preHandler: [app.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request.user as { id: string }).id;
      const user = await pgDb.users.findById(userId);

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }

      const isAdmin = ADMIN_EMAILS.includes(user.email);

      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            level: user.level || 1,
            xp: user.xp || 0,
            avatarUrl: user.avatar_url,
            streakDays: user.streak_days || 0,
            isAdmin,
          },
          credits: isAdmin ? 999999 : user.credit_balance || 0,
        },
      });
    } catch (error) {
      console.error('Get me error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An error occurred while fetching user data',
        },
      });
    }
  });

  /**
   * POST /api/auth/oauth
   * OAuth login/register (for redirect-based OAuth flow)
   */
  const oauthSchema = z.object({
    provider: z.string(),
    providerId: z.string(),
    email: z.string().email(),
    name: z.string().optional(),
    image: z.string().optional(),
  });

  app.post('/oauth', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = oauthSchema.parse(request.body);
      const { provider, providerId, email, name, image } = body;

      // Check if user exists by provider ID or email
      let user = provider === 'google'
        ? await pgDb.users.findByGoogleId(providerId)
        : null;
      let isNewUser = false;

      if (!user) {
        // Check by email
        user = await pgDb.users.findByEmail(email);

        if (user) {
          // Link OAuth account to existing user
          if (provider === 'google') {
            await pgDb.query(
              `UPDATE users SET google_id = $1, avatar_url = COALESCE(avatar_url, $2), updated_at = NOW() WHERE id = $3`,
              [providerId, image, user.id]
            );
          }
        } else {
          // Create new user
          isNewUser = true;
          const referralCode = nanoid(8).toUpperCase();

          user = await transaction(async (client) => {
            const { rows: [newUser] } = await client.query(
              `INSERT INTO users (email, name, google_id, avatar_url, referral_code)
               VALUES (LOWER($1), $2, $3, $4, $5)
               RETURNING *`,
              [email, name || email.split('@')[0], provider === 'google' ? providerId : null, image, referralCode]
            );

            const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
            await client.query(
              `INSERT INTO credit_balances (user_id, balance, lifetime_earned)
               VALUES ($1, $2, $2)`,
              [newUser.id, isAdmin ? 999999 : 25]
            );

            return newUser;
          });
        }
      }

      // Update last login
      await pgDb.users.updateLastLogin(user.id);

      // Get current credit balance
      const creditBalance = await pgDb.credits.getBalance(user.id);

      // Generate JWT token
      const token = app.jwt.sign(
        { id: user.id, email: user.email, name: user.name || '', level: user.level || 1 },
        { expiresIn: config.jwtExpiresIn }
      );

      const isAdmin = ADMIN_EMAILS.includes(user.email);

      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            level: user.level || 1,
            avatarUrl: user.avatar_url || image,
            isAdmin,
          },
          accessToken: token,
          credits: isAdmin ? 999999 : creditBalance?.balance || 25,
          isNewUser,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid input',
          },
        });
      }
      console.error('OAuth error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An error occurred during OAuth sign-in',
        },
      });
    }
  });

  /**
   * POST /api/auth/logout
   * Logout (client-side token removal acknowledgment)
   */
  app.post('/logout', async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      message: 'Logged out successfully',
    });
  });
}
