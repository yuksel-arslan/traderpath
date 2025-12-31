// ===========================================
// Authentication Routes
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { prisma } from '../../core/database';

// Admin emails with free unlimited access
const ADMIN_EMAILS = ['contact@yukselarslan.com'];

export default async function authRoutes(app: FastifyInstance) {
  /**
   * POST /api/auth/register
   * Register a new user
   */
  const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(2).max(50),
    referralCode: z.string().optional(),
  });

  app.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = registerSchema.parse(request.body);

    // Check if email exists
    const existing = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existing) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'AUTH_EMAIL_EXISTS',
          message: 'Email already registered',
        },
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 12);

    // Generate referral code
    const referralCode = nanoid(8).toUpperCase();

    // Find referrer if code provided
    let referredById: string | undefined;
    if (body.referralCode) {
      const referrer = await prisma.user.findUnique({
        where: { referralCode: body.referralCode },
      });
      if (referrer) {
        referredById = referrer.id;
      }
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        name: body.name,
        referralCode,
        referredById,
      },
    });

    // Create credit balance with welcome bonus
    await prisma.creditBalance.create({
      data: {
        userId: user.id,
        balance: 25,
        lifetimeEarned: 25,
      },
    });

    // Handle referral bonus
    if (referredById) {
      await prisma.referral.create({
        data: {
          referrerId: referredById,
          referredId: user.id,
          status: 'REGISTERED',
          referrerCreditsEarned: 20,
          referredCreditsEarned: 20,
        },
      });

      // Add referral bonus to both users
      await prisma.creditBalance.update({
        where: { userId: referredById },
        data: { balance: { increment: 20 } },
      });
      await prisma.creditBalance.update({
        where: { userId: user.id },
        data: { balance: { increment: 20 } },
      });
    }

    // Generate JWT
    const token = app.jwt.sign({ id: user.id });

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
        },
        token,
        credits: isAdmin ? 999999 : 25 + (referredById ? 20 : 0),
      },
    });
  });

  /**
   * POST /api/auth/login
   * Login with email and password
   */
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
  });

  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.parse(request.body);

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (!user || !user.passwordHash) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'AUTH_INVALID',
          message: 'Invalid email or password',
        },
      });
    }

    // Verify password
    const valid = await bcrypt.compare(body.password, user.passwordHash);
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
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT
    const token = app.jwt.sign({ id: user.id });

    const isAdmin = ADMIN_EMAILS.includes(user.email);

    return reply.send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          level: user.level,
          isAdmin,
        },
        token,
      },
    });
  });

  /**
   * POST /api/auth/google
   * Login/Register with Google
   */
  const googleSchema = z.object({
    credential: z.string(),
  });

  app.post('/google', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = googleSchema.parse(request.body);

    try {
      // Decode the Google JWT credential (it's a JWT token)
      // In production, you should verify this with Google's public keys
      const parts = body.credential.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid credential format');
      }

      // Decode payload (base64url)
      const payload = JSON.parse(
        Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
      );

      const { email, name, picture, sub: googleId } = payload;

      if (!email) {
        throw new Error('Email not provided by Google');
      }

      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Create new user
        const referralCode = nanoid(8).toUpperCase();

        user = await prisma.user.create({
          data: {
            email,
            name: name || email.split('@')[0],
            avatarUrl: picture,
            googleId,
            referralCode,
          },
        });

        // Create credit balance with welcome bonus
        await prisma.creditBalance.create({
          data: {
            userId: user.id,
            balance: 25,
            lifetimeEarned: 25,
          },
        });
      } else {
        // Update existing user's Google info if needed
        if (!user.googleId || !user.avatarUrl) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: user.googleId || googleId,
              avatarUrl: user.avatarUrl || picture,
            },
          });
        }
      }

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Generate JWT
      const token = app.jwt.sign({ id: user.id });

      const isAdmin = ADMIN_EMAILS.includes(user.email);

      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            level: user.level,
            isAdmin,
          },
          token,
        },
      });
    } catch (error) {
      console.error('Google auth error:', error);
      return reply.status(400).send({
        success: false,
        error: {
          code: 'GOOGLE_AUTH_FAILED',
          message: error instanceof Error ? error.message : 'Google authentication failed',
        },
      });
    }
  });

  /**
   * GET /api/auth/me
   * Get current user
   */
  app.get('/me', {
    preHandler: app.authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user!.id },
      include: {
        creditBalance: true,
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
          avatarUrl: user.avatarUrl,
          level: user.level,
          xp: user.xp,
          streakDays: user.streakDays,
          preferredCoins: user.preferredCoins,
          referralCode: user.referralCode,
          createdAt: user.createdAt,
          isAdmin,
        },
        credits: isAdmin
          ? { ...user.creditBalance, balance: 999999 }
          : user.creditBalance,
      },
    });
  });
}
