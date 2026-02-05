/**
 * Signal Outcome Tracker Job
 * Monitors published signals and updates outcomes when TP/SL is hit
 * Runs every 15 minutes
 */

import cron from 'node-cron';
import { prisma } from '../../core/database';
import { redis } from '../../core/cache';
import { formatSignalUpdate } from './telegram-formatter';
import { signalMonitoring } from './signal-monitoring.service';
import { emailService } from '../email/email.service';
import type { SignalOutcome } from './types';

const CRON_SCHEDULE = '*/15 * * * *'; // Every 15 minutes
const REDIS_LOCK_KEY = 'signal-outcome-tracker:lock';
const REDIS_LOCK_TTL = 600; // 10 minutes

let cronJob: cron.ScheduledTask | null = null;

// Email notification template
function generateOutcomeEmailHTML(
  symbol: string,
  direction: 'long' | 'short',
  outcome: SignalOutcome,
  entryPrice: number,
  outcomePrice: number,
  pnlPercent: number,
  signalId: string
): { subject: string; html: string } {
  const isProfit = outcome === 'tp1_hit' || outcome === 'tp2_hit';
  const outcomeLabel = {
    tp1_hit: 'TP1 HIT ✅',
    tp2_hit: 'TP2 HIT 🎯',
    sl_hit: 'STOP LOSS HIT 🛑',
    expired: 'EXPIRED ⏱️',
  }[outcome];

  const backgroundColor = isProfit ? '#10b981' : '#ef4444';
  const pnlColor = pnlPercent >= 0 ? '#10b981' : '#ef4444';

  const subject = `${outcomeLabel} - ${symbol} ${direction.toUpperCase()} Signal`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; background-color: #f8fafc;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">TraderPath Signal Update</h1>
            </td>
          </tr>

          <!-- Outcome Badge -->
          <tr>
            <td style="padding: 30px; text-align: center;">
              <div style="display: inline-block; background-color: ${backgroundColor}; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-size: 18px; font-weight: 700;">
                ${outcomeLabel}
              </div>
            </td>
          </tr>

          <!-- Signal Info -->
          <tr>
            <td style="padding: 0 30px 30px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px;">Symbol:</span>
                    <strong style="float: right; color: #1e293b; font-size: 16px;">${symbol}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px;">Direction:</span>
                    <strong style="float: right; color: ${direction === 'long' ? '#10b981' : '#ef4444'}; font-size: 16px; text-transform: uppercase;">${direction}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px;">Entry Price:</span>
                    <strong style="float: right; color: #1e293b; font-size: 16px;">$${entryPrice.toFixed(entryPrice >= 1 ? 2 : 6)}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                    <span style="color: #64748b; font-size: 14px;">Exit Price:</span>
                    <strong style="float: right; color: #1e293b; font-size: 16px;">$${outcomePrice.toFixed(outcomePrice >= 1 ? 2 : 6)}</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <span style="color: #64748b; font-size: 14px;">P/L:</span>
                    <strong style="float: right; color: ${pnlColor}; font-size: 20px; font-weight: 700;">${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%</strong>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 30px 30px; text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://traderpath.io'}/signals/${signalId}" style="display: inline-block; background: linear-gradient(135deg, #14b8a6 0%, #06b6d4 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                View Signal Details
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; text-align: center; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
              <p style="margin: 0 0 10px;">This is an automated notification from TraderPath.</p>
              <p style="margin: 0;">Manage your notification preferences in <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://traderpath.io'}/settings" style="color: #14b8a6; text-decoration: none;">Settings</a>.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html };
}

// Price fetching service
async function getCurrentPrice(symbol: string, assetClass: string): Promise<number | null> {
  try {
    if (assetClass === 'crypto') {
      // Binance API for crypto
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`
      );
      if (response.ok) {
        const data = await response.json();
        return parseFloat(data.price);
      }
    } else {
      // Yahoo Finance for stocks/metals/bonds
      const cleanSymbol = symbol.replace('USDT', '').replace('BUSD', '');
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${cleanSymbol}?interval=1m&range=1d`
      );
      if (response.ok) {
        const data = await response.json();
        const quote = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (quote) return quote;
      }
    }
  } catch (error) {
    console.error(`[OutcomeTracker] Error fetching price for ${symbol}:`, error);
  }
  return null;
}

// Check if TP or SL has been hit
function checkOutcome(
  currentPrice: number,
  entryPrice: number,
  stopLoss: number,
  takeProfit1: number,
  takeProfit2: number,
  direction: 'long' | 'short'
): { outcome: SignalOutcome | null; pnlPercent: number } {
  let outcome: SignalOutcome | null = null;
  let pnlPercent = 0;

  if (direction === 'long') {
    // LONG position checks
    if (currentPrice <= stopLoss) {
      outcome = 'sl_hit';
      pnlPercent = ((stopLoss - entryPrice) / entryPrice) * 100;
    } else if (currentPrice >= takeProfit2) {
      outcome = 'tp2_hit';
      pnlPercent = ((takeProfit2 - entryPrice) / entryPrice) * 100;
    } else if (currentPrice >= takeProfit1) {
      outcome = 'tp1_hit';
      pnlPercent = ((takeProfit1 - entryPrice) / entryPrice) * 100;
    }
  } else {
    // SHORT position checks
    if (currentPrice >= stopLoss) {
      outcome = 'sl_hit';
      pnlPercent = ((entryPrice - stopLoss) / entryPrice) * 100;
    } else if (currentPrice <= takeProfit2) {
      outcome = 'tp2_hit';
      pnlPercent = ((entryPrice - takeProfit2) / entryPrice) * 100;
    } else if (currentPrice <= takeProfit1) {
      outcome = 'tp1_hit';
      pnlPercent = ((entryPrice - takeProfit1) / entryPrice) * 100;
    }
  }

  return { outcome, pnlPercent };
}

// Send Telegram notification for signal update
async function sendTelegramNotification(
  signal: any,
  outcome: SignalOutcome,
  outcomePrice: number,
  pnlPercent: number
) {
  try {
    const TELEGRAM_BOT_TOKEN = process.env['TELEGRAM_BOT_TOKEN'];
    const TELEGRAM_CHANNEL_ID = process.env['TELEGRAM_CHANNEL_ID'];

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
      console.warn('[OutcomeTracker] Telegram credentials not configured');
      return;
    }

    const message = formatSignalUpdate(
      signal.symbol,
      signal.direction,
      outcome,
      Number(signal.entryPrice),
      outcomePrice,
      pnlPercent,
      signal.id
    );

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHANNEL_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    console.log(`[OutcomeTracker] Telegram notification sent for ${signal.symbol} (${outcome})`);
  } catch (error) {
    console.error('[OutcomeTracker] Error sending Telegram notification:', error);
  }
}

// Send user notifications (Telegram/Discord/Email)
async function sendUserNotifications(
  signal: any,
  outcome: SignalOutcome,
  outcomePrice: number,
  pnlPercent: number
) {
  try {
    // Get users who have this signal's market enabled
    const preferences = await prisma.userSignalPreferences.findMany({
      where: {
        enabledMarkets: {
          has: signal.market,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    const message = formatSignalUpdate(
      signal.symbol,
      signal.direction,
      outcome,
      Number(signal.entryPrice),
      outcomePrice,
      pnlPercent,
      signal.id
    );

    for (const pref of preferences) {
      // Telegram notifications
      if (pref.telegramEnabled && pref.telegramChatId) {
        const TELEGRAM_BOT_TOKEN = process.env['TELEGRAM_BOT_TOKEN'];
        if (TELEGRAM_BOT_TOKEN) {
          try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: pref.telegramChatId,
                text: message,
                parse_mode: 'HTML',
              }),
            });
          } catch (err) {
            console.error(`[OutcomeTracker] Telegram error for user ${pref.userId}:`, err);
          }
        }
      }

      // Discord notifications
      if (pref.discordEnabled && pref.discordWebhookUrl) {
        try {
          await fetch(pref.discordWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content: message.replace(/<[^>]*>/g, ''), // Strip HTML tags for Discord
            }),
          });
        } catch (err) {
          console.error(`[OutcomeTracker] Discord error for user ${pref.userId}:`, err);
        }
      }

      // Email notifications
      if (pref.emailEnabled && pref.user.email) {
        try {
          const { subject, html } = generateOutcomeEmailHTML(
            signal.symbol,
            signal.direction as 'long' | 'short',
            outcome,
            Number(signal.entryPrice),
            outcomePrice,
            pnlPercent,
            signal.id
          );

          await emailService.sendEmail({
            to: pref.user.email,
            subject,
            html,
          });

          console.log(`[OutcomeTracker] Email sent to ${pref.user.email}`);
        } catch (err) {
          console.error(`[OutcomeTracker] Email error for user ${pref.userId}:`, err);
        }
      }
    }

    console.log(`[OutcomeTracker] User notifications sent for ${signal.symbol} to ${preferences.length} users`);
  } catch (error) {
    console.error('[OutcomeTracker] Error sending user notifications:', error);
  }
}

// Main tracking function
export async function trackSignalOutcomes() {
  const startTime = Date.now();
  console.log('[OutcomeTracker] Starting outcome tracking...');

  // Acquire distributed lock
  if (redis) {
    const lockAcquired = await redis.set(REDIS_LOCK_KEY, '1', 'EX', REDIS_LOCK_TTL, 'NX');
    if (!lockAcquired) {
      console.log('[OutcomeTracker] Another instance is already running');
      return {
        success: false,
        message: 'Another instance is already tracking outcomes',
      };
    }
  }

  try {
    // Fetch all published signals that haven't been closed yet
    const activeSignals = await prisma.signal.findMany({
      where: {
        status: 'published',
        outcome: null,
      },
      orderBy: {
        publishedAt: 'asc',
      },
    });

    console.log(`[OutcomeTracker] Found ${activeSignals.length} active signals to track`);

    let checkedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const signal of activeSignals) {
      try {
        checkedCount++;

        // Get current price
        const currentPrice = await getCurrentPrice(signal.symbol, signal.assetClass);
        if (!currentPrice) {
          console.warn(`[OutcomeTracker] Could not fetch price for ${signal.symbol}`);
          errorCount++;
          continue;
        }

        // Check if TP or SL has been hit
        const { outcome, pnlPercent } = checkOutcome(
          currentPrice,
          Number(signal.entryPrice),
          Number(signal.stopLoss),
          Number(signal.takeProfit1),
          Number(signal.takeProfit2),
          signal.direction as 'long' | 'short'
        );

        if (outcome) {
          // Update signal in database
          await prisma.signal.update({
            where: { id: signal.id },
            data: {
              outcome,
              outcomePrice: currentPrice,
              outcomeAt: new Date(),
              pnlPercent,
            },
          });

          updatedCount++;

          console.log(
            `[OutcomeTracker] Signal ${signal.symbol} outcome: ${outcome} at $${currentPrice} (${pnlPercent.toFixed(2)}%)`
          );

          // Send Telegram channel notification
          await sendTelegramNotification(signal, outcome, currentPrice, pnlPercent);

          // Send user notifications
          await sendUserNotifications(signal, outcome, currentPrice, pnlPercent);

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // Check if signal has expired
        if (signal.expiresAt && new Date() > signal.expiresAt && !outcome) {
          await prisma.signal.update({
            where: { id: signal.id },
            data: {
              status: 'expired',
              outcome: 'expired',
              outcomePrice: currentPrice,
              outcomeAt: new Date(),
            },
          });
          updatedCount++;
          console.log(`[OutcomeTracker] Signal ${signal.symbol} expired`);
        }
      } catch (error) {
        console.error(`[OutcomeTracker] Error tracking signal ${signal.id}:`, error);
        errorCount++;
      }
    }

    // Record successful execution metrics
    const duration = Date.now() - startTime;
    await signalMonitoring.recordTrackerRun({
      success: true,
      duration,
      checked: checkedCount,
      updated: updatedCount,
      errors: errorCount,
    });

    return {
      success: true,
      checked: checkedCount,
      updated: updatedCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[OutcomeTracker] Fatal error:', error);

    // Record failure metrics
    const duration = Date.now() - startTime;
    await signalMonitoring.recordTrackerRun({
      success: false,
      duration,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  } finally {
    // Release lock
    if (redis) {
      await redis.del(REDIS_LOCK_KEY);
    }
  }
}

// Start the cron job
export function startSignalOutcomeTracker() {
  if (cronJob) {
    console.log('[OutcomeTracker] Job already running');
    return;
  }

  cronJob = cron.schedule(CRON_SCHEDULE, async () => {
    console.log('[OutcomeTracker] Cron triggered');
    await trackSignalOutcomes();
  });

  console.log('[OutcomeTracker] Cron job started (runs every 15 minutes)');

  // Run immediately on startup
  setTimeout(() => {
    trackSignalOutcomes().catch(console.error);
  }, 5000); // 5 second delay
}

// Stop the cron job
export function stopSignalOutcomeTracker() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[OutcomeTracker] Cron job stopped');
  }
}

// Manual trigger (for testing/admin)
export async function runSignalOutcomeTrackerManually() {
  console.log('[OutcomeTracker] Manual execution triggered');
  return await trackSignalOutcomes();
}
