/**
 * BILGE Guardian System - Cron Jobs
 *
 * Weekly report generation (Sunday 21:00 UTC+3)
 */

import cron, { type ScheduledTask } from 'node-cron';
import { generateWeeklyReport } from './bilge.service';
import { sendNotification } from './notification.service';
import { NotificationMessage } from './types';
import { logger } from '../../core/logger';

let weeklyReportJob: ScheduledTask | null = null;

/**
 * Start the BILGE weekly report cron job
 * Runs every Sunday at 21:00 UTC+3 (18:00 UTC)
 */
export function startBilgeWeeklyReportJob(): void {
  // Schedule: At 18:00 UTC on Sunday (21:00 UTC+3)
  // Cron format: minute hour day-of-month month day-of-week
  weeklyReportJob = cron.schedule('0 18 * * 0', async () => {
    logger.info('[BILGE] Generating weekly report...');

    try {
      // Generate report for TraderPath
      const report = await generateWeeklyReport('traderpath');

      // Create notification message
      const message: NotificationMessage = {
        channel: 'slack',
        severity: report.summary.criticalErrors > 0 ? 'high' : 'low',
        title: `BILGE Weekly Report - ${new Date().toLocaleDateString()}`,
        message: formatWeeklyReportMessage(report),
        project: 'traderpath',
        dashboardLink: 'https://traderpath.io/admin/bilge',
        timestamp: new Date(),
      };

      // Send to Slack and Discord
      await sendNotification(message, ['slack', 'discord']);

      logger.info('[BILGE] Weekly report generated and sent successfully');
    } catch (error) {
      logger.error('[BILGE] Failed to generate weekly report:', error);
    }
  }, {
    timezone: 'UTC',
  });

  logger.info('[BILGE] Weekly report cron job started (Sunday 21:00 UTC+3)');
}

/**
 * Stop the BILGE weekly report cron job
 */
export function stopBilgeWeeklyReportJob(): void {
  if (weeklyReportJob) {
    weeklyReportJob.stop();
    weeklyReportJob = null;
    logger.info('[BILGE] Weekly report cron job stopped');
  }
}

/**
 * Format weekly report for notification
 */
function formatWeeklyReportMessage(report: any): string {
  const trendEmoji = report.trends.errorTrend === 'increasing' ? '📈' :
                     report.trends.errorTrend === 'decreasing' ? '📉' : '➡️';

  let message = `**Weekly Summary (${new Date(report.weekStart).toLocaleDateString()} - ${new Date(report.weekEnd).toLocaleDateString()})**\n\n`;

  message += `📊 **Statistics:**\n`;
  message += `• Total Errors: ${report.summary.totalErrors}\n`;
  message += `• Critical Errors: ${report.summary.criticalErrors}\n`;
  message += `• Resolved Errors: ${report.summary.resolvedErrors}\n`;
  message += `• Uptime: ${report.summary.uptime}%\n`;
  message += `• Trend: ${trendEmoji} ${report.trends.comparedToLastWeek > 0 ? '+' : ''}${report.trends.comparedToLastWeek}% vs last week\n\n`;

  if (report.topIssues.length > 0) {
    message += `🔥 **Top Issues:**\n`;
    report.topIssues.slice(0, 3).forEach((issue: any, index: number) => {
      message += `${index + 1}. ${issue.patternName} (${issue.count}x) - ${issue.severity.toUpperCase()}\n`;
    });
    message += '\n';
  }

  if (report.recommendations.length > 0) {
    message += `💡 **Recommendations:**\n`;
    report.recommendations.slice(0, 3).forEach((rec: string, index: number) => {
      message += `${index + 1}. ${rec}\n`;
    });
  }

  return message;
}

export default {
  startBilgeWeeklyReportJob,
  stopBilgeWeeklyReportJob,
};
