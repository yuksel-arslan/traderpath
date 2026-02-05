// ===========================================
// Email Service
// Send emails to users (reports, notifications)
// ===========================================

import { config } from '../../core/config';

// Crypto symbols get /USDT suffix, non-crypto (stocks, BIST, metals, bonds) don't
const KNOWN_NON_CRYPTO = [
  // BIST
  'THYAO', 'GARAN', 'AKBNK', 'YKBNK', 'ISCTR', 'HALKB', 'VAKBN', 'TSKB', 'KCHOL', 'SAHOL',
  'TAVHL', 'TKFEN', 'DOHOL', 'SISE', 'TOASO', 'FROTO', 'EREGL', 'KRDMD', 'TUPRS', 'PETKM',
  'PGSUS', 'TCELL', 'TTKOM', 'BIMAS', 'MGROS', 'SOKM', 'ENKAI', 'EKGYO', 'ASELS', 'LOGO',
  'ARCLK', 'VESTL', 'KOZAL', 'KOZAA', 'XU100',
  // Stocks
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 'V', 'WMT',
  'SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO',
  // Metals
  'GLD', 'SLV', 'IAU', 'SGOL', 'XAUUSD', 'XAGUSD',
  // Bonds
  'TLT', 'IEF', 'SHY', 'BND', 'AGG', 'LQD', 'HYG',
];

function formatSymbolPair(symbol: string): string {
  const upper = symbol.toUpperCase().replace('.IS', '');
  if (KNOWN_NON_CRYPTO.includes(upper) || symbol.includes('.IS') || symbol.includes('.')) {
    return upper;
  }
  return `${upper}/USDT`;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string; // Base64 encoded content
    encoding?: string; // 'base64'
    cid?: string; // Content-ID for inline embedding (src="cid:xxx")
    content_type?: string; // MIME type e.g., 'image/png'
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
  private readonly FROM_EMAIL = 'TraderPath <noreply@traderpath.io>';
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

    console.log('[EmailService] Sending email to:', options.to, 'Subject:', options.subject);

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
        console.log('[EmailService] Attachments:', options.attachments.length, 'files');
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        console.error('[EmailService] Failed to send email. Status:', response.status);
        console.error('[EmailService] Response:', responseText);
        return { success: false, error: responseText };
      }

      const data = JSON.parse(responseText);
      console.log('[EmailService] Email sent successfully. ID:', data.id);
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
      subject: `TraderPath ${data.symbol} Expert Analysis Report - ${data.expertName}`,
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
  <title>TraderPath Expert Report</title>
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
                TraderPath
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Expert AI Analysis Report
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <p style="color: #94a3b8; font-size: 16px; margin: 0 0 20px;">
                Hello ${data.userName},
              </p>

              <!-- Symbol Badge -->
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
                <span style="color: white; font-size: 32px; font-weight: bold;">
                  ${data.symbol}
                </span>
                <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0; font-size: 14px;">
                  ${data.expertName} Analysis
                </p>
              </div>

              <!-- Expert Insights -->
              <div style="background-color: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 25px; border-left: 4px solid #3b82f6;">
                <h3 style="color: #3b82f6; margin: 0 0 15px; font-size: 18px;">
                  Expert Opinion
                </h3>
                <p style="color: #e2e8f0; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">
${data.expertInsights}
                </p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${data.reportUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  View Full Report
                </a>
              </div>

              <!-- Footer Note -->
              <p style="color: #64748b; font-size: 13px; text-align: center; margin: 20px 0 0;">
                This report was generated on ${data.generatedAt}.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px; text-align: center; border-top: 1px solid #334155;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                TraderPath - Professional Trading Analysis
              </p>
              <p style="color: #475569; font-size: 11px; margin: 10px 0 0;">
                This email was sent for your requested analysis report.
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
TraderPath Expert Analysis Report
=============================

Hello ${data.userName},

Your ${data.expertName} analysis report for ${data.symbol} is ready.

EXPERT OPINION:
${data.expertInsights}

View full report: ${data.reportUrl}

This report was generated on ${data.generatedAt}.

---
TraderPath - Professional Trading Analysis
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
      subject: `📊 TraderPath ${data.symbol} Daily Analysis - ${data.verdict}`,
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
  <title>TraderPath Scheduled Report</title>
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
                TraderPath
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
                TraderPath - Professional Trading Analysis
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
TraderPath Scheduled Analysis Report
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
TraderPath - Professional Trading Analysis
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
      subject: `📊 TraderPath ${formatSymbolPair(data.symbol)} Analysis Report - ${data.verdict}`,
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
  <title>TraderPath Analysis Report</title>
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
                Hello <strong style="color: #1e293b;">${data.userName}</strong>,
              </p>

              <p style="color: #64748b; font-size: 15px; margin: 0 0 30px; line-height: 1.6;">
                Your requested <strong style="color: #1e293b;">${formatSymbolPair(data.symbol)}</strong> analysis report has been prepared and attached to this email.
              </p>

              <!-- Report Summary Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; margin-bottom: 25px;">
                <tr>
                  <td style="padding: 25px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="vertical-align: top;">
                          <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Analyzed</p>
                          <p style="margin: 0; color: #1e293b; font-size: 28px; font-weight: bold;">${formatSymbolPair(data.symbol)}</p>
                        </td>
                        <td width="50%" style="text-align: right; vertical-align: top;">
                          <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Direction</p>
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
                            <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Verdict</p>
                            <span style="display: inline-block; background: ${verdictColor}20; color: ${verdictColor}; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 14px;">
                              ${data.verdict}
                            </span>
                          </td>
                          <td width="50%" style="text-align: right;">
                            <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Confidence Score</p>
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
                          <p style="margin: 0 0 4px; color: #166534; font-weight: 600; font-size: 15px;">PDF Report Attached</p>
                          <p style="margin: 0; color: #15803d; font-size: 13px;">${data.fileName}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Report Contents -->
              <p style="color: #64748b; font-size: 14px; margin: 0 0 15px; font-weight: 600;">Report Contents:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
                <tr>
                  <td style="padding: 8px 0; color: #475569; font-size: 14px;">
                    <span style="color: #22c55e; margin-right: 10px;">✓</span> 7-Step Analysis (Market Pulse, Asset Scan, Safety Check...)
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #475569; font-size: 14px;">
                    <span style="color: #22c55e; margin-right: 10px;">✓</span> Trade Plan (Entry, Stop Loss, Take Profit levels)
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #475569; font-size: 14px;">
                    <span style="color: #22c55e; margin-right: 10px;">✓</span> Price Chart
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #475569; font-size: 14px;">
                    <span style="color: #22c55e; margin-right: 10px;">✓</span> AI Expert Commentary
                  </td>
                </tr>
              </table>

              <!-- Footer Note -->
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 30px 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                This report was generated on ${data.generatedAt}.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 10px; font-weight: 600;">
                TraderPath - Professional Trading Analysis
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                This email was automatically sent for your requested analysis report.
              </p>
              <p style="color: #cbd5e1; font-size: 10px; margin: 15px 0 0;">
                ⚠️ This report does not constitute investment advice. Do your own research before trading.
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
TraderPath Analysis Report
=======================

Hello ${data.userName},

Your requested ${formatSymbolPair(data.symbol)} analysis report has been prepared and attached to this email.

REPORT SUMMARY:
• Coin: ${formatSymbolPair(data.symbol)}
• Direction: ${directionText}
• Verdict: ${data.verdict}
• Score: ${data.score}/100

REPORT CONTENTS:
✓ 7-Step Analysis (Market Pulse, Asset Scan, Safety Check...)
✓ Trade Plan (Entry, Stop Loss, Take Profit levels)
✓ Price Chart
✓ AI Expert Commentary

PDF File: ${data.fileName}

This report was generated on ${data.generatedAt}.

---
TraderPath - Professional Trading Analysis

⚠️ This report does not constitute investment advice.
Do your own research before trading.
    `.trim();
  }

  // ===========================================
  // Security Email Templates
  // ===========================================

  /**
   * Send email verification link
   */
  async sendEmailVerification(
    email: string,
    userName: string,
    verificationUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Verification - TraderPath</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                TraderPath
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Email Verification
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #475569; font-size: 16px; margin: 0 0 25px;">
                Hello <strong style="color: #1e293b;">${userName}</strong>,
              </p>

              <p style="color: #64748b; font-size: 15px; margin: 0 0 30px; line-height: 1.6;">
                Thank you for creating your TraderPath account! Click the button below to verify your email address.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">
                  ✓ Verify My Email
                </a>
              </div>

              <!-- Security Note -->
              <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.5;">
                  <strong>Security Note:</strong> This link will expire in 24 hours. If you did not request this, you can ignore this email.
                </p>
              </div>

              <!-- Link Alternative -->
              <p style="color: #94a3b8; font-size: 12px; margin: 25px 0 0; word-break: break-all;">
                If the button doesn't work, paste this link in your browser:<br>
                <a href="${verificationUrl}" style="color: #3b82f6;">${verificationUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 13px; margin: 0;">
                TraderPath - Professional Trading Analysis
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 10px 0 0;">
                This email was sent automatically. Please do not reply.
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

    const text = `
Hello ${userName},

Thank you for creating your TraderPath account!

To verify your email address, open this link in your browser:
${verificationUrl}

This link will expire in 24 hours.

If you did not request this, you can ignore this email.

---
TraderPath - Professional Trading Analysis
    `.trim();

    const result = await this.sendEmail({
      to: email,
      subject: '✓ Verify Your Email - TraderPath',
      html,
      text,
    });

    return { success: result.success, error: result.error };
  }

  /**
   * Send password reset link
   */
  async sendPasswordReset(
    email: string,
    userName: string,
    resetUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset - TraderPath</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                TraderPath
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                🔐 Password Reset
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #475569; font-size: 16px; margin: 0 0 25px;">
                Hello <strong style="color: #1e293b;">${userName}</strong>,
              </p>

              <p style="color: #64748b; font-size: 15px; margin: 0 0 30px; line-height: 1.6;">
                You requested a password reset for your account. Click the button below to reset your password.
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);">
                  🔑 Reset My Password
                </a>
              </div>

              <!-- Security Note -->
              <div style="background: #fef2f2; border-radius: 8px; padding: 15px; margin: 25px 0; border-left: 4px solid #ef4444;">
                <p style="color: #991b1b; font-size: 13px; margin: 0; line-height: 1.5;">
                  <strong>⚠️ Important:</strong> This link will expire in 1 hour. If you did not request a password reset, please ignore this email and consider changing your password to keep your account secure.
                </p>
              </div>

              <!-- Link Alternative -->
              <p style="color: #94a3b8; font-size: 12px; margin: 25px 0 0; word-break: break-all;">
                If the button doesn't work, paste this link in your browser:<br>
                <a href="${resetUrl}" style="color: #3b82f6;">${resetUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 13px; margin: 0;">
                TraderPath - Professional Trading Analysis
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 10px 0 0;">
                This email was sent in response to your password reset request.
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

    const text = `
Hello ${userName},

You requested a password reset for your account.

To reset your password, open this link in your browser:
${resetUrl}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email.

---
TraderPath - Professional Trading Analysis
    `.trim();

    const result = await this.sendEmail({
      to: email,
      subject: '🔐 Password Reset Request - TraderPath',
      html,
      text,
    });

    return { success: result.success, error: result.error };
  }

  /**
   * Send 2FA enabled notification
   */
  async sendTwoFactorEnabled(
    email: string,
    userName: string
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>2FA Enabled - TraderPath</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                TraderPath
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                🛡️ Güvenlik Bildirimi
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 40px; line-height: 80px;">✓</span>
                </div>
                <h2 style="color: #22c55e; font-size: 24px; margin: 0;">
                  Two-Factor Authentication Enabled!
                </h2>
              </div>

              <p style="color: #475569; font-size: 16px; margin: 0 0 25px;">
                Hello <strong style="color: #1e293b;">${userName}</strong>,
              </p>

              <p style="color: #64748b; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
                Two-factor authentication (2FA) has been successfully enabled for your account. Your account is now protected with an extra layer of security.
              </p>

              <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #bbf7d0;">
                <p style="color: #166534; font-size: 14px; margin: 0 0 10px; font-weight: bold;">
                  Important Reminders:
                </p>
                <ul style="color: #15803d; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Keep your backup codes in a safe place</li>
                  <li>Don't lose your authenticator app</li>
                  <li>A 2FA code will be required for each login</li>
                </ul>
              </div>

              <p style="color: #94a3b8; font-size: 13px; margin: 25px 0 0; text-align: center;">
                If you did not perform this action, please check your account immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 13px; margin: 0;">
                TraderPath - Professional Trading Analysis
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

    const text = `
Hello ${userName},

Two-factor authentication (2FA) has been successfully enabled for your account!

Your account is now protected with an extra layer of security.

Important Reminders:
- Keep your backup codes in a safe place
- Don't lose your authenticator app
- A 2FA code will be required for each login

If you did not perform this action, please check your account immediately.

---
TraderPath - Professional Trading Analysis
    `.trim();

    const result = await this.sendEmail({
      to: email,
      subject: '🛡️ Two-Factor Authentication Enabled - TraderPath',
      html,
      text,
    });

    return { success: result.success, error: result.error };
  }

  /**
   * Send analysis completion summary notification
   */
  async sendAnalysisSummary(
    email: string,
    userName: string,
    data: {
      symbol: string;
      verdict: string;
      score: number;
      direction: string;
      entryPrice: string;
      stopLoss: string;
      takeProfit1: string;
      tradeType: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const verdictColor = data.verdict === 'GO' ? '#22c55e' : data.verdict === 'WAIT' ? '#f59e0b' : '#ef4444';
    const verdictEmoji = data.verdict === 'GO' ? '🟢' : data.verdict === 'WAIT' ? '🟡' : '🔴';
    const isLong = data.direction?.toLowerCase() === 'long';
    const directionEmoji = isLong ? '📈' : '📉';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Analysis Complete - TraderPath</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">TraderPath</h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Analysis Complete!</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #475569; font-size: 16px; margin: 0 0 25px;">
                Hello <strong style="color: #1e293b;">${userName}</strong>,
              </p>

              <p style="color: #64748b; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
                Your analysis for <strong>${formatSymbolPair(data.symbol)}</strong> is complete! Here's a quick summary:
              </p>

              <!-- Analysis Summary -->
              <div style="background: #f8fafc; border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid #e2e8f0;">
                <table width="100%" style="font-size: 14px;">
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                      <strong style="color: #64748b;">Symbol</strong>
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 18px; font-weight: bold; color: #1e293b;">
                      ${formatSymbolPair(data.symbol)}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                      <strong style="color: #64748b;">Verdict</strong>
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                      <span style="background: ${verdictColor}20; color: ${verdictColor}; padding: 4px 12px; border-radius: 12px; font-weight: bold;">
                        ${verdictEmoji} ${data.verdict}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                      <strong style="color: #64748b;">Score</strong>
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #1e293b;">
                      ${data.score}/100
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                      <strong style="color: #64748b;">Direction</strong>
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: ${isLong ? '#22c55e' : '#ef4444'};">
                      ${directionEmoji} ${data.direction.toUpperCase()}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0;">
                      <strong style="color: #64748b;">Trade Type</strong>
                    </td>
                    <td style="padding: 12px 0; text-align: right; color: #1e293b;">
                      ${data.tradeType}
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Quick Trade Plan -->
              <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 25px 0; border-left: 4px solid #22c55e;">
                <p style="margin: 0 0 15px; font-weight: bold; color: #166534;">Quick Trade Plan:</p>
                <table width="100%" style="font-size: 13px; color: #15803d;">
                  <tr><td>Entry:</td><td style="text-align: right; font-weight: bold;">${data.entryPrice}</td></tr>
                  <tr><td>TP1:</td><td style="text-align: right; font-weight: bold; color: #22c55e;">${data.takeProfit1}</td></tr>
                  <tr><td>Stop Loss:</td><td style="text-align: right; font-weight: bold; color: #ef4444;">${data.stopLoss}</td></tr>
                </table>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://traderpath.io/dashboard" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                  View Full Report
                </a>
              </div>

              <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                Log in to see detailed analysis, charts, and AI expert commentary.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 13px; margin: 0;">TraderPath - Professional Trading Analysis</p>
              <p style="color: #cbd5e1; font-size: 10px; margin: 15px 0 0;">
                ⚠️ This is not investment advice. Do your own research before trading.
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

    const text = `
TraderPath - Analysis Complete!
==============================

Hello ${userName},

Your analysis for ${formatSymbolPair(data.symbol)} is complete!

SUMMARY:
- Symbol: ${formatSymbolPair(data.symbol)}
- Verdict: ${data.verdict}
- Score: ${data.score}/100
- Direction: ${data.direction.toUpperCase()}
- Trade Type: ${data.tradeType}

QUICK TRADE PLAN:
- Entry: ${data.entryPrice}
- TP1: ${data.takeProfit1}
- Stop Loss: ${data.stopLoss}

View full report at: https://traderpath.io/dashboard

---
TraderPath - Professional Trading Analysis
⚠️ This is not investment advice.
    `.trim();

    const result = await this.sendEmail({
      to: email,
      subject: `${verdictEmoji} ${formatSymbolPair(data.symbol)} Analysis: ${data.verdict} (${data.score}/100) - TraderPath`,
      html,
      text,
    });

    return { success: result.success, error: result.error };
  }

  /**
   * Send credit grant notification
   */
  async sendCreditGrantNotification(
    email: string,
    userName: string,
    data: { amount: number; reason: string; newBalance: number }
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Free Credits Received - TraderPath</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                TraderPath
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                🎁 Free Credits Received!
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; margin: 0 auto 20px; line-height: 80px;">
                  <span style="font-size: 40px;">🎁</span>
                </div>
                <h2 style="color: #22c55e; font-size: 24px; margin: 0;">
                  +${data.amount} Credits!
                </h2>
              </div>

              <p style="color: #475569; font-size: 16px; margin: 0 0 25px;">
                Hello <strong style="color: #1e293b;">${userName}</strong>,
              </p>

              <p style="color: #64748b; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
                Great news! You have received free credits to your TraderPath account.
              </p>

              <!-- Credit Details -->
              <div style="background: #f0fdf4; border-radius: 12px; padding: 25px; margin: 25px 0; border: 1px solid #bbf7d0;">
                <table width="100%" style="color: #166534; font-size: 14px;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #bbf7d0;">
                      <strong>Credits Added:</strong>
                    </td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #bbf7d0; text-align: right; font-size: 20px; font-weight: bold; color: #22c55e;">
                      +${data.amount}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #bbf7d0;">
                      <strong>Reason:</strong>
                    </td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #bbf7d0; text-align: right;">
                      ${data.reason}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0;">
                      <strong>New Balance:</strong>
                    </td>
                    <td style="padding: 10px 0; text-align: right; font-size: 18px; font-weight: bold;">
                      ${data.newBalance} credits
                    </td>
                  </tr>
                </table>
              </div>

              <p style="color: #64748b; font-size: 14px; margin: 0 0 25px; line-height: 1.6;">
                You can use these credits for AI analysis, expert reports, and more!
              </p>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://traderpath.io/dashboard" style="display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; text-decoration: none; padding: 16px 50px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">
                  Start Analyzing
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 13px; margin: 0;">
                TraderPath - Professional Trading Analysis
              </p>
              <p style="color: #94a3b8; font-size: 11px; margin: 10px 0 0;">
                Thank you for being part of our community!
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

    const text = `
Hello ${userName},

Great news! You have received free credits to your TraderPath account.

CREDIT DETAILS:
- Credits Added: +${data.amount}
- Reason: ${data.reason}
- New Balance: ${data.newBalance} credits

You can use these credits for AI analysis, expert reports, and more!

Visit https://traderpath.io/dashboard to start analyzing.

---
TraderPath - Professional Trading Analysis
Thank you for being part of our community!
    `.trim();

    const result = await this.sendEmail({
      to: email,
      subject: `🎁 You received ${data.amount} free credits - TraderPath`,
      html,
      text,
    });

    return { success: result.success, error: result.error };
  }

  /**
   * Send suspicious login alert
   */
  async sendSuspiciousLoginAlert(
    email: string,
    userName: string,
    loginDetails: { ip: string; location?: string; device?: string; time: string }
  ): Promise<{ success: boolean; error?: string }> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Alert - TraderPath</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                TraderPath
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                ⚠️ Security Alert
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 40px; line-height: 80px;">⚠️</span>
                </div>
                <h2 style="color: #d97706; font-size: 24px; margin: 0;">
                  New Device Login Detected
                </h2>
              </div>

              <p style="color: #475569; font-size: 16px; margin: 0 0 25px;">
                Hello <strong style="color: #1e293b;">${userName}</strong>,
              </p>

              <p style="color: #64748b; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
                A login to your account was detected from a new device or location. If this wasn't you, please change your password immediately.
              </p>

              <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 25px 0; border: 1px solid #fcd34d;">
                <p style="color: #92400e; font-size: 14px; margin: 0 0 15px; font-weight: bold;">
                  Login Details:
                </p>
                <table width="100%" style="color: #78350f; font-size: 13px;">
                  <tr>
                    <td style="padding: 5px 0;"><strong>IP Address:</strong></td>
                    <td style="padding: 5px 0;">${loginDetails.ip}</td>
                  </tr>
                  ${loginDetails.location ? `
                  <tr>
                    <td style="padding: 5px 0;"><strong>Location:</strong></td>
                    <td style="padding: 5px 0;">${loginDetails.location}</td>
                  </tr>
                  ` : ''}
                  ${loginDetails.device ? `
                  <tr>
                    <td style="padding: 5px 0;"><strong>Device:</strong></td>
                    <td style="padding: 5px 0;">${loginDetails.device}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 5px 0;"><strong>Time:</strong></td>
                    <td style="padding: 5px 0;">${loginDetails.time}</td>
                  </tr>
                </table>
              </div>

              <p style="color: #64748b; font-size: 14px; margin: 0; line-height: 1.6;">
                If this login was you, you can ignore this alert. Otherwise:
              </p>
              <ul style="color: #475569; font-size: 14px; margin: 15px 0; padding-left: 20px;">
                <li>Change your password immediately</li>
                <li>End all sessions</li>
                <li>Enable two-factor authentication</li>
              </ul>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="color: #64748b; font-size: 13px; margin: 0;">
                TraderPath - Professional Trading Analysis
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

    const text = `
Hello ${userName},

A login to your account was detected from a new device or location.

Login Details:
- IP Address: ${loginDetails.ip}
${loginDetails.location ? `- Location: ${loginDetails.location}` : ''}
${loginDetails.device ? `- Device: ${loginDetails.device}` : ''}
- Time: ${loginDetails.time}

If this login was you, you can ignore this alert.

Otherwise:
- Change your password immediately
- End all sessions
- Enable two-factor authentication

---
TraderPath - Professional Trading Analysis
    `.trim();

    const result = await this.sendEmail({
      to: email,
      subject: '⚠️ New Device Login Detected - TraderPath',
      html,
      text,
    });

    return { success: result.success, error: result.error };
  }
  /**
   * Send analysis screenshot via email (as attachment only - no inline data URL)
   */
  async sendAnalysisScreenshot(
    email: string,
    userName: string,
    data: {
      symbol: string;
      interval: string;
      score: number;
      direction: string;
      screenshotBase64: string; // Base64 data URL
      generatedAt: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    const isLong = data.direction?.toLowerCase() === 'long';
    const directionColor = isLong ? '#14b8a6' : '#ef4444';
    const directionText = isLong ? 'LONG' : 'SHORT';
    const directionIcon = isLong ? '▲' : '▼';
    const scorePercent = Math.round(data.score * 10);
    const scoreColor = scorePercent >= 70 ? '#14b8a6' : scorePercent >= 50 ? '#f59e0b' : '#ef4444';

    // Extract just the base64 part for attachment (remove data URL prefix)
    const base64Data = data.screenshotBase64.replace(/^data:image\/\w+;base64,/, '');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TraderPath Analysis - ${data.symbol}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0f172a; padding: 20px;">
    <tr>
      <td align="center">
        <table width="650" cellpadding="0" cellspacing="0" style="background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #14b8a6 0%, #0f172a 50%, #ef4444 100%); padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 28px; font-weight: bold;">
                Trader<span style="color: #fef3c7;">Path</span>
              </h1>
              <p style="margin: 6px 0 0; color: rgba(255,255,255,0.8); font-size: 12px; letter-spacing: 1px;">
                AI-Powered Trading Analysis
              </p>
            </td>
          </tr>

          <!-- Analysis Info Bar -->
          <tr>
            <td style="background: #0f172a; padding: 15px 20px; border-bottom: 1px solid #334155;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="color: white; font-size: 20px; font-weight: bold;">
                    ${formatSymbolPair(data.symbol)}
                    <span style="font-size: 12px; color: ${directionColor}; margin-left: 10px; padding: 4px 8px; background: ${isLong ? 'rgba(20, 184, 166, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; border-radius: 4px;">
                      ${directionIcon} ${directionText}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <span style="color: ${scoreColor}; font-size: 24px; font-weight: bold;">${scorePercent}/100</span>
                    <span style="color: #94a3b8; font-size: 11px; display: block;">Score</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Screenshot Notice -->
          <tr>
            <td style="background: #1e293b; padding: 30px 20px; text-align: center;">
              <p style="color: #94a3b8; font-size: 14px; margin: 0 0 15px;">
                Full analysis screenshot attached below
              </p>
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                Open the attachment to view your complete ${formatSymbolPair(data.symbol)} analysis with chart and trade plan
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #0f172a; padding: 15px 20px; text-align: center; border-top: 1px solid #334155;">
              <p style="color: #64748b; font-size: 11px; margin: 0;">
                ${data.interval.toUpperCase()} Timeframe | Generated on ${data.generatedAt}
              </p>
              <p style="color: #475569; font-size: 10px; margin: 8px 0 0;">
                This is not investment advice. Do your own research before trading.
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

    const text = `
TraderPath Analysis - ${formatSymbolPair(data.symbol)}
==========================================

Direction: ${directionText}
Score: ${scorePercent}/100
Timeframe: ${data.interval}

Full analysis screenshot attached to this email.

Generated on ${data.generatedAt}

---
TraderPath - AI-Powered Trading Analysis
This is not investment advice. Do your own research before trading.
    `.trim();

    const result = await this.sendEmail({
      to: email,
      subject: `${formatSymbolPair(data.symbol)} ${directionText} - ${scorePercent}/100 Score | TraderPath`,
      html,
      text,
      attachments: [
        {
          filename: `TraderPath_${data.symbol}_${data.interval}.png`,
          content: base64Data,
          encoding: 'base64',
          content_type: 'image/png',
        },
      ],
    });

    return { success: result.success, error: result.error };
  }
}

export const emailService = new EmailService();
