// ===========================================
// Smart Alerts Service
// Monitors L1-L4 Capital Flow hierarchy changes
// and delivers notifications to subscribed users
// ===========================================

import * as cron from 'node-cron';
import { prisma } from '../../core/database';
import { redis } from '../../core/cache';
import { logger } from '../../core/logger';
import { getCapitalFlowSummary } from '../capital-flow/capital-flow.service';
import { notificationCenterService } from '../notifications/notification-center.service';
import {
  evaluateTriggers,
  buildSnapshot,
  type AlertSnapshot,
  type SmartAlert,
  type AlertLayer,
  type AlertSeverity,
} from './alert-triggers';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CACHE_KEY_SNAPSHOT = 'smart-alerts:snapshot';
const CACHE_KEY_LAST_RUN = 'smart-alerts:last-run';
const CACHE_KEY_COOLDOWN_PREFIX = 'smart-alerts:cooldown:';

/** Alert cooldown per type to avoid flooding – in seconds */
const ALERT_COOLDOWNS: Record<string, number> = {
  L1_LIQUIDITY_SHIFT: 3600,          // 1 hour
  L1_DXY_BREAKOUT: 3600,
  L1_VIX_SPIKE: 1800,                // 30 min for VIX (fast moving)
  L1_FED_BALANCE_SHEET_CHANGE: 86400, // 1 day (slow metric)
  L1_YIELD_CURVE_INVERSION: 86400,
  L2_MARKET_BIAS_CHANGE: 3600,
  L2_ROTATION_DETECTED: 3600,
  L2_PHASE_CHANGE: 7200,             // 2 hours
  L3_SECTOR_FLOW_ANOMALY: 3600,
  L3_SECTOR_DOMINANCE_SHIFT: 7200,
  L4_VOLUME_SPIKE: 3600,
  L4_RECOMMENDATION_CHANGE: 1800,
};

/** Default market preferences (all enabled) */
const ALL_MARKETS = ['crypto', 'stocks', 'bonds', 'metals', 'bist'];

// ---------------------------------------------------------------------------
// Types for user preferences
// ---------------------------------------------------------------------------

export interface SmartAlertPreference {
  userId: string;
  enabled: boolean;
  markets: string[];        // which markets the user cares about
  minSeverity: AlertSeverity; // minimum severity to receive
  emailEnabled: boolean;
  pushEnabled: boolean;
}

// ---------------------------------------------------------------------------
// Cron job handle
// ---------------------------------------------------------------------------

let cronJob: cron.ScheduledTask | null = null;
let isRunning = false;

// ---------------------------------------------------------------------------
// Core scan function
// ---------------------------------------------------------------------------

async function runSmartAlertScan(): Promise<{ alerts: SmartAlert[]; notified: number }> {
  if (isRunning) {
    logger.warn('[SmartAlerts] Scan already in progress, skipping');
    return { alerts: [], notified: 0 };
  }

  isRunning = true;
  const start = Date.now();

  try {
    // 1. Get current Capital Flow data
    const summary = await getCapitalFlowSummary();
    if (!summary) {
      logger.warn('[SmartAlerts] No Capital Flow data available');
      return { alerts: [], notified: 0 };
    }

    // 2. Load previous snapshot from cache
    let previousSnapshot: AlertSnapshot | null = null;
    try {
      const cached = await redis?.get(CACHE_KEY_SNAPSHOT);
      if (cached) {
        previousSnapshot = JSON.parse(cached);
      }
    } catch {
      // First run or cache miss – that's fine
    }

    // 3. Evaluate triggers
    const rawAlerts = evaluateTriggers(summary, previousSnapshot);

    // 4. Filter by cooldown (avoid spamming same alert type)
    const filteredAlerts: SmartAlert[] = [];
    for (const alert of rawAlerts) {
      const cooldownKey = `${CACHE_KEY_COOLDOWN_PREFIX}${alert.type}:${alert.market || 'global'}`;
      try {
        const inCooldown = await redis?.get(cooldownKey);
        if (inCooldown) continue;
      } catch {
        // If redis fails, still send the alert
      }
      filteredAlerts.push(alert);
    }

    // 5. Deliver alerts to subscribed users
    let totalNotified = 0;
    if (filteredAlerts.length > 0) {
      totalNotified = await deliverAlerts(filteredAlerts);

      // Set cooldowns for delivered alerts
      for (const alert of filteredAlerts) {
        const cooldownKey = `${CACHE_KEY_COOLDOWN_PREFIX}${alert.type}:${alert.market || 'global'}`;
        const ttl = ALERT_COOLDOWNS[alert.type] || 3600;
        try {
          await redis?.setex(cooldownKey, ttl, '1');
        } catch {
          // Non-critical
        }
      }
    }

    // 6. Save current snapshot for next comparison
    const currentSnapshot = buildSnapshot(summary);
    try {
      await redis?.setex(CACHE_KEY_SNAPSHOT, 86400, JSON.stringify(currentSnapshot)); // 24h TTL
      await redis?.set(CACHE_KEY_LAST_RUN, new Date().toISOString());
    } catch {
      // Non-critical
    }

    const duration = Date.now() - start;
    if (filteredAlerts.length > 0) {
      logger.info(
        { alertCount: filteredAlerts.length, notified: totalNotified, duration: `${duration}ms` },
        '[SmartAlerts] Scan complete',
      );
    }

    return { alerts: filteredAlerts, notified: totalNotified };
  } catch (error) {
    logger.error({ error }, '[SmartAlerts] Scan failed');
    return { alerts: [], notified: 0 };
  } finally {
    isRunning = false;
  }
}

// ---------------------------------------------------------------------------
// Deliver alerts to users via notification center
// ---------------------------------------------------------------------------

async function deliverAlerts(alerts: SmartAlert[]): Promise<number> {
  let totalNotified = 0;

  try {
    // Load all users with their alert preferences
    const prefs = await getAllUserPreferences();

    for (const alert of alerts) {
      // Find users who should receive this alert
      const eligibleUsers = prefs.filter((p) => {
        if (!p.enabled) return false;
        if (!passesSeverityFilter(alert.severity, p.minSeverity)) return false;
        if (alert.market && !p.markets.includes(alert.market)) return false;
        return true;
      });

      if (eligibleUsers.length === 0) continue;

      const userIds = eligibleUsers.map((u) => u.userId);

      // Broadcast via notification center
      try {
        const count = await notificationCenterService.broadcast(
          userIds,
          'ALERT',
          alert.title,
          alert.message,
          {
            type: alert.type,
            layer: alert.layer,
            severity: alert.severity,
            action: alert.action,
            market: alert.market || null,
            ...alert.metadata,
          },
        );
        totalNotified += count;
      } catch (err) {
        logger.error({ err, alertType: alert.type }, '[SmartAlerts] Failed to broadcast alert');
      }
    }
  } catch (error) {
    logger.error({ error }, '[SmartAlerts] Failed to deliver alerts');
  }

  return totalNotified;
}

// ---------------------------------------------------------------------------
// User preferences
// ---------------------------------------------------------------------------

/** Get preferences for all users. Uses metadata JSON in the Notification model's pattern. */
async function getAllUserPreferences(): Promise<SmartAlertPreference[]> {
  try {
    // Load from DB using the smart_alert_preferences table (or fallback to defaults)
    const rows = await prisma.$queryRawUnsafe<Array<{
      user_id: string;
      enabled: boolean;
      markets: string;
      min_severity: string;
      email_enabled: boolean;
      push_enabled: boolean;
    }>>(
      `SELECT user_id, enabled, markets, min_severity, email_enabled, push_enabled
       FROM smart_alert_preferences`
    );

    const fromDb: SmartAlertPreference[] = rows.map((r) => ({
      userId: r.user_id,
      enabled: r.enabled,
      markets: JSON.parse(r.markets),
      minSeverity: r.min_severity as AlertSeverity,
      emailEnabled: r.email_enabled,
      pushEnabled: r.push_enabled,
    }));

    // Also include users who don't have explicit preferences (default = enabled)
    const existingUserIds = new Set(fromDb.map((p) => p.userId));

    const allUsers = await prisma.user.findMany({
      select: { id: true },
    });

    for (const user of allUsers) {
      if (!existingUserIds.has(user.id)) {
        fromDb.push({
          userId: user.id,
          enabled: true,
          markets: [...ALL_MARKETS],
          minSeverity: 'WARNING',
          emailEnabled: false,
          pushEnabled: false,
        });
      }
    }

    return fromDb;
  } catch (error) {
    // If table doesn't exist yet, return defaults for all users
    logger.warn({ error }, '[SmartAlerts] Could not load preferences, using defaults');
    try {
      const allUsers = await prisma.user.findMany({ select: { id: true } });
      return allUsers.map((u) => ({
        userId: u.id,
        enabled: true,
        markets: [...ALL_MARKETS],
        minSeverity: 'WARNING' as AlertSeverity,
        emailEnabled: false,
        pushEnabled: false,
      }));
    } catch {
      return [];
    }
  }
}

/** Get preferences for a single user */
export async function getUserPreferences(userId: string): Promise<SmartAlertPreference> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{
      user_id: string;
      enabled: boolean;
      markets: string;
      min_severity: string;
      email_enabled: boolean;
      push_enabled: boolean;
    }>>(
      `SELECT user_id, enabled, markets, min_severity, email_enabled, push_enabled
       FROM smart_alert_preferences WHERE user_id = $1`,
      userId,
    );

    if (rows.length > 0) {
      const r = rows[0];
      return {
        userId: r.user_id,
        enabled: r.enabled,
        markets: JSON.parse(r.markets),
        minSeverity: r.min_severity as AlertSeverity,
        emailEnabled: r.email_enabled,
        pushEnabled: r.push_enabled,
      };
    }
  } catch {
    // Table may not exist – return defaults
  }

  return {
    userId,
    enabled: true,
    markets: [...ALL_MARKETS],
    minSeverity: 'WARNING',
    emailEnabled: false,
    pushEnabled: false,
  };
}

/** Upsert preferences for a single user */
export async function upsertUserPreferences(pref: SmartAlertPreference): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO smart_alert_preferences (user_id, enabled, markets, min_severity, email_enabled, push_enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         enabled = $2,
         markets = $3,
         min_severity = $4,
         email_enabled = $5,
         push_enabled = $6,
         updated_at = NOW()`,
      pref.userId,
      pref.enabled,
      JSON.stringify(pref.markets),
      pref.minSeverity,
      pref.emailEnabled,
      pref.pushEnabled,
    );
  } catch (error) {
    logger.error({ error }, '[SmartAlerts] Failed to save preferences');
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Recent smart alerts for a user (reads from notification center)
// ---------------------------------------------------------------------------

export async function getUserSmartAlerts(userId: string, options?: {
  layer?: AlertLayer;
  severity?: AlertSeverity;
  market?: string;
  page?: number;
  limit?: number;
}) {
  const { page = 1, limit = 20 } = options || {};

  // Query notification center for ALERT type
  const result = await notificationCenterService.list({
    userId,
    type: 'ALERT',
    page,
    limit,
  });

  let filtered = result.notifications;

  // Apply additional filters on metadata
  if (options?.layer) {
    filtered = filtered.filter((n) => {
      const meta = n.metadata as Record<string, unknown>;
      return meta?.layer === options.layer;
    });
  }
  if (options?.severity) {
    filtered = filtered.filter((n) => {
      const meta = n.metadata as Record<string, unknown>;
      return meta?.severity === options.severity;
    });
  }
  if (options?.market) {
    filtered = filtered.filter((n) => {
      const meta = n.metadata as Record<string, unknown>;
      return meta?.market === options.market || !meta?.market; // global alerts always pass
    });
  }

  return {
    alerts: filtered,
    pagination: result.pagination,
  };
}

// ---------------------------------------------------------------------------
// Status & admin
// ---------------------------------------------------------------------------

export async function getSmartAlertStatus(): Promise<{
  lastRun: string | null;
  isRunning: boolean;
  snapshotExists: boolean;
}> {
  let lastRun: string | null = null;
  let snapshotExists = false;

  try {
    lastRun = await redis?.get(CACHE_KEY_LAST_RUN) ?? null;
    const snap = await redis?.get(CACHE_KEY_SNAPSHOT);
    snapshotExists = !!snap;
  } catch {
    // Non-critical
  }

  return { lastRun, isRunning, snapshotExists };
}

/** Manually trigger a scan (for admin / testing) */
export async function triggerManualScan(): Promise<{ alerts: SmartAlert[]; notified: number }> {
  return runSmartAlertScan();
}

// ---------------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<AlertSeverity, number> = {
  INFO: 0,
  WARNING: 1,
  CRITICAL: 2,
};

function passesSeverityFilter(alertSeverity: AlertSeverity, minSeverity: AlertSeverity): boolean {
  return SEVERITY_RANK[alertSeverity] >= SEVERITY_RANK[minSeverity];
}

// ---------------------------------------------------------------------------
// Cron job management
// ---------------------------------------------------------------------------

/** Start the smart alerts cron job – runs every 15 minutes */
export function startSmartAlertJob(): void {
  if (cronJob) return;

  // Every 15 minutes
  cronJob = cron.schedule('*/15 * * * *', async () => {
    try {
      await runSmartAlertScan();
    } catch (error) {
      logger.error({ error }, '[SmartAlerts] Cron job error');
    }
  });

  logger.info('[SmartAlerts] Cron job started (every 15 minutes)');
}

/** Stop the smart alerts cron job */
export function stopSmartAlertJob(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info('[SmartAlerts] Cron job stopped');
  }
}
