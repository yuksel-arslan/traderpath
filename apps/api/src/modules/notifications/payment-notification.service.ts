/**
 * Payment Notification Service
 * Handles user notifications for payment events
 */

import { prisma } from '../../core/database';
import { logger } from '../../core/logger';

export class PaymentNotificationService {
  /**
   * Notify user of payment failure
   */
  async notifyPaymentFailed(userId: string, reason: string, amount: number): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user) {
        logger.warn({ userId }, '[PaymentNotification] User not found');
        return;
      }

      // Send email notification
      const { emailService } = await import('../email/email.service');

      const html = this.generatePaymentFailedHtml(user.name || 'User', reason, amount);
      const text = this.generatePaymentFailedText(user.name || 'User', reason, amount);

      await emailService.sendEmail({
        to: user.email,
        subject: '⚠️ Payment Failed - TraderPath Subscription',
        html,
        text,
      });

      logger.info({ userId, email: user.email, amount, reason }, '[PaymentNotification] Payment failure email sent');
    } catch (error) {
      logger.error({ error, userId }, '[PaymentNotification] Failed to notify payment failure');
    }
  }

  /**
   * Notify user of successful subscription
   */
  async notifySubscriptionSuccess(userId: string, tier: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user) return;

      // Send email notification
      const { emailService } = await import('../email/email.service');

      const html = this.generateSubscriptionSuccessHtml(user.name || 'User', tier);
      const text = this.generateSubscriptionSuccessText(user.name || 'User', tier);

      await emailService.sendEmail({
        to: user.email,
        subject: '✅ Subscription Activated - TraderPath',
        html,
        text,
      });

      logger.info({ userId, tier }, '[PaymentNotification] Subscription success email sent');
    } catch (error) {
      logger.error({ error, userId }, '[PaymentNotification] Failed to notify subscription success');
    }
  }

  /**
   * Notify user of subscription cancellation
   */
  async notifySubscriptionCanceled(userId: string): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (!user) return;

      // Send email notification
      const { emailService } = await import('../email/email.service');

      const html = this.generateSubscriptionCanceledHtml(user.name || 'User');
      const text = this.generateSubscriptionCanceledText(user.name || 'User');

      await emailService.sendEmail({
        to: user.email,
        subject: 'Subscription Canceled - TraderPath',
        html,
        text,
      });

      logger.info({ userId }, '[PaymentNotification] Subscription cancellation email sent');
    } catch (error) {
      logger.error({ error, userId }, '[PaymentNotification] Failed to notify cancellation');
    }
  }

  // ============================================
  // Email Templates
  // ============================================

  private generatePaymentFailedHtml(userName: string, reason: string, amount: number): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed - TraderPath</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">TraderPath</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">⚠️ Payment Issue</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #475569; font-size: 16px; margin: 0 0 25px;">
                Hello <strong style="color: #1e293b;">${userName}</strong>,
              </p>

              <p style="color: #64748b; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
                We were unable to process your subscription payment for TraderPath. Your subscription may be interrupted if not resolved.
              </p>

              <!-- Payment Details -->
              <div style="background: #fef2f2; border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid #fecaca;">
                <table width="100%" style="color: #991b1b; font-size: 14px;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #fecaca;"><strong>Amount:</strong></td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #fecaca; text-align: right; font-weight: bold;">$${amount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;"><strong>Reason:</strong></td>
                    <td style="padding: 10px 0; text-align: right;">${reason}</td>
                  </tr>
                </table>
              </div>

              <p style="color: #64748b; font-size: 14px; margin: 0 0 25px; line-height: 1.6;">
                <strong>What to do next:</strong>
              </p>
              <ul style="color: #475569; font-size: 14px; margin: 0 0 25px; padding-left: 20px; line-height: 1.8;">
                <li>Update your payment method</li>
                <li>Ensure your card has sufficient funds</li>
                <li>Check if your card is expired</li>
                <li>Contact your bank if the issue persists</li>
              </ul>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://traderpath.io/settings?tab=billing" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Update Payment Method
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 13px; margin: 0;">TraderPath - Professional Trading Analysis</p>
              <p style="color: #94a3b8; font-size: 11px; margin: 10px 0 0;">Need help? Contact support@traderpath.io</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  private generatePaymentFailedText(userName: string, reason: string, amount: number): string {
    return `
Hello ${userName},

We were unable to process your subscription payment for TraderPath.

Payment Details:
- Amount: $${amount.toFixed(2)}
- Reason: ${reason}

What to do next:
- Update your payment method
- Ensure your card has sufficient funds
- Check if your card is expired
- Contact your bank if the issue persists

Update your payment method: https://traderpath.io/settings?tab=billing

---
TraderPath - Professional Trading Analysis
Need help? Contact support@traderpath.io
    `.trim();
  }

  private generateSubscriptionSuccessHtml(userName: string, tier: string): string {
    const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Activated - TraderPath</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">TraderPath</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">✅ Subscription Activated!</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; margin: 0 auto 20px; line-height: 80px;">
                  <span style="font-size: 40px;">✓</span>
                </div>
                <h2 style="color: #22c55e; font-size: 24px; margin: 0;">
                  Welcome to ${tierName}!
                </h2>
              </div>

              <p style="color: #475569; font-size: 16px; margin: 0 0 25px;">
                Hello <strong style="color: #1e293b;">${userName}</strong>,
              </p>

              <p style="color: #64748b; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
                Your TraderPath ${tierName} subscription has been successfully activated! You now have access to all premium features.
              </p>

              <!-- Features -->
              <div style="background: #f0fdf4; border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid #bbf7d0;">
                <p style="color: #166534; font-size: 14px; margin: 0 0 15px; font-weight: bold;">Your ${tierName} Benefits:</p>
                <ul style="color: #15803d; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Daily credit allocation</li>
                  <li>Advanced analysis features</li>
                  <li>Priority support</li>
                  <li>Unlimited access to all tools</li>
                </ul>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://traderpath.io/dashboard" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">
                  Start Analyzing
                </a>
              </div>

              <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                Your subscription will renew automatically.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 13px; margin: 0;">TraderPath - Professional Trading Analysis</p>
              <p style="color: #94a3b8; font-size: 11px; margin: 10px 0 0;">Thank you for choosing TraderPath!</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  private generateSubscriptionSuccessText(userName: string, tier: string): string {
    const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);

    return `
Hello ${userName},

Your TraderPath ${tierName} subscription has been successfully activated!

Your ${tierName} Benefits:
- Daily credit allocation
- Advanced analysis features
- Priority support
- Unlimited access to all tools

Start analyzing: https://traderpath.io/dashboard

Your subscription will renew automatically.

---
TraderPath - Professional Trading Analysis
Thank you for choosing TraderPath!
    `.trim();
  }

  private generateSubscriptionCanceledHtml(userName: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Subscription Canceled - TraderPath</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #64748b 0%, #475569 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">TraderPath</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Subscription Canceled</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #475569; font-size: 16px; margin: 0 0 25px;">
                Hello <strong style="color: #1e293b;">${userName}</strong>,
              </p>

              <p style="color: #64748b; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
                Your TraderPath subscription has been canceled. We're sorry to see you go!
              </p>

              <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid #e2e8f0;">
                <p style="color: #64748b; font-size: 14px; margin: 0 0 15px;">
                  <strong>What happens next:</strong>
                </p>
                <ul style="color: #475569; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>You'll keep access until the end of your billing period</li>
                  <li>No further charges will be made</li>
                  <li>Your data will be preserved if you return</li>
                  <li>You can resubscribe anytime</li>
                </ul>
              </div>

              <p style="color: #64748b; font-size: 14px; margin: 0 0 25px; line-height: 1.6;">
                We'd love to hear your feedback about why you canceled. It helps us improve TraderPath for everyone.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://traderpath.io/pricing" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Resubscribe
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 13px; margin: 0;">TraderPath - Professional Trading Analysis</p>
              <p style="color: #94a3b8; font-size: 11px; margin: 10px 0 0;">We hope to see you again soon!</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  private generateSubscriptionCanceledText(userName: string): string {
    return `
Hello ${userName},

Your TraderPath subscription has been canceled. We're sorry to see you go!

What happens next:
- You'll keep access until the end of your billing period
- No further charges will be made
- Your data will be preserved if you return
- You can resubscribe anytime

Resubscribe: https://traderpath.io/pricing

---
TraderPath - Professional Trading Analysis
We hope to see you again soon!
    `.trim();
  }
}

export const paymentNotificationService = new PaymentNotificationService();
