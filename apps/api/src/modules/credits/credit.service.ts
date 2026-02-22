// ===========================================
// Credit Service
// Ledger-based credit accounting (TASK 1.3)
// ===========================================

import { prisma } from '../../core/database';
import { cache, cacheKeys, cacheTTL } from '../../core/cache';
import { CREDIT_COSTS, type CreditBalance, type CreditTransaction } from '../../types';

// Admin emails with free unlimited access
import { isAdminEmail } from '../../config/admin';

// Prisma transaction type (used internally by addEntry)
type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

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

  // ===========================================
  // LEDGER PRIMITIVES
  // ===========================================

  /**
   * Write a single entry to the credits ledger.
   * Must be called inside a prisma.$transaction().
   * Updates the balance snapshot and lifetime aggregates atomically.
   *
   * @param tx      - Prisma transaction client
   * @param userId  - Target user
   * @param amount  - Positive = credit, negative = debit
   * @param type    - Transaction type
   * @param source  - Human-readable origin (e.g. 'analysis_step_2')
   * @param metadata - Optional context
   * @returns new balance after entry
   */
  private async addEntry(
    tx: PrismaTx,
    userId: string,
    amount: number,
    type: 'PURCHASE' | 'REWARD' | 'SPEND' | 'REFUND' | 'REFERRAL' | 'BONUS' | 'ADJUSTMENT',
    source: string,
    metadata?: Record<string, unknown>
  ): Promise<number> {
    // Update balance snapshot and lifetime stats atomically
    const updateData: Parameters<typeof tx.creditBalance.update>[0]['data'] = {
      balance: { increment: amount },
    };

    if (amount > 0) {
      updateData.lifetimeEarned = { increment: amount };
      if (type === 'PURCHASE') {
        updateData.lifetimePurchased = { increment: amount };
      }
    } else {
      // Debit: increment lifetimeSpent by the absolute amount
      updateData.lifetimeSpent = { increment: -amount };
    }

    const updated = await tx.creditBalance.update({
      where: { userId },
      data: updateData,
    });

    // Write immutable ledger entry
    await tx.creditTransaction.create({
      data: {
        userId,
        amount,
        balanceAfter: updated.balance,
        type,
        source,
        metadata: (metadata || {}) as object,
      },
    });

    return updated.balance;
  }

  /**
   * Calculate balance from the credits ledger (source of truth).
   * Uses Redis cache for O(1) reads; falls back to SUM from DB.
   *
   * @param userId - Target user
   * @param tx     - Optional transaction client (bypasses cache)
   */
  async calculateBalance(userId: string, tx?: PrismaTx): Promise<number> {
    if (!tx) {
      // Try cache first
      const cached = await cache.get<{ balance: number }>(cacheKeys.userCredits(userId));
      if (cached) return cached.balance;
    }

    // SUM from ledger = authoritative balance
    const queryRaw = tx ? tx.$queryRaw.bind(tx) : prisma.$queryRaw.bind(prisma);

    const result = await queryRaw<Array<{ balance: bigint }>>`
      SELECT COALESCE(SUM(amount), 0)::bigint AS balance
      FROM credits_ledger
      WHERE user_id = ${userId}::uuid
    `;

    return Number(result[0].balance);
  }

  // ===========================================
  // PUBLIC API
  // ===========================================

  /**
   * Get full balance object (balance + lifetime stats).
   * Reads from cache → DB snapshot (not from ledger SUM for lifetime stats).
   */
  async getBalance(userId: string): Promise<CreditBalance> {
    // Check cache
    const cached = await cache.get<CreditBalance>(cacheKeys.userCredits(userId));
    if (cached) return cached;

    // Upsert: creates the record with welcome bonus on first access.
    // Uses upsert to prevent unique-constraint race on concurrent first-access.
    const balance = await prisma.creditBalance.upsert({
      where: { userId },
      create: {
        userId,
        balance: 20,
        lifetimeEarned: 20,
      },
      update: {},
    });

    // If this is a brand-new account, seed the ledger entry too
    const ledgerCount = await prisma.creditTransaction.count({ where: { userId } });
    if (ledgerCount === 0 && balance.lifetimeEarned > 0) {
      await prisma.creditTransaction.create({
        data: {
          userId,
          amount: balance.balance,
          balanceAfter: balance.balance,
          type: 'BONUS',
          source: 'welcome_bonus',
          metadata: { note: 'Account creation welcome bonus' },
        },
      });
    }

    const result: CreditBalance = {
      balance: balance.balance,
      lifetimeEarned: balance.lifetimeEarned,
      lifetimeSpent: balance.lifetimeSpent,
      lifetimePurchased: balance.lifetimePurchased,
    };

    await cache.set(cacheKeys.userCredits(userId), result, cacheTTL.userCredits);

    return result;
  }

  /**
   * Check if user has enough credits.
   * Admins always return true.
   */
  async hasEnough(userId: string, amount: number): Promise<boolean> {
    if (await this.isAdmin(userId)) return true;
    const balance = await this.getBalance(userId);
    return balance.balance >= amount;
  }

  /**
   * Debit credits for a service.
   *
   * RACE CONDITION PROTECTION: Uses pg_advisory_xact_lock to serialize
   * concurrent charge attempts for the same user. The lock is automatically
   * released at transaction end — no manual cleanup needed.
   *
   * Negative balance is impossible: balance is checked inside the locked
   * transaction before writing the ledger entry.
   */
  async charge(
    userId: string,
    amount: number,
    source: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; newBalance: number }> {
    // Admins have free access
    if (await this.isAdmin(userId)) {
      const balance = await this.getBalance(userId);
      return { success: true, newBalance: balance.balance };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Acquire a user-scoped advisory lock. Prevents concurrent charges
      // from passing the balance check simultaneously.
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(('x' || encode(digest(${userId}, 'sha256'), 'hex'))::bit(64)::bigint)
      `;

      // Read current balance from the snapshot (fast, consistent under lock)
      const snapshot = await tx.creditBalance.findUnique({ where: { userId } });
      const currentBalance = snapshot?.balance ?? 0;

      if (currentBalance < amount) {
        return { success: false, newBalance: currentBalance };
      }

      const newBalance = await this.addEntry(tx, userId, -amount, 'SPEND', source, metadata);
      return { success: true, newBalance };
    });

    // Invalidate cache regardless of outcome
    await cache.del(cacheKeys.userCredits(userId));

    return result;
  }

  /**
   * Credit a user's balance (reward, purchase, refund, etc.)
   */
  async add(
    userId: string,
    amount: number,
    type: 'REWARD' | 'PURCHASE' | 'REFERRAL' | 'BONUS',
    source: string,
    metadata?: Record<string, unknown>
  ): Promise<{ success: boolean; newBalance: number }> {
    const result = await prisma.$transaction(async (tx) => {
      const newBalance = await this.addEntry(tx, userId, amount, type, source, metadata);
      return { success: true, newBalance };
    });

    await cache.del(cacheKeys.userCredits(userId));

    return result;
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
   * Purchase credits via a package
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
   * Get paginated transaction history (ledger entries)
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
   * Check and award daily analysis bonus.
   * Awards 1 credit for every 10 completed analyses today.
   * Idempotent: counts existing bonus entries to avoid double-awarding.
   */
  async checkDailyAnalysisBonus(userId: string): Promise<{ awarded: boolean; credits: number }> {
    if (await this.isAdmin(userId)) {
      return { awarded: false, credits: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAnalysisCount = await prisma.analysis.count({
      where: {
        userId,
        createdAt: { gte: today },
        stepsCompleted: { has: 7 },
      },
    });

    const bonusesEarned = Math.floor(todayAnalysisCount / 10);

    if (bonusesEarned === 0) {
      return { awarded: false, credits: 0 };
    }

    const todayBonusTransactions = await prisma.creditTransaction.count({
      where: {
        userId,
        source: 'daily_10_analysis_bonus',
        createdAt: { gte: today },
      },
    });

    const newBonuses = bonusesEarned - todayBonusTransactions;
    if (newBonuses > 0) {
      await this.add(userId, newBonuses, 'BONUS', 'daily_10_analysis_bonus', {
        message: `Bonus for completing ${bonusesEarned * 10} analyses today`,
        analysisCount: todayAnalysisCount,
      });
      return { awarded: true, credits: newBonuses };
    }

    return { awarded: false, credits: 0 };
  }

  /**
   * Reconcile: verify balance snapshot matches ledger SUM.
   * Returns mismatch info; does NOT auto-fix (caller decides).
   */
  async reconcile(userId: string): Promise<{
    snapshotBalance: number;
    ledgerBalance: number;
    isConsistent: boolean;
    delta: number;
  }> {
    const [snapshot, ledgerBalance] = await Promise.all([
      prisma.creditBalance.findUnique({ where: { userId } }),
      this.calculateBalance(userId),
    ]);

    const snapshotBalance = snapshot?.balance ?? 0;
    const delta = ledgerBalance - snapshotBalance;

    return {
      snapshotBalance,
      ledgerBalance,
      isConsistent: delta === 0,
      delta,
    };
  }
}

export const creditService = new CreditService();
