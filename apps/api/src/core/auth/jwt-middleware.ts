// ===========================================
// Authentication Middleware
// Verifies JWT tokens
// ===========================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../database';
import * as jose from 'jose';

// Admin emails with free unlimited access
const ADMIN_EMAILS = ['contact@yukselarslan.com'];

// JWT secret - must match the secret used in Fastify JWT config
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-minimum-32-characters-long';

/**
 * Verify and decode JWT token
 */
async function verifyJwtToken(token: string): Promise<{ id: string; email?: string; name?: string; isAdmin?: boolean } | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });

    return {
      id: (payload.id as string) || (payload.sub as string),
      email: payload.email as string,
      name: payload.name as string,
      isAdmin: payload.isAdmin as boolean,
    };
  } catch (e) {
    console.error('Token verification error:', e);
    return null;
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

    // Verify and decode token
    const decoded = await verifyJwtToken(token);
    if (!decoded || (!decoded.id && !decoded.email)) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'AUTH_002',
          message: 'Invalid token',
        },
      });
    }

    // Find user by ID or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(decoded.id ? [{ id: decoded.id }] : []),
          ...(decoded.email ? [{ email: decoded.email }] : []),
        ],
      },
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
        code: 'AUTH_004',
        message: 'Authentication failed',
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

    const token = authHeader.substring(7);
    const decoded = await verifyJwtToken(token);

    if (!decoded || (!decoded.id && !decoded.email)) {
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(decoded.id ? [{ id: decoded.id }] : []),
          ...(decoded.email ? [{ email: decoded.email }] : []),
        ],
      },
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
