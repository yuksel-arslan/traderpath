// ===========================================
// Security Routes
// Email verification, password reset, 2FA
// ===========================================

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '../../core/database';
import { config } from '../../core/config';
import { authenticate } from '../../core/auth/middleware';
import { emailService } from '../email/email.service';
import {
  createEmailVerificationToken,
  verifyEmail,
  createPasswordResetToken,
  validatePasswordResetToken,
  resetPassword,
  setup2FA,
  enable2FA,
  verify2FACode,
  disable2FA,
  getUserSecurityLogs,
  verifyRecaptcha,
  logSecurityEvent,
} from '../../core/auth/security.service';

// Password validation schema
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

const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export default async function securityRoutes(app: FastifyInstance) {
  // ===========================================
  // Email Verification
  // ===========================================

  /**
   * POST /api/auth/send-verification
   * Send email verification link
   */
  app.post('/send-verification', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, emailVerified: true },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
      }

      if (user.emailVerified) {
        return reply.status(400).send({
          success: false,
          error: { code: 'ALREADY_VERIFIED', message: 'Email already verified' },
        });
      }

      const result = await createEmailVerificationToken(userId);

      if (!result.success || !result.token) {
        return reply.status(500).send({
          success: false,
          error: { code: 'TOKEN_ERROR', message: 'Failed to create verification token' },
        });
      }

      const verificationUrl = `${BASE_URL}/verify-email?token=${result.token}`;

      await emailService.sendEmailVerification(
        user.email,
        user.name || 'User',
        verificationUrl
      );

      await logSecurityEvent({
        userId,
        email: user.email,
        eventType: 'EMAIL_VERIFICATION_SENT',
        success: true,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.send({
        success: true,
        message: 'Verification email sent',
      });
    } catch (error) {
      console.error('Send verification error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to send verification email' },
      });
    }
  });

  /**
   * POST /api/auth/verify-email
   * Verify email with token
   */
  app.post('/verify-email', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token } = z.object({ token: z.string() }).parse(request.body);

      const result = await verifyEmail(token);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_TOKEN', message: result.error || 'Invalid or expired token' },
        });
      }

      return reply.send({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Token is required' },
        });
      }
      console.error('Verify email error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Verification failed' },
      });
    }
  });

  // ===========================================
  // Password Reset
  // ===========================================

  /**
   * POST /api/auth/forgot-password
   * Request password reset
   */
  app.post('/forgot-password', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, recaptchaToken } = z.object({
        email: z.string().email(),
        recaptchaToken: z.string().optional(),
      }).parse(request.body);

      // Verify reCAPTCHA if provided
      if (recaptchaToken) {
        const captchaResult = await verifyRecaptcha(recaptchaToken, 'forgot_password');
        if (!captchaResult.success) {
          return reply.status(400).send({
            success: false,
            error: { code: 'CAPTCHA_FAILED', message: 'reCAPTCHA verification failed' },
          });
        }
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, name: true, googleId: true, passwordHash: true },
      });

      // Always return success (don't reveal if email exists)
      if (!user) {
        return reply.send({
          success: true,
          message: 'If an account exists, a password reset link has been sent',
        });
      }

      // Check if user has password (not OAuth-only)
      if (!user.passwordHash && user.googleId) {
        return reply.send({
          success: true,
          message: 'If an account exists, a password reset link has been sent',
        });
      }

      const result = await createPasswordResetToken(email.toLowerCase());

      if (result.success && result.token) {
        const resetUrl = `${BASE_URL}/reset-password?token=${result.token}`;

        await emailService.sendPasswordReset(
          email.toLowerCase(),
          user.name || 'User',
          resetUrl
        );

        await logSecurityEvent({
          userId: user.id,
          email: email.toLowerCase(),
          eventType: 'PASSWORD_RESET_REQUEST',
          success: true,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        });
      }

      return reply.send({
        success: true,
        message: 'If an account exists, a password reset link has been sent',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Valid email is required' },
        });
      }
      console.error('Forgot password error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to process request' },
      });
    }
  });

  /**
   * POST /api/auth/reset-password
   * Reset password with token
   */
  app.post('/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token, password } = z.object({
        token: z.string(),
        password: passwordSchema,
      }).parse(request.body);

      // Hash new password
      const passwordHash = await bcrypt.hash(password, 12);

      const result = await resetPassword(token, passwordHash, request.ip);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'RESET_FAILED', message: result.error || 'Password reset failed' },
        });
      }

      return reply.send({
        success: true,
        message: 'Password reset successfully. Please login with your new password.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: error.errors[0]?.message || 'Invalid input' },
        });
      }
      console.error('Reset password error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Password reset failed' },
      });
    }
  });

  /**
   * GET /api/auth/validate-reset-token
   * Validate password reset token (before showing reset form)
   */
  app.get('/validate-reset-token', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token } = z.object({ token: z.string() }).parse(request.query);

      const result = await validatePasswordResetToken(token);

      return reply.send({
        success: true,
        valid: result.valid,
      });
    } catch (error) {
      return reply.status(400).send({
        success: false,
        valid: false,
      });
    }
  });

  // ===========================================
  // Two-Factor Authentication (2FA)
  // ===========================================

  /**
   * POST /api/auth/2fa/setup
   * Initialize 2FA setup (get QR code)
   */
  app.post('/2fa/setup', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;

      const result = await setup2FA(userId);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: { code: '2FA_SETUP_ERROR', message: result.error || 'Failed to setup 2FA' },
        });
      }

      return reply.send({
        success: true,
        data: {
          secret: result.secret,
          qrCodeUrl: result.qrCodeUrl,
          backupCodes: result.backupCodes,
        },
      });
    } catch (error) {
      console.error('2FA setup error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to setup 2FA' },
      });
    }
  });

  /**
   * POST /api/auth/2fa/enable
   * Enable 2FA after verifying code
   */
  app.post('/2fa/enable', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const { code } = z.object({ code: z.string().length(6) }).parse(request.body);

      const result = await enable2FA(userId, code, request.ip);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: { code: '2FA_VERIFY_ERROR', message: result.error || 'Invalid code' },
        });
      }

      // Send confirmation email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (user) {
        await emailService.sendTwoFactorEnabled(user.email, user.name || 'User');
      }

      return reply.send({
        success: true,
        message: '2FA enabled successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Valid 6-digit code is required' },
        });
      }
      console.error('2FA enable error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to enable 2FA' },
      });
    }
  });

  /**
   * POST /api/auth/2fa/verify
   * Verify 2FA code during login
   */
  app.post('/2fa/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { userId, code } = z.object({
        userId: z.string().uuid(),
        code: z.string().min(6).max(10),
      }).parse(request.body);

      const result = await verify2FACode(userId, code);

      if (!result.success) {
        await logSecurityEvent({
          userId,
          email: '', // We'll get this from the user later
          eventType: 'TWO_FACTOR_FAILED',
          success: false,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
          failureReason: result.error,
        });

        return reply.status(400).send({
          success: false,
          error: { code: '2FA_VERIFY_ERROR', message: result.error || 'Invalid code' },
        });
      }

      // Generate token for the user
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, level: true, isAdmin: true },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
      }

      await logSecurityEvent({
        userId,
        email: user.email,
        eventType: 'TWO_FACTOR_SUCCESS',
        success: true,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      // Generate JWT
      const token = app.jwt.sign(
        { id: user.id },
        { expiresIn: config.jwtExpiresIn }
      );

      // Update last login
      await prisma.user.update({
        where: { id: userId },
        data: {
          lastLoginAt: new Date(),
          lastLoginIp: request.ip,
          lastLoginDevice: request.headers['user-agent'],
        },
      });

      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            level: user.level,
            isAdmin: user.isAdmin,
          },
          token,
          usedBackupCode: result.usedBackupCode,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Valid code is required' },
        });
      }
      console.error('2FA verify error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Verification failed' },
      });
    }
  });

  /**
   * POST /api/auth/2fa/disable
   * Disable 2FA (requires password)
   */
  app.post('/2fa/disable', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const { password } = z.object({ password: z.string() }).parse(request.body);

      const verifyPassword = async (hash: string, pwd: string) => {
        return bcrypt.compare(pwd, hash);
      };

      const result = await disable2FA(userId, password, verifyPassword, request.ip);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: { code: '2FA_DISABLE_ERROR', message: result.error || 'Failed to disable 2FA' },
        });
      }

      return reply.send({
        success: true,
        message: '2FA disabled successfully',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Password is required' },
        });
      }
      console.error('2FA disable error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to disable 2FA' },
      });
    }
  });

  /**
   * GET /api/auth/2fa/status
   * Get 2FA status
   */
  app.get('/2fa/status', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          twoFactorEnabled: true,
          twoFactorBackupCodes: true,
        },
      });

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
      }

      return reply.send({
        success: true,
        data: {
          enabled: user.twoFactorEnabled,
          backupCodesRemaining: user.twoFactorBackupCodes.length,
        },
      });
    } catch (error) {
      console.error('2FA status error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to get 2FA status' },
      });
    }
  });

  // ===========================================
  // Security Logs
  // ===========================================

  /**
   * GET /api/auth/security-logs
   * Get user's security activity logs
   */
  app.get('/security-logs', {
    preHandler: authenticate,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user!.id;
      const { limit } = z.object({ limit: z.number().optional().default(20) }).parse(request.query);

      const logs = await getUserSecurityLogs(userId, limit);

      return reply.send({
        success: true,
        data: logs,
      });
    } catch (error) {
      console.error('Security logs error:', error);
      return reply.status(500).send({
        success: false,
        error: { code: 'SERVER_ERROR', message: 'Failed to get security logs' },
      });
    }
  });
}
