// ===========================================
// Report Distribution Service
// Orchestrates snapshot generation + delivery
// to Intelligence Reports subscribers via Telegram/Discord
// ===========================================

import { prisma } from '../../core/database';
import { logger } from '../../core/logger';
import { snapshotService, type SnapshotResult, type SnapshotType } from './snapshot.service';
import { socialNotificationService } from '../notifications/social-notification.service';

interface DistributionResult {
  snapshotsGenerated: number;
  telegramSent: number;
  discordSent: number;
  errors: string[];
}

class ReportDistributionService {
  /**
   * Generate snapshots and distribute to the report owner
   */
  async distributeToUser(
    reportId: string,
    userId: string,
    reportData: Record<string, unknown>,
    type: SnapshotType = 'executive'
  ): Promise<DistributionResult> {
    const result: DistributionResult = {
      snapshotsGenerated: 0,
      telegramSent: 0,
      discordSent: 0,
      errors: [],
    };

    try {
      // Get user notification settings
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          telegramChatId: true,
          discordWebhookUrl: true,
          notificationSettings: true,
        },
      });

      if (!user) {
        result.errors.push('User not found');
        return result;
      }

      const hasTelegram = !!user.telegramChatId;
      const hasDiscord = !!user.discordWebhookUrl;

      if (!hasTelegram && !hasDiscord) {
        logger.info('[ReportDistribution] User has no notification channels configured');
        return result;
      }

      // Generate snapshots
      const snapshots = await snapshotService.generateSnapshots(reportData, type);
      result.snapshotsGenerated = snapshots.length;

      if (snapshots.length === 0) {
        result.errors.push('No snapshots generated');
        return result;
      }

      const symbol = (reportData.symbol as string) || 'Unknown';
      const verdict = ((reportData.verdict as Record<string, unknown>)?.action as string) ||
                      ((reportData.verdict as Record<string, unknown>)?.verdict as string) || '';
      const score = ((reportData.verdict as Record<string, unknown>)?.overallScore as number) || 0;
      const typeLabel = type === 'executive' ? 'Executive Summary' : 'Detailed Analysis';

      // Send to Telegram
      if (hasTelegram && user.telegramChatId) {
        try {
          const caption = `📊 <b>${symbol}/USDT ${typeLabel}</b>\n\nVerdict: <b>${verdict.toUpperCase()}</b> | Score: <b>${Math.round(score * 10)}/100</b>\n\n🔗 traderpath.io/reports/${reportId}`;
          await this.sendToTelegram(user.telegramChatId, snapshots, caption);
          result.telegramSent = snapshots.length;
        } catch (err) {
          result.errors.push(`Telegram: ${String(err)}`);
        }
      }

      // Send to Discord
      if (hasDiscord && user.discordWebhookUrl) {
        try {
          await this.sendToDiscord(user.discordWebhookUrl, snapshots, {
            symbol,
            verdict: verdict.toUpperCase(),
            score: Math.round(score * 10),
            type: typeLabel,
            reportId,
          });
          result.discordSent = snapshots.length;
        } catch (err) {
          result.errors.push(`Discord: ${String(err)}`);
        }
      }

      logger.info({
        reportId,
        symbol,
        snapshots: result.snapshotsGenerated,
        telegram: result.telegramSent,
        discord: result.discordSent,
      }, '[ReportDistribution] Report distributed');

    } catch (err) {
      logger.error('[ReportDistribution] Distribution failed:', err);
      result.errors.push(String(err));
    }

    return result;
  }

  /**
   * Distribute report to all Intelligence Reports subscribers
   */
  async distributeToSubscribers(
    reportData: Record<string, unknown>,
    type: SnapshotType = 'executive'
  ): Promise<DistributionResult> {
    const result: DistributionResult = {
      snapshotsGenerated: 0,
      telegramSent: 0,
      discordSent: 0,
      errors: [],
    };

    try {
      // Find active signal subscribers with delivery channels configured
      const subscribers = await prisma.signalSubscription.findMany({
        where: {
          status: 'ACTIVE',
          tier: { not: 'SIGNAL_FREE' },
          OR: [
            { telegramDelivery: true },
            { discordDelivery: true },
          ],
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              telegramChatId: true,
              discordWebhookUrl: true,
            },
          },
        },
      });

      // Also get user-level signal preferences for chat IDs
      const userSignalPrefs = await prisma.userSignalPreferences.findMany({
        where: {
          userId: { in: subscribers.map(s => s.userId) },
        },
        select: {
          userId: true,
          telegramChatId: true,
          telegramEnabled: true,
          discordWebhookUrl: true,
          discordEnabled: true,
        },
      });

      const prefsMap = new Map(userSignalPrefs.map(p => [p.userId, p]));

      if (subscribers.length === 0) {
        logger.info('[ReportDistribution] No active subscribers found');
        return result;
      }

      // Generate snapshots once
      const snapshots = await snapshotService.generateSnapshots(reportData, type);
      result.snapshotsGenerated = snapshots.length;

      if (snapshots.length === 0) {
        result.errors.push('No snapshots generated');
        return result;
      }

      const symbol = (reportData.symbol as string) || 'Unknown';
      const verdict = ((reportData.verdict as Record<string, unknown>)?.action as string) ||
                      ((reportData.verdict as Record<string, unknown>)?.verdict as string) || '';
      const score = ((reportData.verdict as Record<string, unknown>)?.overallScore as number) || 0;
      const typeLabel = type === 'executive' ? 'Executive Summary' : 'Detailed Analysis';

      // Distribute to each subscriber
      for (const sub of subscribers) {
        const prefs = prefsMap.get(sub.userId);
        const telegramChatId = prefs?.telegramChatId || sub.user.telegramChatId;
        const discordWebhookUrl = prefs?.discordWebhookUrl || sub.user.discordWebhookUrl;

        // Telegram delivery
        if (sub.telegramDelivery && telegramChatId) {
          try {
            const caption = `📊 <b>${symbol}/USDT ${typeLabel}</b>\n\nVerdict: <b>${verdict.toUpperCase()}</b> | Score: <b>${Math.round(score * 10)}/100</b>\n\n🔗 traderpath.io`;
            await this.sendToTelegram(telegramChatId, snapshots, caption);
            result.telegramSent++;
          } catch (err) {
            result.errors.push(`Telegram (${sub.userId}): ${String(err)}`);
          }
        }

        // Discord delivery
        if (sub.discordDelivery && discordWebhookUrl) {
          try {
            await this.sendToDiscord(discordWebhookUrl, snapshots, {
              symbol,
              verdict: verdict.toUpperCase(),
              score: Math.round(score * 10),
              type: typeLabel,
            });
            result.discordSent++;
          } catch (err) {
            result.errors.push(`Discord (${sub.userId}): ${String(err)}`);
          }
        }
      }

      logger.info({
        subscribers: subscribers.length,
        snapshots: result.snapshotsGenerated,
        telegram: result.telegramSent,
        discord: result.discordSent,
      }, '[ReportDistribution] Report distributed to subscribers');

    } catch (err) {
      logger.error('[ReportDistribution] Subscriber distribution failed:', err);
      result.errors.push(String(err));
    }

    return result;
  }

  /**
   * Send snapshots to Telegram (as media group for multiple or single photo)
   */
  private async sendToTelegram(chatId: string, snapshots: SnapshotResult[], caption: string): Promise<void> {
    if (snapshots.length === 1) {
      await socialNotificationService.sendTelegramPhoto(chatId, snapshots[0].buffer, caption);
    } else {
      // Send as media group (album)
      const photos = snapshots.map((s, i) => ({
        buffer: s.buffer,
        caption: i === 0 ? caption : undefined,
      }));
      await socialNotificationService.sendTelegramMediaGroup(chatId, photos);
    }
  }

  /**
   * Send snapshots to Discord (with image embeds)
   */
  private async sendToDiscord(
    webhookUrl: string,
    snapshots: SnapshotResult[],
    meta: { symbol: string; verdict: string; score: number; type: string; reportId?: string }
  ): Promise<void> {
    const verdictColor = meta.verdict === 'GO' ? 0x00F5A0 :
                         meta.verdict.includes('CONDITIONAL') ? 0x00D4FF :
                         meta.verdict === 'WAIT' ? 0xFFB800 : 0xFF4757;

    // Discord supports max 10 embeds per message, max 10 files
    // Send all snapshots in one message with multiple embeds
    const images = snapshots.map((s, i) => ({
      buffer: s.buffer,
      title: i === 0 ? `📊 ${meta.symbol}/USDT — ${meta.type}` : s.title,
      description: i === 0 ? `Verdict: **${meta.verdict}** | Score: **${meta.score}/100**${meta.reportId ? `\n[View Full Report](https://traderpath.io/reports/${meta.reportId})` : ''}` : '',
      color: verdictColor,
    }));

    await socialNotificationService.sendDiscordMultiImage(webhookUrl, images);
  }
}

export const reportDistributionService = new ReportDistributionService();
