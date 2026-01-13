// ===========================================
// Notification Service
// Handles Browser Push, Telegram, Discord, TradingView alerts
// ===========================================

import { prisma } from '../../core/database';
import webpush from 'web-push';

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@traderpath.io';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('[Web Push] VAPID keys configured');
} else {
  console.warn('[Web Push] VAPID keys not configured - push notifications disabled');
}

export interface NotificationPayload {
  userId: string;
  symbol: string;
  alertType: string;
  targetPrice: number;
  currentPrice: number;
  direction: 'ABOVE' | 'BELOW';
  note?: string;
}

export interface UserNotificationSettings {
  browserPush?: {
    enabled: boolean;
    subscription?: PushSubscription;
  };
  telegram?: {
    enabled: boolean;
    chatId?: string;
    botToken?: string;
  };
  discord?: {
    enabled: boolean;
    webhookUrl?: string;
  };
  tradingView?: {
    enabled: boolean;
    webhookUrl?: string;
  };
}

class NotificationService {
  /**
   * Send notification to all configured channels
   */
  async sendAlert(payload: NotificationPayload, channels: string[]): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { notificationSettings: true, name: true },
    });

    if (!user) return;

    const settings = (user.notificationSettings as UserNotificationSettings) || {};
    const promises: Promise<void>[] = [];

    if (channels.includes('browser') && settings.browserPush?.enabled) {
      promises.push(this.sendBrowserPush(payload, settings.browserPush));
    }

    if (channels.includes('telegram') && settings.telegram?.enabled) {
      promises.push(this.sendTelegram(payload, settings.telegram));
    }

    if (channels.includes('discord') && settings.discord?.enabled) {
      promises.push(this.sendDiscord(payload, settings.discord));
    }

    if (channels.includes('tradingview') && settings.tradingView?.enabled) {
      promises.push(this.sendTradingView(payload, settings.tradingView));
    }

    await Promise.allSettled(promises);
  }

  /**
   * Send browser push notification using web-push
   */
  private async sendBrowserPush(
    payload: NotificationPayload,
    settings: UserNotificationSettings['browserPush']
  ): Promise<void> {
    if (!settings?.subscription) {
      console.log('[Browser Push] No subscription found');
      return;
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.warn('[Browser Push] VAPID keys not configured');
      return;
    }

    const emoji = payload.alertType === 'SL' ? '🔴' :
                  payload.alertType.startsWith('TP') ? '🟢' :
                  payload.alertType === 'ENTRY' ? '🔵' : '🔔';

    const alertName = {
      ENTRY: 'Entry Zone',
      TP1: 'Take Profit 1',
      TP2: 'Take Profit 2',
      TP3: 'Take Profit 3',
      SL: 'Stop Loss',
      CUSTOM: 'Custom Alert',
    }[payload.alertType] || payload.alertType;

    const notificationPayload = JSON.stringify({
      title: `${emoji} ${payload.symbol} Alert`,
      body: `${alertName} reached at $${payload.currentPrice.toLocaleString()}`,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: `alert-${payload.symbol}-${payload.alertType}`,
      data: {
        symbol: payload.symbol,
        alertType: payload.alertType,
        targetPrice: payload.targetPrice,
        currentPrice: payload.currentPrice,
        url: `/alerts?symbol=${payload.symbol}`,
      },
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    });

    try {
      await webpush.sendNotification(
        settings.subscription as unknown as webpush.PushSubscription,
        notificationPayload
      );
      console.log(`[Browser Push] Sent alert for ${payload.symbol}`);
    } catch (error: any) {
      console.error('[Browser Push] Failed to send:', error.message);

      // If subscription is invalid, we should remove it
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log('[Browser Push] Subscription expired or invalid, should be removed');
        // Note: Subscription removal should be handled by the calling code
      }
    }
  }

  /**
   * Send Telegram notification
   */
  private async sendTelegram(
    payload: NotificationPayload,
    settings: UserNotificationSettings['telegram']
  ): Promise<void> {
    if (!settings?.chatId || !settings?.botToken) return;

    const message = this.formatMessage(payload, 'telegram');
    const url = `https://api.telegram.org/bot${settings.botToken}/sendMessage`;

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: settings.chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });
      console.log(`[Telegram] Sent alert for ${payload.symbol}`);
    } catch (error) {
      console.error('[Telegram] Failed to send:', error);
    }
  }

  /**
   * Send Discord webhook notification
   */
  private async sendDiscord(
    payload: NotificationPayload,
    settings: UserNotificationSettings['discord']
  ): Promise<void> {
    if (!settings?.webhookUrl) return;

    const color = payload.alertType === 'SL' ? 0xff0000 :
                  payload.alertType.startsWith('TP') ? 0x00ff00 :
                  payload.alertType === 'ENTRY' ? 0x0099ff : 0xffaa00;

    try {
      await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `🔔 TradePath Alert: ${payload.symbol}`,
            description: this.formatMessage(payload, 'discord'),
            color,
            fields: [
              { name: 'Alert Type', value: payload.alertType, inline: true },
              { name: 'Target Price', value: `$${payload.targetPrice.toLocaleString()}`, inline: true },
              { name: 'Current Price', value: `$${payload.currentPrice.toLocaleString()}`, inline: true },
            ],
            footer: { text: 'TradePath - Smart Trading Decisions' },
            timestamp: new Date().toISOString(),
          }],
        }),
      });
      console.log(`[Discord] Sent alert for ${payload.symbol}`);
    } catch (error) {
      console.error('[Discord] Failed to send:', error);
    }
  }

  /**
   * Send TradingView webhook
   */
  private async sendTradingView(
    payload: NotificationPayload,
    settings: UserNotificationSettings['tradingView']
  ): Promise<void> {
    if (!settings?.webhookUrl) return;

    try {
      await fetch(settings.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: `${payload.symbol}USDT`,
          action: payload.alertType,
          price: payload.currentPrice,
          targetPrice: payload.targetPrice,
          direction: payload.direction,
          timestamp: Date.now(),
        }),
      });
      console.log(`[TradingView] Sent alert for ${payload.symbol}`);
    } catch (error) {
      console.error('[TradingView] Failed to send:', error);
    }
  }

  /**
   * Format message for different platforms
   */
  private formatMessage(payload: NotificationPayload, platform: 'telegram' | 'discord'): string {
    const emoji = payload.alertType === 'SL' ? '🔴' :
                  payload.alertType.startsWith('TP') ? '🟢' :
                  payload.alertType === 'ENTRY' ? '🔵' : '🔔';

    const alertName = {
      ENTRY: 'Entry Zone',
      TP1: 'Take Profit 1',
      TP2: 'Take Profit 2',
      TP3: 'Take Profit 3',
      SL: 'Stop Loss',
      CUSTOM: 'Custom Alert',
    }[payload.alertType] || payload.alertType;

    if (platform === 'telegram') {
      return `${emoji} <b>TradePath Alert</b>\n\n` +
        `<b>${payload.symbol}/USDT</b>\n` +
        `Alert: ${alertName}\n` +
        `Target: $${payload.targetPrice.toLocaleString()}\n` +
        `Current: $${payload.currentPrice.toLocaleString()}\n` +
        (payload.note ? `\nNote: ${payload.note}` : '');
    }

    return `${alertName} reached!\n` +
      `Target: $${payload.targetPrice.toLocaleString()}\n` +
      `Current: $${payload.currentPrice.toLocaleString()}` +
      (payload.note ? `\n\n${payload.note}` : '');
  }

  /**
   * Check all active alerts against current prices
   * Called by scheduler
   */
  async checkAlerts(): Promise<void> {
    const activeAlerts = await prisma.priceAlert.findMany({
      where: { isActive: true, isTriggered: false },
      select: {
        id: true,
        userId: true,
        symbol: true,
        targetPrice: true,
        direction: true,
        alertType: true,
        channels: true,
        note: true,
      },
    });

    if (activeAlerts.length === 0) return;

    // Get unique symbols
    const symbols = [...new Set(activeAlerts.map(a => a.symbol))];
    const prices: Record<string, number> = {};

    // Fetch current prices from Binance
    try {
      const pairs = symbols.map((s: string) => `"${s.toUpperCase()}USDT"`).join(',');
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbols=[${pairs}]`
      );
      if (response.ok) {
        // Safely parse JSON response
        const responseText = await response.text();
        if (responseText && responseText.trim() !== '') {
          try {
            const data = JSON.parse(responseText) as Array<{ symbol: string; price: string }>;
            for (const item of data) {
              const symbol = item.symbol.replace('USDT', '');
              prices[symbol] = parseFloat(item.price);
            }
          } catch {
            console.error('[Alert Check] Invalid JSON from Binance');
          }
        }
      }
    } catch (error) {
      console.error('[Alert Check] Failed to fetch prices:', error);
      return;
    }

    // Check each alert
    for (const alert of activeAlerts) {
      const currentPrice = prices[alert.symbol];
      if (!currentPrice) continue;

      const targetPrice = Number(alert.targetPrice);
      const triggered = alert.direction === 'ABOVE'
        ? currentPrice >= targetPrice
        : currentPrice <= targetPrice;

      if (triggered) {
        // Mark as triggered
        await prisma.priceAlert.update({
          where: { id: alert.id },
          data: { isTriggered: true, triggeredAt: new Date() },
        });

        // Send notifications
        const channels = (alert.channels as string[]) || ['browser'];
        await this.sendAlert({
          userId: alert.userId,
          symbol: alert.symbol,
          alertType: alert.alertType,
          targetPrice,
          currentPrice,
          direction: alert.direction,
          note: alert.note || undefined,
        }, channels);
      }
    }
  }

  /**
   * Create trade plan alerts (entry, TPs, SL)
   */
  async createTradePlanAlerts(
    userId: string,
    symbol: string,
    tradePlan: {
      direction: 'long' | 'short';
      entryPrice: number;
      stopLoss: number;
      takeProfits: number[];
    },
    channels: string[],
    reportId?: string
  ): Promise<{ alerts: any[]; creditsSpent: number }> {
    const isLong = tradePlan.direction === 'long';
    const alerts: any[] = [];

    // Entry alert
    alerts.push({
      userId,
      symbol,
      targetPrice: tradePlan.entryPrice,
      direction: isLong ? 'BELOW' : 'ABOVE', // Alert when price reaches entry
      alertType: 'ENTRY',
      channels: JSON.stringify(channels),
      reportId,
      note: `Entry zone for ${isLong ? 'LONG' : 'SHORT'} position`,
    });

    // Stop Loss alert
    alerts.push({
      userId,
      symbol,
      targetPrice: tradePlan.stopLoss,
      direction: isLong ? 'BELOW' : 'ABOVE', // SL triggers when price goes against us
      alertType: 'SL',
      channels: JSON.stringify(channels),
      reportId,
      note: 'Stop Loss hit - Exit position',
    });

    // Take Profit alerts
    tradePlan.takeProfits.forEach((tp, index) => {
      alerts.push({
        userId,
        symbol,
        targetPrice: tp,
        direction: isLong ? 'ABOVE' : 'BELOW', // TP triggers when price reaches target
        alertType: `TP${index + 1}` as 'TP1' | 'TP2' | 'TP3',
        channels: JSON.stringify(channels),
        reportId,
        note: `Take Profit ${index + 1} reached`,
      });
    });

    // Create all alerts in database
    const createdAlerts = await prisma.priceAlert.createMany({
      data: alerts,
    });

    return {
      alerts: alerts,
      creditsSpent: alerts.length, // 1 credit per alert
    };
  }
}

export const notificationService = new NotificationService();
