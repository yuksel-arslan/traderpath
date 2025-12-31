// ===========================================
// Authentication Routes
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { prisma } from '../../core/database';

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

    return reply.status(201).send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          level: user.level,
        },
        token,
        credits: 25 + (referredById ? 20 : 0),
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

    return reply.send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          level: user.level,
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
    idToken: z.string(),
  });

  app.post('/google', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = googleSchema.parse(request.body);

    // TODO: Verify Google token
    // For now, return placeholder
    return reply.status(501).send({
      success: false,
      error: {
        code: 'NOT_IMPLEMENTED',
        message: 'Google auth not yet implemented',
      },
    });
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
        },
        credits: user.creditBalance,
      },
    });
  });
}
