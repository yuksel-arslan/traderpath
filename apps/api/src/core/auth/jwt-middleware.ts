// ===========================================
// Authentication Middleware
// Verifies JWT tokens using Fastify JWT
// ===========================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../database';
import { isAdminEmail } from '../../config/admin';
import { logger } from '../logger';

// Minimal select to avoid P2022 errors on missing columns
const AUTH_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  level: true,
};

/**
 * Safely fetch user for auth - handles P2022 (missing column) gracefully
 */
async function findUserForAuth(userId: string) {
  try {
    // Try with isAdmin column first
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { ...AUTH_USER_SELECT, isAdmin: true },
    });
  } catch (error: any) {
    const code = error?.code || '';
    if (code === 'P2022' || code === 'P2021') {
      // Column missing in DB - fall back to minimal select
      logger.warn('Auth: isAdmin column missing, using fallback');
      return await prisma.user.findUnique({
        where: { id: userId },
        select: AUTH_USER_SELECT,
      });
    }
    throw error;
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Use Fastify's built-in JWT verification
    const decoded = await request.jwtVerify<{ id: string }>();

    if (!decoded?.id) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'AUTH_002',
          message: 'Invalid token',
        },
      });
    }

    // Find user by ID (with P2022 fallback)
    const user = await findUserForAuth(decoded.id);

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'AUTH_003',
          message: 'User not found',
        },
      });
    }

    // Check if user is admin (from DB or hardcoded list)
    const isAdmin = (user as any).isAdmin || isAdminEmail(user.email);

    // Attach user to request
    request.user = {
      ...user,
      isAdmin,
    };
  } catch (error: any) {
    // Don't log expected JWT verification failures as errors
    if (error?.code !== 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
      logger.warn({ error: error?.message }, 'Auth middleware error');
    }
    return reply.status(401).send({
      success: false,
      error: {
        code: 'AUTH_001',
        message: 'Authentication required',
      },
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export async function optionalAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return;
    }

    // Use Fastify's built-in JWT verification
    const decoded = await request.jwtVerify<{ id: string }>();

    if (!decoded?.id) {
      return;
    }

    const user = await findUserForAuth(decoded.id);

    if (user) {
      const isAdmin = (user as any).isAdmin || isAdminEmail(user.email);
      request.user = {
        ...user,
        isAdmin,
      };
    }
  } catch {
    // Ignore errors for optional auth
  }
}
