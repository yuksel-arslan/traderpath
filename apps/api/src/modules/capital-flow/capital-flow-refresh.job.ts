/**
 * Capital Flow Smart Refresh Job
 *
 * Publication-aware cron scheduling that fetches data right after
 * each source publishes, instead of constant polling.
 *
 * Publication Schedule:
 *   M2 Money Supply  — Monthly, 4th Tuesday  16:15 ET → cron at 17:00 ET (21:00 UTC)
 *   Fed Balance Sheet — Weekly, Thursday      16:30 ET → cron at 17:00 ET (21:00 UTC)
 *   TGA              — Weekly, Thursday       16:30 ET → same as Fed BS
 *   Treasury Yields  — Daily (business days)  ~18:00 ET → cron at 18:30 ET (22:30 UTC)
 *   Reverse Repo     — Daily (business days)  ~15:15 ET → cron at 16:00 ET (20:00 UTC)
 *   DefiLlama TVL    — Daily                  ~00:00 UTC → cron at 01:00 UTC
 *   DXY / VIX        — Real-time (Yahoo)      → handled by MARKET cache (5 min)
 */

import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../../core/logger';
import { redis } from '../../core/cache';

// Import individual provider functions
import {
  getFedBalanceSheet,
  getM2MoneySupply,
  getTreasuryYields,
  getReverseRepo,
  getTreasuryGeneralAccount,
  getNetLiquidity,
} from './providers/fred.provider';
import { getAllDefiLlamaData } from './providers/defillama.provider';
import { runRegimePipeline } from './scoring/regime-pipeline.service';

// Cache keys and TTLs must stay in sync with capital-flow.service.ts
const CACHE_KEYS = {
  LIQUIDITY_M2: 'capital-flow:liquidity:m2',
  LIQUIDITY_FED_BS: 'capital-flow:liquidity:fed-bs',
  LIQUIDITY_TGA: 'capital-flow:liquidity:tga',
  LIQUIDITY_YIELDS: 'capital-flow:liquidity:yields',
  LIQUIDITY_RRP: 'capital-flow:liquidity:rrp',
  LIQUIDITY_NET: 'capital-flow:liquidity:net',
  DEFI_DATA: 'capital-flow:defi',
  // Invalidate composite so next request rebuilds it
  GLOBAL_LIQUIDITY: 'capital-flow:liquidity',
  CAPITAL_FLOW: 'capital-flow:summary',
};

const CACHE_TTL = {
  LIQUIDITY_SLOW: 604_800,    // 7 days
  LIQUIDITY_WEEKLY: 259_200,  // 3 days
  LIQUIDITY_DAILY: 21_600,    // 6 hours
  DEFI: 43_200,               // 12 hours
};

let scheduledTasks: ScheduledTask[] = [];

/**
 * Safely write data to Redis cache
 */
async function cacheWrite(key: string, ttl: number, data: unknown): Promise<void> {
  try {
    if (redis) {
      await redis.setex(key, ttl, JSON.stringify(data));
    }
  } catch (err) {
    logger.warn({ key, err }, '[CapitalFlowRefresh] Cache write failed');
  }
}

/**
 * Invalidate composite caches so the next request picks up fresh data
 */
async function invalidateComposites(): Promise<void> {
  try {
    if (redis) {
      await Promise.all([
        redis.del(CACHE_KEYS.GLOBAL_LIQUIDITY),
        redis.del(CACHE_KEYS.CAPITAL_FLOW),
      ]);
    }
  } catch (err) {
    logger.warn({ err }, '[CapitalFlowRefresh] Composite invalidation failed');
  }
}

/**
 * Refresh M2 Money Supply
 * Schedule: 4th Tuesday of each month, 21:00 UTC (17:00 ET)
 * Since node-cron can't express "4th Tuesday", we run every Tuesday at 21:00
 * and check if it's the 4th Tuesday programmatically.
 */
async function refreshM2(): Promise<void> {
  try {
    const now = new Date();
    const dayOfMonth = now.getUTCDate();
    // 4th Tuesday is between the 22nd and 28th
    if (dayOfMonth < 22 || dayOfMonth > 28) {
      return; // Not the 4th week
    }

    logger.info('[CapitalFlowRefresh] Fetching M2 Money Supply (monthly publication)');
    const data = await getM2MoneySupply();
    await cacheWrite(CACHE_KEYS.LIQUIDITY_M2, CACHE_TTL.LIQUIDITY_SLOW, {
      value: data.value,
      change30d: data.change30d,
      yoyGrowth: data.yoyGrowth,
    });
    await invalidateComposites();
    logger.info({ value: data.value }, '[CapitalFlowRefresh] M2 refreshed');
  } catch (error) {
    logger.error(error, '[CapitalFlowRefresh] M2 refresh failed');
  }
}

/**
 * Refresh Fed Balance Sheet + TGA (both publish Thursday)
 * Schedule: Every Thursday 21:00 UTC (17:00 ET)
 */
async function refreshWeeklyFred(): Promise<void> {
  try {
    logger.info('[CapitalFlowRefresh] Fetching weekly FRED data (Fed BS + TGA)');
    const [fedBs, tga, netLiq] = await Promise.all([
      getFedBalanceSheet(),
      getTreasuryGeneralAccount(),
      getNetLiquidity(),
    ]);

    await Promise.all([
      cacheWrite(CACHE_KEYS.LIQUIDITY_FED_BS, CACHE_TTL.LIQUIDITY_WEEKLY, {
        value: fedBs.value, change30d: fedBs.change30d, trend: fedBs.trend,
      }),
      cacheWrite(CACHE_KEYS.LIQUIDITY_TGA, CACHE_TTL.LIQUIDITY_WEEKLY, {
        value: tga.value, change7d: tga.change7d, change30d: tga.change30d, trend: tga.trend,
      }),
      cacheWrite(CACHE_KEYS.LIQUIDITY_NET, CACHE_TTL.LIQUIDITY_DAILY, {
        value: netLiq.value, change7d: netLiq.change7d, change30d: netLiq.change30d,
        trend: netLiq.trend, components: netLiq.components, interpretation: netLiq.interpretation,
      }),
    ]);
    await invalidateComposites();
    logger.info({ fedBs: fedBs.value, tga: tga.value }, '[CapitalFlowRefresh] Weekly FRED refreshed');
  } catch (error) {
    logger.error(error, '[CapitalFlowRefresh] Weekly FRED refresh failed');
  }
}

/**
 * Refresh daily FRED data (Treasury Yields)
 * Schedule: Mon-Fri 22:30 UTC (18:30 ET)
 */
async function refreshDailyYields(): Promise<void> {
  try {
    logger.info('[CapitalFlowRefresh] Fetching daily Treasury Yields');
    const yields = await getTreasuryYields();
    await cacheWrite(CACHE_KEYS.LIQUIDITY_YIELDS, CACHE_TTL.LIQUIDITY_DAILY, {
      spread10y2y: yields.spread10y2y, inverted: yields.inverted, interpretation: yields.interpretation,
    });
    await invalidateComposites();
    logger.info({ spread: yields.spread10y2y }, '[CapitalFlowRefresh] Yields refreshed');
  } catch (error) {
    logger.error(error, '[CapitalFlowRefresh] Yields refresh failed');
  }
}

/**
 * Refresh Reverse Repo (RRP)
 * Schedule: Mon-Fri 20:00 UTC (16:00 ET)
 */
async function refreshDailyRrp(): Promise<void> {
  try {
    logger.info('[CapitalFlowRefresh] Fetching daily Reverse Repo');
    const rrp = await getReverseRepo();
    await cacheWrite(CACHE_KEYS.LIQUIDITY_RRP, CACHE_TTL.LIQUIDITY_DAILY, {
      value: rrp.value, change7d: rrp.change7d, change30d: rrp.change30d, trend: rrp.trend,
    });

    // Also re-derive net liquidity since RRP is a component
    const netLiq = await getNetLiquidity();
    await cacheWrite(CACHE_KEYS.LIQUIDITY_NET, CACHE_TTL.LIQUIDITY_DAILY, {
      value: netLiq.value, change7d: netLiq.change7d, change30d: netLiq.change30d,
      trend: netLiq.trend, components: netLiq.components, interpretation: netLiq.interpretation,
    });

    await invalidateComposites();
    logger.info({ rrp: rrp.value }, '[CapitalFlowRefresh] RRP refreshed');
  } catch (error) {
    logger.error(error, '[CapitalFlowRefresh] RRP refresh failed');
  }
}

/**
 * Refresh DefiLlama data (TVL, chains, stablecoins, sectors)
 * Schedule: Daily 01:00 UTC (data publishes ~00:00 UTC)
 */
async function refreshDefiLlama(): Promise<void> {
  try {
    logger.info('[CapitalFlowRefresh] Fetching DefiLlama data');
    const data = await getAllDefiLlamaData();
    await cacheWrite(CACHE_KEYS.DEFI_DATA, CACHE_TTL.DEFI, data);
    await invalidateComposites();
    logger.info({ tvl: data.tvl?.current }, '[CapitalFlowRefresh] DefiLlama refreshed');
  } catch (error) {
    logger.error(error, '[CapitalFlowRefresh] DefiLlama refresh failed');
  }
}

/**
 * Refresh Regime Score
 * Runs after any FRED/market data update to recompute GLRS + regime.
 * Also scheduled independently every 5 minutes during market hours.
 */
async function refreshRegimeScore(): Promise<void> {
  try {
    logger.info('[CapitalFlowRefresh] Running regime scoring pipeline');
    const { result, change } = await runRegimePipeline();
    logger.info(
      { score: result.glrs.score, regime: result.glrs.regime },
      '[CapitalFlowRefresh] Regime score updated',
    );
    if (change) {
      logger.warn(
        { from: change.previousRegime, to: change.currentRegime, direction: change.direction },
        '[CapitalFlowRefresh] REGIME CHANGE DETECTED',
      );
    }
  } catch (error) {
    logger.error(error, '[CapitalFlowRefresh] Regime scoring failed');
  }
}

/**
 * Start all publication-aware refresh cron jobs
 */
export function startCapitalFlowRefreshJobs(): void {
  // M2: Every Tuesday at 21:00 UTC (function checks if 4th Tuesday)
  scheduledTasks.push(
    cron.schedule('0 21 * * 2', refreshM2, { timezone: 'UTC' })
  );

  // Fed BS + TGA: Every Thursday at 21:00 UTC
  scheduledTasks.push(
    cron.schedule('0 21 * * 4', refreshWeeklyFred, { timezone: 'UTC' })
  );

  // Treasury Yields: Mon-Fri at 22:30 UTC (18:30 ET)
  scheduledTasks.push(
    cron.schedule('30 22 * * 1-5', refreshDailyYields, { timezone: 'UTC' })
  );

  // Reverse Repo: Mon-Fri at 20:00 UTC (16:00 ET)
  scheduledTasks.push(
    cron.schedule('0 20 * * 1-5', refreshDailyRrp, { timezone: 'UTC' })
  );

  // DefiLlama: Daily at 01:00 UTC
  scheduledTasks.push(
    cron.schedule('0 1 * * *', refreshDefiLlama, { timezone: 'UTC' })
  );

  // Regime Score: Every 5 minutes during market hours (14:30–21:00 UTC = US market)
  // Also runs at 21:05 UTC after weekly FRED data lands
  scheduledTasks.push(
    cron.schedule('*/5 14-21 * * 1-5', refreshRegimeScore, { timezone: 'UTC' })
  );
  // And once after each FRED refresh
  scheduledTasks.push(
    cron.schedule('5 21 * * 4', refreshRegimeScore, { timezone: 'UTC' })
  );

  logger.info('[CapitalFlowRefresh] Smart refresh cron jobs started:');
  logger.info('  M2:           Tuesdays 21:00 UTC (4th week only)');
  logger.info('  Fed BS+TGA:   Thursdays 21:00 UTC');
  logger.info('  Yields:       Mon-Fri 22:30 UTC');
  logger.info('  RRP:          Mon-Fri 20:00 UTC');
  logger.info('  DefiLlama:    Daily 01:00 UTC');
  logger.info('  Regime Score: Every 5 min during US market hours');
}

/**
 * Stop all cron jobs (for graceful shutdown)
 */
export function stopCapitalFlowRefreshJobs(): void {
  for (const task of scheduledTasks) {
    task.stop();
  }
  scheduledTasks = [];
  logger.info('[CapitalFlowRefresh] Cron jobs stopped');
}
