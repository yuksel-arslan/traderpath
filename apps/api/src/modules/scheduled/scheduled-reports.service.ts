// ===========================================
// Scheduled Reports Service
// Handles scheduled analysis automation
// ===========================================

import { prisma } from '../../core/database';
import { analysisEngine } from '../analysis/analysis.engine';
import { getTradeTypeFromInterval } from '../analysis/config/trade-config';
import { creditService } from '../credits/credit.service';
import { creditCostsService } from '../costs/credit-costs.service';
import { emailService } from '../email/email.service';
import { notificationService } from '../notifications/notification.service';
import cron from 'node-cron';

// Cost for scheduled analysis - fetched dynamically from settings

interface ScheduledReportResult {
  success: boolean;
  analysisId?: string;
  error?: string;
}

class ScheduledReportsService {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Start the cron job to check and run scheduled analyses
   * Runs every hour at minute 0
   */
  start() {
    if (this.cronJob) {
      console.log('[ScheduledReports] Cron job already running');
      return;
    }

    // Run every hour at minute 0
    this.cronJob = cron.schedule('0 * * * *', async () => {
      console.log('[ScheduledReports] Running hourly check...');
      await this.processScheduledReports();
    });

    console.log('[ScheduledReports] Cron job started - runs every hour');
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('[ScheduledReports] Cron job stopped');
    }
  }

  /**
   * Process all scheduled reports that are due
   */
  async processScheduledReports(): Promise<void> {
    const now = new Date();

    try {
      // Find all active scheduled reports where nextRunAt <= now
      const dueReports = await prisma.scheduledReport.findMany({
        where: {
          isActive: true,
          nextRunAt: { lte: now },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              telegramChatId: true,
              discordWebhookUrl: true,
            },
          },
        },
      });

      console.log(`[ScheduledReports] Found ${dueReports.length} reports due for execution`);

      for (const report of dueReports) {
        try {
          await this.runScheduledAnalysis(report);
        } catch (error) {
          console.error(`[ScheduledReports] Failed to run analysis for ${report.symbol}:`, error);
        }
      }
    } catch (error) {
      console.error('[ScheduledReports] Error processing scheduled reports:', error);
    }
  }

  /**
   * Run a single scheduled analysis
   */
  private async runScheduledAnalysis(report: any): Promise<ScheduledReportResult> {
    const { id, userId, symbol, user, deliverEmail, deliverTelegram, deliverDiscord } = report;

    console.log(`[ScheduledReports] Running analysis for ${symbol} (user: ${user.email})`);

    // Get cost from settings (same as normal analysis)
    const analysisCost = await creditCostsService.getCreditCost('BUNDLE_FULL_ANALYSIS');

    try {
      // Check user credits
      const balance = await creditService.getBalance(userId);
      if (balance < analysisCost) {
        console.log(`[ScheduledReports] User ${user.email} has insufficient credits (${balance})`);

        // Notify user about insufficient credits
        if (deliverEmail && user.email) {
          await emailService.sendEmail({
            to: user.email,
            subject: `TraderPath: Scheduled Analysis Skipped - Insufficient Credits`,
            html: `
              <p>Hi ${user.name || 'Trader'},</p>
              <p>Your scheduled analysis for <strong>${symbol}/USDT</strong> was skipped due to insufficient credits.</p>
              <p>Required: ${analysisCost} credits<br>Available: ${balance} credits</p>
              <p>Please add credits to continue receiving scheduled analyses.</p>
              <p>- TraderPath Team</p>
            `,
            text: `Your scheduled analysis for ${symbol}/USDT was skipped due to insufficient credits. Required: ${analysisCost}, Available: ${balance}`,
          });
        }

        // Update next run time anyway
        await this.updateNextRunTime(id, report.frequency, report.scheduleHour, report.scheduleDayOfWeek);

        return { success: false, error: 'Insufficient credits' };
      }

      // Deduct credits
      await creditService.deduct(userId, analysisCost, 'scheduled_analysis', {
        symbol,
        scheduledReportId: id,
      });

      // Run analysis with user's selected interval
      const interval = report.interval || '4h';
      const tradeType = getTradeTypeFromInterval(interval);

      const [marketPulse, assetScan, safetyCheck, timing, trapCheck] = await Promise.all([
        analysisEngine.getMarketPulse(),
        analysisEngine.scanAsset(symbol, tradeType),
        analysisEngine.safetyCheck(symbol, tradeType),
        analysisEngine.timingAnalysis(symbol, tradeType),
        analysisEngine.trapCheck(symbol, tradeType),
      ]);

      const preliminaryVerdict = analysisEngine.preliminaryVerdict(symbol, {
        marketPulse,
        assetScan,
        safetyCheck,
        timing,
        trapCheck,
      });

      const tradePlan = await analysisEngine.integratedTradePlan(
        symbol,
        preliminaryVerdict,
        { marketPulse, assetScan, safetyCheck, timing, trapCheck },
        10000 // Default account size
      );

      const verdict = await analysisEngine.getFinalVerdict(
        symbol,
        preliminaryVerdict,
        { marketPulse, assetScan, safetyCheck, timing, trapCheck },
        tradePlan,
        tradeType
      );

      // Save analysis
      const savedAnalysis = await prisma.analysis.create({
        data: {
          userId,
          symbol,
          interval,
          stepsCompleted: [1, 2, 3, 4, 5, 6, 7],
          step1Result: marketPulse as object,
          step2Result: assetScan as object,
          step3Result: safetyCheck as object,
          step4Result: timing as object,
          step5Result: tradePlan as object || null,
          step6Result: trapCheck as object,
          step7Result: { ...verdict, preliminaryVerdict } as object,
          totalScore: verdict.overallScore,
          creditsSpent: analysisCost,
        },
      });

      // Send notifications
      await this.sendNotifications(report, savedAnalysis, verdict, tradePlan);

      // Update last run and next run times
      await prisma.scheduledReport.update({
        where: { id },
        data: {
          lastRunAt: new Date(),
          nextRunAt: this.calculateNextRunTime(report.frequency, report.scheduleHour, report.scheduleDayOfWeek),
        },
      });

      console.log(`[ScheduledReports] Analysis completed for ${symbol} - ${verdict.action}`);

      return { success: true, analysisId: savedAnalysis.id };
    } catch (error) {
      console.error(`[ScheduledReports] Error running analysis for ${symbol}:`, error);

      // Refund credits on failure
      try {
        await creditService.add(userId, analysisCost, 'REFUND', 'scheduled_analysis_failed', {
          symbol,
          scheduledReportId: id,
          error: String(error),
        });
      } catch (refundError) {
        console.error('[ScheduledReports] Failed to refund credits:', refundError);
      }

      // Update next run time anyway
      await this.updateNextRunTime(id, report.frequency, report.scheduleHour, report.scheduleDayOfWeek);

      return { success: false, error: String(error) };
    }
  }

  /**
   * Send notifications for completed analysis
   */
  private async sendNotifications(report: any, analysis: any, verdict: any, tradePlan: any): Promise<void> {
    const { user, symbol, deliverEmail, deliverTelegram, deliverDiscord } = report;

    const direction = tradePlan?.direction || 'N/A';
    const score = Math.round((verdict.overallScore || 0) * 10);
    const action = verdict.action || 'N/A';

    // Email notification
    if (deliverEmail && user.email) {
      try {
        await emailService.sendEmail({
          to: user.email,
          subject: `TraderPath: ${symbol}/USDT - ${action} (${score}/100)`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10b981;">Scheduled Analysis Complete</h2>
              <p><strong>${symbol}/USDT</strong> - ${new Date().toLocaleString('tr-TR')}</p>
              <div style="background: #1e293b; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="font-size: 24px; margin: 0;"><strong>${action}</strong> - ${direction.toUpperCase()}</p>
                <p style="font-size: 36px; color: ${score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'}; margin: 10px 0;">${score}/100</p>
              </div>
              ${tradePlan ? `
              <div style="background: #f1f5f9; padding: 15px; border-radius: 8px;">
                <p><strong>Entry:</strong> $${tradePlan.averageEntry?.toFixed(4) || 'N/A'}</p>
                <p><strong>Stop Loss:</strong> $${tradePlan.stopLoss?.price?.toFixed(4) || 'N/A'}</p>
                <p><strong>Take Profit 1:</strong> $${tradePlan.takeProfit1?.toFixed(4) || 'N/A'}</p>
              </div>
              ` : ''}
              <p style="margin-top: 20px; color: #64748b; font-size: 12px;">
                View full analysis at <a href="https://traderpath.io/analyze/details/${analysis.id}">TraderPath</a>
              </p>
            </div>
          `,
          text: `${symbol}/USDT - ${action} (${score}/100) - ${direction}`,
        });
      } catch (error) {
        console.error('[ScheduledReports] Failed to send email:', error);
      }
    }

    // Telegram notification
    if (deliverTelegram && user.telegramChatId) {
      try {
        await notificationService.sendTelegram(user.telegramChatId, {
          symbol,
          verdict: action,
          score,
          direction,
          entry: tradePlan?.averageEntry,
          stopLoss: tradePlan?.stopLoss?.price,
          takeProfit1: tradePlan?.takeProfit1,
        });
      } catch (error) {
        console.error('[ScheduledReports] Failed to send Telegram:', error);
      }
    }

    // Discord notification
    if (deliverDiscord && user.discordWebhookUrl) {
      try {
        await notificationService.sendDiscord(user.discordWebhookUrl, {
          symbol,
          verdict: action,
          score,
          direction,
          entry: tradePlan?.averageEntry,
          stopLoss: tradePlan?.stopLoss?.price,
          takeProfit1: tradePlan?.takeProfit1,
        });
      } catch (error) {
        console.error('[ScheduledReports] Failed to send Discord:', error);
      }
    }
  }

  /**
   * Calculate the next run time based on frequency
   */
  calculateNextRunTime(
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY',
    scheduleHour: number,
    scheduleDayOfWeek?: number | null
  ): Date {
    const now = new Date();
    const next = new Date();

    // Set the hour (UTC)
    next.setUTCHours(scheduleHour, 0, 0, 0);

    switch (frequency) {
      case 'DAILY':
        // If today's scheduled time has passed, move to tomorrow
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        break;

      case 'WEEKLY':
        // Set to the scheduled day of week
        const targetDay = scheduleDayOfWeek ?? 1; // Default to Monday
        const currentDay = next.getDay();
        let daysUntilTarget = targetDay - currentDay;

        if (daysUntilTarget < 0 || (daysUntilTarget === 0 && next <= now)) {
          daysUntilTarget += 7;
        }

        next.setDate(next.getDate() + daysUntilTarget);
        break;

      case 'MONTHLY':
        // Run on the 1st of each month
        next.setDate(1);
        if (next <= now) {
          next.setMonth(next.getMonth() + 1);
        }
        break;
    }

    return next;
  }

  /**
   * Update next run time for a scheduled report
   */
  private async updateNextRunTime(
    id: string,
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY',
    scheduleHour: number,
    scheduleDayOfWeek?: number | null
  ): Promise<void> {
    const nextRunAt = this.calculateNextRunTime(frequency, scheduleHour, scheduleDayOfWeek);

    await prisma.scheduledReport.update({
      where: { id },
      data: { nextRunAt },
    });
  }

  /**
   * Create a new scheduled report
   */
  async create(
    userId: string,
    symbol: string,
    interval: string,
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY',
    scheduleHour: number,
    options: {
      scheduleDayOfWeek?: number;
      deliverEmail?: boolean;
      deliverTelegram?: boolean;
      deliverDiscord?: boolean;
    } = {}
  ) {
    const {
      scheduleDayOfWeek,
      deliverEmail = true,
      deliverTelegram = false,
      deliverDiscord = false,
    } = options;

    // Check if user already has this symbol scheduled
    const existing = await prisma.scheduledReport.findFirst({
      where: { userId, symbol, isActive: true },
    });

    if (existing) {
      throw new Error(`You already have a scheduled report for ${symbol}`);
    }

    // Calculate next run time
    const nextRunAt = this.calculateNextRunTime(frequency, scheduleHour, scheduleDayOfWeek);

    // Create the scheduled report
    const report = await prisma.scheduledReport.create({
      data: {
        userId,
        symbol: symbol.toUpperCase(),
        interval,
        frequency,
        scheduleHour,
        scheduleDayOfWeek,
        deliverEmail,
        deliverTelegram,
        deliverDiscord,
        nextRunAt,
        isActive: true,
      },
    });

    return report;
  }

  /**
   * Get all scheduled reports for a user
   */
  async getByUser(userId: string) {
    return prisma.scheduledReport.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update a scheduled report
   */
  async update(
    id: string,
    userId: string,
    data: {
      frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
      scheduleHour?: number;
      scheduleDayOfWeek?: number | null;
      deliverEmail?: boolean;
      deliverTelegram?: boolean;
      deliverDiscord?: boolean;
      isActive?: boolean;
    }
  ) {
    // Verify ownership
    const report = await prisma.scheduledReport.findFirst({
      where: { id, userId },
    });

    if (!report) {
      throw new Error('Scheduled report not found');
    }

    // Recalculate next run time if schedule changed
    let nextRunAt = report.nextRunAt;
    if (data.frequency || data.scheduleHour !== undefined || data.scheduleDayOfWeek !== undefined) {
      nextRunAt = this.calculateNextRunTime(
        data.frequency || report.frequency,
        data.scheduleHour ?? report.scheduleHour,
        data.scheduleDayOfWeek !== undefined ? data.scheduleDayOfWeek : report.scheduleDayOfWeek
      );
    }

    return prisma.scheduledReport.update({
      where: { id },
      data: {
        ...data,
        nextRunAt,
      },
    });
  }

  /**
   * Delete a scheduled report
   */
  async delete(id: string, userId: string) {
    // Verify ownership
    const report = await prisma.scheduledReport.findFirst({
      where: { id, userId },
    });

    if (!report) {
      throw new Error('Scheduled report not found');
    }

    return prisma.scheduledReport.delete({
      where: { id },
    });
  }

  /**
   * Get count of active scheduled reports for a user
   */
  async getActiveCount(userId: string): Promise<number> {
    return prisma.scheduledReport.count({
      where: { userId, isActive: true },
    });
  }
}

export const scheduledReportsService = new ScheduledReportsService();
