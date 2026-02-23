// ===========================================
// Daily Pass Service
// Manages daily passes for Capital Flow and Asset Analysis
// ===========================================

import { prisma } from '../../core/database';
import { creditService } from '../credits/credit.service';
import { DailyPassType } from '@prisma/client';
import { isAdminEmail } from '../../config/admin';

// Admin emails - now configurable via ADMIN_EMAILS env variable

// Pass pricing configuration
export const DAILY_PASS_CONFIG = {
  CAPITAL_FLOW_L3: {
    cost: 25,
    maxUsage: 1, // Unlimited access for the day (no per-usage limit)
    description: 'Layer 3 - Sector Activity',
  },
  CAPITAL_FLOW_L4: {
    cost: 25,
    maxUsage: 1, // Unlimited access for the day (no per-usage limit)
    description: 'Layer 4 - AI Recommendations',
  },
  ASSET_ANALYSIS: {
    cost: 100,
    maxUsage: 10, // Max 10 analyses per day
    description: 'Asset Analysis (7-Step/MLIS Pro)',
  },
} as const;

interface PassCheckResult {
  hasPass: boolean;
  pass?: {
    id: string;
    usageCount: number;
    maxUsage: number;
    remainingUsage: number;
    expiresAt: Date;
  };
  canUse: boolean;
  reason?: string;
  isAdmin?: boolean;
}

interface PassPurchaseResult {
  success: boolean;
  pass?: {
    id: string;
    passType: DailyPassType;
    passDate: Date;
    usageCount: number;
    maxUsage: number;
    expiresAt: Date;
  };
  error?: {
    code: string;
    message: string;
    required?: number;
    currentBalance?: number;
  };
  isAdmin?: boolean;
}

class DailyPassService {
  /**
   * Get today's date at midnight UTC
   */
  private getTodayDate(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  /**
   * Get end of day UTC
   */
  private getEndOfDay(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  }

  /**
   * Check if user is admin (by email, same as auth.routes.ts)
   */
  private async isUserAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user ? isAdminEmail(user.email) : false;
  }

  /**
   * Check if user has a valid daily pass
   * Admin users always have access
   */
  async checkPass(userId: string, passType: DailyPassType): Promise<PassCheckResult> {
    // Check if admin - admins always have access
    const isAdmin = await this.isUserAdmin(userId);
    if (isAdmin) {
      return {
        hasPass: true,
        canUse: true,
        isAdmin: true,
        pass: {
          id: 'admin',
          usageCount: 0,
          maxUsage: 999,
          remainingUsage: 999,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        },
      };
    }

    // Regular pass check
    const today = this.getTodayDate();

    const pass = await prisma.dailyPass.findUnique({
      where: {
        unique_daily_pass: {
          userId,
          passType,
          passDate: today,
        },
      },
    });

    if (!pass) {
      return {
        hasPass: false,
        canUse: false,
        reason: 'NO_PASS',
      };
    }

    // Check if pass is expired
    if (new Date() > pass.expiresAt) {
      return {
        hasPass: false,
        canUse: false,
        reason: 'PASS_EXPIRED',
      };
    }

    // For Asset Analysis, check usage limit
    if (passType === 'ASSET_ANALYSIS' && pass.usageCount >= pass.maxUsage) {
      return {
        hasPass: true,
        pass: {
          id: pass.id,
          usageCount: pass.usageCount,
          maxUsage: pass.maxUsage,
          remainingUsage: 0,
          expiresAt: pass.expiresAt,
        },
        canUse: false,
        reason: 'USAGE_LIMIT_REACHED',
      };
    }

    return {
      hasPass: true,
      pass: {
        id: pass.id,
        usageCount: pass.usageCount,
        maxUsage: pass.maxUsage,
        remainingUsage: pass.maxUsage - pass.usageCount,
        expiresAt: pass.expiresAt,
      },
      canUse: true,
    };
  }

  /**
   * Purchase a daily pass
   * Admin users don't need to purchase
   */
  async purchasePass(userId: string, passType: DailyPassType): Promise<PassPurchaseResult> {
    // Check if admin - admins don't need to purchase
    const isAdmin = await this.isUserAdmin(userId);
    if (isAdmin) {
      return {
        success: true,
        isAdmin: true,
        pass: {
          id: 'admin',
          passType,
          passDate: this.getTodayDate(),
          usageCount: 0,
          maxUsage: 999,
          expiresAt: this.getEndOfDay(),
        },
      };
    }

    // Regular purchase flow
    const config = DAILY_PASS_CONFIG[passType];
    const today = this.getTodayDate();
    const expiresAt = this.getEndOfDay();

    // Check if already has pass for today
    const existingPass = await prisma.dailyPass.findUnique({
      where: {
        unique_daily_pass: {
          userId,
          passType,
          passDate: today,
        },
      },
    });

    if (existingPass && new Date() < existingPass.expiresAt) {
      return {
        success: true,
        pass: {
          id: existingPass.id,
          passType: existingPass.passType,
          passDate: existingPass.passDate,
          usageCount: existingPass.usageCount,
          maxUsage: existingPass.maxUsage,
          expiresAt: existingPass.expiresAt,
        },
      };
    }

    // Charge credits
    const chargeResult = await creditService.charge(userId, config.cost, `daily_pass_${passType.toLowerCase()}`, {
      passType,
      date: today.toISOString(),
    });

    if (!chargeResult.success) {
      return {
        success: false,
        error: {
          code: 'INSUFFICIENT_CREDITS',
          message: `You need ${config.cost} credits to purchase a daily pass. Current balance: ${chargeResult.newBalance}`,
          required: config.cost,
          currentBalance: chargeResult.newBalance,
        },
      };
    }

    // Create or update the pass
    const pass = await prisma.dailyPass.upsert({
      where: {
        unique_daily_pass: {
          userId,
          passType,
          passDate: today,
        },
      },
      update: {
        expiresAt,
        usageCount: 0, // Reset usage if somehow re-purchasing
      },
      create: {
        userId,
        passType,
        passDate: today,
        creditsCost: config.cost,
        usageCount: 0,
        maxUsage: config.maxUsage,
        expiresAt,
      },
    });

    return {
      success: true,
      pass: {
        id: pass.id,
        passType: pass.passType,
        passDate: pass.passDate,
        usageCount: pass.usageCount,
        maxUsage: pass.maxUsage,
        expiresAt: pass.expiresAt,
      },
    };
  }

  /**
   * Use the pass (increment usage count for Asset Analysis)
   *
   * RACE CONDITION FIX: The previous read → check → increment pattern allowed
   * concurrent analyses to both pass the limit guard and push usageCount above
   * maxUsage. The fix uses a single atomic SQL statement that only increments
   * when the current count is still below the limit, checked at the DB level.
   */
  async usePass(userId: string, passType: DailyPassType): Promise<{ success: boolean; usageCount?: number; remainingUsage?: number; error?: string }> {
    // Check if admin - admins don't use passes
    const isAdmin = await this.isUserAdmin(userId);
    if (isAdmin) {
      return { success: true, usageCount: 0, remainingUsage: 999 };
    }

    // Regular pass usage
    const today = this.getTodayDate();

    // For Capital Flow L3/L4 there is no usage limit — just verify pass exists
    if (passType !== 'ASSET_ANALYSIS') {
      const pass = await prisma.dailyPass.findUnique({
        where: { unique_daily_pass: { userId, passType, passDate: today } },
      });
      if (!pass) return { success: false, error: 'NO_PASS' };
      if (new Date() > pass.expiresAt) return { success: false, error: 'PASS_EXPIRED' };
      return { success: true };
    }

    // ASSET_ANALYSIS: atomic check-and-increment.
    // Only succeeds when: pass exists, not expired, AND usageCount < maxUsage.
    // All three conditions are evaluated at the DB level in a single statement.
    const rows = await prisma.$queryRaw<Array<{ usage_count: number; max_usage: number; expired: boolean }>>`
      UPDATE daily_passes
      SET usage_count = usage_count + 1
      WHERE user_id    = ${userId}::uuid
        AND pass_type  = ${passType}::"DailyPassType"
        AND pass_date  = ${today}
        AND expires_at > NOW()
        AND usage_count < max_usage
      RETURNING usage_count, max_usage, (expires_at <= NOW()) AS expired
    `;

    if (rows.length === 0) {
      // Could be: no pass, expired, or usage limit reached.
      // Determine the specific reason for a meaningful error code.
      const pass = await prisma.dailyPass.findUnique({
        where: { unique_daily_pass: { userId, passType, passDate: today } },
      });
      if (!pass) return { success: false, error: 'NO_PASS' };
      if (new Date() > pass.expiresAt) return { success: false, error: 'PASS_EXPIRED' };
      return { success: false, error: 'USAGE_LIMIT_REACHED' };
    }

    const { usage_count, max_usage } = rows[0];
    return {
      success: true,
      usageCount: usage_count,
      remainingUsage: max_usage - usage_count,
    };
  }

  /**
   * Get user's active passes
   */
  async getActivePasses(userId: string): Promise<{
    capitalFlowL3: PassCheckResult;
    capitalFlowL4: PassCheckResult;
    assetAnalysis: PassCheckResult;
    isAdmin: boolean;
  }> {
    const [capitalFlowL3, capitalFlowL4, assetAnalysis, isAdmin] = await Promise.all([
      this.checkPass(userId, 'CAPITAL_FLOW_L3'),
      this.checkPass(userId, 'CAPITAL_FLOW_L4'),
      this.checkPass(userId, 'ASSET_ANALYSIS'),
      this.isUserAdmin(userId),
    ]);

    return { capitalFlowL3, capitalFlowL4, assetAnalysis, isAdmin };
  }

  /**
   * Get pass statistics for a user
   */
  async getPassStats(userId: string): Promise<{
    totalPurchases: number;
    totalCreditsSpent: number;
    totalAnalysesPerformed: number;
    lastPurchaseDate: Date | null;
  }> {
    const stats = await prisma.dailyPass.aggregate({
      where: { userId },
      _count: { id: true },
      _sum: { creditsCost: true, usageCount: true },
      _max: { createdAt: true },
    });

    return {
      totalPurchases: stats._count.id,
      totalCreditsSpent: stats._sum.creditsCost || 0,
      totalAnalysesPerformed: stats._sum.usageCount || 0,
      lastPurchaseDate: stats._max.createdAt,
    };
  }
}

export const dailyPassService = new DailyPassService();
