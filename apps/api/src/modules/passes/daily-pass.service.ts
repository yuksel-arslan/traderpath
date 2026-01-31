// ===========================================
// Daily Pass Service
// Manages daily passes for Capital Flow and Asset Analysis
// ===========================================

import { prisma } from '../../core/database';
import { creditService } from '../credits/credit.service';
import { DailyPassType } from '@prisma/client';

// Pass pricing configuration
export const DAILY_PASS_CONFIG = {
  CAPITAL_FLOW_L4: {
    cost: 25,
    maxUsage: 1, // Unlimited access for the day (no per-usage limit)
    description: 'Capital Flow Layer 4 - AI Recommendations',
  },
  ASSET_ANALYSIS: {
    cost: 100,
    maxUsage: 10, // Max 10 analyses per day
    description: 'Asset Analysis - 7-Step/MLIS Pro',
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
  };
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
   * Check if user has a valid daily pass
   */
  async checkPass(userId: string, passType: DailyPassType): Promise<PassCheckResult> {
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
   */
  async purchasePass(userId: string, passType: DailyPassType): Promise<PassPurchaseResult> {
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
          message: `You need ${config.cost} credits to purchase a daily pass`,
          required: config.cost,
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
   */
  async usePass(userId: string, passType: DailyPassType): Promise<{ success: boolean; usageCount?: number; remainingUsage?: number; error?: string }> {
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
      return { success: false, error: 'NO_PASS' };
    }

    if (new Date() > pass.expiresAt) {
      return { success: false, error: 'PASS_EXPIRED' };
    }

    // For Asset Analysis, check and increment usage
    if (passType === 'ASSET_ANALYSIS') {
      if (pass.usageCount >= pass.maxUsage) {
        return { success: false, error: 'USAGE_LIMIT_REACHED' };
      }

      const updatedPass = await prisma.dailyPass.update({
        where: { id: pass.id },
        data: { usageCount: { increment: 1 } },
      });

      return {
        success: true,
        usageCount: updatedPass.usageCount,
        remainingUsage: updatedPass.maxUsage - updatedPass.usageCount,
      };
    }

    // For Capital Flow L4, no usage limit
    return { success: true };
  }

  /**
   * Get user's active passes
   */
  async getActivePasses(userId: string): Promise<{
    capitalFlowL4: PassCheckResult;
    assetAnalysis: PassCheckResult;
  }> {
    const [capitalFlowL4, assetAnalysis] = await Promise.all([
      this.checkPass(userId, 'CAPITAL_FLOW_L4'),
      this.checkPass(userId, 'ASSET_ANALYSIS'),
    ]);

    return { capitalFlowL4, assetAnalysis };
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
