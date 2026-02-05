// ===========================================
// Payment Reconciliation Service
// Verifies and fixes payment data inconsistencies
// ===========================================

import { prisma } from '../../core/database';
import { logger } from '../../core/logger';
import { stripeService } from '../payments/stripe.service';
import { lemonSqueezyService } from '../payments/lemonSqueezy.service';

export interface ReconciliationReport {
  timestamp: Date;
  lemonSqueezy: {
    checked: number;
    discrepancies: Array<{
      orderId: string;
      issue: string;
      localAmount: number;
      expectedAmount: number;
    }>;
  };
  stripe: {
    checked: number;
    discrepancies: Array<{
      subscriptionId: string;
      issue: string;
      localStatus: string;
      stripeStatus: string;
    }>;
  };
  credits: {
    usersChecked: number;
    discrepancies: Array<{
      userId: string;
      issue: string;
      balance: number;
      expected: number;
    }>;
  };
  summary: {
    totalIssues: number;
    fixedIssues: number;
    pendingIssues: number;
  };
}

class ReconciliationService {
  /**
   * Run full reconciliation check
   */
  async runReconciliation(options: {
    fixDiscrepancies?: boolean;
    checkLemonSqueezy?: boolean;
    checkStripe?: boolean;
    checkCredits?: boolean;
  } = {}): Promise<ReconciliationReport> {
    const {
      fixDiscrepancies = false,
      checkLemonSqueezy = true,
      checkStripe = true,
      checkCredits = true,
    } = options;

    logger.info({ fixDiscrepancies }, 'Starting payment reconciliation');

    const report: ReconciliationReport = {
      timestamp: new Date(),
      lemonSqueezy: { checked: 0, discrepancies: [] },
      stripe: { checked: 0, discrepancies: [] },
      credits: { usersChecked: 0, discrepancies: [] },
      summary: { totalIssues: 0, fixedIssues: 0, pendingIssues: 0 },
    };

    // Check LemonSqueezy transactions
    if (checkLemonSqueezy) {
      const lsResult = await this.checkLemonSqueezyTransactions(fixDiscrepancies);
      report.lemonSqueezy = lsResult;
    }

    // Check Stripe subscriptions
    if (checkStripe) {
      const stripeResult = await this.checkStripeSubscriptions(fixDiscrepancies);
      report.stripe = stripeResult;
    }

    // Check credit balances
    if (checkCredits) {
      const creditsResult = await this.checkCreditBalances(fixDiscrepancies);
      report.credits = creditsResult;
    }

    // Calculate summary
    report.summary.totalIssues =
      report.lemonSqueezy.discrepancies.length +
      report.stripe.discrepancies.length +
      report.credits.discrepancies.length;

    if (fixDiscrepancies) {
      report.summary.fixedIssues = report.summary.totalIssues;
      report.summary.pendingIssues = 0;
    } else {
      report.summary.fixedIssues = 0;
      report.summary.pendingIssues = report.summary.totalIssues;
    }

    logger.info({ summary: report.summary }, 'Reconciliation completed');

    return report;
  }

  /**
   * Check LemonSqueezy credit purchase transactions
   */
  private async checkLemonSqueezyTransactions(fix: boolean): Promise<{
    checked: number;
    discrepancies: Array<{
      orderId: string;
      issue: string;
      localAmount: number;
      expectedAmount: number;
    }>;
  }> {
    const discrepancies: Array<{
      orderId: string;
      issue: string;
      localAmount: number;
      expectedAmount: number;
    }> = [];

    // Get all LemonSqueezy purchase transactions from last 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const transactions = await prisma.creditTransaction.findMany({
      where: {
        type: 'PURCHASE',
        source: { startsWith: 'package_' },
        createdAt: { gte: ninetyDaysAgo },
      },
      select: {
        id: true,
        userId: true,
        amount: true,
        metadata: true,
      },
    });

    for (const tx of transactions) {
      const metadata = tx.metadata as any;
      const expectedCredits = metadata?.total_credits;
      const orderId = metadata?.lemonSqueezyOrderId;

      if (!expectedCredits || !orderId) {
        continue; // Skip if missing metadata
      }

      // Check if credits match
      if (tx.amount !== parseInt(expectedCredits)) {
        discrepancies.push({
          orderId,
          issue: 'Credit amount mismatch',
          localAmount: tx.amount,
          expectedAmount: parseInt(expectedCredits),
        });

        // Fix if requested
        if (fix) {
          const diff = parseInt(expectedCredits) - tx.amount;
          await prisma.creditBalance.update({
            where: { userId: tx.userId },
            data: {
              balance: { increment: diff },
              lifetimePurchased: { increment: diff },
            },
          });

          await prisma.creditTransaction.create({
            data: {
              userId: tx.userId,
              amount: diff,
              type: 'ADJUSTMENT',
              source: 'reconciliation_fix',
              balanceAfter: 0, // Will be updated
              metadata: {
                originalTransactionId: tx.id,
                reason: 'Reconciliation adjustment',
                orderId,
              },
            },
          });

          logger.info({ orderId, diff }, 'Fixed LemonSqueezy discrepancy');
        }
      }
    }

    return {
      checked: transactions.length,
      discrepancies,
    };
  }

  /**
   * Check Stripe subscription status consistency
   */
  private async checkStripeSubscriptions(fix: boolean): Promise<{
    checked: number;
    discrepancies: Array<{
      subscriptionId: string;
      issue: string;
      localStatus: string;
      stripeStatus: string;
    }>;
  }> {
    const discrepancies: Array<{
      subscriptionId: string;
      issue: string;
      localStatus: string;
      stripeStatus: string;
    }> = [];

    // Get all active or past_due subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: { in: ['active', 'past_due', 'trialing'] },
        stripeSubscriptionId: { not: null },
      },
      select: {
        id: true,
        userId: true,
        stripeSubscriptionId: true,
        status: true,
        tier: true,
      },
    });

    for (const sub of subscriptions) {
      if (!sub.stripeSubscriptionId) continue;

      try {
        // Fetch from Stripe
        const stripeSub = await stripeService.getSubscription(sub.stripeSubscriptionId);

        if (!stripeSub) {
          discrepancies.push({
            subscriptionId: sub.id,
            issue: 'Subscription not found in Stripe',
            localStatus: sub.status,
            stripeStatus: 'not_found',
          });
          continue;
        }

        // Check status mismatch
        if (sub.status !== stripeSub.status) {
          discrepancies.push({
            subscriptionId: sub.id,
            issue: 'Status mismatch',
            localStatus: sub.status,
            stripeStatus: stripeSub.status,
          });

          // Fix if requested
          if (fix) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: {
                status: stripeSub.status as any,
                currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
                cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
              },
            });

            logger.info(
              { subscriptionId: sub.id, newStatus: stripeSub.status },
              'Fixed Stripe subscription status'
            );
          }
        }
      } catch (error: any) {
        logger.error({ error: error.message, subscriptionId: sub.id }, 'Failed to check Stripe subscription');
      }
    }

    return {
      checked: subscriptions.length,
      discrepancies,
    };
  }

  /**
   * Check credit balance integrity
   */
  private async checkCreditBalances(fix: boolean): Promise<{
    usersChecked: number;
    discrepancies: Array<{
      userId: string;
      issue: string;
      balance: number;
      expected: number;
    }>;
  }> {
    const discrepancies: Array<{
      userId: string;
      issue: string;
      balance: number;
      expected: number;
    }> = [];

    // Get all users with credit balances
    const balances = await prisma.creditBalance.findMany({
      select: {
        userId: true,
        balance: true,
        lifetimePurchased: true,
        lifetimeEarned: true,
      },
    });

    for (const bal of balances) {
      // Calculate expected balance from transactions
      const transactions = await prisma.creditTransaction.findMany({
        where: { userId: bal.userId },
        select: { amount: true, type: true },
      });

      const expectedBalance = transactions.reduce((sum, tx) => sum + tx.amount, 0);

      // Check for discrepancy
      if (Math.abs(bal.balance - expectedBalance) > 0.01) {
        // Allow small floating point differences
        discrepancies.push({
          userId: bal.userId,
          issue: 'Balance does not match transaction history',
          balance: bal.balance,
          expected: expectedBalance,
        });

        // Fix if requested
        if (fix) {
          await prisma.creditBalance.update({
            where: { userId: bal.userId },
            data: { balance: expectedBalance },
          });

          logger.info(
            { userId: bal.userId, oldBalance: bal.balance, newBalance: expectedBalance },
            'Fixed credit balance'
          );
        }
      }
    }

    return {
      usersChecked: balances.length,
      discrepancies,
    };
  }

  /**
   * Reprocess a specific LemonSqueezy order (manual webhook replay)
   */
  async reprocessLemonSqueezyOrder(orderId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      logger.info({ orderId }, 'Reprocessing LemonSqueezy order');

      // Find the original transaction
      const transaction = await prisma.creditTransaction.findFirst({
        where: {
          type: 'PURCHASE',
          metadata: {
            path: ['lemonSqueezyOrderId'],
            equals: orderId,
          },
        },
      });

      if (!transaction) {
        return {
          success: false,
          message: `Order ${orderId} not found in database`,
        };
      }

      const metadata = transaction.metadata as any;
      const userId = transaction.userId;
      const totalCredits = metadata?.total_credits;

      if (!totalCredits) {
        return {
          success: false,
          message: 'Missing total_credits in metadata',
        };
      }

      // Reapply credits
      await prisma.$transaction(async (tx) => {
        await tx.creditBalance.update({
          where: { userId },
          data: {
            balance: { increment: totalCredits },
            lifetimePurchased: { increment: totalCredits },
          },
        });

        const updatedBalance = await tx.creditBalance.findUnique({
          where: { userId },
          select: { balance: true },
        });

        await tx.creditTransaction.create({
          data: {
            userId,
            amount: totalCredits,
            type: 'ADJUSTMENT',
            source: 'manual_reprocess',
            balanceAfter: updatedBalance?.balance || 0,
            metadata: {
              originalOrderId: orderId,
              reason: 'Manual reprocess by admin',
            },
          },
        });
      });

      return {
        success: true,
        message: `Successfully reprocessed order ${orderId} - ${totalCredits} credits added`,
      };
    } catch (error: any) {
      logger.error({ error: error.message, orderId }, 'Failed to reprocess order');
      return {
        success: false,
        message: `Failed to reprocess: ${error.message}`,
      };
    }
  }
}

export const reconciliationService = new ReconciliationService();
