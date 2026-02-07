// ===========================================
// Authentication Routes
// Secure, production-ready implementation
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../../core/database';
import { config } from '../../core/config';
import {
  checkAccountLockout,
  recordFailedLogin,
  recordSuccessfulLogin,
  checkSuspiciousActivity,
  createEmailVerificationToken,
} from '../../core/auth/security.service';
import { emailService } from '../email/email.service';
import { creditService } from '../credits/credit.service';

// First login bonus amount
const FIRST_LOGIN_BONUS = 100;

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

export default async function authRoutes(app: FastifyInstance) {
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
      const existing = await prisma.user.findUnique({
        where: { email: body.email.toLowerCase() },
      });

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
        const referrer = await prisma.user.findUnique({
          where: { referralCode: body.referralCode.toUpperCase() },
        });
        if (referrer) {
          referredById = referrer.id;
        }
      }

      // Create user in transaction
      const user = await prisma.$transaction(async (tx) => {
        // Create user
        const newUser = await tx.user.create({
          data: {
            email: body.email.toLowerCase(),
            passwordHash,
            name: body.name,
            referralCode,
            referredById,
            registrationEmail: body.email.toLowerCase(), // Store original registration email
          },
        });

        // Create credit balance with welcome bonus
        const isAdmin = ADMIN_EMAILS.includes(body.email.toLowerCase());
        await tx.creditBalance.create({
          data: {
            userId: newUser.id,
            balance: isAdmin ? 999999 : 25,
            lifetimeEarned: isAdmin ? 999999 : 25,
          },
        });

        // Handle referral bonus
        if (referredById) {
          await tx.referral.create({
            data: {
              referrerId: referredById,
              referredId: newUser.id,
              status: 'REGISTERED',
              referrerCreditsEarned: 20,
              referredCreditsEarned: 20,
            },
          });

          // Add referral bonus to both users
          await tx.creditBalance.update({
            where: { userId: referredById },
            data: {
              balance: { increment: 20 },
              lifetimeEarned: { increment: 20 },
            },
          });
          await tx.creditBalance.update({
            where: { userId: newUser.id },
            data: {
              balance: { increment: 20 },
              lifetimeEarned: { increment: 20 },
            },
          });
        }

        return newUser;
      });

      // Send email verification
      const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const verificationResult = await createEmailVerificationToken(user.id);
      if (verificationResult.success && verificationResult.token) {
        const verificationUrl = `${BASE_URL}/verify-email?token=${verificationResult.token}`;
        emailService.sendEmailVerification(
          user.email,
          user.name || body.name,
          verificationUrl
        ).catch((err) => app.log.error({ error: err }, 'Failed to send verification email'));
      }

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
            level: user.level,
            isAdmin,
            emailVerified: false,
          },
          token,
          credits: isAdmin ? 999999 : 25 + (referredById ? 20 : 0),
          message: 'Please check your email to verify your account.',
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Sanitize validation errors - only expose field and message
        const sanitizedErrors = error.errors.map(e => ({
          field: e.path[0] || 'unknown',
          message: e.message,
        }));
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid input',
            details: sanitizedErrors,
          },
        });
      }
      app.log.error({ error }, 'Registration error');
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
   * Includes account lockout, 2FA, and audit logging
   */
  const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  });

  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = loginSchema.parse(request.body);
      const email = body.email.toLowerCase();
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];

      // Check account lockout
      const lockoutStatus = await checkAccountLockout(email);
      if (lockoutStatus.isLocked) {
        const minutesRemaining = lockoutStatus.lockedUntil
          ? Math.ceil((lockoutStatus.lockedUntil.getTime() - Date.now()) / 60000)
          : 30;
        return reply.status(423).send({
          success: false,
          error: {
            code: 'ACCOUNT_LOCKED',
            message: `Account is temporarily locked. Try again in ${minutesRemaining} minutes.`,
            lockedUntil: lockoutStatus.lockedUntil,
          },
        });
      }

      // Find user by email - use select to avoid P2022 if production DB has missing columns
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          image: true,
          emailVerified: true,
          twoFactorEnabled: true,
          firstLoginBonusReceived: true,
          level: true,
          creditBalance: { select: { balance: true } },
        },
      });

      if (!user) {
        // Record failed attempt (even for non-existent email)
        await recordFailedLogin(email, ipAddress, userAgent, 'User not found');
        return reply.status(401).send({
          success: false,
          error: {
            code: 'AUTH_INVALID',
            message: 'Invalid email or password',
            attemptsRemaining: lockoutStatus.attemptsRemaining - 1,
          },
        });
      }

      if (!user.passwordHash) {
        // User registered with Google, doesn't have password
        return reply.status(401).send({
          success: false,
          error: {
            code: 'AUTH_GOOGLE_ONLY',
            message: 'This account uses Google Sign-In. Please login with Google.',
          },
        });
      }

      // Verify password
      const valid = await bcrypt.compare(body.password, user.passwordHash);
      if (!valid) {
        const result = await recordFailedLogin(email, ipAddress, userAgent, 'Invalid password');
        return reply.status(401).send({
          success: false,
          error: {
            code: 'AUTH_INVALID',
            message: 'Invalid email or password',
            attemptsRemaining: result.attemptsRemaining,
            isLocked: result.isLocked,
          },
        });
      }

      // Check if email is verified (SECURITY: Require email verification before login)
      if (!user.emailVerified) {
        // Resend verification email
        const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        const verificationResult = await createEmailVerificationToken(user.id);
        if (verificationResult.success && verificationResult.token) {
          const verificationUrl = `${BASE_URL}/verify-email?token=${verificationResult.token}`;
          emailService.sendEmailVerification(
            user.email,
            user.name || 'User',
            verificationUrl
          ).catch(console.error);
        }

        return reply.status(403).send({
          success: false,
          error: {
            code: 'EMAIL_NOT_VERIFIED',
            message: 'Please verify your email address before logging in. A new verification email has been sent.',
            email: user.email,
          },
        });
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        // Return partial success - user needs to complete 2FA
        return reply.send({
          success: true,
          data: {
            requiresTwoFactor: true,
            userId: user.id,
          },
        });
      }

      // Record successful login
      await recordSuccessfulLogin(user.id, email, ipAddress, userAgent);

      // Check for suspicious activity
      const suspiciousCheck = await checkSuspiciousActivity(user.id, ipAddress);
      if (suspiciousCheck.suspicious) {
        // Send alert email (but don't block login)
        emailService.sendSuspiciousLoginAlert(
          user.email,
          user.name || 'User',
          {
            ip: ipAddress,
            device: userAgent,
            time: new Date().toLocaleString('en-US'),
          }
        ).catch(console.error);
      }

      // Award first login bonus if not already received
      let isFirstLogin = false;
      let updatedCredits = user.creditBalance?.balance || 0;

      if (!user.firstLoginBonusReceived) {
        isFirstLogin = true;
        // Award first login bonus
        const bonusResult = await creditService.add(
          user.id,
          FIRST_LOGIN_BONUS,
          'BONUS',
          'first_login_bonus',
          { message: 'Welcome bonus for first login' }
        );
        updatedCredits = bonusResult.newBalance;

        // Mark first login bonus as received
        await prisma.user.update({
          where: { id: user.id },
          data: { firstLoginBonusReceived: true },
        });
      }

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
            level: user.level,
            avatarUrl: user.image,
            isAdmin,
            emailVerified: !!user.emailVerified,
            twoFactorEnabled: user.twoFactorEnabled,
          },
          token,
          credits: isAdmin ? 999999 : updatedCredits,
          newDeviceLogin: suspiciousCheck.suspicious,
          isFirstLogin,
          firstLoginBonus: isFirstLogin ? FIRST_LOGIN_BONUS : undefined,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid input',
          },
        });
      }
      // Log detailed error info for diagnosis
      const errorCode = error?.code || 'UNKNOWN';
      const errorMeta = error?.meta ? JSON.stringify(error.meta) : 'none';
      console.error(`Login error [${errorCode}]:`, error?.message || error, `meta: ${errorMeta}`);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: errorCode === 'P2022'
            ? `Database schema mismatch: column ${error?.meta?.column || 'unknown'} not found. Please run migrations.`
            : errorCode === 'P2021'
            ? `Database schema mismatch: table not found. Please run migrations.`
            : 'An error occurred during login',
        },
      });
    }
  });

  /**
   * POST /api/auth/google
   * Login/Register with Google OAuth
   * Properly verifies Google JWT token with Google's public keys
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

      // Verify the Google JWT token with Google's public keys
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
            code: 'GOOGLE_NO_EMAIL',
            message: 'Email not provided by Google. Please check your Google account settings.',
          },
        });
      }

      // Fields we actually need - using select avoids P2022 if production DB has missing columns
      const userSelect = {
        id: true, email: true, name: true, image: true, googleId: true,
        firstLoginBonusReceived: true, level: true,
        creditBalance: { select: { balance: true } },
      } as const;

      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: userSelect,
      });

      let isNewUser = false;

      if (!user) {
        // Create new user
        isNewUser = true;
        const referralCode = nanoid(8).toUpperCase();
        const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

        user = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email: email.toLowerCase(),
              name: name || email.split('@')[0],
              image: picture,
              googleId,
              referralCode,
            },
          });

          // Create credit balance with welcome bonus
          await tx.creditBalance.create({
            data: {
              userId: newUser.id,
              balance: isAdmin ? 999999 : 25,
              lifetimeEarned: isAdmin ? 999999 : 25,
            },
          });

          // Refetch user with credit balance
          return tx.user.findUnique({
            where: { id: newUser.id },
            select: userSelect,
          });
        });
      } else {
        // Update existing user's Google info if needed
        if (!user.googleId || !user.image) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: user.googleId || googleId,
              image: user.image || picture,
            },
            select: userSelect,
          });
        }
      }

      if (!user) {
        console.error('Google auth error: user is null after creation/lookup');
        return reply.status(500).send({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Failed to create or find user account' },
        });
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Award first login bonus if not already received
      let isFirstLogin = false;
      let updatedCredits = user.creditBalance?.balance || 0;

      if (!user.firstLoginBonusReceived) {
        isFirstLogin = true;
        // Award first login bonus
        const bonusResult = await creditService.add(
          user.id,
          FIRST_LOGIN_BONUS,
          'BONUS',
          'first_login_bonus',
          { message: 'Welcome bonus for first login' }
        );
        updatedCredits = bonusResult.newBalance;

        // Mark first login bonus as received
        await prisma.user.update({
          where: { id: user.id },
          data: { firstLoginBonusReceived: true },
        });
      }

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
            avatarUrl: user.image,
            level: user.level,
            isAdmin,
          },
          token,
          credits: isAdmin ? 999999 : updatedCredits,
          isNewUser,
          isFirstLogin,
          firstLoginBonus: isFirstLogin ? FIRST_LOGIN_BONUS : undefined,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid input',
          },
        });
      }
      const errorCode = error?.code || 'UNKNOWN';
      const errorMeta = error?.meta ? JSON.stringify(error.meta) : 'none';
      console.error(`Google auth error [${errorCode}]:`, error?.message || error, `meta: ${errorMeta}`);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: errorCode === 'P2022'
            ? `Database schema mismatch: column ${error?.meta?.column || 'unknown'} not found. Please run migrations.`
            : errorCode === 'P2021'
            ? `Database schema mismatch: table not found. Please run migrations.`
            : 'An error occurred during Google authentication',
        },
      });
    }
  });

  /**
   * GET /api/auth/me
   * Get current authenticated user
   */
  app.get('/me', {
    preHandler: app.authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: request.user!.id },
        select: {
          id: true, email: true, name: true, image: true, level: true, xp: true,
          streakDays: true, preferredCoins: true, preferredInterface: true,
          referralCode: true, twoFactorEnabled: true, preferredLanguage: true,
          telegramChatId: true, discordWebhookUrl: true, createdAt: true,
          creditBalance: { select: { balance: true, lifetimeEarned: true } },
        },
      });

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
            avatarUrl: user.image,
            level: user.level,
            xp: user.xp,
            streakDays: user.streakDays,
            preferredCoins: user.preferredCoins,
            preferredInterface: user.preferredInterface, // 'ui' | 'concierge' | null
            referralCode: user.referralCode,
            createdAt: user.createdAt,
            isAdmin,
          },
          credits: user.creditBalance,
        },
      });
    } catch (error: any) {
      const errorCode = error?.code || 'UNKNOWN';
      const errorMeta = error?.meta ? JSON.stringify(error.meta) : 'none';
      console.error(`Get user error [${errorCode}]:`, error?.message || error, `meta: ${errorMeta}`);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: errorCode === 'P2022'
            ? `Database schema mismatch: column ${error?.meta?.column || 'unknown'} not found. Please run migrations.`
            : 'An error occurred while fetching user data',
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

      // Fields we actually need from User - using select avoids P2022 if production DB has missing columns
      const userSelect = {
        id: true, email: true, name: true, image: true, googleId: true,
        firstLoginBonusReceived: true, level: true,
        creditBalance: { select: { balance: true } },
      } as const;

      // Check if user exists by provider ID or email
      let user = provider === 'google'
        ? await prisma.user.findUnique({
            where: { googleId: providerId },
            select: userSelect,
          })
        : null;
      let isNewUser = false;

      if (!user) {
        // Check by email
        user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: userSelect,
        });

        if (user) {
          // Link OAuth account to existing user
          if (provider === 'google' && !user.googleId) {
            user = await prisma.user.update({
              where: { id: user.id },
              data: {
                googleId: providerId,
                image: user.image || image,
              },
              select: userSelect,
            });
          }
        } else {
          // Create new user
          isNewUser = true;
          const referralCode = nanoid(8).toUpperCase();
          const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

          user = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
              data: {
                email: email.toLowerCase(),
                name: name || email.split('@')[0],
                googleId: provider === 'google' ? providerId : undefined,
                image: image,
                referralCode,
              },
            });

            await tx.creditBalance.create({
              data: {
                userId: newUser.id,
                balance: isAdmin ? 999999 : 25,
                lifetimeEarned: isAdmin ? 999999 : 25,
              },
            });

            return tx.user.findUnique({
              where: { id: newUser.id },
              select: userSelect,
            });
          });
        }
      }

      if (!user) {
        console.error('OAuth error: user is null after creation/lookup');
        return reply.status(500).send({
          success: false,
          error: { code: 'SERVER_ERROR', message: 'Failed to create or find user account' },
        });
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Award first login bonus if not already received
      let isFirstLogin = false;
      let updatedCredits = user.creditBalance?.balance || 0;

      if (!user.firstLoginBonusReceived) {
        isFirstLogin = true;
        // Award first login bonus
        const bonusResult = await creditService.add(
          user.id,
          FIRST_LOGIN_BONUS,
          'BONUS',
          'first_login_bonus',
          { message: 'Welcome bonus for first login' }
        );
        updatedCredits = bonusResult.newBalance;

        // Mark first login bonus as received
        await prisma.user.update({
          where: { id: user.id },
          data: { firstLoginBonusReceived: true },
        });
      }

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
            level: user.level,
            avatarUrl: user.image || image,
            isAdmin,
          },
          accessToken: token,
          credits: isAdmin ? 999999 : updatedCredits,
          isNewUser,
          isFirstLogin,
          firstLoginBonus: isFirstLogin ? FIRST_LOGIN_BONUS : undefined,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.errors[0]?.message || 'Invalid input',
          },
        });
      }
      // Log detailed error info for diagnosis
      const errorCode = error?.code || 'UNKNOWN';
      const errorMeta = error?.meta ? JSON.stringify(error.meta) : 'none';
      console.error(`OAuth error [${errorCode}]:`, error?.message || error, `meta: ${errorMeta}`);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: errorCode === 'P2022'
            ? `Database schema mismatch: column ${error?.meta?.column || 'unknown'} not found. Please run migrations.`
            : errorCode === 'P2021'
            ? `Database schema mismatch: table not found. Please run migrations.`
            : 'An error occurred during OAuth authentication',
        },
      });
    }
  });

  /**
   * POST /api/auth/logout
   * Logout user (client-side token removal, but we can invalidate if needed)
   */
  app.post('/logout', {
    preHandler: app.authenticate,
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    // In a stateless JWT system, logout is handled client-side
    // But we acknowledge the request for proper UX
    return reply.send({
      success: true,
      message: 'Logged out successfully',
    });
  });

  /**
   * POST /api/auth/refresh
   * Refresh JWT token (extend session)
   */
  app.post('/refresh', {
    preHandler: app.authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Verify user still exists and is valid
      const user = await prisma.user.findUnique({
        where: { id: request.user!.id },
        select: { id: true, email: true, name: true, level: true },
      });

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User no longer exists',
          },
        });
      }

      // Generate new token
      const token = app.jwt.sign(
        { id: user.id, email: user.email, name: user.name || '', level: user.level || 1 },
        { expiresIn: config.jwtExpiresIn }
      );

      return reply.send({
        success: true,
        data: { token },
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      return reply.status(500).send({
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'An error occurred while refreshing token',
        },
      });
    }
  });
}
