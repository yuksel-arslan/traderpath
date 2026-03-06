/**
 * Signal Monitoring Service
 * Tracks signal job health and performance
 * Integrates with BILGE Guardian for alerting
 */

import { cache } from '../../core/cache';
import { collectError } from '../bilge/bilge.service';

// ===========================================
// TYPES
// ===========================================

interface JobMetrics {
  lastRunAt: Date;
  lastStatus: 'success' | 'failure';
  lastDuration: number; // milliseconds
  consecutiveFailures: number;
  totalRuns: number;
  totalFailures: number;
  errorMessage?: string;
}

interface SignalGeneratorMetrics extends JobMetrics {
  signalsGenerated: number;
  signalsPublished: number;
  averageConfidence: number;
}

interface OutcomeTrackerMetrics extends JobMetrics {
  signalsChecked: number;
  outcomesUpdated: number;
  errorsCount: number;
}

// ===========================================
// CONSTANTS
// ===========================================

const CACHE_TTL = 86400; // 24 hours
const MAX_CONSECUTIVE_FAILURES = 3; // Alert threshold

// ===========================================
// SIGNAL GENERATOR MONITORING
// ===========================================

export const signalMonitoring = {
  /**
   * Record signal generator job execution
   */
  async recordGeneratorRun(result: {
    success: boolean;
    duration: number;
    signalsGenerated?: number;
    signalsPublished?: number;
    averageConfidence?: number;
    error?: Error;
  }): Promise<void> {
    const key = 'signal-monitoring:generator';

    // Get existing metrics
    const existing = await cache.get<SignalGeneratorMetrics>(key);
    const metrics: SignalGeneratorMetrics = existing
      ? existing
      : {
          lastRunAt: new Date(),
          lastStatus: 'success',
          lastDuration: 0,
          consecutiveFailures: 0,
          totalRuns: 0,
          totalFailures: 0,
          signalsGenerated: 0,
          signalsPublished: 0,
          averageConfidence: 0,
        };

    // Update metrics
    metrics.lastRunAt = new Date();
    metrics.lastStatus = result.success ? 'success' : 'failure';
    metrics.lastDuration = result.duration;
    metrics.totalRuns += 1;

    if (result.success) {
      metrics.consecutiveFailures = 0;
      metrics.signalsGenerated = result.signalsGenerated || 0;
      metrics.signalsPublished = result.signalsPublished || 0;
      metrics.averageConfidence = result.averageConfidence || 0;
    } else {
      metrics.consecutiveFailures += 1;
      metrics.totalFailures += 1;
      metrics.errorMessage = result.error?.message || 'Unknown error';

      // Report to BILGE Guardian
      if (result.error) {
        try {
          await collectError({
            message: result.error.message || 'Signal generator error',
            stack: result.error.stack,
            code: 'SIGNAL_GENERATOR_ERROR',
          });
        } catch { /* don't crash on monitoring failure */ }
      }

      // Alert if too many consecutive failures
      if (metrics.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        try { await this.alertGeneratorFailure(metrics); } catch { /* ignore */ }
      }
    }

    // Save metrics
    try {
      await cache.set(key, JSON.stringify(metrics), CACHE_TTL);
    } catch { /* don't crash on cache failure */ }
  },

  /**
   * Get signal generator metrics
   */
  async getGeneratorMetrics(): Promise<SignalGeneratorMetrics | null> {
    const key = 'signal-monitoring:generator';
    return await cache.get<SignalGeneratorMetrics>(key);
  },

  /**
   * Alert for signal generator failure
   */
  async alertGeneratorFailure(metrics: SignalGeneratorMetrics): Promise<void> {
    // Report critical error to BILGE
    const error = new Error(
      `Signal Generator has failed ${metrics.consecutiveFailures} times consecutively. Last error: ${metrics.errorMessage}`
    );

    try {
      await collectError({
        message: error.message,
        stack: error.stack,
        code: 'SIGNAL_GENERATOR_CRITICAL',
      });
    } catch { /* ignore */ }

    console.error('[SignalMonitoring] CRITICAL: Signal generator consecutive failures', {
      consecutiveFailures: metrics.consecutiveFailures,
      lastError: metrics.errorMessage,
      lastRunAt: metrics.lastRunAt,
    });
  },

  // ===========================================
  // AUTOEDGE GENERATOR MONITORING
  // ===========================================

  /**
   * Record AutoEdge generator job execution
   */
  async recordAutoEdgeRun(result: {
    success: boolean;
    duration: number;
    signalsGenerated?: number;
    signalsPublished?: number;
    symbolsScanned?: number;
    averageConfidence?: number;
    error?: Error;
  }): Promise<void> {
    const key = 'signal-monitoring:autoedge';

    const existing = await cache.get<SignalGeneratorMetrics & { symbolsScanned: number }>(key);
    const metrics = existing
      ? existing
      : {
          lastRunAt: new Date(),
          lastStatus: 'success' as const,
          lastDuration: 0,
          consecutiveFailures: 0,
          totalRuns: 0,
          totalFailures: 0,
          signalsGenerated: 0,
          signalsPublished: 0,
          averageConfidence: 0,
          symbolsScanned: 0,
        };

    metrics.lastRunAt = new Date();
    metrics.lastStatus = result.success ? 'success' : 'failure';
    metrics.lastDuration = result.duration;
    metrics.totalRuns += 1;

    if (result.success) {
      metrics.consecutiveFailures = 0;
      metrics.signalsGenerated = result.signalsGenerated || 0;
      metrics.signalsPublished = result.signalsPublished || 0;
      metrics.averageConfidence = result.averageConfidence || 0;
      metrics.symbolsScanned = result.symbolsScanned || 0;
    } else {
      metrics.consecutiveFailures += 1;
      metrics.totalFailures += 1;
      metrics.errorMessage = result.error?.message || 'Unknown error';

      if (result.error) {
        try {
          await collectError({
            message: result.error.message || 'AutoEdge generator error',
            stack: result.error.stack,
            code: 'AUTOEDGE_GENERATOR_ERROR',
          });
        } catch { /* don't crash on monitoring failure */ }
      }

      if (metrics.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        console.error('[SignalMonitoring] CRITICAL: AutoEdge consecutive failures', {
          consecutiveFailures: metrics.consecutiveFailures,
          lastError: metrics.errorMessage,
        });
      }
    }

    try {
      await cache.set(key, JSON.stringify(metrics), CACHE_TTL);
    } catch { /* don't crash on cache failure */ }
  },

  /**
   * Get AutoEdge generator metrics
   */
  async getAutoEdgeMetrics(): Promise<(SignalGeneratorMetrics & { symbolsScanned: number }) | null> {
    const key = 'signal-monitoring:autoedge';
    return await cache.get<SignalGeneratorMetrics & { symbolsScanned: number }>(key);
  },

  // ===========================================
  // OUTCOME TRACKER MONITORING
  // ===========================================

  /**
   * Record outcome tracker job execution
   */
  async recordTrackerRun(result: {
    success: boolean;
    duration: number;
    checked?: number;
    updated?: number;
    errors?: number;
    error?: Error;
  }): Promise<void> {
    const key = 'signal-monitoring:tracker';

    // Get existing metrics
    const existing = await cache.get<OutcomeTrackerMetrics>(key);
    const metrics: OutcomeTrackerMetrics = existing
      ? existing
      : {
          lastRunAt: new Date(),
          lastStatus: 'success',
          lastDuration: 0,
          consecutiveFailures: 0,
          totalRuns: 0,
          totalFailures: 0,
          signalsChecked: 0,
          outcomesUpdated: 0,
          errorsCount: 0,
        };

    // Update metrics
    metrics.lastRunAt = new Date();
    metrics.lastStatus = result.success ? 'success' : 'failure';
    metrics.lastDuration = result.duration;
    metrics.totalRuns += 1;

    if (result.success) {
      metrics.consecutiveFailures = 0;
      metrics.signalsChecked = result.checked || 0;
      metrics.outcomesUpdated = result.updated || 0;
      metrics.errorsCount = result.errors || 0;

      // Alert if high error rate
      if (metrics.signalsChecked > 0 && metrics.errorsCount / metrics.signalsChecked > 0.5) {
        await this.alertTrackerHighErrorRate(metrics);
      }
    } else {
      metrics.consecutiveFailures += 1;
      metrics.totalFailures += 1;
      metrics.errorMessage = result.error?.message || 'Unknown error';

      // Report to BILGE Guardian
      if (result.error) {
        try {
          await collectError({
            message: result.error.message || 'Outcome tracker error',
            stack: result.error.stack,
            code: 'OUTCOME_TRACKER_ERROR',
          });
        } catch { /* don't crash on monitoring failure */ }
      }

      // Alert if too many consecutive failures
      if (metrics.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        try { await this.alertTrackerFailure(metrics); } catch { /* ignore */ }
      }
    }

    // Save metrics
    try {
      await cache.set(key, JSON.stringify(metrics), CACHE_TTL);
    } catch { /* don't crash on cache failure */ }
  },

  /**
   * Get outcome tracker metrics
   */
  async getTrackerMetrics(): Promise<OutcomeTrackerMetrics | null> {
    const key = 'signal-monitoring:tracker';
    return await cache.get<OutcomeTrackerMetrics>(key);
  },

  /**
   * Alert for outcome tracker failure
   */
  async alertTrackerFailure(metrics: OutcomeTrackerMetrics): Promise<void> {
    // Report critical error to BILGE
    const error = new Error(
      `Outcome Tracker has failed ${metrics.consecutiveFailures} times consecutively. Last error: ${metrics.errorMessage}`
    );

    try {
      await collectError({
        message: error.message,
        stack: error.stack,
        code: 'OUTCOME_TRACKER_CRITICAL',
      });
    } catch { /* ignore */ }

    console.error('[SignalMonitoring] CRITICAL: Outcome tracker consecutive failures', {
      consecutiveFailures: metrics.consecutiveFailures,
      lastError: metrics.errorMessage,
      lastRunAt: metrics.lastRunAt,
    });
  },

  /**
   * Alert for high error rate in tracker
   */
  async alertTrackerHighErrorRate(metrics: OutcomeTrackerMetrics): Promise<void> {
    const errorRate = (metrics.errorsCount / metrics.signalsChecked) * 100;

    const error = new Error(
      `Outcome Tracker has high error rate: ${errorRate.toFixed(1)}% (${metrics.errorsCount}/${metrics.signalsChecked})`
    );

    try {
      await collectError({
        message: error.message,
        stack: error.stack,
        code: 'OUTCOME_TRACKER_HIGH_ERROR_RATE',
      });
    } catch { /* ignore */ }

    console.warn('[SignalMonitoring] WARNING: High error rate in outcome tracker', {
      errorRate,
      signalsChecked: metrics.signalsChecked,
      errorsCount: metrics.errorsCount,
    });
  },

  // ===========================================
  // HEALTH CHECK
  // ===========================================

  /**
   * Get overall signal system health
   */
  async getSystemHealth(): Promise<{
    healthy: boolean;
    generator: {
      status: string;
      lastRun?: Date;
      consecutiveFailures: number;
      schedule: string;
      active: boolean;
    };
    autoedge: {
      status: string;
      lastRun?: Date;
      consecutiveFailures: number;
      schedule: string;
      active: boolean;
    };
    tracker: {
      status: string;
      lastRun?: Date;
      consecutiveFailures: number;
    };
  }> {
    const generatorMetrics = await this.getGeneratorMetrics();
    const autoedgeMetrics = await this.getAutoEdgeMetrics();
    const trackerMetrics = await this.getTrackerMetrics();

    const now = Date.now();
    const GENERATOR_STALE = 5 * 60 * 60 * 1000; // 5 hours (runs every 4h)
    const AUTOEDGE_STALE = 20 * 60 * 1000; // 20 minutes (runs every 15m)
    const TRACKER_STALE = 30 * 60 * 1000; // 30 minutes

    // Check generator health — considered active if ran within expected window
    const generatorLastRun = generatorMetrics ? now - new Date(generatorMetrics.lastRunAt).getTime() : Infinity;
    const generatorHealthy = generatorMetrics &&
      generatorMetrics.consecutiveFailures === 0 &&
      generatorLastRun < GENERATOR_STALE;

    // Check AutoEdge health
    const autoedgeLastRun = autoedgeMetrics ? now - new Date(autoedgeMetrics.lastRunAt).getTime() : Infinity;
    const autoedgeHealthy = autoedgeMetrics &&
      autoedgeMetrics.consecutiveFailures === 0 &&
      autoedgeLastRun < AUTOEDGE_STALE;

    // Check tracker health
    const trackerHealthy = trackerMetrics &&
      trackerMetrics.consecutiveFailures === 0 &&
      (now - new Date(trackerMetrics.lastRunAt).getTime()) < TRACKER_STALE;

    return {
      healthy: (generatorHealthy || false) && (autoedgeHealthy || false) && (trackerHealthy || false),
      generator: {
        status: generatorHealthy ? 'healthy' : generatorMetrics ? 'unhealthy' : 'never_run',
        lastRun: generatorMetrics?.lastRunAt,
        consecutiveFailures: generatorMetrics?.consecutiveFailures || 0,
        schedule: '15 2,6,10,14,18,22 * * *', // Every 4h at :15
        active: generatorLastRun < GENERATOR_STALE,
      },
      autoedge: {
        status: autoedgeHealthy ? 'healthy' : autoedgeMetrics ? 'unhealthy' : 'never_run',
        lastRun: autoedgeMetrics?.lastRunAt,
        consecutiveFailures: autoedgeMetrics?.consecutiveFailures || 0,
        schedule: '*/15 * * * *', // Every 15 minutes
        active: autoedgeLastRun < AUTOEDGE_STALE,
      },
      tracker: {
        status: trackerHealthy ? 'healthy' : 'unhealthy',
        lastRun: trackerMetrics?.lastRunAt,
        consecutiveFailures: trackerMetrics?.consecutiveFailures || 0,
      },
    };
  },
};
