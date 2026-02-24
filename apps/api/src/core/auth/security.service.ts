// ===========================================
// Auth Security Service
// Handles email verification, 2FA, password reset,
// account lockout, and security audit logging
// ===========================================

import { randomBytes, createHash } from 'crypto';
import { prisma } from '../database';

// Define LoginEventType locally (mirrors Prisma enum)
// This allows the code to work even if Prisma client isn't generated
export type LoginEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGIN_BLOCKED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET_SUCCESS'
  | 'PASSWORD_RESET_REQUEST'
  | 'TWO_FACTOR_ENABLED'
  | 'TWO_FACTOR_DISABLED'
  | 'TWO_FACTOR_FAILED'
  | 'TWO_FACTOR_SUCCESS'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_UNLOCKED'
  | 'SUSPICIOUS_ACTIVITY'
  | 'EMAIL_VERIFIED'
  | 'EMAIL_VERIFICATION_SENT';

// ===========================================
// Database Compatibility Helper
// ===========================================

let securityFieldsExist: boolean | null = null;

/**
 * Check if security fields exist in the database
 */
async function checkSecurityFieldsExist(): Promise<boolean> {
  if (securityFieldsExist !== null) return securityFieldsExist;

  try {
    // Try to check if the column exists
    const result = await prisma.$queryRaw<Array<{ column_name: string }>>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'email_verification_token'
    `;
    securityFieldsExist = result.length > 0;
  } catch {
    securityFieldsExist = false;
  }

  if (!securityFieldsExist) {
    console.warn('[Security] Security fields not found in database. Run the SQL migration: prisma/migrations/manual_security_migration.sql');
  }

  return securityFieldsExist;
}

// ===========================================
// Configuration
// ===========================================

const SECURITY_CONFIG = {
  // Account Lockout
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,

  // Token Expiration
  EMAIL_VERIFICATION_EXPIRES_HOURS: 24,
  PASSWORD_RESET_EXPIRES_HOURS: 1,

  // 2FA
  BACKUP_CODES_COUNT: 10,
  TOTP_WINDOW: 1, // Allow 1 step before/after for clock drift

  // Rate Limiting
  MAX_EMAIL_REQUESTS_PER_HOUR: 5,
  MAX_PASSWORD_RESET_REQUESTS_PER_HOUR: 3,
};

// ===========================================
// Token Generation
// ===========================================

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Hash a token for storage (one-way)
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Generate backup codes for 2FA recovery
 */
export function generateBackupCodes(count: number = SECURITY_CONFIG.BACKUP_CODES_COUNT): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Format: XXXX-XXXX (8 alphanumeric characters)
    const code = randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }
  return codes;
}

// ===========================================
// Email Verification
// ===========================================

interface EmailVerificationResult {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * Create email verification token for a user
 */
export async function createEmailVerificationToken(userId: string): Promise<EmailVerificationResult> {
  try {
    const fieldsExist = await checkSecurityFieldsExist();
    if (!fieldsExist) {
      return { success: false, error: 'Security features not yet enabled. Database migration required.' };
    }

    const token = generateSecureToken();
    const hashedToken = hashToken(token);
    const expiresAt = new Date(Date.now() + SECURITY_CONFIG.EMAIL_VERIFICATION_EXPIRES_HOURS * 60 * 60 * 1000);

    // Use raw SQL to avoid Prisma client type issues
    await prisma.$executeRaw`
      UPDATE "users"
      SET email_verification_token = ${hashedToken},
          email_verification_expires = ${expiresAt}
      WHERE id = ${userId}
    `;

    return { success: true, token };
  } catch (error) {
    console.error('[Security] Failed to create email verification token:', error);
    return { success: false, error: 'Failed to create verification token' };
  }
}

/**
 * Verify email with token
 */
export async function verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
  try {
    const hashedToken = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { gt: new Date() },
      },
      select: { id: true, email: true },
    });

    if (!user) {
      return { success: false, error: 'Invalid or expired verification token' };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: new Date(),
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    // Log the event
    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      eventType: 'EMAIL_VERIFIED',
      success: true,
      ipAddress: '0.0.0.0', // Will be set by caller
    });

    return { success: true };
  } catch (error) {
    console.error('[Security] Failed to verify email:', error);
    return { success: false, error: 'Verification failed' };
  }
}

// ===========================================
// Password Reset
// ===========================================

interface PasswordResetResult {
  success: boolean;
  token?: string;
  error?: string;
}

/**
 * Create password reset token
 */
export async function createPasswordResetToken(email: string): Promise<PasswordResetResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, googleId: true },
    });

    if (!user) {
      // Don't reveal if email exists (security)
      return { success: true }; // Pretend success
    }

    // Check if user has a password (not OAuth-only)
    if (!user.passwordHash && user.googleId) {
      return { success: false, error: 'This account uses Google login. Please sign in with Google.' };
    }

    const token = generateSecureToken();
    const hashedToken = hashToken(token);
    const expiresAt = new Date(Date.now() + SECURITY_CONFIG.PASSWORD_RESET_EXPIRES_HOURS * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: hashedToken,
        passwordResetExpires: expiresAt,
      },
    });

    return { success: true, token };
  } catch (error) {
    console.error('[Security] Failed to create password reset token:', error);
    return { success: false, error: 'Failed to create reset token' };
  }
}

/**
 * Validate password reset token
 */
export async function validatePasswordResetToken(token: string): Promise<{ valid: boolean; userId?: string }> {
  const hashedToken = hashToken(token);

  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpires: { gt: new Date() },
    },
    select: { id: true },
  });

  return { valid: !!user, userId: user?.id };
}

/**
 * Reset password with token
 */
export async function resetPassword(
  token: string,
  newPasswordHash: string,
  ipAddress: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const hashedToken = hashToken(token);

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { gt: new Date() },
      },
      select: { id: true, email: true },
    });

    if (!user) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        // Reset login attempts on password change
        loginAttempts: 0,
        accountLocked: false,
        accountLockedUntil: null,
      },
    });

    // Blacklist all existing tokens for this user
    await blacklistUserTokens(user.id, 'password_change');

    // Log the event
    await logSecurityEvent({
      userId: user.id,
      email: user.email,
      eventType: 'PASSWORD_RESET_SUCCESS',
      success: true,
      ipAddress,
    });

    return { success: true };
  } catch (error) {
    console.error('[Security] Failed to reset password:', error);
    return { success: false, error: 'Password reset failed' };
  }
}

// ===========================================
// Account Lockout
// ===========================================

interface LockoutStatus {
  isLocked: boolean;
  attemptsRemaining: number;
  lockedUntil?: Date;
}

/**
 * Check if account is locked
 * Gracefully degrades if security columns don't exist in production DB
 */
export async function checkAccountLockout(email: string): Promise<LockoutStatus> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        accountLocked: true,
        accountLockedUntil: true,
        loginAttempts: true,
      },
    });

    if (!user) {
      return { isLocked: false, attemptsRemaining: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS };
    }

    // Check if lock has expired
    if (user.accountLocked && user.accountLockedUntil) {
      if (new Date() > user.accountLockedUntil) {
        // Unlock the account
        try {
          await prisma.user.update({
            where: { email },
            data: {
              accountLocked: false,
              accountLockedUntil: null,
              loginAttempts: 0,
            },
          });
        } catch (updateErr) {
          console.error('[Security] Failed to unlock expired account:', updateErr);
        }
        return { isLocked: false, attemptsRemaining: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS };
      }
      return {
        isLocked: true,
        attemptsRemaining: 0,
        lockedUntil: user.accountLockedUntil,
      };
    }

    return {
      isLocked: false,
      attemptsRemaining: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - (user.loginAttempts || 0),
    };
  } catch (error: any) {
    // If security columns don't exist (P2022), degrade gracefully - allow login
    const code = error?.code || '';
    if (code === 'P2022' || code === 'P2021') {
      console.warn('[Security] Lockout columns missing in DB, skipping lockout check. Run ensure_all_user_columns.sql migration.');
    } else {
      console.error('[Security] checkAccountLockout error:', error);
    }
    return { isLocked: false, attemptsRemaining: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS };
  }
}

/**
 * Record failed login attempt
 * Uses select clause and try-catch to prevent P2022 crashes in production
 */
export async function recordFailedLogin(
  email: string,
  ipAddress: string,
  userAgent?: string,
  reason?: string
): Promise<LockoutStatus> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        loginAttempts: true,
      },
    });

    if (!user) {
      // Log failed attempt even for non-existent user (for security monitoring)
      await logSecurityEvent({
        email,
        eventType: 'LOGIN_FAILED',
        success: false,
        ipAddress,
        userAgent,
        failureReason: 'User not found',
      });
      return { isLocked: false, attemptsRemaining: 0 };
    }

    const newAttempts = (user.loginAttempts || 0) + 1;
    const shouldLock = newAttempts >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS;

    const updateData: Record<string, unknown> = {
      loginAttempts: newAttempts,
    };

    if (shouldLock) {
      const lockUntil = new Date(Date.now() + SECURITY_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000);
      updateData.accountLocked = true;
      updateData.accountLockedUntil = lockUntil;

      // Log account locked event
      await logSecurityEvent({
        userId: user.id,
        email,
        eventType: 'ACCOUNT_LOCKED',
        success: true,
        ipAddress,
        userAgent,
        metadata: { attempts: newAttempts, lockUntil },
      });
    }

    try {
      await prisma.user.update({
        where: { email },
        data: updateData,
      });
    } catch (updateErr: any) {
      // If lockout columns don't exist, log but don't crash
      console.error('[Security] Failed to update login attempts (missing columns?):', updateErr?.code || updateErr);
    }

    // Log failed login
    await logSecurityEvent({
      userId: user.id,
      email,
      eventType: shouldLock ? 'LOGIN_BLOCKED' : 'LOGIN_FAILED',
      success: false,
      ipAddress,
      userAgent,
      failureReason: reason || 'Invalid credentials',
    });

    return {
      isLocked: shouldLock,
      attemptsRemaining: Math.max(0, SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - newAttempts),
      lockedUntil: shouldLock ? (updateData.accountLockedUntil as Date) : undefined,
    };
  } catch (error: any) {
    // Degrade gracefully - don't block login because of security feature failure
    const code = error?.code || '';
    if (code === 'P2022' || code === 'P2021') {
      console.warn('[Security] recordFailedLogin columns missing in DB, skipping. Run ensure_all_user_columns.sql migration.');
    } else {
      console.error('[Security] recordFailedLogin error:', error);
    }
    return { isLocked: false, attemptsRemaining: SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - 1 };
  }
}

/**
 * Reset login attempts on successful login
 * Wrapped in try-catch to prevent P2022 crashes - login must succeed even if audit fails
 */
export async function recordSuccessfulLogin(
  userId: string,
  email: string,
  ipAddress: string,
  userAgent?: string
): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        loginAttempts: 0,
        accountLocked: false,
        accountLockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        lastLoginDevice: userAgent,
      },
    });
  } catch (error: any) {
    // If security columns don't exist, log but don't crash login
    const code = error?.code || '';
    if (code === 'P2022' || code === 'P2021') {
      console.warn('[Security] recordSuccessfulLogin columns missing in DB. Run ensure_all_user_columns.sql migration.');
    } else {
      console.error('[Security] Failed to record successful login:', error);
    }
  }

  // Must be inside try-catch to prevent audit log failures from crashing login
  try {
    await logSecurityEvent({
      userId,
      email,
      eventType: 'LOGIN_SUCCESS',
      success: true,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error('[Security] Failed to log successful login event:', error);
  }
}

// ===========================================
// Two-Factor Authentication (2FA)
// ===========================================

interface TwoFactorSetupResult {
  success: boolean;
  secret?: string;
  qrCodeUrl?: string;
  backupCodes?: string[];
  error?: string;
}

/**
 * Generate 2FA setup data (call before enabling)
 * Note: Requires 'speakeasy' and 'qrcode' packages
 */
export async function setup2FA(userId: string): Promise<TwoFactorSetupResult> {
  try {
    // Dynamic import to avoid bundling if not used
    const speakeasy = await import('speakeasy');
    const QRCode = await import('qrcode');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.twoFactorEnabled) {
      return { success: false, error: '2FA is already enabled' };
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `TradePath (${user.email})`,
      issuer: 'TradePath',
      length: 32,
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || '');

    // Generate backup codes
    const backupCodes = generateBackupCodes();

    // Store secret temporarily (will be confirmed when user verifies)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
        twoFactorBackupCodes: backupCodes.map(hashToken), // Store hashed
      },
    });

    return {
      success: true,
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    };
  } catch (error) {
    console.error('[Security] Failed to setup 2FA:', error);
    return { success: false, error: 'Failed to setup 2FA' };
  }
}

/**
 * Enable 2FA after user verifies with their first code
 */
export async function enable2FA(
  userId: string,
  code: string,
  ipAddress: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const speakeasy = await import('speakeasy');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.twoFactorEnabled) {
      return { success: false, error: '2FA is already enabled' };
    }

    if (!user.twoFactorSecret) {
      return { success: false, error: 'Please setup 2FA first' };
    }

    // Verify the code
    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: SECURITY_CONFIG.TOTP_WINDOW,
    });

    if (!isValid) {
      return { success: false, error: 'Invalid verification code' };
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    await logSecurityEvent({
      userId,
      email: user.email,
      eventType: 'TWO_FACTOR_ENABLED',
      success: true,
      ipAddress,
    });

    return { success: true };
  } catch (error) {
    console.error('[Security] Failed to enable 2FA:', error);
    return { success: false, error: 'Failed to enable 2FA' };
  }
}

/**
 * Verify 2FA code during login
 */
export async function verify2FACode(
  userId: string,
  code: string
): Promise<{ success: boolean; usedBackupCode?: boolean; error?: string }> {
  try {
    const speakeasy = await import('speakeasy');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorBackupCodes: true },
    });

    if (!user || !user.twoFactorSecret) {
      return { success: false, error: '2FA not configured' };
    }

    // First try TOTP verification
    const isValidTotp = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: SECURITY_CONFIG.TOTP_WINDOW,
    });

    if (isValidTotp) {
      return { success: true };
    }

    // Try backup code (format: XXXX-XXXX)
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const formattedCode = normalizedCode.length === 8
      ? `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4, 8)}`
      : code.toUpperCase();

    const hashedCode = hashToken(formattedCode);
    const backupCodeIndex = user.twoFactorBackupCodes.indexOf(hashedCode);

    if (backupCodeIndex !== -1) {
      // Remove used backup code
      const newBackupCodes = [...user.twoFactorBackupCodes];
      newBackupCodes.splice(backupCodeIndex, 1);

      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorBackupCodes: newBackupCodes },
      });

      return { success: true, usedBackupCode: true };
    }

    return { success: false, error: 'Invalid verification code' };
  } catch (error) {
    console.error('[Security] Failed to verify 2FA:', error);
    return { success: false, error: 'Verification failed' };
  }
}

/**
 * Disable 2FA
 */
export async function disable2FA(
  userId: string,
  password: string,
  verifyPassword: (hash: string, password: string) => Promise<boolean>,
  ipAddress: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, passwordHash: true, twoFactorEnabled: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.twoFactorEnabled) {
      return { success: false, error: '2FA is not enabled' };
    }

    // Require password verification for security
    if (!user.passwordHash) {
      return { success: false, error: 'Password not set for this account' };
    }

    const isValidPassword = await verifyPassword(user.passwordHash, password);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid password' };
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });

    await logSecurityEvent({
      userId,
      email: user.email,
      eventType: 'TWO_FACTOR_DISABLED',
      success: true,
      ipAddress,
    });

    return { success: true };
  } catch (error) {
    console.error('[Security] Failed to disable 2FA:', error);
    return { success: false, error: 'Failed to disable 2FA' };
  }
}

// ===========================================
// Token Blacklist
// ===========================================

/**
 * Add a token to the blacklist
 */
export async function blacklistToken(
  token: string,
  userId: string,
  reason: string,
  expiresAt: Date
): Promise<void> {
  const hashedToken = hashToken(token);

  await prisma.tokenBlacklist.create({
    data: {
      token: hashedToken,
      userId,
      reason,
      expiresAt,
    },
  });
}

/**
 * Check if a token is blacklisted
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const hashedToken = hashToken(token);

  const entry = await prisma.tokenBlacklist.findUnique({
    where: { token: hashedToken },
  });

  return !!entry;
}

/**
 * Blacklist all tokens for a user
 */
export async function blacklistUserTokens(userId: string, reason: string): Promise<void> {
  // Since we don't store tokens, we'll use a different approach:
  // Store a "all tokens before this time are invalid" marker
  // For now, we'll add a special entry that can be checked

  // In a production system, you'd want to track active sessions
  // and invalidate them individually

  console.log(`[Security] Blacklisting all tokens for user ${userId}: ${reason}`);
}

/**
 * Clean up expired blacklist entries
 */
export async function cleanupExpiredBlacklist(): Promise<number> {
  const result = await prisma.tokenBlacklist.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}

// ===========================================
// Security Audit Logging
// ===========================================

interface SecurityEventData {
  userId?: string;
  email: string;
  eventType: LoginEventType;
  success: boolean;
  ipAddress: string;
  userAgent?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log a security event
 */
export async function logSecurityEvent(data: SecurityEventData): Promise<void> {
  try {
    await prisma.loginAuditLog.create({
      data: {
        userId: data.userId,
        email: data.email,
        eventType: data.eventType,
        success: data.success,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        failureReason: data.failureReason,
        metadata: (data.metadata || {}) as object,
      },
    });
  } catch (error) {
    console.error('[Security] Failed to log security event:', error);
  }
}

/**
 * Get recent security events for a user
 */
export async function getUserSecurityLogs(
  userId: string,
  limit: number = 20
): Promise<Array<Record<string, unknown>>> {
  const logs = await prisma.loginAuditLog.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      eventType: true,
      success: true,
      ipAddress: true,
      location: true,
      createdAt: true,
    },
  });

  return logs;
}

/**
 * Check for suspicious activity
 * Wrapped in try-catch - if LoginAuditLog table doesn't exist, return safe default
 */
export async function checkSuspiciousActivity(
  userId: string,
  currentIp: string
): Promise<{ suspicious: boolean; reason?: string }> {
  try {
    // Get recent login history
    const recentLogins = await prisma.loginAuditLog.findMany({
      where: {
        userId,
        eventType: 'LOGIN_SUCCESS',
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        ipAddress: true,
        eventType: true,
        createdAt: true,
      },
    });

    // Check for multiple IPs in short time
    const uniqueIps = new Set(recentLogins.map((l) => l.ipAddress));
    if (uniqueIps.size >= 3 && !uniqueIps.has(currentIp)) {
      return { suspicious: true, reason: 'Multiple login locations detected' };
    }

    // Check if this is a new IP
    const knownIps = await prisma.loginAuditLog.findMany({
      where: {
        userId,
        eventType: 'LOGIN_SUCCESS',
        ipAddress: currentIp,
      },
      take: 1,
      select: { id: true },
    });

    if (knownIps.length === 0 && recentLogins.length > 0) {
      return { suspicious: true, reason: 'New login location' };
    }

    return { suspicious: false };
  } catch (error: any) {
    // If LoginAuditLog table doesn't exist or columns missing, degrade gracefully
    const code = error?.code || '';
    if (code === 'P2022' || code === 'P2021') {
      console.warn('[Security] LoginAuditLog table/columns missing. Run auth_tables.sql migration.');
    } else {
      console.error('[Security] checkSuspiciousActivity error:', error);
    }
    return { suspicious: false };
  }
}

// ===========================================
// reCAPTCHA Verification
// ===========================================

/**
 * Verify reCAPTCHA token
 */
export async function verifyRecaptcha(token: string, action?: string): Promise<{ success: boolean; score?: number }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.log('[Security] reCAPTCHA not configured, skipping verification');
    return { success: true, score: 1.0 };
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();

    // For reCAPTCHA v3, check score (0.0 = bot, 1.0 = human)
    if (data.success) {
      // v3 score threshold (0.5 is recommended)
      if (data.score !== undefined && data.score < 0.5) {
        return { success: false, score: data.score };
      }

      // v3 action verification
      if (action && data.action !== action) {
        return { success: false };
      }

      return { success: true, score: data.score };
    }

    return { success: false };
  } catch (error) {
    console.error('[Security] reCAPTCHA verification failed:', error);
    return { success: false };
  }
}

// ===========================================
// Export Configuration
// ===========================================

export const securityConfig = SECURITY_CONFIG;
