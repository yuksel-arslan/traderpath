/**
 * AutoEdge Position Monitor Job
 *
 * Runs every 2 minutes to check open positions on Binance Futures Testnet.
 * Detects TP/SL hits and records outcomes.
 */

import cron, { type ScheduledTask } from 'node-cron';
import { monitorOpenTrades } from './autoedge-executor.service';
import { isTestnetConfigured } from './binance-testnet.client';

const TELEGRAM_BOT_TOKEN = process.env['TELEGRAM_BOT_TOKEN'];
const TELEGRAM_CHANNEL_ID = process.env['TELEGRAM_SIGNAL_CHANNEL_ID'];

// Every 2 minutes
const MONITOR_CRON_SCHEDULE = '*/2 * * * *';

let monitorJob: ScheduledTask | null = null;
let isRunning = false;

export function startAutoEdgeMonitorJob(): void {
  if (monitorJob) {
    console.log('[AutoEdge-Monitor] Job already running');
    return;
  }

  if (!isTestnetConfigured()) {
    console.log('[AutoEdge-Monitor] Testnet not configured, monitor job not started');
    return;
  }

  console.log(`[AutoEdge-Monitor] Starting position monitor — ${MONITOR_CRON_SCHEDULE}`);

  monitorJob = cron.schedule(MONITOR_CRON_SCHEDULE, async () => {
    if (isRunning) {
      console.log('[AutoEdge-Monitor] Previous run still in progress, skipping');
      return;
    }

    isRunning = true;
    try {
      const result = await monitorOpenTrades();

      if (result.checked > 0) {
        console.log(`[AutoEdge-Monitor] Checked ${result.checked} trades, closed ${result.closed}`);
      }

      // Send Telegram notification for closed trades
      if (result.closed > 0 && TELEGRAM_BOT_TOKEN && TELEGRAM_CHANNEL_ID) {
        try {
          const message = `🤖 <b>AutoEdge Monitor</b>\n\n${result.closed} trade(s) closed this cycle.\nChecked: ${result.checked} | Errors: ${result.errors.length}`;
          await sendTelegramMessage(TELEGRAM_CHANNEL_ID, message);
        } catch {
          // Non-critical
        }
      }

      if (result.errors.length > 0) {
        console.error('[AutoEdge-Monitor] Errors:', result.errors);
      }
    } catch (error) {
      console.error('[AutoEdge-Monitor] Fatal error:', error);
    } finally {
      isRunning = false;
    }
  });

  console.log('[AutoEdge-Monitor] Position monitor job started');
}

export function stopAutoEdgeMonitorJob(): void {
  if (monitorJob) {
    monitorJob.stop();
    monitorJob = null;
    console.log('[AutoEdge-Monitor] Position monitor job stopped');
  }
}

async function sendTelegramMessage(chatId: string, text: string): Promise<string | undefined> {
  if (!TELEGRAM_BOT_TOKEN) return undefined;

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  const data = await res.json() as { ok: boolean; result?: { message_id: number } };
  return data.result?.message_id?.toString();
}
