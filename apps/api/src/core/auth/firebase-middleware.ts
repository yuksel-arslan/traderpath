// ===========================================
// Firebase Authentication Middleware
// Verifies Firebase ID tokens
// ===========================================

import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../database';

// Admin emails with free unlimited access
const ADMIN_EMAILS = ['contact@yukselarslan.com'];

// User type is declared in src/index.ts

/**
 * Decode Firebase ID token (without verification for development)
 * In production, use firebase-admin to properly verify tokens
 */
function decodeFirebaseToken(token: string): { uid: string; email?: string; name?: string } | null {
  try {
    // Firebase ID tokens are JWTs with 3 parts
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode the payload (second part)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));

    return {
      uid: payload.user_id || payload.sub,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    return null;
  }
}

/**
 * Firebase Authentication middleware
 * Verifies Firebase ID token and attaches user to request
 */
export async function firebaseAuth(
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

    // Decode Firebase token
    const decoded = decodeFirebaseToken(token);
    if (!decoded || !decoded.uid) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'AUTH_002',
          message: 'Invalid token format',
        },
      });
    }

    // Try to find user by Firebase UID or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: decoded.uid },
          { email: decoded.email },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        level: true,
      },
    });

    // If user doesn't exist, create them (auto-registration)
    if (!user && decoded.email) {
      user = await prisma.user.create({
        data: {
          email: decoded.email,
          name: decoded.name || decoded.email.split('@')[0],
          googleId: decoded.uid,
          password: '', // No password for Firebase users
          level: 1,
        },
        select: {
          id: true,
          email: true,
          name: true,
          level: true,
        },
      });

      // Create initial credit balance
      try {
        await prisma.creditBalance.create({
          data: {
            userId: user.id,
            balance: 25, // Welcome credits
          },
        });
      } catch {
        // Credit balance might already exist
      }
    }

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'AUTH_003',
          message: 'User not found',
        },
      });
    }

    // Check if user is admin
    const isAdmin = ADMIN_EMAILS.includes(user.email);

    // Attach user to request
    request.user = { ...user, isAdmin, firebaseUid: decoded.uid };
  } catch (error) {
    console.error('Firebase auth error:', error);
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
 * Optional Firebase authentication middleware
 * Attaches user if token is valid, but doesn't require it
 */
export async function optionalFirebaseAuth(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return;
    }

    const token = authHeader.substring(7);
    const decoded = decodeFirebaseToken(token);

    if (!decoded || !decoded.uid) {
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: decoded.uid },
          { email: decoded.email },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        level: true,
      },
    });

    if (user) {
      const isAdmin = ADMIN_EMAILS.includes(user.email);
      request.user = { ...user, isAdmin, firebaseUid: decoded.uid };
    }
  } catch {
    // Ignore errors for optional auth
  }
}
