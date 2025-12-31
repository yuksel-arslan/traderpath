// ===========================================
// Authentication Middleware
// ===========================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../database';

// Extend FastifyRequest to include user
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      email: string;
      name: string;
      level: number;
      isAdmin?: boolean;
    };
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
    // Get token from header
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'No token provided',
        },
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const decoded = await request.jwtVerify<{ id: string }>();

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        level: true,
      },
    });

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'AUTH_002',
          message: 'User not found',
        },
      });
    }

    // Attach user to request
    request.user = user;
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'AUTH_003',
        message: 'Invalid or expired token',
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

    const decoded = await request.jwtVerify<{ id: string }>();

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        level: true,
      },
    });

    if (user) {
      request.user = user;
    }
  } catch {
    // Ignore errors for optional auth
  }
}
