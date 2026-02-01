// ===========================================
// Price Checker Background Job
// Checks price alerts and triggers notifications
// ===========================================

import { prisma } from '../../core/database';
import { notificationService } from './notification.service';
import { logger } from '../../core/logger';

interface BinanceTickerResponse {
  symbol: string;
  price: string;
}

// Cache for current prices (updated every check)
const priceCache = new Map<string, number>();

/**
 * Fetch current prices from Binance
 */
async function fetchCurrentPrices(symbols: string[]): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  try {
    // Fetch all prices at once from Binance
    const response = await fetch('https://api.binance.com/api/v3/ticker/price');
    const data: BinanceTickerResponse[] = await response.json();

    for (const ticker of data) {
      const symbol = ticker.symbol.replace('USDT', '');
      if (symbols.includes(symbol)) {
        prices.set(symbol, parseFloat(ticker.price));
        priceCache.set(symbol, parseFloat(ticker.price));
      }
    }
  } catch (error) {
    logger.error('[PriceChecker] Failed to fetch prices:', error);
    // Return cached prices on error
    for (const symbol of symbols) {
      const cached = priceCache.get(symbol);
      if (cached) {
        prices.set(symbol, cached);
      }
    }
  }

  return prices;
}

/**
 * Check all active alerts and trigger notifications for those that hit their targets
 */
export async function checkPriceAlerts(): Promise<{
  checked: number;
  triggered: number;
  errors: number;
}> {
  const stats = { checked: 0, triggered: 0, errors: 0 };

  try {
    // Get all active, non-triggered alerts
    const alerts = await prisma.priceAlert.findMany({
      where: {
        isActive: true,
        isTriggered: false,
      },
      include: {
        user: {
          select: {
            id: true,
            notificationSettings: true,
          },
        },
      },
    });

    if (alerts.length === 0) {
      logger.info('[PriceChecker] No active alerts to check');
      return stats;
    }

    stats.checked = alerts.length;

    // Get unique symbols
    const symbols = [...new Set(alerts.map(a => a.symbol))];

    // Fetch current prices
    const prices = await fetchCurrentPrices(symbols);

    logger.info(`[PriceChecker] Checking ${alerts.length} alerts for ${symbols.length} symbols`);

    // Check each alert
    for (const alert of alerts) {
      try {
        const currentPrice = prices.get(alert.symbol);

        if (!currentPrice) {
          logger.warn(`[PriceChecker] No price for ${alert.symbol}`);
          continue;
        }

        const targetPrice = Number(alert.targetPrice);
        let isTriggered = false;

        // Check if alert condition is met
        if (alert.direction === 'ABOVE' && currentPrice >= targetPrice) {
          isTriggered = true;
        } else if (alert.direction === 'BELOW' && currentPrice <= targetPrice) {
          isTriggered = true;
        }

        if (isTriggered) {
          logger.info(`[PriceChecker] Alert triggered: ${alert.symbol} ${alert.direction} ${targetPrice} (current: ${currentPrice})`);

          // Mark alert as triggered
          await prisma.priceAlert.update({
            where: { id: alert.id },
            data: {
              isTriggered: true,
              triggeredAt: new Date(),
              triggeredPrice: currentPrice,
            },
          });

          // Send notifications
          const settings = alert.user.notificationSettings as Record<string, any> || {};
          const channels: string[] = [];

          if (settings.browserPush?.enabled) channels.push('browser');
          if (settings.telegram?.enabled) channels.push('telegram');
          if (settings.discord?.enabled) channels.push('discord');
          if (settings.tradingView?.enabled) channels.push('tradingview');

          if (channels.length > 0) {
            await notificationService.sendAlert(
              {
                userId: alert.userId,
                symbol: alert.symbol,
                alertType: alert.alertType || 'CUSTOM',
                targetPrice: targetPrice,
                currentPrice: currentPrice,
                direction: alert.direction as 'ABOVE' | 'BELOW',
                note: alert.note || undefined,
              },
              channels
            );
          }

          stats.triggered++;
        }
      } catch (error) {
        logger.error(`[PriceChecker] Error processing alert ${alert.id}:`, error);
        stats.errors++;
      }
    }

    logger.info(`[PriceChecker] Results: ${stats.triggered} triggered, ${stats.errors} errors`);
  } catch (error) {
    logger.error('[PriceChecker] Fatal error:', error);
    stats.errors++;
  }

  return stats;
}

// Job interval in milliseconds (default: 30 seconds)
const CHECK_INTERVAL = parseInt(process.env.PRICE_CHECK_INTERVAL || '30000', 10);

let intervalId: NodeJS.Timeout | null = null;

/**
 * Start the price checker background job
 */
export function startPriceChecker(): void {
  if (intervalId) {
    logger.info('[PriceChecker] Already running');
    return;
  }

  logger.info(`[PriceChecker] Starting (interval: ${CHECK_INTERVAL}ms)`);

  // Run immediately on start
  checkPriceAlerts().catch(logger.error);

  // Then run at interval
  intervalId = setInterval(() => {
    checkPriceAlerts().catch(logger.error);
  }, CHECK_INTERVAL);
}

/**
 * Stop the price checker background job
 */
export function stopPriceChecker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('[PriceChecker] Stopped');
  }
}

/**
 * Check if the price checker is running
 */
export function isPriceCheckerRunning(): boolean {
  return intervalId !== null;
}
