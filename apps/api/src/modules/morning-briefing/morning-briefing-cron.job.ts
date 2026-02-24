/**
 * Morning Briefing Cron Job
 * Runs daily at 07:00 (4:00 UTC)
 */

import cron, { type ScheduledTask } from 'node-cron';
import { morningBriefingService } from './morning-briefing.service';
import { emailService } from '../email/email.service';
import { cache } from '../../core/cache';
import { prisma } from '../../core/database';

const LOCK_KEY = 'morning-briefing:running';
const LOCK_TTL = 1800; // 30 minutes

let cronJob: ScheduledTask | null = null;

/**
 * Execute morning briefing generation and delivery
 */
async function executeMorningBriefing() {
  console.log('[MorningBriefing] Cron job triggered');

  // Acquire lock to prevent concurrent runs
  const acquired = await cache.setNX(LOCK_KEY, '1', LOCK_TTL);
  if (!acquired) {
    console.log('[MorningBriefing] Another instance running, skipping');
    return;
  }

  try {
    // Generate briefing
    const briefing = await morningBriefingService.generateBriefing();
    console.log('[MorningBriefing] Briefing generated:', briefing.id);

    // Get users who want briefing (for now, all active users)
    const users = await prisma.user.findMany({
      where: {
        accountLocked: false,
        emailVerified: { not: null },
      },
      select: {
        id: true,
        email: true,
        name: true,
        telegramChatId: true,
        discordWebhookUrl: true,
      },
      take: 100, // Limit for initial rollout
    });

    console.log(`[MorningBriefing] Sending to ${users.length} users`);

    // Send briefing to each user
    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      try {
        await sendBriefingToUser(user, briefing);
        successCount++;
      } catch (error) {
        console.error(`[MorningBriefing] Failed for user ${user.id}:`, error);
        failCount++;
      }
    }

    console.log(`[MorningBriefing] Complete. Success: ${successCount}, Failed: ${failCount}`);
  } catch (error) {
    console.error('[MorningBriefing] Execution failed:', error);
  } finally {
    // Release lock
    await cache.del(LOCK_KEY);
  }
}

/**
 * Send briefing to a specific user
 */
async function sendBriefingToUser(user: any, briefing: any) {
  const emailHtml = generateEmailHtml(briefing, user);

  await emailService.sendEmail({
    to: user.email,
    subject: `TraderPath Morning Briefing - ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    html: emailHtml,
    text: generatePlainText(briefing),
  });
}

/**
 * Generate HTML email template
 */
function generateEmailHtml(briefing: any, user: any): string {
  const date = new Date(briefing.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const riskAlertsHtml =
    briefing.riskAlerts.length > 0
      ? `
    <div style="background: #FEF2F2; border-left: 4px solid #DC2626; padding: 16px; margin: 20px 0; border-radius: 8px;">
      <h3 style="color: #DC2626; margin: 0 0 12px 0; font-size: 16px; font-weight: 600;">⚠️ Risk Alerts</h3>
      ${briefing.riskAlerts
        .map(
          (alert: any) => `
        <div style="margin: 8px 0;">
          <span style="color: #991B1B; font-weight: 500;">${alert.severity.toUpperCase()}:</span>
          <span style="color: #7F1D1D;">${alert.message}</span>
        </div>
      `
        )
        .join('')}
    </div>
  `
      : '<p style="color: #059669; font-weight: 500;">✅ No significant risk alerts today.</p>';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TraderPath Morning Briefing</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F8FAFC;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #14B8A6 0%, #0EA5E9 100%); padding: 32px 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">TraderPath</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Morning Briefing</p>
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px;">
      <p style="color: #64748B; margin: 0 0 24px 0; font-size: 14px;">
        Good morning${user.name ? ', ' + user.name : ''}! Here's your market intelligence for ${date}.
      </p>

      <!-- L1: Global Liquidity -->
      <div style="margin-bottom: 32px;">
        <h2 style="color: #0F172A; font-size: 20px; font-weight: 600; margin: 0 0 16px 0; display: flex; align-items: center;">
          <span style="background: #14B8A6; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 14px; font-weight: 700;">L1</span>
          Global Liquidity Status
        </h2>
        <div style="background: #F1F5F9; padding: 16px; border-radius: 8px; border-left: 4px solid #14B8A6;">
          <div style="display: grid; gap: 12px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748B;">Market Bias:</span>
              <strong style="color: ${
                briefing.globalLiquidityStatus.bias === 'risk_on'
                  ? '#059669'
                  : briefing.globalLiquidityStatus.bias === 'risk_off'
                    ? '#DC2626'
                    : '#F59E0B'
              };">${briefing.globalLiquidityStatus.bias.toUpperCase().replace('_', '-')}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748B;">DXY (USD):</span>
              <strong style="color: #0F172A;">${briefing.globalLiquidityStatus.dxyLevel.toFixed(2)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748B;">VIX (Fear Index):</span>
              <strong style="color: #0F172A;">${briefing.globalLiquidityStatus.vixLevel.toFixed(1)}</strong>
            </div>
          </div>
          <p style="color: #475569; margin: 16px 0 0 0; font-size: 14px; line-height: 1.6;">
            ${briefing.globalLiquidityStatus.verdict}
          </p>
        </div>
      </div>

      <!-- L2: Market Bias -->
      <div style="margin-bottom: 32px;">
        <h2 style="color: #0F172A; font-size: 20px; font-weight: 600; margin: 0 0 16px 0; display: flex; align-items: center;">
          <span style="background: #0EA5E9; color: white; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 14px; font-weight: 700;">L2</span>
          Market Flow Analysis
        </h2>
        <div style="background: #F1F5F9; padding: 16px; border-radius: 8px; border-left: 4px solid #0EA5E9;">
          <div style="display: grid; gap: 12px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748B;">Primary Market:</span>
              <strong style="color: #0F172A;">${briefing.marketBias.primary.toUpperCase()}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748B;">7D Flow:</span>
              <strong style="color: ${briefing.marketBias.flow7d > 0 ? '#059669' : '#DC2626'};">${briefing.marketBias.flow7d > 0 ? '+' : ''}${briefing.marketBias.flow7d.toFixed(1)}%</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748B;">Phase:</span>
              <strong style="color: #0F172A;">${briefing.marketBias.phase.toUpperCase()}</strong>
            </div>
          </div>
          <p style="color: #475569; margin: 16px 0 0 0; font-size: 14px; line-height: 1.6;">
            ${briefing.marketBias.recommendation}
          </p>
        </div>
      </div>

      <!-- Top 3 Assets -->
      <div style="margin-bottom: 32px;">
        <h2 style="color: #0F172A; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">
          🎯 Top 3 Assets to Watch
        </h2>
        ${briefing.topAssets
          .map(
            (asset: any, i: number) => `
          <div style="background: #F8FAFC; padding: 16px; border-radius: 8px; margin-bottom: 12px; border: 1px solid #E2E8F0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div>
                <span style="color: #94A3B8; font-size: 12px; font-weight: 600;">#${i + 1}</span>
                <strong style="color: #0F172A; font-size: 16px; margin-left: 8px;">${asset.symbol}</strong>
              </div>
              <div style="background: ${asset.direction === 'long' ? '#DCFCE7' : '#FEE2E2'}; color: ${asset.direction === 'long' ? '#166534' : '#991B1B'}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                ${asset.direction.toUpperCase()}
              </div>
            </div>
            <p style="color: #64748B; margin: 0; font-size: 14px;">${asset.reason}</p>
            <div style="margin-top: 8px;">
              <span style="color: #64748B; font-size: 12px;">Score:</span>
              <strong style="color: #0F172A; font-size: 14px;"> ${asset.score.toFixed(1)}/10</strong>
            </div>
          </div>
        `
          )
          .join('')}
      </div>

      <!-- Risk Alerts -->
      ${riskAlertsHtml}

      <!-- Today's Opportunities -->
      ${
        briefing.opportunities.length > 0
          ? `
      <div style="margin-bottom: 32px;">
        <h2 style="color: #0F172A; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">
          💡 Today's Opportunities
        </h2>
        ${briefing.opportunities
          .map(
            (opp: any) => `
          <div style="background: #F0FDF4; padding: 16px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #059669;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong style="color: #0F172A; font-size: 16px;">${opp.title}</strong>
              <span style="color: #059669; font-size: 12px; font-weight: 600;">${opp.confidence}% Confidence</span>
            </div>
            <p style="color: #475569; margin: 0; font-size: 14px;">${opp.description}</p>
          </div>
        `
          )
          .join('')}
      </div>
      `
          : ''
      }

      <!-- CTA -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://traderpath.io/analyze" style="display: inline-block; background: linear-gradient(135deg, #14B8A6 0%, #0EA5E9 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
          View Full Analysis →
        </a>
      </div>

    </div>

    <!-- Footer -->
    <div style="background: #F8FAFC; padding: 24px; text-align: center; border-top: 1px solid #E2E8F0;">
      <p style="color: #94A3B8; margin: 0; font-size: 12px;">
        TraderPath - AI-Powered Trading Intelligence
      </p>
      <p style="color: #CBD5E1; margin: 8px 0 0 0; font-size: 11px;">
        This briefing is generated automatically based on market data and should not be considered financial advice.
      </p>
    </div>

  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text version
 */
function generatePlainText(briefing: any): string {
  const date = new Date(briefing.date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return `
TraderPath Morning Briefing - ${date}

=== L1: GLOBAL LIQUIDITY STATUS ===
Market Bias: ${briefing.globalLiquidityStatus.bias.toUpperCase()}
DXY: ${briefing.globalLiquidityStatus.dxyLevel.toFixed(2)}
VIX: ${briefing.globalLiquidityStatus.vixLevel.toFixed(1)}

${briefing.globalLiquidityStatus.verdict}

=== L2: MARKET FLOW ANALYSIS ===
Primary Market: ${briefing.marketBias.primary.toUpperCase()}
7D Flow: ${briefing.marketBias.flow7d > 0 ? '+' : ''}${briefing.marketBias.flow7d.toFixed(1)}%
Phase: ${briefing.marketBias.phase.toUpperCase()}

${briefing.marketBias.recommendation}

=== TOP 3 ASSETS TO WATCH ===
${briefing.topAssets
  .map(
    (asset: any, i: number) => `
${i + 1}. ${asset.symbol} (${asset.direction.toUpperCase()}) - Score: ${asset.score.toFixed(1)}/10
   ${asset.reason}
`
  )
  .join('')}

${
  briefing.riskAlerts.length > 0
    ? `
=== RISK ALERTS ===
${briefing.riskAlerts.map((alert: any) => `- [${alert.severity.toUpperCase()}] ${alert.message}`).join('\n')}
`
    : '=== RISK ALERTS ===\nNo significant risk alerts today.'
}

${
  briefing.opportunities.length > 0
    ? `
=== TODAY'S OPPORTUNITIES ===
${briefing.opportunities.map((opp: any) => `- ${opp.title}: ${opp.description} (${opp.confidence}% confidence)`).join('\n')}
`
    : ''
}

View full analysis: https://traderpath.io/analyze

---
TraderPath - AI-Powered Trading Intelligence
This briefing is generated automatically based on market data and should not be considered financial advice.
  `;
}

/**
 * Start the morning briefing cron job
 */
export function startMorningBriefingJob() {
  if (cronJob) {
    console.log('[MorningBriefing] Cron job already running');
    return;
  }

  // Run daily at 07:00 (4:00 UTC = 7:00 UTC+3)
  cronJob = cron.schedule(
    '0 4 * * *',
    async () => {
      await executeMorningBriefing();
    },
    {
      timezone: 'UTC',
    }
  );

  console.log('[MorningBriefing] Cron job started - runs daily at 07:00 (UTC+3)');
}

/**
 * Stop the morning briefing cron job
 */
export function stopMorningBriefingJob() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[MorningBriefing] Cron job stopped');
  }
}

/**
 * Manual trigger for testing
 */
export async function triggerManualBriefing() {
  console.log('[MorningBriefing] Manual trigger initiated');
  await executeMorningBriefing();
}
