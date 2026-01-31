// ===========================================
// Daily Pass Service
// Manages daily passes for Capital Flow and Asset Analysis
// ===========================================

import { prisma } from '../../core/database';
import { creditService } from '../credits/credit.service';
import { DailyPassType } from '@prisma/client';

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

// Free trial configuration
export const FREE_TRIAL_CONFIG = {
  durationHours: 24, // 1 day
  maxAnalyses: 10, // Max 10 analyses during free trial
};

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
  isFreeTrial?: boolean;
  freeTrialAnalysesRemaining?: number;
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
  isAdmin?: boolean;
  isFreeTrial?: boolean;
}

interface FreeTrialStatus {
  isActive: boolean;
  isEligible: boolean;
  startedAt?: Date;
  expiresAt?: Date;
  analysesUsed: number;
  analysesRemaining: number;
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
   * Check if user is admin
   */
  private async isUserAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    return user?.isAdmin || false;
  }

  /**
   * Get user's free trial status
   */
  async getFreeTrialStatus(userId: string): Promise<FreeTrialStatus> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        freeTrialUsed: true,
        freeTrialStartedAt: true,
        freeTrialAnalysesUsed: true,
      },
    });

    if (!user) {
      return {
        isActive: false,
        isEligible: false,
        analysesUsed: 0,
        analysesRemaining: 0,
      };
    }

    // If free trial hasn't been used yet, user is eligible
    if (!user.freeTrialUsed && !user.freeTrialStartedAt) {
      return {
        isActive: false,
        isEligible: true,
        analysesUsed: 0,
        analysesRemaining: FREE_TRIAL_CONFIG.maxAnalyses,
      };
    }

    // If free trial was started, check if it's still active
    if (user.freeTrialStartedAt) {
      const expiresAt = new Date(user.freeTrialStartedAt.getTime() + FREE_TRIAL_CONFIG.durationHours * 60 * 60 * 1000);
      const now = new Date();
      const isActive = now < expiresAt && user.freeTrialAnalysesUsed < FREE_TRIAL_CONFIG.maxAnalyses;

      return {
        isActive,
        isEligible: false,
        startedAt: user.freeTrialStartedAt,
        expiresAt,
        analysesUsed: user.freeTrialAnalysesUsed,
        analysesRemaining: Math.max(0, FREE_TRIAL_CONFIG.maxAnalyses - user.freeTrialAnalysesUsed),
      };
    }

    return {
      isActive: false,
      isEligible: false,
      analysesUsed: user.freeTrialAnalysesUsed,
      analysesRemaining: 0,
    };
  }

  /**
   * Start free trial for user
   */
  async startFreeTrial(userId: string): Promise<{ success: boolean; expiresAt?: Date; error?: string }> {
    const trialStatus = await this.getFreeTrialStatus(userId);

    if (!trialStatus.isEligible) {
      return { success: false, error: 'FREE_TRIAL_ALREADY_USED' };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + FREE_TRIAL_CONFIG.durationHours * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: userId },
      data: {
        freeTrialStartedAt: now,
        freeTrialAnalysesUsed: 0,
      },
    });

    return { success: true, expiresAt };
  }

  /**
   * Use free trial analysis
   */
  async useFreeTrialAnalysis(userId: string): Promise<{ success: boolean; remainingAnalyses?: number; error?: string }> {
    const trialStatus = await this.getFreeTrialStatus(userId);

    if (!trialStatus.isActive) {
      return { success: false, error: 'FREE_TRIAL_NOT_ACTIVE' };
    }

    if (trialStatus.analysesRemaining <= 0) {
      return { success: false, error: 'FREE_TRIAL_LIMIT_REACHED' };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        freeTrialAnalysesUsed: { increment: 1 },
      },
      select: { freeTrialAnalysesUsed: true },
    });

    return {
      success: true,
      remainingAnalyses: FREE_TRIAL_CONFIG.maxAnalyses - user.freeTrialAnalysesUsed,
    };
  }

  /**
   * Mark free trial as used (expired)
   */
  async markFreeTrialUsed(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { freeTrialUsed: true },
    });
  }

  /**
   * Check if user has a valid daily pass
   * Admin users always have access
   * Free trial users have access during trial period
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

    // Check free trial status
    const trialStatus = await this.getFreeTrialStatus(userId);
    if (trialStatus.isActive) {
      // During free trial, all passes are available
      if (passType === 'ASSET_ANALYSIS') {
        return {
          hasPass: true,
          canUse: trialStatus.analysesRemaining > 0,
          isFreeTrial: true,
          freeTrialAnalysesRemaining: trialStatus.analysesRemaining,
          pass: {
            id: 'free_trial',
            usageCount: trialStatus.analysesUsed,
            maxUsage: FREE_TRIAL_CONFIG.maxAnalyses,
            remainingUsage: trialStatus.analysesRemaining,
            expiresAt: trialStatus.expiresAt!,
          },
          reason: trialStatus.analysesRemaining <= 0 ? 'FREE_TRIAL_LIMIT_REACHED' : undefined,
        };
      }
      // For Layer 3 and 4, unlimited access during free trial
      return {
        hasPass: true,
        canUse: true,
        isFreeTrial: true,
        pass: {
          id: 'free_trial',
          usageCount: 0,
          maxUsage: 999,
          remainingUsage: 999,
          expiresAt: trialStatus.expiresAt!,
        },
      };
    }

    // Check if user is eligible for free trial (hasn't used it yet)
    if (trialStatus.isEligible) {
      return {
        hasPass: false,
        canUse: false,
        reason: 'FREE_TRIAL_AVAILABLE',
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
   * Free trial users don't need to purchase
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

    // Check if on free trial
    const trialStatus = await this.getFreeTrialStatus(userId);
    if (trialStatus.isActive) {
      return {
        success: true,
        isFreeTrial: true,
        pass: {
          id: 'free_trial',
          passType,
          passDate: this.getTodayDate(),
          usageCount: trialStatus.analysesUsed,
          maxUsage: passType === 'ASSET_ANALYSIS' ? FREE_TRIAL_CONFIG.maxAnalyses : 999,
          expiresAt: trialStatus.expiresAt!,
        },
      };
    }

    // Check if eligible for free trial
    if (trialStatus.isEligible) {
      // Start free trial automatically
      const startResult = await this.startFreeTrial(userId);
      if (startResult.success) {
        return {
          success: true,
          isFreeTrial: true,
          pass: {
            id: 'free_trial',
            passType,
            passDate: this.getTodayDate(),
            usageCount: 0,
            maxUsage: passType === 'ASSET_ANALYSIS' ? FREE_TRIAL_CONFIG.maxAnalyses : 999,
            expiresAt: startResult.expiresAt!,
          },
        };
      }
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
    // Check if admin - admins don't use passes
    const isAdmin = await this.isUserAdmin(userId);
    if (isAdmin) {
      return { success: true, usageCount: 0, remainingUsage: 999 };
    }

    // Check if on free trial
    const trialStatus = await this.getFreeTrialStatus(userId);
    if (trialStatus.isActive && passType === 'ASSET_ANALYSIS') {
      const result = await this.useFreeTrialAnalysis(userId);
      if (result.success) {
        return { success: true, usageCount: FREE_TRIAL_CONFIG.maxAnalyses - (result.remainingAnalyses || 0), remainingUsage: result.remainingAnalyses };
      }
      return { success: false, error: result.error };
    }

    // For L3/L4 during free trial, no usage tracking needed
    if (trialStatus.isActive) {
      return { success: true };
    }

    // Regular pass usage
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

    // For Capital Flow L3/L4, no usage limit
    return { success: true };
  }

  /**
   * Get user's active passes
   */
  async getActivePasses(userId: string): Promise<{
    capitalFlowL3: PassCheckResult;
    capitalFlowL4: PassCheckResult;
    assetAnalysis: PassCheckResult;
    isAdmin: boolean;
    freeTrial: FreeTrialStatus;
  }> {
    const [capitalFlowL3, capitalFlowL4, assetAnalysis, isAdmin, freeTrial] = await Promise.all([
      this.checkPass(userId, 'CAPITAL_FLOW_L3'),
      this.checkPass(userId, 'CAPITAL_FLOW_L4'),
      this.checkPass(userId, 'ASSET_ANALYSIS'),
      this.isUserAdmin(userId),
      this.getFreeTrialStatus(userId),
    ]);

    return { capitalFlowL3, capitalFlowL4, assetAnalysis, isAdmin, freeTrial };
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
