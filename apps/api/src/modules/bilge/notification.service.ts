/**
 * BILGE Guardian System - Notification Service
 *
 * Handles notifications to Slack, Discord, SMS/WhatsApp
 */

import { logger } from '../../core/logger';
import {
  NotificationChannel,
  NotificationMessage,
  ErrorSeverity,
  CollectedError,
} from './types';
import { getSeverityColor, getSeverityEmoji } from './pattern-database';

// Environment variables (accessed via bracket notation for Railpack compatibility)
const getEnvVar = (key: string): string | undefined => process.env[key];

const SLACK_WEBHOOK_URL = getEnvVar('BILGE_SLACK_WEBHOOK_URL');
const DISCORD_WEBHOOK_URL = getEnvVar('BILGE_DISCORD_WEBHOOK_URL');
const TWILIO_ACCOUNT_SID = getEnvVar('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = getEnvVar('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = getEnvVar('TWILIO_PHONE_NUMBER');
const ADMIN_PHONE_NUMBERS = getEnvVar('BILGE_ADMIN_PHONE_NUMBERS')?.split(',') || [];

/**
 * Send notification to Slack
 */
export async function sendSlackNotification(message: NotificationMessage): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    logger.info('[BILGE] Slack webhook URL not configured');
    return false;
  }

  try {
    const emoji = getSeverityEmoji(message.severity);
    const color = getSeverityColor(message.severity);

    const slackPayload = {
      attachments: [
        {
          color,
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: `${emoji} ${message.title}`,
                emoji: true,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: message.message,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `*Project:* ${message.project} | *Severity:* ${message.severity.toUpperCase()} | *Time:* ${message.timestamp.toISOString()}`,
                },
              ],
            },
          ],
        },
      ],
    };

    // Add action buttons if links provided
    if (message.dashboardLink || message.detailsLink) {
      const actions: any[] = [];

      if (message.dashboardLink) {
        actions.push({
          type: 'button',
          text: { type: 'plain_text', text: '📊 Dashboard', emoji: true },
          url: message.dashboardLink,
        });
      }

      if (message.detailsLink) {
        actions.push({
          type: 'button',
          text: { type: 'plain_text', text: '🔍 Details', emoji: true },
          url: message.detailsLink,
        });
      }

      slackPayload.attachments[0].blocks.push({
        type: 'actions',
        elements: actions,
      } as any);
    }

    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      logger.error('[BILGE] Slack notification failed:', response.status);
      return false;
    }

    logger.info('[BILGE] Slack notification sent successfully');
    return true;
  } catch (error) {
    logger.error('[BILGE] Error sending Slack notification:', error);
    return false;
  }
}

/**
 * Send notification to Discord
 */
export async function sendDiscordNotification(message: NotificationMessage): Promise<boolean> {
  if (!DISCORD_WEBHOOK_URL) {
    logger.info('[BILGE] Discord webhook URL not configured');
    return false;
  }

  try {
    const emoji = getSeverityEmoji(message.severity);
    const color = parseInt(getSeverityColor(message.severity).replace('#', ''), 16);

    const discordPayload = {
      embeds: [
        {
          title: `${emoji} ${message.title}`,
          description: message.message,
          color,
          fields: [
            {
              name: 'Project',
              value: message.project,
              inline: true,
            },
            {
              name: 'Severity',
              value: message.severity.toUpperCase(),
              inline: true,
            },
            {
              name: 'Time',
              value: message.timestamp.toISOString(),
              inline: true,
            },
          ],
          footer: {
            text: 'BILGE Guardian System',
            icon_url: 'https://traderpath.io/bilge-icon.png',
          },
          timestamp: message.timestamp.toISOString(),
        },
      ],
    };

    // Add links if provided
    if (message.dashboardLink) {
      discordPayload.embeds[0].fields.push({
        name: '📊 Dashboard',
        value: `[Open Dashboard](${message.dashboardLink})`,
        inline: true,
      });
    }

    if (message.detailsLink) {
      discordPayload.embeds[0].fields.push({
        name: '🔍 Details',
        value: `[View Details](${message.detailsLink})`,
        inline: true,
      });
    }

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    });

    if (!response.ok) {
      logger.error('[BILGE] Discord notification failed:', response.status);
      return false;
    }

    logger.info('[BILGE] Discord notification sent successfully');
    return true;
  } catch (error) {
    logger.error('[BILGE] Error sending Discord notification:', error);
    return false;
  }
}

/**
 * Send SMS notification via Twilio
 */
export async function sendSMSNotification(
  message: NotificationMessage,
  phoneNumbers?: string[]
): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    logger.info('[BILGE] Twilio credentials not configured');
    return false;
  }

  const recipients = phoneNumbers || ADMIN_PHONE_NUMBERS;
  if (recipients.length === 0) {
    logger.info('[BILGE] No phone numbers configured for SMS');
    return false;
  }

  try {
    const emoji = getSeverityEmoji(message.severity);
    const smsText = `${emoji} BILGE Alert\n\n${message.title}\n\n${message.message}\n\nProject: ${message.project}\nSeverity: ${message.severity.toUpperCase()}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const results = await Promise.all(
      recipients.map(async (phoneNumber) => {
        try {
          const response = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: phoneNumber.trim(),
              From: TWILIO_PHONE_NUMBER,
              Body: smsText.substring(0, 1600), // SMS limit
            }),
          });

          return response.ok;
        } catch (err) {
          logger.error(`[BILGE] SMS to ${phoneNumber} failed:`, err);
          return false;
        }
      })
    );

    const successCount = results.filter(Boolean).length;
    logger.info(`[BILGE] SMS sent: ${successCount}/${recipients.length}`);
    return successCount > 0;
  } catch (error) {
    logger.error('[BILGE] Error sending SMS:', error);
    return false;
  }
}

/**
 * Send WhatsApp notification via Twilio
 */
export async function sendWhatsAppNotification(
  message: NotificationMessage,
  phoneNumbers?: string[]
): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    logger.info('[BILGE] Twilio credentials not configured');
    return false;
  }

  const recipients = phoneNumbers || ADMIN_PHONE_NUMBERS;
  if (recipients.length === 0) {
    logger.info('[BILGE] No phone numbers configured for WhatsApp');
    return false;
  }

  try {
    const emoji = getSeverityEmoji(message.severity);
    const waText = `${emoji} *BILGE Alert*\n\n*${message.title}*\n\n${message.message}\n\n_Project:_ ${message.project}\n_Severity:_ ${message.severity.toUpperCase()}`;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const results = await Promise.all(
      recipients.map(async (phoneNumber) => {
        try {
          const response = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              To: `whatsapp:${phoneNumber.trim()}`,
              From: `whatsapp:${TWILIO_PHONE_NUMBER}`,
              Body: waText,
            }),
          });

          return response.ok;
        } catch (err) {
          logger.error(`[BILGE] WhatsApp to ${phoneNumber} failed:`, err);
          return false;
        }
      })
    );

    const successCount = results.filter(Boolean).length;
    logger.info(`[BILGE] WhatsApp sent: ${successCount}/${recipients.length}`);
    return successCount > 0;
  } catch (error) {
    logger.error('[BILGE] Error sending WhatsApp:', error);
    return false;
  }
}

/**
 * Send notification to specified channels
 */
export async function sendNotification(
  message: NotificationMessage,
  channels: NotificationChannel[]
): Promise<Record<NotificationChannel, boolean>> {
  const results: Record<NotificationChannel, boolean> = {
    slack: false,
    discord: false,
    sms: false,
    whatsapp: false,
    email: false,
  };

  const promises: Promise<void>[] = [];

  if (channels.includes('slack')) {
    promises.push(
      sendSlackNotification(message).then((success) => {
        results.slack = success;
      })
    );
  }

  if (channels.includes('discord')) {
    promises.push(
      sendDiscordNotification(message).then((success) => {
        results.discord = success;
      })
    );
  }

  if (channels.includes('sms')) {
    promises.push(
      sendSMSNotification(message).then((success) => {
        results.sms = success;
      })
    );
  }

  if (channels.includes('whatsapp')) {
    promises.push(
      sendWhatsAppNotification(message).then((success) => {
        results.whatsapp = success;
      })
    );
  }

  await Promise.all(promises);

  return results;
}

/**
 * Create notification message from collected error
 */
export function createErrorNotificationMessage(
  error: CollectedError,
  patternName?: string,
  suggestedFix?: string
): NotificationMessage {
  const baseUrl = getEnvVar('APP_URL') || 'https://traderpath.io';

  let messageBody = `**Error:** ${error.message}`;

  if (error.endpoint) {
    messageBody += `\n**Endpoint:** ${error.method || 'GET'} ${error.endpoint}`;
  }

  if (error.occurrenceCount > 1) {
    messageBody += `\n**Occurrences:** ${error.occurrenceCount} times`;
  }

  if (patternName) {
    messageBody += `\n**Pattern:** ${patternName}`;
  }

  if (suggestedFix) {
    messageBody += `\n\n**Suggested Fix:**\n${suggestedFix}`;
  }

  return {
    channel: 'slack', // Will be overridden
    severity: error.severity,
    title: `${error.category.replace('_', ' ').toUpperCase()} - ${error.project}`,
    message: messageBody,
    project: error.project,
    errorId: error.id,
    patternId: error.patternId,
    dashboardLink: `${baseUrl}/admin/bilge`,
    detailsLink: `${baseUrl}/admin/bilge/errors/${error.id}`,
    timestamp: new Date(),
  };
}

/**
 * Send critical alert (uses all channels including SMS/WhatsApp)
 */
export async function sendCriticalAlert(
  error: CollectedError,
  patternName?: string,
  suggestedFix?: string
): Promise<void> {
  const message = createErrorNotificationMessage(error, patternName, suggestedFix);

  // Send to all channels for critical errors
  await sendNotification(message, ['slack', 'discord', 'sms', 'whatsapp']);

  logger.info(`[BILGE] Critical alert sent for error ${error.id}`);
}
