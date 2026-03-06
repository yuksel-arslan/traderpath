/**
 * Subscription Cron Jobs
 *
 * Daily credit allocation for active subscribers (00:00 UTC)
 */

import cron, { type ScheduledTask } from 'node-cron';
import { subscriptionService } from './subscription.service';
import { logger } from '../../core/logger';

let dailyCreditsJob: ScheduledTask | null = null;

/**
 * Start the daily credit allocation cron job
 * Runs every day at 00:00 UTC
 */
export function startDailyCreditsJob(): void {
  // Schedule: At 00:00 UTC every day
  // Cron format: minute hour day-of-month month day-of-week
  dailyCreditsJob = cron.schedule('0 0 * * *', async () => {
    logger.info('[SUBSCRIPTION] Starting daily credit allocation...');

    try {
      const processed = await subscriptionService.processDailyCreditsForAllSubscribers();
      logger.info(`[SUBSCRIPTION] Daily credits allocated for ${processed} subscribers`);
    } catch (error) {
      logger.error('[SUBSCRIPTION] Failed to allocate daily credits:', error);
    }
  }, {
    timezone: 'UTC',
  });

  logger.info('[SUBSCRIPTION] Daily credits cron job started (00:00 UTC)');
}

/**
 * Stop the daily credit allocation cron job
 */
export function stopDailyCreditsJob(): void {
  if (dailyCreditsJob) {
    dailyCreditsJob.stop();
    dailyCreditsJob = null;
    logger.info('[SUBSCRIPTION] Daily credits cron job stopped');
  }
}

export default {
  startDailyCreditsJob,
  stopDailyCreditsJob,
};
