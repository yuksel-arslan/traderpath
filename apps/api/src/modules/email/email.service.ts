// ===========================================
// Email Service
// Send emails to users (reports, notifications)
// ===========================================

import { config } from '../../core/config';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface ReportEmailData {
  userName: string;
  symbol: string;
  expertName: string;
  expertInsights: string;
  reportUrl: string;
  generatedAt: string;
}

class EmailService {
  private readonly FROM_EMAIL = 'TradePath <noreply@tradepath.app>';
  private readonly RESEND_API_KEY = process.env.RESEND_API_KEY;

  /**
   * Send an email using Resend API
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.RESEND_API_KEY) {
      console.log('[EmailService] No API key, email would be sent to:', options.to);
      console.log('[EmailService] Subject:', options.subject);
      return { success: true, messageId: 'mock-' + Date.now() };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.FROM_EMAIL,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[EmailService] Failed to send email:', error);
        return { success: false, error };
      }

      const data = await response.json();
      return { success: true, messageId: data.id };
    } catch (error) {
      console.error('[EmailService] Error sending email:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Send expert analysis report to user
   */
  async sendExpertReport(email: string, data: ReportEmailData): Promise<{ success: boolean }> {
    const html = this.generateReportEmailHtml(data);
    const text = this.generateReportEmailText(data);

    const result = await this.sendEmail({
      to: email,
      subject: `TradePath ${data.symbol} Uzman Analiz Raporu - ${data.expertName}`,
      html,
      text,
    });

    return { success: result.success };
  }

  /**
   * Generate HTML email for expert report
   */
  private generateReportEmailHtml(data: ReportEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TradePath Uzman Raporu</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden; border: 1px solid #334155;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                TradePath
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Uzman AI Analiz Raporu
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #94a3b8; font-size: 16px; margin: 0 0 20px;">
                Merhaba ${data.userName},
              </p>

              <!-- Symbol Badge -->
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
                <span style="color: white; font-size: 32px; font-weight: bold;">
                  ${data.symbol}
                </span>
                <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0; font-size: 14px;">
                  ${data.expertName} Analizi
                </p>
              </div>

              <!-- Expert Insights -->
              <div style="background-color: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #3b82f6;">
                <h3 style="color: #3b82f6; margin: 0 0 15px; font-size: 18px;">
                  Uzman Görüşü
                </h3>
                <p style="color: #e2e8f0; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">
${data.expertInsights}
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.reportUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  Tam Raporu Görüntüle
                </a>
              </div>

              <!-- Footer Note -->
              <p style="color: #64748b; font-size: 13px; text-align: center; margin: 20px 0 0;">
                Bu rapor ${data.generatedAt} tarihinde oluşturulmuştur.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px; text-align: center; border-top: 1px solid #334155;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                TradePath - Professional Trading Analysis
              </p>
              <p style="color: #475569; font-size: 11px; margin: 10px 0 0;">
                Bu e-posta, talep ettiğiniz analiz raporu için gönderilmiştir.
              </p>
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

  /**
   * Generate plain text email for expert report
   */
  private generateReportEmailText(data: ReportEmailData): string {
    return `
TradePath Uzman Analiz Raporu
=============================

Merhaba ${data.userName},

${data.symbol} için ${data.expertName} analiz raporunuz hazır.

UZMAN GÖRÜŞÜ:
${data.expertInsights}

Tam raporu görüntülemek için: ${data.reportUrl}

Bu rapor ${data.generatedAt} tarihinde oluşturulmuştur.

---
TradePath - Professional Trading Analysis
    `.trim();
  }
}

export const emailService = new EmailService();
