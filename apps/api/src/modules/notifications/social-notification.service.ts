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
  // Telegram Photo (Snapshot PNG inline)
  // ===========================================

  /**
   * Send a photo via Telegram sendPhoto API (inline image, no download needed)
   */
  async sendTelegramPhoto(chatId: string, photoBuffer: Buffer, caption?: string): Promise<NotificationResult> {
    if (!this.TELEGRAM_BOT_TOKEN) {
      console.log('[SocialNotification] No Telegram bot token, photo would be sent to:', chatId);
      return { success: true, channel: 'telegram' };
    }

    try {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', new Blob([photoBuffer], { type: 'image/png' }), 'report.png');
      if (caption) {
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
      }

      const response = await fetch(
        `https://api.telegram.org/bot${this.TELEGRAM_BOT_TOKEN}/sendPhoto`,
        { method: 'POST', body: formData }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        console.error('[SocialNotification] Telegram sendPhoto error:', data);
        return { success: false, channel: 'telegram', error: data.description || 'Unknown error' };
      }

      console.log('[SocialNotification] Telegram photo sent to:', chatId);
      return { success: true, channel: 'telegram' };
    } catch (error) {
      console.error('[SocialNotification] Telegram sendPhoto error:', error);
      return { success: false, channel: 'telegram', error: String(error) };
    }
  }

  /**
   * Send multiple photos as a Telegram media group (album)
   */
  async sendTelegramMediaGroup(chatId: string, photos: Array<{ buffer: Buffer; caption?: string }>): Promise<NotificationResult> {
    if (!this.TELEGRAM_BOT_TOKEN) {
      console.log('[SocialNotification] No Telegram bot token, media group would be sent to:', chatId);
      return { success: true, channel: 'telegram' };
    }

    try {
      // Telegram media group supports max 10 items
      const items = photos.slice(0, 10);
      const formData = new FormData();
      formData.append('chat_id', chatId);

      const media = items.map((photo, i) => {
        const attachName = `photo_${i}`;
        formData.append(attachName, new Blob([photo.buffer], { type: 'image/png' }), `report_${i}.png`);
        return {
          type: 'photo',
          media: `attach://${attachName}`,
          ...(i === 0 && photo.caption ? { caption: photo.caption, parse_mode: 'HTML' } : {}),
        };
      });

      formData.append('media', JSON.stringify(media));

      const response = await fetch(
        `https://api.telegram.org/bot${this.TELEGRAM_BOT_TOKEN}/sendMediaGroup`,
        { method: 'POST', body: formData }
      );

      const data = await response.json();

      if (!response.ok || !data.ok) {
        console.error('[SocialNotification] Telegram sendMediaGroup error:', data);
        return { success: false, channel: 'telegram', error: data.description || 'Unknown error' };
      }

      console.log('[SocialNotification] Telegram media group sent to:', chatId, `(${items.length} photos)`);
      return { success: true, channel: 'telegram' };
    } catch (error) {
      console.error('[SocialNotification] Telegram sendMediaGroup error:', error);
      return { success: false, channel: 'telegram', error: String(error) };
    }
  }

  // ===========================================
  // Discord Image Attachment
  // ===========================================

  /**
   * Send Discord webhook message with image attachment (inline display)
   */
  async sendDiscordWithImage(webhookUrl: string, content: {
    title: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  }, imageBuffer: Buffer, filename: string = 'report.png'): Promise<NotificationResult> {
    if (!webhookUrl) {
      return { success: false, channel: 'discord', error: 'No webhook URL' };
    }

    try {
      const formData = new FormData();

      // Attach file
      formData.append('files[0]', new Blob([imageBuffer], { type: 'image/png' }), filename);

      // Build payload with image embed
      const payload = {
        embeds: [{
          title: content.title,
          description: content.description || '',
          color: content.color || 0x14b8a6,
          fields: content.fields || [],
          image: { url: `attachment://${filename}` },
          footer: { text: 'TraderPath - Professional Trading Analysis' },
          timestamp: new Date().toISOString(),
        }],
      };

      formData.append('payload_json', JSON.stringify(payload));

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[SocialNotification] Discord image error:', error);
        return { success: false, channel: 'discord', error };
      }

      console.log('[SocialNotification] Discord image sent');
      return { success: true, channel: 'discord' };
    } catch (error) {
      console.error('[SocialNotification] Discord image error:', error);
      return { success: false, channel: 'discord', error: String(error) };
    }
  }

  /**
   * Send multiple images to Discord via webhook (one embed per image)
   */
  async sendDiscordMultiImage(webhookUrl: string, images: Array<{
    buffer: Buffer;
    title: string;
    description?: string;
    color?: number;
  }>): Promise<NotificationResult> {
    if (!webhookUrl) {
      return { success: false, channel: 'discord', error: 'No webhook URL' };
    }

    try {
      const formData = new FormData();
      const embeds = images.map((img, i) => {
        const filename = `report_${i}.png`;
        formData.append(`files[${i}]`, new Blob([img.buffer], { type: 'image/png' }), filename);
        return {
          title: img.title,
          description: img.description || '',
          color: img.color || 0x14b8a6,
          image: { url: `attachment://${filename}` },
          ...(i === images.length - 1 ? {
            footer: { text: 'TraderPath - Professional Trading Analysis' },
            timestamp: new Date().toISOString(),
          } : {}),
        };
      });

      formData.append('payload_json', JSON.stringify({ embeds }));

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[SocialNotification] Discord multi-image error:', error);
        return { success: false, channel: 'discord', error };
      }

      console.log('[SocialNotification] Discord multi-image sent:', images.length, 'images');
      return { success: true, channel: 'discord' };
    } catch (error) {
      console.error('[SocialNotification] Discord multi-image error:', error);
      return { success: false, channel: 'discord', error: String(error) };
    }
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
