'use client';

// ===========================================
// Analysis Report PDF Generator
// Full-width steps with AI insights and trade plan chart
// ===========================================

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  pdf,
} from '@react-pdf/renderer';
import { saveAs } from 'file-saver';

// TradePath brand colors - Premium gradient theme
const BRAND = {
  // Primary gradient colors (Red to Green)
  gradientStart: '#ef4444', // Red
  gradientEnd: '#22c55e', // Green
  // Accent colors
  primary: '#3b82f6',
  primaryDark: '#1e40af',
  success: '#22c55e',
  successDark: '#15803d',
  danger: '#ef4444',
  dangerDark: '#b91c1c',
  warning: '#f59e0b',
  warningDark: '#d97706',
  // Neutral colors
  text: '#0f172a',
  textLight: '#334155',
  textMuted: '#64748b',
  border: '#e2e8f0',
  bgLight: '#f8fafc',
  bgDark: '#1e293b',
  // Special
  gold: '#fbbf24',
  platinum: '#94a3b8',
};

// Step colors
const STEP_COLORS = {
  1: { bg: '#eff6ff', border: '#3b82f6', text: '#1d4ed8' }, // Blue - Market Pulse
  2: { bg: '#ecfeff', border: '#06b6d4', text: '#0891b2' }, // Cyan - Asset Scanner
  3: { bg: '#fff7ed', border: '#f97316', text: '#c2410c' }, // Orange - Safety Check
  4: { bg: '#faf5ff', border: '#a855f7', text: '#7c3aed' }, // Purple - Timing
  5: { bg: '#eef2ff', border: '#6366f1', text: '#4f46e5' }, // Indigo - Trade Plan
  6: { bg: '#fef2f2', border: '#ef4444', text: '#dc2626' }, // Red - Trap Check
  7: { bg: '#f0fdf4', border: '#22c55e', text: '#16a34a' }, // Green - Final Verdict
};

// Professional styles
const styles = StyleSheet.create({
  // Cover Page - Premium Dark Theme
  coverPage: {
    flex: 1,
    backgroundColor: '#0f172a', // Dark slate
    padding: 0,
  },
  coverTopBar: {
    height: 6,
    flexDirection: 'row',
  },
  coverTopBarSegment: {
    flex: 1,
    height: 6,
  },
  coverContent: {
    flex: 1,
    padding: 50,
    justifyContent: 'space-between',
  },
  coverHeader: {
    alignItems: 'center',
    marginTop: 30,
  },
  coverLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  coverLogoT: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#ef4444', // Red
  },
  coverLogoP: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#22c55e', // Green
  },
  coverTagline: {
    fontSize: 10,
    color: '#94a3b8',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  coverDivider: {
    width: 80,
    height: 2,
    backgroundColor: '#334155',
    marginTop: 20,
    marginBottom: 40,
  },
  coverMain: {
    alignItems: 'center',
  },
  coverSymbolBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1e293b',
    borderWidth: 3,
    borderColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  coverSymbolLetter: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  coverTitle: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  coverSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 50,
  },
  coverVerdictContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  coverVerdictLabel: {
    fontSize: 10,
    color: '#64748b',
    letterSpacing: 2,
    marginBottom: 8,
  },
  coverVerdictBadge: {
    paddingVertical: 16,
    paddingHorizontal: 50,
    borderRadius: 8,
    marginBottom: 30,
  },
  coverVerdictText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    letterSpacing: 1,
  },
  coverScoreContainer: {
    alignItems: 'center',
    padding: 25,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  coverScoreLabel: {
    fontSize: 10,
    color: '#64748b',
    letterSpacing: 2,
    marginBottom: 8,
  },
  coverScore: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  coverScoreMax: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  coverFooter: {
    alignItems: 'center',
    paddingTop: 30,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  coverMetaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 30,
    marginBottom: 15,
  },
  coverMetaItem: {
    alignItems: 'center',
  },
  coverMetaLabel: {
    fontSize: 8,
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 2,
  },
  coverMeta: {
    fontSize: 10,
    color: '#94a3b8',
  },
  coverPowered: {
    fontSize: 9,
    color: '#475569',
  },

  // Content Pages
  page: {
    backgroundColor: '#ffffff',
    padding: 25,
    paddingBottom: 50,
    fontFamily: 'Helvetica',
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  pageHeaderLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageHeaderLogoT: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND.danger,
  },
  pageHeaderLogoP: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BRAND.success,
  },
  pageHeaderSymbol: {
    fontSize: 12,
    color: BRAND.textMuted,
  },

  // Step Card - Full Width
  stepCard: {
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BRAND.text,
  },
  stepStatus: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    color: '#ffffff',
  },

  // Metrics Grid - 4 columns
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricItem: {
    width: '25%',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 8,
    color: BRAND.textMuted,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: BRAND.text,
  },

  // AI Insight Box
  aiInsightBox: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  aiInsightLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: BRAND.primary,
    marginBottom: 4,
  },
  aiInsightText: {
    fontSize: 9,
    color: BRAND.text,
    lineHeight: 1.4,
  },

  // Trade Levels
  levelsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  levelBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  levelTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  levelPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: BRAND.text,
  },
  levelPercent: {
    fontSize: 9,
    marginTop: 2,
  },

  // Chart Section
  chartSection: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: BRAND.border,
    overflow: 'hidden',
    marginTop: 15,
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: BRAND.text,
    padding: 8,
    backgroundColor: BRAND.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  chartImage: {
    width: '100%',
    height: 300,
  },

  // AI Expert Section
  aiExpertSection: {
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    padding: 12,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  aiExpertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#fcd34d',
  },
  aiExpertBadge: {
    backgroundColor: '#f59e0b',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  aiExpertBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  aiExpertTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#92400e',
  },
  aiExpertContent: {
    fontSize: 9,
    color: '#78350f',
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 25,
    right: 25,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  footerText: {
    fontSize: 8,
    color: BRAND.textMuted,
  },
  footerDisclaimer: {
    fontSize: 7,
    color: '#9ca3af',
    lineHeight: 1.3,
    marginTop: 3,
    maxWidth: '80%',
  },
  pageNumber: {
    fontSize: 9,
    color: BRAND.textMuted,
  },
});

// Helper functions
function formatPrice(price: number): string {
  if (!price) return '$0';
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

function getStatusLabel(value: string | boolean | number, type: string): string {
  if (type === 'trend') {
    if (value === 'bullish') return 'BULLISH';
    if (value === 'bearish') return 'BEARISH';
    return 'NEUTRAL';
  }
  if (type === 'risk') {
    if (value === 'low') return 'LOW RISK';
    if (value === 'high') return 'HIGH RISK';
    return 'MODERATE';
  }
  if (type === 'timing') {
    return value ? 'READY' : 'WAIT';
  }
  return String(value).toUpperCase();
}

// Data types
interface AnalysisReportData {
  symbol: string;
  generatedAt: string;
  analysisId: string;
  chartImage?: string;
  marketPulse: {
    btcDominance: number;
    fearGreedIndex: number;
    fearGreedLabel: string;
    trend: { direction: string; strength: number };
    aiSummary?: string;
  };
  assetScan: {
    currentPrice: number;
    priceChange24h: number;
    indicators: { rsi: number; macd: { histogram: number } };
    levels?: { support: number[]; resistance: number[] };
    aiInsight?: string;
  };
  safetyCheck: {
    riskLevel: string;
    manipulation: { pumpDumpRisk: string };
    whaleActivity: { bias: string };
    smartMoney?: { positioning: string };
    aiInsight?: string;
  };
  timing: {
    tradeNow: boolean;
    reason: string;
    aiInsight?: string;
  };
  tradePlan: {
    direction: string;
    entries?: Array<{ price: number; percentage?: number }>;
    averageEntry: number;
    stopLoss: { price: number; percentage?: number };
    takeProfits: Array<{ price: number; percentage?: number }>;
    riskReward: number;
    winRateEstimate?: number;
    aiInsight?: string;
  };
  trapCheck?: {
    traps: { bullTrap: boolean; bearTrap: boolean; fakeoutRisk: string };
    aiInsight?: string;
  };
  verdict: {
    action: string;
    overallScore: number;
    aiSummary?: string;
  };
  aiExpertComment?: string;
}

// Page Footer Component
const PageFooter = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
  <View style={styles.footer}>
    <View style={styles.footerContent}>
      <View>
        <Text style={styles.footerText}>TradePath AI Analysis Report • Confidential</Text>
        <Text style={styles.footerDisclaimer}>
          Disclaimer: This report is for educational purposes only and does not constitute financial advice. Crypto trading involves substantial risk.
        </Text>
      </View>
      <Text style={styles.pageNumber}>Page {pageNum} / {totalPages}</Text>
    </View>
  </View>
);

// Step Card Component
const StepCard = ({
  stepNum,
  title,
  status,
  statusColor,
  metrics,
  aiInsight
}: {
  stepNum: number;
  title: string;
  status: string;
  statusColor: string;
  metrics: Array<{ label: string; value: string; color?: string }>;
  aiInsight?: string;
}) => {
  const colors = STEP_COLORS[stepNum as keyof typeof STEP_COLORS];

  return (
    <View style={[styles.stepCard, { backgroundColor: colors.bg, borderLeftColor: colors.border }]}>
      <View style={styles.stepHeader}>
        <View style={styles.stepTitleRow}>
          <View style={[styles.stepNumber, { backgroundColor: colors.border }]}>
            <Text style={styles.stepNumberText}>{stepNum}</Text>
          </View>
          <Text style={styles.stepTitle}>{title}</Text>
        </View>
        <Text style={[styles.stepStatus, { backgroundColor: statusColor }]}>{status}</Text>
      </View>

      <View style={styles.metricsGrid}>
        {metrics.map((metric, idx) => (
          <View key={idx} style={styles.metricItem}>
            <Text style={styles.metricLabel}>{metric.label}</Text>
            <Text style={[styles.metricValue, metric.color ? { color: metric.color } : {}]}>
              {metric.value}
            </Text>
          </View>
        ))}
      </View>

      {aiInsight && (
        <View style={styles.aiInsightBox}>
          <Text style={[styles.aiInsightLabel, { color: colors.text }]}>🤖 AI Insight</Text>
          <Text style={styles.aiInsightText}>{aiInsight.slice(0, 250)}{aiInsight.length > 250 ? '...' : ''}</Text>
        </View>
      )}
    </View>
  );
};

// PDF Document Component
const AnalysisReportDocument = ({ data }: { data: AnalysisReportData }) => {
  const isLong = data.tradePlan.direction === 'long';
  const score = (data.verdict.overallScore || 0) * 10;
  const totalPages = data.chartImage ? 3 : 2;

  // Status calculations
  const marketStatus = data.marketPulse.trend?.direction === 'bullish' ? 'BULLISH' :
                       data.marketPulse.trend?.direction === 'bearish' ? 'BEARISH' : 'NEUTRAL';
  const marketColor = marketStatus === 'BULLISH' ? BRAND.success : marketStatus === 'BEARISH' ? BRAND.danger : BRAND.warning;

  const assetStatus = (data.assetScan.priceChange24h || 0) >= 0 ? 'STABLE' : 'DECLINING';
  const assetColor = assetStatus === 'STABLE' ? BRAND.success : BRAND.danger;

  const safetyStatus = data.safetyCheck.riskLevel === 'low' ? 'SAFE' : data.safetyCheck.riskLevel === 'high' ? 'RISKY' : 'CAUTION';
  const safetyColor = safetyStatus === 'SAFE' ? BRAND.success : safetyStatus === 'RISKY' ? BRAND.danger : BRAND.warning;

  const timingStatus = data.timing.tradeNow ? 'READY' : 'WAIT';
  const timingColor = timingStatus === 'READY' ? BRAND.success : BRAND.warning;

  const planStatus = data.tradePlan.averageEntry ? 'READY' : 'PENDING';
  const planColor = planStatus === 'READY' ? BRAND.success : BRAND.warning;

  const trapStatus = data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap ? 'WARNING' : 'CLEAR';
  const trapColor = trapStatus === 'CLEAR' ? BRAND.success : BRAND.danger;

  return (
    <Document>
      {/* COVER PAGE - Premium Dark Theme */}
      <Page size="A4" style={styles.coverPage}>
        {/* Gradient Top Bar */}
        <View style={styles.coverTopBar}>
          <View style={[styles.coverTopBarSegment, { backgroundColor: '#ef4444' }]} />
          <View style={[styles.coverTopBarSegment, { backgroundColor: '#f97316' }]} />
          <View style={[styles.coverTopBarSegment, { backgroundColor: '#f59e0b' }]} />
          <View style={[styles.coverTopBarSegment, { backgroundColor: '#84cc16' }]} />
          <View style={[styles.coverTopBarSegment, { backgroundColor: '#22c55e' }]} />
        </View>

        <View style={styles.coverContent}>
          {/* Header with Logo */}
          <View style={styles.coverHeader}>
            <View style={styles.coverLogoContainer}>
              <Text style={styles.coverLogoT}>Trade</Text>
              <Text style={styles.coverLogoP}>Path</Text>
            </View>
            <Text style={styles.coverTagline}>From Charts to Clarity</Text>
            <View style={styles.coverDivider} />
          </View>

          {/* Main Content */}
          <View style={styles.coverMain}>
            {/* Symbol Badge */}
            <View style={styles.coverSymbolBadge}>
              <Text style={styles.coverSymbolLetter}>{data.symbol.charAt(0)}</Text>
            </View>
            <Text style={styles.coverTitle}>{data.symbol}/USDT</Text>
            <Text style={styles.coverSubtitle}>7-Step AI Trading Analysis Report</Text>

            {/* Verdict Section */}
            <View style={styles.coverVerdictContainer}>
              <Text style={styles.coverVerdictLabel}>RECOMMENDATION</Text>
              <View style={[styles.coverVerdictBadge, { backgroundColor: isLong ? '#16a34a' : '#dc2626' }]}>
                <Text style={styles.coverVerdictText}>{isLong ? '↗ LONG' : '↘ SHORT'}</Text>
              </View>
            </View>

            {/* Score Section */}
            <View style={styles.coverScoreContainer}>
              <Text style={styles.coverScoreLabel}>CONFIDENCE SCORE</Text>
              <Text style={[styles.coverScore, { color: score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444' }]}>
                {score}
              </Text>
              <Text style={styles.coverScoreMax}>out of 100</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.coverFooter}>
            <View style={styles.coverMetaRow}>
              <View style={styles.coverMetaItem}>
                <Text style={styles.coverMetaLabel}>GENERATED</Text>
                <Text style={styles.coverMeta}>{data.generatedAt}</Text>
              </View>
              <View style={styles.coverMetaItem}>
                <Text style={styles.coverMetaLabel}>REPORT ID</Text>
                <Text style={styles.coverMeta}>{data.analysisId?.slice(-12) || 'N/A'}</Text>
              </View>
            </View>
            <Text style={styles.coverPowered}>Powered by Gemini 2.5 Flash AI • TradePath © 2025</Text>
          </View>
        </View>
      </Page>

      {/* PAGE 2: Steps 1-4 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLogoContainer}>
            <Text style={styles.pageHeaderLogoT}>Trade</Text>
            <Text style={styles.pageHeaderLogoP}>Path</Text>
          </View>
          <Text style={styles.pageHeaderSymbol}>{data.symbol}/USDT Analysis Report</Text>
        </View>

        {/* Step 1: Market Pulse */}
        <StepCard
          stepNum={1}
          title="Market Pulse"
          status={marketStatus}
          statusColor={marketColor}
          metrics={[
            { label: 'Fear & Greed Index', value: `${data.marketPulse.fearGreedIndex} (${data.marketPulse.fearGreedLabel})` },
            { label: 'BTC Dominance', value: `${data.marketPulse.btcDominance?.toFixed(1)}%` },
            { label: 'Trend Direction', value: (data.marketPulse.trend?.direction || 'N/A').toUpperCase() },
            { label: 'Trend Strength', value: `${data.marketPulse.trend?.strength || 0}%` },
          ]}
          aiInsight={data.marketPulse.aiSummary}
        />

        {/* Step 2: Asset Scanner */}
        <StepCard
          stepNum={2}
          title="Asset Scanner"
          status={assetStatus}
          statusColor={assetColor}
          metrics={[
            { label: 'Current Price', value: formatPrice(data.assetScan.currentPrice) },
            { label: '24h Change', value: `${(data.assetScan.priceChange24h || 0).toFixed(2)}%`, color: (data.assetScan.priceChange24h || 0) >= 0 ? BRAND.success : BRAND.danger },
            { label: 'RSI (14)', value: `${data.assetScan.indicators?.rsi?.toFixed(0) || 'N/A'}` },
            { label: 'MACD Signal', value: (data.assetScan.indicators?.macd?.histogram || 0) >= 0 ? 'BULLISH' : 'BEARISH', color: (data.assetScan.indicators?.macd?.histogram || 0) >= 0 ? BRAND.success : BRAND.danger },
          ]}
          aiInsight={data.assetScan.aiInsight}
        />

        {/* Step 3: Safety Check */}
        <StepCard
          stepNum={3}
          title="Safety Check"
          status={safetyStatus}
          statusColor={safetyColor}
          metrics={[
            { label: 'Risk Level', value: (data.safetyCheck.riskLevel || 'N/A').toUpperCase(), color: safetyColor },
            { label: 'Whale Activity', value: (data.safetyCheck.whaleActivity?.bias || 'neutral').toUpperCase() },
            { label: 'Pump/Dump Risk', value: (data.safetyCheck.manipulation?.pumpDumpRisk || 'N/A').toUpperCase() },
            { label: 'Smart Money', value: (data.safetyCheck.smartMoney?.positioning || 'N/A').toUpperCase() },
          ]}
          aiInsight={data.safetyCheck.aiInsight}
        />

        {/* Step 4: Timing */}
        <StepCard
          stepNum={4}
          title="Timing Analysis"
          status={timingStatus}
          statusColor={timingColor}
          metrics={[
            { label: 'Trade Now?', value: data.timing.tradeNow ? 'YES' : 'WAIT', color: data.timing.tradeNow ? BRAND.success : BRAND.warning },
            { label: 'Reason', value: (data.timing.reason || 'N/A').slice(0, 50) + (data.timing.reason?.length > 50 ? '...' : '') },
          ]}
          aiInsight={data.timing.aiInsight}
        />

        <PageFooter pageNum={1} totalPages={totalPages} />
      </Page>

      {/* PAGE 3: Steps 5-7 + Trade Plan Chart */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLogoContainer}>
            <Text style={styles.pageHeaderLogoT}>Trade</Text>
            <Text style={styles.pageHeaderLogoP}>Path</Text>
          </View>
          <Text style={styles.pageHeaderSymbol}>{data.symbol}/USDT - Trade Plan</Text>
        </View>

        {/* Step 5: Trade Plan */}
        <StepCard
          stepNum={5}
          title="Trade Plan"
          status={isLong ? 'LONG' : 'SHORT'}
          statusColor={isLong ? BRAND.success : BRAND.danger}
          metrics={[
            { label: 'Direction', value: (data.tradePlan.direction || 'N/A').toUpperCase(), color: isLong ? BRAND.success : BRAND.danger },
            { label: 'Risk/Reward', value: `${(data.tradePlan.riskReward || 0).toFixed(1)}:1` },
            { label: 'Win Rate Est.', value: `${data.tradePlan.winRateEstimate || 0}%` },
            { label: 'Entry', value: formatPrice(data.tradePlan.averageEntry) },
          ]}
          aiInsight={data.tradePlan.aiInsight}
        />

        {/* Trade Levels */}
        <View style={styles.levelsGrid}>
          <View style={styles.levelBox}>
            <Text style={[styles.levelTitle, { color: BRAND.primary }]}>📍 Entry Zone</Text>
            <Text style={styles.levelPrice}>{formatPrice(data.tradePlan.averageEntry)}</Text>
          </View>
          <View style={styles.levelBox}>
            <Text style={[styles.levelTitle, { color: BRAND.danger }]}>🛑 Stop Loss</Text>
            <Text style={[styles.levelPrice, { color: BRAND.danger }]}>{formatPrice(data.tradePlan.stopLoss?.price)}</Text>
            <Text style={[styles.levelPercent, { color: BRAND.danger }]}>-{(data.tradePlan.stopLoss?.percentage || 0).toFixed(1)}%</Text>
          </View>
          <View style={styles.levelBox}>
            <Text style={[styles.levelTitle, { color: BRAND.success }]}>🎯 Take Profit 1</Text>
            <Text style={[styles.levelPrice, { color: BRAND.success }]}>{formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</Text>
          </View>
          <View style={styles.levelBox}>
            <Text style={[styles.levelTitle, { color: BRAND.success }]}>🎯 TP2 / TP3</Text>
            <Text style={[styles.levelPrice, { color: BRAND.success, fontSize: 10 }]}>
              {formatPrice(data.tradePlan.takeProfits?.[1]?.price)} / {formatPrice(data.tradePlan.takeProfits?.[2]?.price)}
            </Text>
          </View>
        </View>

        {/* Step 6: Trap Check */}
        <StepCard
          stepNum={6}
          title="Trap Check"
          status={trapStatus}
          statusColor={trapColor}
          metrics={[
            { label: 'Bull Trap', value: data.trapCheck?.traps?.bullTrap ? 'DETECTED' : 'NO', color: data.trapCheck?.traps?.bullTrap ? BRAND.danger : BRAND.success },
            { label: 'Bear Trap', value: data.trapCheck?.traps?.bearTrap ? 'DETECTED' : 'NO', color: data.trapCheck?.traps?.bearTrap ? BRAND.danger : BRAND.success },
            { label: 'Fakeout Risk', value: (data.trapCheck?.traps?.fakeoutRisk || 'LOW').toUpperCase() },
          ]}
          aiInsight={data.trapCheck?.aiInsight}
        />

        {/* Step 7: Final Verdict */}
        <View style={[styles.stepCard, { backgroundColor: isLong ? '#dcfce7' : '#fee2e2', borderLeftColor: isLong ? BRAND.success : BRAND.danger }]}>
          <View style={styles.stepHeader}>
            <View style={styles.stepTitleRow}>
              <View style={[styles.stepNumber, { backgroundColor: isLong ? BRAND.success : BRAND.danger }]}>
                <Text style={styles.stepNumberText}>7</Text>
              </View>
              <Text style={styles.stepTitle}>Final Verdict</Text>
            </View>
            <Text style={[styles.stepStatus, { backgroundColor: isLong ? BRAND.success : BRAND.danger }]}>
              {score}/100
            </Text>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Direction</Text>
              <Text style={[styles.metricValue, { color: isLong ? BRAND.success : BRAND.danger, fontSize: 14 }]}>{isLong ? 'LONG' : 'SHORT'}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Confidence</Text>
              <Text style={[styles.metricValue, { fontSize: 14 }]}>{score}%</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Risk/Reward</Text>
              <Text style={styles.metricValue}>{(data.tradePlan.riskReward || 0).toFixed(2)}:1</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Win Rate</Text>
              <Text style={styles.metricValue}>{data.tradePlan.winRateEstimate || 0}%</Text>
            </View>
          </View>

          {data.verdict.aiSummary && (
            <View style={styles.aiInsightBox}>
              <Text style={[styles.aiInsightLabel, { color: isLong ? BRAND.success : BRAND.danger }]}>🤖 AI Summary</Text>
              <Text style={styles.aiInsightText}>{data.verdict.aiSummary.slice(0, 350)}{data.verdict.aiSummary.length > 350 ? '...' : ''}</Text>
            </View>
          )}
        </View>

        {/* AI Expert Comment */}
        {data.aiExpertComment && (
          <View style={styles.aiExpertSection}>
            <View style={styles.aiExpertHeader}>
              <View style={styles.aiExpertBadge}>
                <Text style={styles.aiExpertBadgeText}>AI EXPERT</Text>
              </View>
              <Text style={styles.aiExpertTitle}>Expert Review</Text>
            </View>
            <Text style={styles.aiExpertContent}>
              {data.aiExpertComment.slice(0, 500)}{data.aiExpertComment.length > 500 ? '...' : ''}
            </Text>
          </View>
        )}

        <PageFooter pageNum={2} totalPages={totalPages} />
      </Page>

      {/* PAGE 4: Trade Plan Chart (if available) */}
      {data.chartImage && (
        <Page size="A4" style={styles.page}>
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderLogoContainer}>
              <Text style={styles.pageHeaderLogoT}>Trade</Text>
              <Text style={styles.pageHeaderLogoP}>Path</Text>
            </View>
            <Text style={styles.pageHeaderSymbol}>{data.symbol}/USDT - Trade Plan Chart</Text>
          </View>

          {/* Chart */}
          <View style={styles.chartSection}>
            <Text style={styles.chartTitle}>📊 Trade Plan Visualization</Text>
            <Image src={data.chartImage} style={styles.chartImage} />
          </View>

          {/* Quick Reference */}
          <View style={[styles.levelsGrid, { marginTop: 20 }]}>
            <View style={[styles.levelBox, { flex: 2 }]}>
              <Text style={[styles.levelTitle, { color: BRAND.primary, fontSize: 11 }]}>📍 Entry Zone</Text>
              <Text style={[styles.levelPrice, { fontSize: 16 }]}>{formatPrice(data.tradePlan.averageEntry)}</Text>
            </View>
            <View style={[styles.levelBox, { flex: 2 }]}>
              <Text style={[styles.levelTitle, { color: BRAND.danger, fontSize: 11 }]}>🛑 Stop Loss</Text>
              <Text style={[styles.levelPrice, { fontSize: 16, color: BRAND.danger }]}>
                {formatPrice(data.tradePlan.stopLoss?.price)}
              </Text>
              <Text style={[styles.levelPercent, { color: BRAND.danger }]}>
                -{(data.tradePlan.stopLoss?.percentage || 0).toFixed(1)}%
              </Text>
            </View>
            <View style={[styles.levelBox, { flex: 3 }]}>
              <Text style={[styles.levelTitle, { color: BRAND.success, fontSize: 11 }]}>🎯 Take Profit Targets</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: 11, color: BRAND.success }}>TP1: {formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</Text>
                <Text style={{ fontSize: 11, color: BRAND.success }}>TP2: {formatPrice(data.tradePlan.takeProfits?.[1]?.price)}</Text>
                <Text style={{ fontSize: 11, color: BRAND.success }}>TP3: {formatPrice(data.tradePlan.takeProfits?.[2]?.price)}</Text>
              </View>
            </View>
          </View>

          <PageFooter pageNum={3} totalPages={totalPages} />
        </Page>
      )}
    </Document>
  );
};

// Capture chart element as image
export async function captureChartAsImage(elementId: string = 'trade-plan-chart'): Promise<string | null> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn('Chart element not found:', elementId);
      return null;
    }

    // Scroll element into view
    element.scrollIntoView({ behavior: 'instant', block: 'center' });

    // Wait longer for chart to fully render (Binance API data loading)
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Dynamic import
    const html2canvas = (await import('html2canvas')).default;

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      foreignObjectRendering: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to capture chart:', error);
    return null;
  }
}

// Export function
export async function generateAnalysisReport(data: AnalysisReportData, captureChart: boolean = true): Promise<void> {
  // Try to capture chart if requested
  if (captureChart && !data.chartImage) {
    const chartImage = await captureChartAsImage();
    if (chartImage) {
      data.chartImage = chartImage;
    }
  }

  const blob = await pdf(<AnalysisReportDocument data={data} />).toBlob();
  const filename = `TradePath_${data.symbol}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, filename);
}

export { AnalysisReportDocument };
export type { AnalysisReportData };
