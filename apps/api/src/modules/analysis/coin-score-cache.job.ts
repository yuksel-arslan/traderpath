// ===========================================
// Coin Score Cache Job
// DISABLED: Automatic scanning removed to reduce costs
// Now triggered on-demand by user request (300 credits)
// ===========================================

import cron from 'node-cron';
import { coinScoreCacheService } from './services/coin-score-cache.service';

let cronJob: cron.ScheduledTask | null = null;

/**
 * Start the coin score cache cron job
 * DISABLED: Automatic scanning removed - now on-demand only
 * Users can request top coin scans on-demand for 300 credits
 */
export function startCoinScoreCacheJob(): void {
  console.log('[CoinScoreCache] Automatic cron job DISABLED - on-demand scanning only');
}

/**
 * Stop the coin score cache cron job
 */
export function stopCoinScoreCacheJob(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[CoinScoreCache] Cron job stopped');
  }
}

/**
 * Manually trigger a scan (for admin or paid user request)
 * Cost: 300 credits for users (discounted from 750)
 */
export async function triggerManualScan(): Promise<{ success: number; failed: number }> {
  console.log('[CoinScoreCache] Manual scan triggered');
  const result = await coinScoreCacheService.scanAllCoins('4h');
  return { success: result.success, failed: result.failed };
}
