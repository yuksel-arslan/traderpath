// ===========================================
// Authentication Middleware
// Verifies JWT tokens using Fastify JWT
// ===========================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../database';

// Admin emails with free unlimited access
const ADMIN_EMAILS = ['contact@yukselarslan.com'];

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

    // Find user by ID
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        level: true,
        isAdmin: true,
      },
    });

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
    const isAdmin = user.isAdmin || ADMIN_EMAILS.includes(user.email);

    // Attach user to request
    request.user = {
      ...user,
      isAdmin,
    };
  } catch (error) {
    console.error('Auth error:', error);
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

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        level: true,
        isAdmin: true,
      },
    });

    if (user) {
      const isAdmin = user.isAdmin || ADMIN_EMAILS.includes(user.email);
      request.user = {
        ...user,
        isAdmin,
      };
    }
  } catch {
    // Ignore errors for optional auth
  }
}
