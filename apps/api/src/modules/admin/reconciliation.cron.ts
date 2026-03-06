// ===========================================
// Payment Reconciliation Cron Job
// Runs daily at 3 AM to check for discrepancies
// ===========================================

import cron from 'node-cron';
import type { ScheduledTask } from 'node-cron';
import { reconciliationService } from './reconciliation.service';
import { logger } from '../../core/logger';

let reconciliationJob: ScheduledTask | null = null;

/**
 * Start daily reconciliation job
 * Runs every day at 3:00 AM UTC
 */
export function startReconciliationJob() {
  if (reconciliationJob) {
    logger.warn('Reconciliation job already running');
    return;
  }

  // Schedule: Every day at 3:00 AM UTC
  reconciliationJob = cron.schedule('0 3 * * *', async () => {
    logger.info('Starting scheduled payment reconciliation');

    try {
      const report = await reconciliationService.runReconciliation({
        fixDiscrepancies: true, // Auto-fix discrepancies
        checkLemonSqueezy: true,
        checkStripe: true,
        checkCredits: true,
      });

      logger.info({ report: report.summary }, 'Scheduled reconciliation completed');

      // Log if there were any issues
      if (report.summary.totalIssues > 0) {
        logger.warn(
          {
            totalIssues: report.summary.totalIssues,
            fixed: report.summary.fixedIssues,
            lemonSqueezy: report.lemonSqueezy.discrepancies.length,
            stripe: report.stripe.discrepancies.length,
            credits: report.credits.discrepancies.length,
          },
          'Reconciliation found and fixed discrepancies'
        );
      }
    } catch (error: any) {
      logger.error({ error: error.message }, 'Scheduled reconciliation failed');
    }
  });

  logger.info('Reconciliation cron job started (runs daily at 3:00 AM UTC)');
}

/**
 * Stop reconciliation job
 */
export function stopReconciliationJob() {
  if (reconciliationJob) {
    reconciliationJob.stop();
    reconciliationJob = null;
    logger.info('Reconciliation cron job stopped');
  }
}
