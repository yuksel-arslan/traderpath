// ===========================================
// Notification Center Service
// Centralized notification management
// ===========================================

import { prisma } from '../../core/database';
import { logger } from '../../core/logger';

// Notification types matching Prisma enum
type NotificationType = 'BRIEFING' | 'ALERT' | 'SIGNAL' | 'REWARD' | 'SYSTEM';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

interface ListNotificationsOptions {
  userId: string;
  type?: NotificationType;
  read?: boolean;
  page?: number;
  limit?: number;
}

class NotificationCenterService {

  /**
   * Create a new notification
   */
  async create(input: CreateNotificationInput): Promise<{ id: string }> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type as any,
          title: input.title,
          message: input.message,
          metadata: input.metadata || {},
        },
        select: { id: true },
      });

      return { id: notification.id };
    } catch (error) {
      logger.error({ error, input }, 'Failed to create notification');
      throw error;
    }
  }

  /**
   * Create notifications for multiple users (broadcast)
   */
  async broadcast(userIds: string[], type: NotificationType, title: string, message: string, metadata?: Record<string, unknown>): Promise<number> {
    try {
      const result = await prisma.notification.createMany({
        data: userIds.map((userId) => ({
          userId,
          type: type as any,
          title,
          message,
          metadata: metadata || {},
        })),
      });

      return result.count;
    } catch (error) {
      logger.error({ error }, 'Failed to broadcast notifications');
      throw error;
    }
  }

  /**
   * List notifications with filtering and pagination
   */
  async list(options: ListNotificationsOptions) {
    const { userId, type, read, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };
    if (type) where.type = type;
    if (read !== undefined) where.read = read;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: where as any,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          metadata: true,
          read: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where: where as any }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get unread count for a user (optionally by type)
   */
  async getUnreadCount(userId: string, type?: NotificationType): Promise<number> {
    const where: Record<string, unknown> = { userId, read: false };
    if (type) where.type = type;

    return prisma.notification.count({ where: where as any });
  }

  /**
   * Get unread counts grouped by type
   */
  async getUnreadCounts(userId: string): Promise<Record<string, number>> {
    const types: NotificationType[] = ['BRIEFING', 'ALERT', 'SIGNAL', 'REWARD', 'SYSTEM'];
    const counts: Record<string, number> = {};

    // Single query with groupBy would be ideal but Prisma groupBy is limited on enums
    // Use parallel count queries instead (fast with index)
    const results = await Promise.all(
      types.map(async (t) => ({
        type: t,
        count: await prisma.notification.count({
          where: { userId, type: t as any, read: false },
        }),
      })),
    );

    for (const r of results) {
      counts[r.type] = r.count;
    }

    counts.total = Object.values(counts).reduce((a, b) => a + b, 0);
    return counts;
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
    return result.count > 0;
  }

  /**
   * Mark all notifications as read for a user (optionally filtered by type)
   */
  async markAllAsRead(userId: string, type?: NotificationType): Promise<number> {
    const where: Record<string, unknown> = { userId, read: false };
    if (type) where.type = type;

    const result = await prisma.notification.updateMany({
      where: where as any,
      data: { read: true },
    });
    return result.count;
  }

  /**
   * Delete read notifications for a user
   */
  async clearRead(userId: string): Promise<number> {
    const result = await prisma.notification.deleteMany({
      where: { userId, read: true },
    });
    return result.count;
  }

  /**
   * Delete a single notification
   */
  async delete(notificationId: string, userId: string): Promise<boolean> {
    const result = await prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    });
    return result.count > 0;
  }
}

export const notificationCenterService = new NotificationCenterService();
