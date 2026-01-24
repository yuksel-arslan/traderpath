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
 */
export function startCoinScoreCacheJob(): void {
  // DISABLED: Automatic scanning removed to reduce platform costs
  // Users can request top coin scans on-demand for 300 credits
  console.log('[CoinScoreCache] Automatic cron job DISABLED - on-demand scanning only');
  return;

  /* DISABLED CODE - kept for reference
  if (cronJob) {
    console.log('[CoinScoreCache] Cron job already running');
    return;
  }

  // Run every 2 hours at minute 30 (e.g., 00:30, 02:30, 04:30, ...)
  cronJob = cron.schedule('30 */2 * * *', async () => {
    console.log('[CoinScoreCache] Starting scheduled coin scan...');
    try {
      const result = await coinScoreCacheService.scanAllCoins('4h');
      console.log(`[CoinScoreCache] Scan complete. Success: ${result.success}, Failed: ${result.failed}`);
    } catch (error) {
      console.error('[CoinScoreCache] Scheduled scan failed:', error);
    }
  });

  console.log('[CoinScoreCache] Cron job started - runs every 2 hours at minute 30');

  // Run initial scan on startup (with delay to let the server warm up)
  setTimeout(async () => {
    console.log('[CoinScoreCache] Running initial coin scan...');
    try {
      const isStale = await coinScoreCacheService.isCacheStale();
      if (isStale) {
        await coinScoreCacheService.scanAllCoins('4h');
        console.log('[CoinScoreCache] Initial scan complete');
      } else {
        console.log('[CoinScoreCache] Cache is fresh, skipping initial scan');
      }
    } catch (error) {
      console.error('[CoinScoreCache] Initial scan failed:', error);
    }
  }, 30000); // 30 seconds delay
  */
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
