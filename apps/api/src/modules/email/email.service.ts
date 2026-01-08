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
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded content
  }>;
}

interface ReportEmailData {
  userName: string;
  symbol: string;
  expertName: string;
  expertInsights: string;
  reportUrl: string;
  generatedAt: string;
}

interface ScheduledReportEmailData {
  userName: string;
  symbol: string;
  verdict: string;
  score: number;
  direction: string;
  entryPrice: string;
  stopLoss: string;
  takeProfit1: string;
  takeProfit2?: string;
  takeProfit3?: string;
  reportUrl: string;
  generatedAt: string;
}

interface PdfReportEmailData {
  userName: string;
  symbol: string;
  verdict: string;
  score: number;
  direction: string;
  generatedAt: string;
  pdfBase64: string; // Base64 encoded PDF
  fileName: string;
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
      const emailPayload: Record<string, unknown> = {
        from: this.FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      // Add attachments if provided
      if (options.attachments && options.attachments.length > 0) {
        emailPayload.attachments = options.attachments;
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
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

  /**
   * Send scheduled analysis report to user
   */
  async sendScheduledReport(email: string, data: ScheduledReportEmailData): Promise<{ success: boolean }> {
    const html = this.generateScheduledReportHtml(data);
    const text = this.generateScheduledReportText(data);

    const result = await this.sendEmail({
      to: email,
      subject: `📊 TradePath ${data.symbol} Daily Analysis - ${data.verdict}`,
      html,
      text,
    });

    return { success: result.success };
  }

  /**
   * Generate HTML email for scheduled report
   */
  private generateScheduledReportHtml(data: ScheduledReportEmailData): string {
    const verdictColor = data.verdict === 'GO' ? '#22c55e' :
                        data.verdict === 'WAIT' ? '#f59e0b' : '#ef4444';
    const verdictEmoji = data.verdict === 'GO' ? '🟢' :
                        data.verdict === 'WAIT' ? '🟡' : '🔴';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TradePath Scheduled Report</title>
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
                Scheduled Analysis Report
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #94a3b8; font-size: 16px; margin: 0 0 20px;">
                Hi ${data.userName}, here's your scheduled analysis for today:
              </p>

              <!-- Symbol & Verdict -->
              <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
                <div style="background: #1e293b; border-radius: 12px; padding: 20px; text-align: center; flex: 1; margin-right: 10px;">
                  <span style="color: white; font-size: 32px; font-weight: bold;">
                    ${data.symbol}
                  </span>
                  <p style="color: #94a3b8; margin: 10px 0 0; font-size: 14px;">
                    ${data.direction.toUpperCase()}
                  </p>
                </div>
                <div style="background: ${verdictColor}20; border: 2px solid ${verdictColor}; border-radius: 12px; padding: 20px; text-align: center; flex: 1; margin-left: 10px;">
                  <span style="font-size: 24px;">${verdictEmoji}</span>
                  <p style="color: ${verdictColor}; font-size: 24px; font-weight: bold; margin: 5px 0;">
                    ${data.verdict}
                  </p>
                  <p style="color: #94a3b8; margin: 5px 0 0; font-size: 14px;">
                    Score: ${data.score}/100
                  </p>
                </div>
              </div>

              <!-- Trade Plan -->
              <div style="background-color: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <h3 style="color: #3b82f6; margin: 0 0 15px; font-size: 18px;">
                  📋 Trade Plan
                </h3>
                <table width="100%" style="color: #e2e8f0; font-size: 14px;">
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #334155;">
                      <span style="color: #94a3b8;">Entry:</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #334155; text-align: right; font-weight: bold;">
                      ${data.entryPrice}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #334155;">
                      <span style="color: #22c55e;">TP1:</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #334155; text-align: right; color: #22c55e; font-weight: bold;">
                      ${data.takeProfit1}
                    </td>
                  </tr>
                  ${data.takeProfit2 ? `
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #334155;">
                      <span style="color: #22c55e;">TP2:</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #334155; text-align: right; color: #22c55e; font-weight: bold;">
                      ${data.takeProfit2}
                    </td>
                  </tr>
                  ` : ''}
                  ${data.takeProfit3 ? `
                  <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #334155;">
                      <span style="color: #22c55e;">TP3:</span>
                    </td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #334155; text-align: right; color: #22c55e; font-weight: bold;">
                      ${data.takeProfit3}
                    </td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 8px 0;">
                      <span style="color: #ef4444;">Stop Loss:</span>
                    </td>
                    <td style="padding: 8px 0; text-align: right; color: #ef4444; font-weight: bold;">
                      ${data.stopLoss}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.reportUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  View Full Report
                </a>
              </div>

              <!-- Footer Note -->
              <p style="color: #64748b; font-size: 13px; text-align: center; margin: 20px 0 0;">
                Generated on ${data.generatedAt}
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
                This is your scheduled report. Manage settings in your dashboard.
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
   * Generate plain text email for scheduled report
   */
  private generateScheduledReportText(data: ScheduledReportEmailData): string {
    return `
TradePath Scheduled Analysis Report
====================================

Hi ${data.userName},

Here's your scheduled analysis for ${data.symbol}:

VERDICT: ${data.verdict} (Score: ${data.score}/100)
Direction: ${data.direction.toUpperCase()}

TRADE PLAN:
- Entry: ${data.entryPrice}
- TP1: ${data.takeProfit1}
${data.takeProfit2 ? `- TP2: ${data.takeProfit2}` : ''}
${data.takeProfit3 ? `- TP3: ${data.takeProfit3}` : ''}
- Stop Loss: ${data.stopLoss}

View full report: ${data.reportUrl}

Generated on ${data.generatedAt}

---
TradePath - Professional Trading Analysis
    `.trim();
  }

  /**
   * Send PDF analysis report to user with attachment
   */
  async sendPdfReport(email: string, data: PdfReportEmailData): Promise<{ success: boolean; error?: string }> {
    const html = this.generatePdfReportEmailHtml(data);
    const text = this.generatePdfReportEmailText(data);

    const result = await this.sendEmail({
      to: email,
      subject: `📊 TradePath ${data.symbol}/USDT Analiz Raporu - ${data.verdict}`,
      html,
      text,
      attachments: [
        {
          filename: data.fileName,
          content: data.pdfBase64,
        },
      ],
    });

    return { success: result.success, error: result.error };
  }

  /**
   * Generate HTML email for PDF report
   */
  private generatePdfReportEmailHtml(data: PdfReportEmailData): string {
    const isLong = data.direction?.toLowerCase() === 'long';
    const verdictColor = data.verdict === 'GO' ? '#22c55e' :
                        data.verdict === 'WAIT' ? '#f59e0b' : '#ef4444';
    const directionColor = isLong ? '#22c55e' : '#ef4444';
    const directionIcon = isLong ? '▲' : '▼';
    const directionText = isLong ? 'BULLISH' : 'BEARISH';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TradePath Analiz Raporu</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

          <!-- Header with gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #f59e0b 50%, #22c55e 100%); padding: 30px; text-align: center;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="text-align: center;">
                    <h1 style="margin: 0; color: white; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                      Trade<span style="color: #fef3c7;">Path</span>
                    </h1>
                    <p style="margin: 8px 0 0; color: rgba(255,255,255,0.95); font-size: 14px; letter-spacing: 1px;">
                      From Charts to Clarity
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 35px;">
              <p style="color: #475569; font-size: 16px; margin: 0 0 25px; line-height: 1.6;">
                Merhaba <strong style="color: #1e293b;">${data.userName}</strong>,
              </p>

              <p style="color: #64748b; font-size: 15px; margin: 0 0 30px; line-height: 1.6;">
                Talep ettiğiniz <strong style="color: #1e293b;">${data.symbol}/USDT</strong> analiz raporu hazırlandı ve bu e-postaya eklendi.
              </p>

              <!-- Report Summary Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 25px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="vertical-align: top;">
                          <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Analiz Edilen</p>
                          <p style="margin: 0; color: #1e293b; font-size: 28px; font-weight: bold;">${data.symbol}/USDT</p>
                        </td>
                        <td width="50%" style="text-align: right; vertical-align: top;">
                          <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Yön</p>
                          <p style="margin: 0; color: ${directionColor}; font-size: 20px; font-weight: bold;">
                            ${directionIcon} ${directionText}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <div style="border-top: 1px solid #e2e8f0; margin: 20px 0; padding-top: 20px;">
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td width="50%">
                            <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Karar</p>
                            <span style="display: inline-block; background: ${verdictColor}20; color: ${verdictColor}; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 14px;">
                              ${data.verdict}
                            </span>
                          </td>
                          <td width="50%" style="text-align: right;">
                            <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Güven Skoru</p>
                            <p style="margin: 0; color: #1e293b; font-size: 24px; font-weight: bold;">${data.score}<span style="color: #94a3b8; font-size: 16px;">/100</span></p>
                          </td>
                        </tr>
                      </table>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Attachment Notice -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: #f0fdf4; border-radius: 12px; border: 1px solid #bbf7d0; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="40" style="vertical-align: top;">
                          <div style="width: 36px; height: 36px; background: #22c55e; border-radius: 8px; text-align: center; line-height: 36px;">
                            <span style="color: white; font-size: 18px;">📎</span>
                          </div>
                        </td>
                        <td style="padding-left: 15px;">
                          <p style="margin: 0 0 4px; color: #166534; font-weight: 600; font-size: 15px;">PDF Rapor Ekte</p>
                          <p style="margin: 0; color: #15803d; font-size: 13px;">${data.fileName}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Report Contents -->
              <p style="color: #64748b; font-size: 14px; margin: 0 0 15px; font-weight: 600;">Rapor İçeriği:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                <tr>
                  <td style="padding: 8px 0; color: #475569; font-size: 14px;">
                    <span style="color: #22c55e; margin-right: 10px;">✓</span> 7 Adımlı Analiz (Market Pulse, Asset Scan, Safety Check...)
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #475569; font-size: 14px;">
                    <span style="color: #22c55e; margin-right: 10px;">✓</span> Trade Plan (Entry, Stop Loss, Take Profit seviyeleri)
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #475569; font-size: 14px;">
                    <span style="color: #22c55e; margin-right: 10px;">✓</span> Fiyat Grafiği
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #475569; font-size: 14px;">
                    <span style="color: #22c55e; margin-right: 10px;">✓</span> AI Expert Yorumları
                  </td>
                </tr>
              </table>

              <!-- Footer Note -->
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                Bu rapor ${data.generatedAt} tarihinde oluşturulmuştur.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 10px; font-weight: 600;">
                TradePath - Professional Trading Analysis
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                Bu e-posta, talep ettiğiniz analiz raporu için otomatik olarak gönderilmiştir.
              </p>
              <p style="color: #cbd5e1; font-size: 10px; margin: 15px 0 0;">
                ⚠️ Bu rapor yatırım tavsiyesi niteliği taşımamaktadır. İşlem yapmadan önce kendi araştırmanızı yapın.
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
   * Generate plain text email for PDF report
   */
  private generatePdfReportEmailText(data: PdfReportEmailData): string {
    const directionText = data.direction?.toLowerCase() === 'long' ? 'BULLISH' : 'BEARISH';

    return `
TradePath Analiz Raporu
=======================

Merhaba ${data.userName},

Talep ettiğiniz ${data.symbol}/USDT analiz raporu hazırlandı ve bu e-postaya eklendi.

RAPOR ÖZETİ:
• Coin: ${data.symbol}/USDT
• Yön: ${directionText}
• Karar: ${data.verdict}
• Skor: ${data.score}/100

RAPOR İÇERİĞİ:
✓ 7 Adımlı Analiz (Market Pulse, Asset Scan, Safety Check...)
✓ Trade Plan (Entry, Stop Loss, Take Profit seviyeleri)
✓ Fiyat Grafiği
✓ AI Expert Yorumları

PDF Dosyası: ${data.fileName}

Bu rapor ${data.generatedAt} tarihinde oluşturulmuştur.

---
TradePath - Professional Trading Analysis

⚠️ Bu rapor yatırım tavsiyesi niteliği taşımamaktadır.
İşlem yapmadan önce kendi araştırmanızı yapın.
    `.trim();
  }
}

export const emailService = new EmailService();
