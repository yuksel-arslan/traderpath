// ===========================================
// Credit Service
// ===========================================

import { prisma } from '../../core/database';
import { cache, cacheKeys, cacheTTL } from '../../core/cache';
import { CREDIT_COSTS, type CreditBalance, type CreditTransaction } from '@traderpath/types';

// Admin emails with free unlimited access
import { isAdminEmail } from '../../config/admin';

export class CreditService {
  /**
   * Check if user is admin with unlimited access
   */
  private async isAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user ? isAdminEmail(user.email) : false;
  }
  /**
   * Get user's credit balance
   */
  async getBalance(userId: string): Promise<CreditBalance> {
    // Check cache first
    const cached = await cache.get<CreditBalance>(cacheKeys.userCredits(userId));
    if (cached) return cached;

    // Get from database
    let balance = await prisma.creditBalance.findUnique({
      where: { userId },
    });

    // Create if doesn't exist
    if (!balance) {
      balance = await prisma.creditBalance.create({
        data: {
          userId,
          balance: 20, // Welcome bonus
        },
      });
    }

    const result: CreditBalance = {
      balance: balance.balance,
      lifetimeEarned: balance.lifetimeEarned,
      lifetimeSpent: balance.lifetimeSpent,
      lifetimePurchased: balance.lifetimePurchased,
    };

    // Cache result
    await cache.set(cacheKeys.userCredits(userId), result, cacheTTL.userCredits);

    return result;
  }

  /**
   * Check if user has enough credits
   * Admins always have unlimited credits
   */
  async hasEnough(userId: string, amount: number): Promise<boolean> {
    // Admins have unlimited access
    if (await this.isAdmin(userId)) {
      return true;
    }
    const balance = await this.getBalance(userId);
    return balance.balance >= amount;
  }

  /**
   * Charge credits for a service
   * Admins are not charged - they have free access
   */
  async charge(
    userId: string,
    amount: number,
    source: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; newBalance: number }> {
    // Admins have free access - don't charge
    if (await this.isAdmin(userId)) {
      const balance = await this.getBalance(userId);
      return { success: true, newBalance: balance.balance };
    }

    const balance = await this.getBalance(userId);

    if (balance.balance < amount) {
      return { success: false, newBalance: balance.balance };
    }

    // Update balance and create transaction
    const [updated] = await prisma.$transaction([
      prisma.creditBalance.update({
        where: { userId },
        data: {
          balance: { decrement: amount },
          lifetimeSpent: { increment: amount },
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          balanceAfter: balance.balance - amount,
          type: 'SPEND',
          source,
          metadata: (metadata || {}) as object,
        },
      }),
    ]);

    // Invalidate cache
    await cache.del(cacheKeys.userCredits(userId));

    return { success: true, newBalance: updated.balance };
  }

  /**
   * Add credits (reward, purchase, etc.)
   */
  async add(
    userId: string,
    amount: number,
    type: 'REWARD' | 'PURCHASE' | 'REFERRAL' | 'BONUS',
    source: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; newBalance: number }> {
    const balance = await this.getBalance(userId);

    const updateData: Record<string, unknown> = {
      balance: { increment: amount },
      lifetimeEarned: { increment: amount },
    };

    if (type === 'PURCHASE') {
      updateData.lifetimePurchased = { increment: amount };
    }

    const [updated] = await prisma.$transaction([
      prisma.creditBalance.update({
        where: { userId },
        data: updateData,
      }),
      prisma.creditTransaction.create({
        data: {
          userId,
          amount,
          balanceAfter: balance.balance + amount,
          type,
          source,
          metadata: (metadata || {}) as object,
        },
      }),
    ]);

    // Invalidate cache
    await cache.del(cacheKeys.userCredits(userId));

    return { success: true, newBalance: updated.balance };
  }

  /**
   * Get credit packages
   */
  async getPackages() {
    return prisma.creditPackage.findMany({
      where: { isActive: true },
      orderBy: { credits: 'asc' },
    });
  }

  /**
   * Purchase credits
   */
  async purchasePackage(
    userId: string,
    packageId: string,
    paymentId: string
  ): Promise<{ success: boolean; creditsAdded: number; newBalance: number }> {
    const pkg = await prisma.creditPackage.findUnique({
      where: { id: packageId, isActive: true },
    });

    if (!pkg) {
      throw new Error('Package not found');
    }

    const totalCredits = pkg.credits + pkg.bonusCredits;

    const result = await this.add(userId, totalCredits, 'PURCHASE', 'credit_purchase', {
      packageId,
      packageName: pkg.name,
      credits: pkg.credits,
      bonusCredits: pkg.bonusCredits,
      priceUsd: pkg.priceUsd,
      paymentId,
    });

    return {
      success: result.success,
      creditsAdded: totalCredits,
      newBalance: result.newBalance,
    };
  }

  /**
   * Get transaction history
   */
  async getHistory(
    userId: string,
    page = 1,
    limit = 20,
    type?: string
  ): Promise<{
    transactions: CreditTransaction[];
    total: number;
    page: number;
    pages: number;
  }> {
    const where: Record<string, unknown> = { userId };
    if (type) {
      where.type = type;
    }

    const [transactions, total] = await prisma.$transaction([
      prisma.creditTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.creditTransaction.count({ where }),
    ]);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        balanceAfter: t.balanceAfter,
        type: t.type,
        source: t.source,
        metadata: t.metadata as Record<string, unknown>,
        createdAt: t.createdAt,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Get cost for a service type
   */
  getCost(serviceType: keyof typeof CREDIT_COSTS): number {
    return CREDIT_COSTS[serviceType];
  }

  /**
   * Check and award daily analysis bonus
   * Award 1 credit for every 10 analyses completed today
   */
  async checkDailyAnalysisBonus(userId: string): Promise<{ awarded: boolean; credits: number }> {
    // Admins don't need bonus
    if (await this.isAdmin(userId)) {
      return { awarded: false, credits: 0 };
    }

    // Get today's start
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count today's completed analyses
    const todayAnalysisCount = await prisma.analysis.count({
      where: {
        userId,
        createdAt: { gte: today },
        stepsCompleted: { has: 7 }, // Only count completed analyses
      },
    });

    // Calculate how many bonuses should have been awarded (1 per 10 analyses)
    const bonusesEarned = Math.floor(todayAnalysisCount / 10);

    if (bonusesEarned === 0) {
      return { awarded: false, credits: 0 };
    }

    // Check how many bonuses were already awarded today
    const todayBonusTransactions = await prisma.creditTransaction.count({
      where: {
        userId,
        source: 'daily_10_analysis_bonus',
        createdAt: { gte: today },
      },
    });

    // Award new bonuses if needed
    const newBonuses = bonusesEarned - todayBonusTransactions;
    if (newBonuses > 0) {
      await this.add(
        userId,
        newBonuses, // 1 credit per 10 analyses bonus
        'BONUS',
        'daily_10_analysis_bonus',
        {
          message: `Bonus for completing ${bonusesEarned * 10} analyses today`,
          analysisCount: todayAnalysisCount,
        }
      );
      return { awarded: true, credits: newBonuses };
    }

    return { awarded: false, credits: 0 };
  }
}

export const creditService = new CreditService();
