// ===========================================
// Social Notification Service
// Send notifications via Telegram, Discord, Twitter
// ===========================================

interface NotificationResult {
  success: boolean;
  channel: string;
  error?: string;
}

interface CreditGrantNotification {
  userName: string;
  amount: number;
  reason: string;
  newBalance: number;
}

interface AnalysisSummaryNotification {
  userName: string;
  symbol: string;
  verdict: string;
  score: number;
  direction: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit1: string;
  tradeType: string;
}

class SocialNotificationService {
  private readonly TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  private readonly TWITTER_API_KEY = process.env.TWITTER_API_KEY;
  private readonly TWITTER_API_SECRET = process.env.TWITTER_API_SECRET;
  private readonly TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN;
  private readonly TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET;

  // ===========================================
  // Telegram Notifications
  // ===========================================

  /**
   * Send Telegram message to a user
   */
  async sendTelegramMessage(chatId: string, message: string): Promise<NotificationResult> {
    if (!this.TELEGRAM_BOT_TOKEN) {
      console.log('[SocialNotification] No Telegram bot token, message would be sent to:', chatId);
      console.log('[SocialNotification] Message:', message.substring(0, 100) + '...');
      return { success: true, channel: 'telegram' };
    }

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        console.error('[SocialNotification] Telegram error:', data);
        return { success: false, channel: 'telegram', error: data.description || 'Unknown error' };
      }

      console.log('[SocialNotification] Telegram message sent to:', chatId);
      return { success: true, channel: 'telegram' };
    } catch (error) {
      console.error('[SocialNotification] Telegram error:', error);
      return { success: false, channel: 'telegram', error: String(error) };
    }
  }

  // ===========================================
  // Discord Notifications
  // ===========================================

  /**
   * Send Discord message via webhook
   */
  async sendDiscordMessage(webhookUrl: string, content: {
    title: string;
    description: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  }): Promise<NotificationResult> {
    if (!webhookUrl) {
      return { success: false, channel: 'discord', error: 'No webhook URL' };
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: content.title,
            description: content.description,
            color: content.color || 0x22c55e, // Green
            fields: content.fields || [],
            footer: {
              text: 'TraderPath - Professional Trading Analysis',
            },
            timestamp: new Date().toISOString(),
          }],
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[SocialNotification] Discord error:', error);
        return { success: false, channel: 'discord', error };
      }

      console.log('[SocialNotification] Discord message sent');
      return { success: true, channel: 'discord' };
    } catch (error) {
      console.error('[SocialNotification] Discord error:', error);
      return { success: false, channel: 'discord', error: String(error) };
    }
  }

  // ===========================================
  // Credit Grant Notifications
  // ===========================================

  /**
   * Send credit grant notification via Telegram
   */
  async sendTelegramCreditGrant(chatId: string, data: CreditGrantNotification): Promise<NotificationResult> {
    const message = `
🎁 <b>Free Credits Received!</b>

Hello ${data.userName}!

Great news! You have received free credits to your TraderPath account.

💰 <b>Credits Added:</b> +${data.amount}
📝 <b>Reason:</b> ${data.reason}
💳 <b>New Balance:</b> ${data.newBalance} credits

Start analyzing at traderpath.io/dashboard

Thank you for being part of our community! 🚀
    `.trim();

    return this.sendTelegramMessage(chatId, message);
  }

  /**
   * Send credit grant notification via Discord
   */
  async sendDiscordCreditGrant(webhookUrl: string, data: CreditGrantNotification): Promise<NotificationResult> {
    return this.sendDiscordMessage(webhookUrl, {
      title: '🎁 Free Credits Received!',
      description: `Hello **${data.userName}**!\n\nGreat news! You have received free credits to your TraderPath account.`,
      color: 0x22c55e, // Green
      fields: [
        { name: '💰 Credits Added', value: `+${data.amount}`, inline: true },
        { name: '💳 New Balance', value: `${data.newBalance} credits`, inline: true },
        { name: '📝 Reason', value: data.reason, inline: false },
      ],
    });
  }

  /**
   * Send credit grant notification to all configured channels
   */
  async sendCreditGrantNotifications(
    user: { telegramChatId?: string | null; discordWebhookUrl?: string | null; name?: string | null },
    data: Omit<CreditGrantNotification, 'userName'>
  ): Promise<{ results: NotificationResult[]; sent: number }> {
    const results: NotificationResult[] = [];
    const notificationData: CreditGrantNotification = {
      ...data,
      userName: user.name || 'Trader',
    };

    // Telegram
    if (user.telegramChatId) {
      const result = await this.sendTelegramCreditGrant(user.telegramChatId, notificationData);
      results.push(result);
    }

    // Discord
    if (user.discordWebhookUrl) {
      const result = await this.sendDiscordCreditGrant(user.discordWebhookUrl, notificationData);
      results.push(result);
    }

    const sent = results.filter(r => r.success).length;
    return { results, sent };
  }

  // ===========================================
  // Analysis Summary Notifications
  // ===========================================

  /**
   * Send analysis summary via Telegram
   */
  async sendTelegramAnalysisSummary(chatId: string, data: AnalysisSummaryNotification): Promise<NotificationResult> {
    const verdictEmoji = data.verdict === 'GO' ? '🟢' : data.verdict === 'WAIT' ? '🟡' : '🔴';
    const directionEmoji = data.direction?.toLowerCase() === 'long' ? '📈' : '📉';

    const message = `
${verdictEmoji} <b>Analysis Complete: ${data.symbol}/USDT</b>

Hello ${data.userName}! Your analysis is ready.

📊 <b>Summary:</b>
• Verdict: <b>${data.verdict}</b>
• Score: <b>${data.score}/100</b>
• Direction: ${directionEmoji} <b>${data.direction.toUpperCase()}</b>
• Trade Type: ${data.tradeType}

💰 <b>Quick Trade Plan:</b>
• Entry: ${data.entryPrice}
• TP1: ${data.takeProfit1}
• SL: ${data.stopLoss}

🔗 View full report at traderpath.io/dashboard

This analysis is for informational and educational purposes only. Not financial advice. Past performance does not guarantee future results.
    `.trim();

    return this.sendTelegramMessage(chatId, message);
  }

  /**
   * Send analysis summary via Discord
   */
  async sendDiscordAnalysisSummary(webhookUrl: string, data: AnalysisSummaryNotification): Promise<NotificationResult> {
    const verdictColor = data.verdict === 'GO' ? 0x22c55e : data.verdict === 'WAIT' ? 0xf59e0b : 0xef4444;
    const verdictEmoji = data.verdict === 'GO' ? '🟢' : data.verdict === 'WAIT' ? '🟡' : '🔴';
    const directionEmoji = data.direction?.toLowerCase() === 'long' ? '📈' : '📉';

    return this.sendDiscordMessage(webhookUrl, {
      title: `${verdictEmoji} Analysis Complete: ${data.symbol}/USDT`,
      description: `Hello **${data.userName}**! Your analysis is ready.\n\n[View Full Report](https://traderpath.io/dashboard)`,
      color: verdictColor,
      fields: [
        { name: 'Verdict', value: `**${data.verdict}**`, inline: true },
        { name: 'Score', value: `**${data.score}/100**`, inline: true },
        { name: 'Direction', value: `${directionEmoji} **${data.direction.toUpperCase()}**`, inline: true },
        { name: 'Trade Type', value: data.tradeType, inline: true },
        { name: '💰 Entry', value: data.entryPrice, inline: true },
        { name: '🎯 TP1', value: data.takeProfit1, inline: true },
        { name: '🛑 Stop Loss', value: data.stopLoss, inline: true },
      ],
    });
  }

  /**
   * Send analysis summary to all configured channels
   */
  async sendAnalysisSummaryNotifications(
    user: { telegramChatId?: string | null; discordWebhookUrl?: string | null; name?: string | null },
    data: Omit<AnalysisSummaryNotification, 'userName'>
  ): Promise<{ results: NotificationResult[]; sent: number }> {
    const results: NotificationResult[] = [];
    const notificationData: AnalysisSummaryNotification = {
      ...data,
      userName: user.name || 'Trader',
    };

    // Telegram
    if (user.telegramChatId) {
      const result = await this.sendTelegramAnalysisSummary(user.telegramChatId, notificationData);
      results.push(result);
    }

    // Discord
    if (user.discordWebhookUrl) {
      const result = await this.sendDiscordAnalysisSummary(user.discordWebhookUrl, notificationData);
      results.push(result);
    }

    const sent = results.filter(r => r.success).length;
    return { results, sent };
  }

  // ===========================================
  // Generic Notifications (for future use)
  // ===========================================

  /**
   * Send a generic notification to all configured channels
   */
  async sendNotification(
    user: { telegramChatId?: string | null; discordWebhookUrl?: string | null },
    telegram: { message: string },
    discord: { title: string; description: string; color?: number }
  ): Promise<{ results: NotificationResult[]; sent: number }> {
    const results: NotificationResult[] = [];

    if (user.telegramChatId) {
      const result = await this.sendTelegramMessage(user.telegramChatId, telegram.message);
      results.push(result);
    }

    if (user.discordWebhookUrl) {
      const result = await this.sendDiscordMessage(user.discordWebhookUrl, discord);
      results.push(result);
    }

    const sent = results.filter(r => r.success).length;
    return { results, sent };
  }
}

export const socialNotificationService = new SocialNotificationService();
