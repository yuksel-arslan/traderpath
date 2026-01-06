'use client';

// ===========================================
// Analysis Report PDF Generator
// Professional format with TradingView chart
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

// TradePath brand colors
const BRAND = {
  primary: '#3b82f6',
  primaryDark: '#2563eb',
  success: '#22c55e',
  danger: '#ef4444',
  warning: '#f59e0b',
  text: '#111827',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  bgLight: '#f9fafb',
};

// Professional styles
const styles = StyleSheet.create({
  // Cover Page
  coverPage: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 60,
    justifyContent: 'space-between',
  },
  coverHeader: {
    alignItems: 'center',
  },
  coverLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  coverLogoT: {
    fontSize: 36,
    fontWeight: 'bold',
    color: BRAND.danger,
  },
  coverLogoP: {
    fontSize: 36,
    fontWeight: 'bold',
    color: BRAND.success,
  },
  coverTagline: {
    fontSize: 11,
    color: BRAND.textMuted,
    letterSpacing: 1,
  },
  coverMain: {
    alignItems: 'center',
  },
  coverSymbolBadge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: BRAND.warning,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
  },
  coverSymbolLetter: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: BRAND.text,
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 14,
    color: BRAND.textMuted,
    marginBottom: 40,
  },
  coverVerdictBadge: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    marginBottom: 20,
  },
  coverVerdictText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  coverScoreContainer: {
    alignItems: 'center',
  },
  coverScore: {
    fontSize: 64,
    fontWeight: 'bold',
    color: BRAND.text,
  },
  coverScoreLabel: {
    fontSize: 14,
    color: BRAND.textMuted,
  },
  coverFooter: {
    alignItems: 'center',
  },
  coverMeta: {
    fontSize: 10,
    color: BRAND.textMuted,
    marginBottom: 4,
  },
  coverPowered: {
    marginTop: 20,
    fontSize: 9,
    color: BRAND.textMuted,
  },

  // Content Pages - Single Page Layout
  page: {
    backgroundColor: '#ffffff',
    padding: 20,
    paddingBottom: 40,
    fontFamily: 'Helvetica',
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  pageHeaderLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageHeaderLogoT: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND.danger,
  },
  pageHeaderLogoP: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND.success,
  },
  pageHeaderSymbol: {
    fontSize: 14,
    color: BRAND.textMuted,
  },

  // Chart section - Larger
  chartSection: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BRAND.border,
    overflow: 'hidden',
  },
  chartImage: {
    width: '100%',
    height: 160,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: BRAND.text,
    padding: 4,
    backgroundColor: BRAND.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },

  // Two Column Layout
  twoColumnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  column: {
    flex: 1,
  },

  // Step Card - Readable
  stepCard: {
    backgroundColor: BRAND.bgLight,
    borderRadius: 5,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: BRAND.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: BRAND.text,
  },
  stepStatus: {
    fontSize: 9,
    fontWeight: 'bold',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  stepContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  stepMetric: {
    width: '50%',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 9,
    color: BRAND.textMuted,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: BRAND.text,
  },
  stepDescription: {
    fontSize: 8,
    color: BRAND.textMuted,
    lineHeight: 1.3,
    marginTop: 4,
  },

  // Trade Levels
  levelsGrid: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 6,
  },
  levelBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    padding: 6,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  levelTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  levelLabel: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  levelPrice: {
    fontSize: 10,
    color: BRAND.text,
  },

  // Final Verdict - Larger
  verdictCard: {
    borderRadius: 6,
    padding: 12,
    marginTop: 10,
  },
  verdictTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  verdictText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.4,
    marginBottom: 8,
  },
  verdictSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  verdictSummaryItem: {
    width: '25%',
    marginBottom: 4,
  },
  verdictSummaryLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  verdictSummaryValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: BRAND.text,
  },
  // AI Summary in verdict
  aiSummaryBox: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
  },
  aiSummaryTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: BRAND.text,
    marginBottom: 4,
  },
  aiSummaryText: {
    fontSize: 9,
    color: '#374151',
    lineHeight: 1.4,
  },

  // AI Expert Comment Section
  aiExpertSection: {
    backgroundColor: '#fef3c7', // amber-100
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#fbbf24', // amber-400
  },
  aiExpertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#fcd34d', // amber-300
  },
  aiExpertBadge: {
    backgroundColor: '#f59e0b', // amber-500
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
    color: '#92400e', // amber-800
  },
  aiExpertContent: {
    fontSize: 9,
    color: '#78350f', // amber-900
    lineHeight: 1.5,
  },

  // Footer with disclaimer
  footer: {
    position: 'absolute',
    bottom: 10,
    left: 20,
    right: 20,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  footerText: {
    fontSize: 9,
    color: BRAND.textMuted,
  },
  footerDisclaimer: {
    fontSize: 8,
    color: '#9ca3af',
    lineHeight: 1.3,
    marginTop: 4,
  },
  pageNumber: {
    fontSize: 10,
    color: BRAND.textMuted,
  },
});

// Helper function
function formatPrice(price: number): string {
  if (!price) return '$0';
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
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
  };
  assetScan: {
    currentPrice: number;
    priceChange24h: number;
    indicators: { rsi: number; macd: { histogram: number } };
    levels?: { support: number[]; resistance: number[] };
  };
  safetyCheck: {
    riskLevel: string;
    manipulation: { pumpDumpRisk: string };
    whaleActivity: { bias: string };
    smartMoney?: { positioning: string };
  };
  timing: {
    tradeNow: boolean;
    reason: string;
  };
  tradePlan: {
    direction: string;
    entries?: Array<{ price: number; percentage?: number }>;
    averageEntry: number;
    stopLoss: { price: number; percentage?: number };
    takeProfits: Array<{ price: number; percentage?: number }>;
    riskReward: number;
    winRateEstimate?: number;
  };
  trapCheck?: {
    traps: { bullTrap: boolean; bearTrap: boolean; fakeoutRisk: string };
  };
  verdict: {
    action: string;
    overallScore: number;
    aiSummary?: string;
  };
  aiExpertComment?: string; // AI Expert review comment
}

// Status helpers
const getStatusColor = (status: string) => {
  const positive = ['Bullish', 'Safe', 'Good', 'Ready', 'Clear', 'Stable', 'Low'];
  const negative = ['Bearish', 'Risky', 'Warning', 'Declining', 'High'];
  if (positive.some(p => status.toLowerCase().includes(p.toLowerCase()))) return BRAND.success;
  if (negative.some(n => status.toLowerCase().includes(n.toLowerCase()))) return BRAND.danger;
  return BRAND.warning;
};

const getStatusBg = (status: string) => {
  const positive = ['Bullish', 'Safe', 'Good', 'Ready', 'Clear', 'Stable', 'Low'];
  const negative = ['Bearish', 'Risky', 'Warning', 'Declining', 'High'];
  if (positive.some(p => status.toLowerCase().includes(p.toLowerCase()))) return '#dcfce7';
  if (negative.some(n => status.toLowerCase().includes(n.toLowerCase()))) return '#fee2e2';
  return '#fef3c7';
};

const getBorderColor = (status: string) => {
  const positive = ['Bullish', 'Safe', 'Good', 'Ready', 'Clear', 'Stable', 'Low'];
  const negative = ['Bearish', 'Risky', 'Warning', 'Declining', 'High'];
  if (positive.some(p => status.toLowerCase().includes(p.toLowerCase()))) return BRAND.success;
  if (negative.some(n => status.toLowerCase().includes(n.toLowerCase()))) return BRAND.danger;
  return BRAND.warning;
};

// Logo Component
const Logo = ({ size = 'small' }: { size?: 'small' | 'large' }) => {
  const fontSize = size === 'large' ? 36 : 16;
  return (
    <View style={{ flexDirection: 'row' }}>
      <Text style={{ fontSize, fontWeight: 'bold', color: BRAND.danger }}>Trade</Text>
      <Text style={{ fontSize, fontWeight: 'bold', color: BRAND.success }}>Path</Text>
    </View>
  );
};

// Footer Component
const PageFooter = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
  <View style={styles.footer}>
    <View style={styles.footerContent}>
      <View style={styles.footerLeft}>
        <Text style={styles.footerText}>TradePath AI Analysis Report • Confidential</Text>
        <Text style={styles.footerDisclaimer}>
          Disclaimer: This report is for educational purposes only and does not constitute financial advice. Crypto trading involves substantial risk. Always DYOR.
        </Text>
      </View>
      <View style={styles.footerRight}>
        <Text style={styles.pageNumber}>Page {pageNum} of {totalPages}</Text>
      </View>
    </View>
  </View>
);

// PDF Document
const AnalysisReportDocument = ({ data }: { data: AnalysisReportData }) => {
  const isLong = data.tradePlan.direction === 'long';
  const score = (data.verdict.overallScore || 0) * 10;

  const marketStatus = data.marketPulse.trend?.direction === 'bullish' ? 'Bullish' : data.marketPulse.trend?.direction === 'bearish' ? 'Bearish' : 'Neutral';
  const assetStatus = (data.assetScan.priceChange24h || 0) >= 0 ? 'Stable' : 'Declining';
  const safetyStatus = data.safetyCheck.riskLevel === 'low' ? 'Safe' : data.safetyCheck.riskLevel === 'high' ? 'Risky' : 'Caution';
  const timingStatus = data.timing.tradeNow ? 'Good' : 'Wait';
  const planStatus = data.tradePlan.averageEntry ? 'Ready' : 'Pending';
  const trapStatus = data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap ? 'Warning' : 'Clear';

  return (
    <Document>
      {/* COVER PAGE */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverHeader}>
          <View style={styles.coverLogoContainer}>
            <Text style={styles.coverLogoT}>Trade</Text>
            <Text style={styles.coverLogoP}>Path</Text>
          </View>
          <Text style={styles.coverTagline}>FROM CHARTS TO CLARITY</Text>
        </View>

        <View style={styles.coverMain}>
          <View style={styles.coverSymbolBadge}>
            <Text style={styles.coverSymbolLetter}>{data.symbol.charAt(0)}</Text>
          </View>
          <Text style={styles.coverTitle}>{data.symbol}/USDT</Text>
          <Text style={styles.coverSubtitle}>7-Step AI Trading Analysis Report</Text>

          <View style={[styles.coverVerdictBadge, { backgroundColor: isLong ? BRAND.success : BRAND.danger }]}>
            <Text style={styles.coverVerdictText}>{isLong ? '↗ LONG' : '↘ SHORT'} RECOMMENDED</Text>
          </View>

          <View style={styles.coverScoreContainer}>
            <Text style={styles.coverScore}>{score}</Text>
            <Text style={styles.coverScoreLabel}>out of 100</Text>
          </View>
        </View>

        <View style={styles.coverFooter}>
          <Text style={styles.coverMeta}>Generated: {data.generatedAt}</Text>
          <Text style={styles.coverMeta}>Report ID: {data.analysisId?.slice(-12) || 'N/A'}</Text>
          <Text style={styles.coverPowered}>Powered by Google Gemini AI • TradePath © 2024</Text>
        </View>
      </Page>

      {/* SINGLE PAGE: All Steps */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLogoContainer}>
            <Text style={styles.pageHeaderLogoT}>Trade</Text>
            <Text style={styles.pageHeaderLogoP}>Path</Text>
          </View>
          <Text style={styles.pageHeaderSymbol}>{data.symbol}/USDT Analysis Report</Text>
        </View>

        {/* Chart */}
        {data.chartImage ? (
          <View style={styles.chartSection}>
            <Image src={data.chartImage} style={styles.chartImage} />
          </View>
        ) : null}

        {/* Two Column Layout for Steps 1-6 */}
        <View style={styles.twoColumnRow}>
          {/* Left Column: Steps 1, 2, 3 */}
          <View style={styles.column}>
            {/* Step 1 */}
            <View style={[styles.stepCard, { borderLeftColor: getBorderColor(marketStatus) }]}>
              <View style={styles.stepHeader}>
                <View style={styles.stepTitleRow}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
                  <Text style={styles.stepTitle}>Market Pulse</Text>
                </View>
                <Text style={[styles.stepStatus, { backgroundColor: getStatusBg(marketStatus), color: getStatusColor(marketStatus) }]}>{marketStatus}</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>Fear & Greed</Text><Text style={styles.metricValue}>{data.marketPulse.fearGreedIndex} ({data.marketPulse.fearGreedLabel})</Text></View>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>BTC Dominance</Text><Text style={styles.metricValue}>{data.marketPulse.btcDominance?.toFixed(1)}%</Text></View>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>Trend Direction</Text><Text style={styles.metricValue}>{(data.marketPulse.trend?.direction || 'N/A').toUpperCase()}</Text></View>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>Trend Strength</Text><Text style={styles.metricValue}>{data.marketPulse.trend?.strength || 0}%</Text></View>
              </View>
            </View>

            {/* Step 2 */}
            <View style={[styles.stepCard, { borderLeftColor: getBorderColor(assetStatus) }]}>
              <View style={styles.stepHeader}>
                <View style={styles.stepTitleRow}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
                  <Text style={styles.stepTitle}>Asset Scan</Text>
                </View>
                <Text style={[styles.stepStatus, { backgroundColor: getStatusBg(assetStatus), color: getStatusColor(assetStatus) }]}>{assetStatus}</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>Current Price</Text><Text style={styles.metricValue}>{formatPrice(data.assetScan.currentPrice)}</Text></View>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>24h Change</Text><Text style={[styles.metricValue, { color: (data.assetScan.priceChange24h || 0) >= 0 ? BRAND.success : BRAND.danger }]}>{(data.assetScan.priceChange24h || 0).toFixed(2)}%</Text></View>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>RSI (14)</Text><Text style={styles.metricValue}>{data.assetScan.indicators?.rsi?.toFixed(0) || 'N/A'}</Text></View>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>MACD</Text><Text style={[styles.metricValue, { color: (data.assetScan.indicators?.macd?.histogram || 0) >= 0 ? BRAND.success : BRAND.danger }]}>{(data.assetScan.indicators?.macd?.histogram || 0) >= 0 ? 'BULLISH' : 'BEARISH'}</Text></View>
              </View>
            </View>

            {/* Step 3 */}
            <View style={[styles.stepCard, { borderLeftColor: getBorderColor(safetyStatus) }]}>
              <View style={styles.stepHeader}>
                <View style={styles.stepTitleRow}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
                  <Text style={styles.stepTitle}>Safety Check</Text>
                </View>
                <Text style={[styles.stepStatus, { backgroundColor: getStatusBg(safetyStatus), color: getStatusColor(safetyStatus) }]}>{safetyStatus}</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>Risk Level</Text><Text style={[styles.metricValue, { color: getStatusColor(safetyStatus) }]}>{(data.safetyCheck.riskLevel || 'N/A').toUpperCase()}</Text></View>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>Whale Bias</Text><Text style={styles.metricValue}>{(data.safetyCheck.whaleActivity?.bias || 'neutral').toUpperCase()}</Text></View>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>Pump/Dump Risk</Text><Text style={styles.metricValue}>{(data.safetyCheck.manipulation?.pumpDumpRisk || 'N/A').toUpperCase()}</Text></View>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>Smart Money</Text><Text style={styles.metricValue}>{(data.safetyCheck.smartMoney?.positioning || 'N/A').toUpperCase()}</Text></View>
              </View>
            </View>
          </View>

          {/* Right Column: Steps 4, 5, 6 */}
          <View style={styles.column}>
            {/* Step 4 */}
            <View style={[styles.stepCard, { borderLeftColor: getBorderColor(timingStatus) }]}>
              <View style={styles.stepHeader}>
                <View style={styles.stepTitleRow}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>4</Text></View>
                  <Text style={styles.stepTitle}>Timing</Text>
                </View>
                <Text style={[styles.stepStatus, { backgroundColor: getStatusBg(timingStatus), color: getStatusColor(timingStatus) }]}>{timingStatus}</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>Trade Now</Text><Text style={[styles.metricValue, { color: data.timing.tradeNow ? BRAND.success : BRAND.warning }]}>{data.timing.tradeNow ? 'YES' : 'WAIT'}</Text></View>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>Reason</Text><Text style={[styles.metricValue, { fontSize: 9 }]}>{(data.timing.reason || 'N/A').slice(0, 30)}</Text></View>
              </View>
            </View>

            {/* Step 5 */}
            <View style={[styles.stepCard, { borderLeftColor: getBorderColor(planStatus) }]}>
              <View style={styles.stepHeader}>
                <View style={styles.stepTitleRow}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>5</Text></View>
                  <Text style={styles.stepTitle}>Trade Plan</Text>
                </View>
                <Text style={[styles.stepStatus, { backgroundColor: getStatusBg(planStatus), color: getStatusColor(planStatus) }]}>{planStatus}</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>Direction</Text><Text style={[styles.metricValue, { color: isLong ? BRAND.success : BRAND.danger }]}>{(data.tradePlan.direction || 'N/A').toUpperCase()}</Text></View>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>R:R</Text><Text style={styles.metricValue}>{(data.tradePlan.riskReward || 0).toFixed(1)}:1</Text></View>
              </View>
              <View style={styles.levelsGrid}>
                <View style={styles.levelBox}>
                  <Text style={[styles.levelTitle, { color: BRAND.primary }]}>Entry</Text>
                  <View style={styles.levelRow}><Text style={styles.levelPrice}>{formatPrice(data.tradePlan.averageEntry)}</Text></View>
                </View>
                <View style={styles.levelBox}>
                  <Text style={[styles.levelTitle, { color: BRAND.danger }]}>SL</Text>
                  <View style={styles.levelRow}><Text style={styles.levelPrice}>{formatPrice(data.tradePlan.stopLoss?.price)}</Text></View>
                </View>
                <View style={styles.levelBox}>
                  <Text style={[styles.levelTitle, { color: BRAND.success }]}>TP1</Text>
                  <View style={styles.levelRow}><Text style={styles.levelPrice}>{formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</Text></View>
                </View>
              </View>
            </View>

            {/* Step 6 */}
            <View style={[styles.stepCard, { borderLeftColor: getBorderColor(trapStatus) }]}>
              <View style={styles.stepHeader}>
                <View style={styles.stepTitleRow}>
                  <View style={styles.stepNumber}><Text style={styles.stepNumberText}>6</Text></View>
                  <Text style={styles.stepTitle}>Trap Check</Text>
                </View>
                <Text style={[styles.stepStatus, { backgroundColor: getStatusBg(trapStatus), color: getStatusColor(trapStatus) }]}>{trapStatus}</Text>
              </View>
              <View style={styles.stepContent}>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>Bull Trap</Text><Text style={[styles.metricValue, { color: data.trapCheck?.traps?.bullTrap ? BRAND.danger : BRAND.success }]}>{data.trapCheck?.traps?.bullTrap ? 'YES' : 'NO'}</Text></View>
                <View style={styles.stepMetric}><Text style={styles.metricLabel}>Bear Trap</Text><Text style={[styles.metricValue, { color: data.trapCheck?.traps?.bearTrap ? BRAND.danger : BRAND.success }]}>{data.trapCheck?.traps?.bearTrap ? 'YES' : 'NO'}</Text></View>
              </View>
              <Text style={styles.stepDescription}>Detects bull/bear traps via volume and order book analysis.</Text>
            </View>
          </View>
        </View>

        {/* Step 7: Final Verdict - Full Width */}
        <View style={[styles.verdictCard, { backgroundColor: isLong ? '#dcfce7' : '#fee2e2' }]}>
          <View style={styles.stepHeader}>
            <View style={styles.stepTitleRow}>
              <View style={[styles.stepNumber, { backgroundColor: isLong ? BRAND.success : BRAND.danger }]}><Text style={styles.stepNumberText}>7</Text></View>
              <Text style={styles.stepTitle}>Final Verdict: {(data.tradePlan.direction || '').toUpperCase()}</Text>
            </View>
            <Text style={[styles.stepStatus, { backgroundColor: isLong ? BRAND.success : BRAND.danger, color: '#ffffff' }]}>{score}/100</Text>
          </View>
          <View style={styles.verdictSummary}>
            <View style={styles.verdictSummaryItem}><Text style={styles.verdictSummaryLabel}>Direction</Text><Text style={[styles.verdictSummaryValue, { color: isLong ? BRAND.success : BRAND.danger }]}>{isLong ? 'LONG' : 'SHORT'}</Text></View>
            <View style={styles.verdictSummaryItem}><Text style={styles.verdictSummaryLabel}>Entry</Text><Text style={styles.verdictSummaryValue}>{formatPrice(data.tradePlan.averageEntry)}</Text></View>
            <View style={styles.verdictSummaryItem}><Text style={styles.verdictSummaryLabel}>Stop Loss</Text><Text style={[styles.verdictSummaryValue, { color: BRAND.danger }]}>{formatPrice(data.tradePlan.stopLoss?.price)}</Text></View>
            <View style={styles.verdictSummaryItem}><Text style={styles.verdictSummaryLabel}>Take Profit</Text><Text style={[styles.verdictSummaryValue, { color: BRAND.success }]}>{formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</Text></View>
            <View style={styles.verdictSummaryItem}><Text style={styles.verdictSummaryLabel}>Risk/Reward</Text><Text style={styles.verdictSummaryValue}>{(data.tradePlan.riskReward || 0).toFixed(2)}:1</Text></View>
            <View style={styles.verdictSummaryItem}><Text style={styles.verdictSummaryLabel}>Win Rate Est.</Text><Text style={styles.verdictSummaryValue}>{data.tradePlan.winRateEstimate || 'N/A'}%</Text></View>
            <View style={styles.verdictSummaryItem}><Text style={styles.verdictSummaryLabel}>TP2</Text><Text style={[styles.verdictSummaryValue, { color: BRAND.success }]}>{formatPrice(data.tradePlan.takeProfits?.[1]?.price)}</Text></View>
            <View style={styles.verdictSummaryItem}><Text style={styles.verdictSummaryLabel}>TP3</Text><Text style={[styles.verdictSummaryValue, { color: BRAND.success }]}>{formatPrice(data.tradePlan.takeProfits?.[2]?.price)}</Text></View>
          </View>
          {/* AI Summary */}
          {data.verdict.aiSummary && (
            <View style={styles.aiSummaryBox}>
              <Text style={styles.aiSummaryTitle}>AI Analysis Summary</Text>
              <Text style={styles.aiSummaryText}>{data.verdict.aiSummary.slice(0, 400)}{data.verdict.aiSummary.length > 400 ? '...' : ''}</Text>
            </View>
          )}
        </View>

        <PageFooter pageNum={1} totalPages={data.aiExpertComment ? 2 : 1} />
      </Page>

      {/* AI EXPERT REVIEW PAGE - Only if comment exists */}
      {data.aiExpertComment && (
        <Page size="A4" style={styles.page}>
          <View style={styles.pageHeader}>
            <View style={styles.pageHeaderLogoContainer}>
              <Text style={styles.pageHeaderLogoT}>Trade</Text>
              <Text style={styles.pageHeaderLogoP}>Path</Text>
            </View>
            <Text style={styles.pageHeaderSymbol}>{data.symbol}/USDT - AI Expert Review</Text>
          </View>

          {/* AI Expert Comment Section */}
          <View style={styles.aiExpertSection}>
            <View style={styles.aiExpertHeader}>
              <View style={styles.aiExpertBadge}>
                <Text style={styles.aiExpertBadgeText}>NEXUS</Text>
              </View>
              <Text style={styles.aiExpertTitle}>AI Expert Risk Assessment</Text>
            </View>
            <Text style={styles.aiExpertContent}>
              {data.aiExpertComment}
            </Text>
          </View>

          <PageFooter pageNum={2} totalPages={2} />
        </Page>
      )}
    </Document>
  );
};

// Capture chart element as image (dynamic import for browser-only)
export async function captureChartAsImage(elementId: string = 'trade-plan-chart'): Promise<string | null> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn('Chart element not found:', elementId);
      return null;
    }

    // Scroll element into view to ensure it's rendered
    element.scrollIntoView({ behavior: 'instant', block: 'center' });

    // Wait for any animations/rendering to complete
    await new Promise(resolve => setTimeout(resolve, 300));

    // Dynamic import to avoid SSR issues
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
