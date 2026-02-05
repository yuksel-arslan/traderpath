/**
 * Idempotency Service
 * Prevents duplicate webhook processing using Redis cache
 */

import { cache } from './cache';
import { logger } from './logger';

const IDEMPOTENCY_PREFIX = 'webhook_processed:';
const IDEMPOTENCY_TTL = 86400; // 24 hours

export class IdempotencyService {
  /**
   * Check if a webhook has already been processed
   * Returns true if already processed
   */
  async isProcessed(eventId: string, eventType: string): Promise<boolean> {
    const key = this.getKey(eventId, eventType);

    try {
      const exists = await cache.get(key);
      return exists !== null;
    } catch (error) {
      logger.error({ error, key }, '[Idempotency] Failed to check if processed');
      // Fail open - allow processing if Redis is down
      return false;
    }
  }

  /**
   * Mark a webhook as processed
   * Returns true if successfully marked, false if already exists
   */
  async markAsProcessed(eventId: string, eventType: string, metadata?: Record<string, unknown>): Promise<boolean> {
    const key = this.getKey(eventId, eventType);

    try {
      // Try to set with NX (only if not exists)
      const data = {
        processedAt: new Date().toISOString(),
        eventType,
        eventId,
        ...metadata,
      };

      const result = await cache.setNX(key, JSON.stringify(data), IDEMPOTENCY_TTL);

      if (!result) {
        logger.warn({ key, eventType, eventId }, '[Idempotency] Webhook already processed');
        return false;
      }

      logger.info({ key, eventType, eventId }, '[Idempotency] Webhook marked as processed');
      return true;
    } catch (error) {
      logger.error({ error, key }, '[Idempotency] Failed to mark as processed');
      // Fail open - allow processing if Redis is down
      return true;
    }
  }

  /**
   * Get the processed webhook metadata
   */
  async getProcessedMetadata(eventId: string, eventType: string): Promise<Record<string, unknown> | null> {
    const key = this.getKey(eventId, eventType);

    try {
      const data = await cache.get(key);
      if (!data) return null;

      return JSON.parse(data as string);
    } catch (error) {
      logger.error({ error, key }, '[Idempotency] Failed to get metadata');
      return null;
    }
  }

  /**
   * Clear a webhook processing record (for testing/debugging)
   */
  async clear(eventId: string, eventType: string): Promise<void> {
    const key = this.getKey(eventId, eventType);

    try {
      await cache.del(key);
      logger.info({ key }, '[Idempotency] Cleared webhook record');
    } catch (error) {
      logger.error({ error, key }, '[Idempotency] Failed to clear record');
    }
  }

  /**
   * Generate cache key
   */
  private getKey(eventId: string, eventType: string): string {
    return `${IDEMPOTENCY_PREFIX}${eventType}:${eventId}`;
  }
}

export const idempotencyService = new IdempotencyService();
