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
    const existing = await cache.get(key);
    const metrics: SignalGeneratorMetrics = existing
      ? JSON.parse(existing)
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
        await collectError({
          error: result.error,
          context: {
            service: 'signal-generator',
            consecutiveFailures: metrics.consecutiveFailures,
            totalRuns: metrics.totalRuns,
          },
        });
      }

      // Alert if too many consecutive failures
      if (metrics.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        await this.alertGeneratorFailure(metrics);
      }
    }

    // Save metrics
    await cache.setex(key, CACHE_TTL, JSON.stringify(metrics));
  },

  /**
   * Get signal generator metrics
   */
  async getGeneratorMetrics(): Promise<SignalGeneratorMetrics | null> {
    const key = 'signal-monitoring:generator';
    const data = await cache.get(key);
    return data ? JSON.parse(data) : null;
  },

  /**
   * Alert for signal generator failure
   */
  async alertGeneratorFailure(metrics: SignalGeneratorMetrics): Promise<void> {
    // Report critical error to BILGE
    const error = new Error(
      `Signal Generator has failed ${metrics.consecutiveFailures} times consecutively. Last error: ${metrics.errorMessage}`
    );

    await collectError({
      error,
      context: {
        service: 'signal-generator',
        severity: 'critical',
        consecutiveFailures: metrics.consecutiveFailures,
        totalRuns: metrics.totalRuns,
        lastRunAt: metrics.lastRunAt,
      },
    });

    console.error('[SignalMonitoring] CRITICAL: Signal generator consecutive failures', {
      consecutiveFailures: metrics.consecutiveFailures,
      lastError: metrics.errorMessage,
      lastRunAt: metrics.lastRunAt,
    });
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
    const existing = await cache.get(key);
    const metrics: OutcomeTrackerMetrics = existing
      ? JSON.parse(existing)
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
        await collectError({
          error: result.error,
          context: {
            service: 'outcome-tracker',
            consecutiveFailures: metrics.consecutiveFailures,
            totalRuns: metrics.totalRuns,
          },
        });
      }

      // Alert if too many consecutive failures
      if (metrics.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        await this.alertTrackerFailure(metrics);
      }
    }

    // Save metrics
    await cache.setex(key, CACHE_TTL, JSON.stringify(metrics));
  },

  /**
   * Get outcome tracker metrics
   */
  async getTrackerMetrics(): Promise<OutcomeTrackerMetrics | null> {
    const key = 'signal-monitoring:tracker';
    const data = await cache.get(key);
    return data ? JSON.parse(data) : null;
  },

  /**
   * Alert for outcome tracker failure
   */
  async alertTrackerFailure(metrics: OutcomeTrackerMetrics): Promise<void> {
    // Report critical error to BILGE
    const error = new Error(
      `Outcome Tracker has failed ${metrics.consecutiveFailures} times consecutively. Last error: ${metrics.errorMessage}`
    );

    await collectError({
      error,
      context: {
        service: 'outcome-tracker',
        severity: 'critical',
        consecutiveFailures: metrics.consecutiveFailures,
        totalRuns: metrics.totalRuns,
        lastRunAt: metrics.lastRunAt,
      },
    });

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

    await collectError({
      error,
      context: {
        service: 'outcome-tracker',
        severity: 'high',
        signalsChecked: metrics.signalsChecked,
        errorsCount: metrics.errorsCount,
        errorRate,
      },
    });

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
    };
    tracker: {
      status: string;
      lastRun?: Date;
      consecutiveFailures: number;
    };
  }> {
    const generatorMetrics = await this.getGeneratorMetrics();
    const trackerMetrics = await this.getTrackerMetrics();

    const now = Date.now();
    const STALE_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours

    // Check generator health
    const generatorHealthy =
      generatorMetrics &&
      generatorMetrics.consecutiveFailures === 0 &&
      now - new Date(generatorMetrics.lastRunAt).getTime() < STALE_THRESHOLD;

    // Check tracker health
    const trackerHealthy =
      trackerMetrics &&
      trackerMetrics.consecutiveFailures === 0 &&
      now - new Date(trackerMetrics.lastRunAt).getTime() < 30 * 60 * 1000; // 30 minutes

    return {
      healthy: generatorHealthy && trackerHealthy,
      generator: {
        status: generatorHealthy ? 'healthy' : 'unhealthy',
        lastRun: generatorMetrics?.lastRunAt,
        consecutiveFailures: generatorMetrics?.consecutiveFailures || 0,
      },
      tracker: {
        status: trackerHealthy ? 'healthy' : 'unhealthy',
        lastRun: trackerMetrics?.lastRunAt,
        consecutiveFailures: trackerMetrics?.consecutiveFailures || 0,
      },
    };
  },
};
