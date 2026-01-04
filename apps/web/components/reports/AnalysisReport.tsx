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

  // Content Pages - Ultra Compact
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
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  pageHeaderLogoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageHeaderLogoT: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BRAND.danger,
  },
  pageHeaderLogoP: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BRAND.success,
  },
  pageHeaderSymbol: {
    fontSize: 10,
    color: BRAND.textMuted,
  },

  // Chart section - Ultra Compact
  chartSection: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: BRAND.border,
    overflow: 'hidden',
  },
  chartImage: {
    width: '100%',
    height: 140,
  },
  chartTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: BRAND.text,
    padding: 4,
    backgroundColor: BRAND.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },

  // Step Card - Ultra Compact
  stepCard: {
    backgroundColor: BRAND.bgLight,
    borderRadius: 4,
    padding: 8,
    marginBottom: 5,
    borderLeftWidth: 3,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: BRAND.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  stepNumberText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stepTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: BRAND.text,
  },
  stepStatus: {
    fontSize: 7,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  stepContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  stepMetric: {
    width: '25%',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 6,
    color: BRAND.textMuted,
    marginBottom: 0,
  },
  metricValue: {
    fontSize: 8,
    fontWeight: 'bold',
    color: BRAND.text,
  },
  stepDescription: {
    fontSize: 7,
    color: BRAND.textMuted,
    lineHeight: 1.2,
    marginTop: 3,
    fontStyle: 'italic',
  },

  // Trade Levels - Ultra Compact
  levelsGrid: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  levelBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 3,
    padding: 4,
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  levelTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 0,
  },
  levelLabel: {
    fontSize: 6,
    fontWeight: 'bold',
  },
  levelPrice: {
    fontSize: 6,
    color: BRAND.text,
  },

  // Final Verdict with Summary - Compact
  verdictCard: {
    borderRadius: 6,
    padding: 10,
    marginBottom: 0,
  },
  verdictTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  verdictText: {
    fontSize: 8,
    color: '#374151',
    lineHeight: 1.4,
    marginBottom: 6,
  },
  verdictSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  verdictSummaryItem: {
    width: '25%',
  },
  verdictSummaryLabel: {
    fontSize: 6,
    color: '#6b7280',
  },
  verdictSummaryValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: BRAND.text,
  },

  // Footer with disclaimer
  footer: {
    position: 'absolute',
    bottom: 8,
    left: 20,
    right: 20,
    paddingTop: 4,
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
    fontSize: 7,
    color: BRAND.textMuted,
  },
  footerDisclaimer: {
    fontSize: 6,
    color: '#9ca3af',
    lineHeight: 1.3,
    marginTop: 4,
  },
  pageNumber: {
    fontSize: 8,
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
    entries: Array<{ price: number; percentage: number }>;
    averageEntry: number;
    stopLoss: { price: number; percentage: number };
    takeProfits: Array<{ price: number; percentage: number }>;
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

      {/* PAGE 1: Chart + Steps 1-4 */}
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
            <Text style={styles.chartTitle}>{data.symbol}/USDT Trade Plan Chart</Text>
            <Image src={data.chartImage} style={styles.chartImage} />
          </View>
        ) : null}

        {/* Step 1: Market Pulse */}
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
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Market Trend</Text><Text style={[styles.metricValue, { color: getStatusColor(marketStatus) }]}>{data.marketPulse.trend?.direction?.toUpperCase()}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Trend Strength</Text><Text style={styles.metricValue}>{data.marketPulse.trend?.strength}%</Text></View>
          </View>
          <Text style={styles.stepDescription}>Analyzes global crypto sentiment via Fear & Greed Index, BTC dominance shifts, and altcoin correlation patterns. Cross-references social media trends, funding rates, and institutional flow data.</Text>
        </View>

        {/* Step 2: Asset Scan */}
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
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>24h Change</Text><Text style={[styles.metricValue, { color: (data.assetScan.priceChange24h || 0) >= 0 ? BRAND.success : BRAND.danger }]}>{(data.assetScan.priceChange24h || 0) >= 0 ? '+' : ''}{(data.assetScan.priceChange24h || 0).toFixed(2)}%</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>RSI (14)</Text><Text style={styles.metricValue}>{data.assetScan.indicators?.rsi?.toFixed(0) || 'N/A'}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>MACD</Text><Text style={[styles.metricValue, { color: (data.assetScan.indicators?.macd?.histogram || 0) > 0 ? BRAND.success : BRAND.danger }]}>{(data.assetScan.indicators?.macd?.histogram || 0) > 0 ? 'Bullish' : 'Bearish'}</Text></View>
          </View>
          <Text style={styles.stepDescription}>Performs multi-timeframe technical analysis using RSI, MACD, Bollinger Bands, and volume profiles. Identifies key support/resistance levels through order book depth and historical price action.</Text>
        </View>

        {/* Step 3: Safety Check */}
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
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Pump/Dump</Text><Text style={styles.metricValue}>{(data.safetyCheck.manipulation?.pumpDumpRisk || 'N/A').toUpperCase()}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Whale Activity</Text><Text style={styles.metricValue}>{(data.safetyCheck.whaleActivity?.bias || 'neutral').toUpperCase()}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Smart Money</Text><Text style={styles.metricValue}>{(data.safetyCheck.smartMoney?.positioning || 'neutral').toUpperCase()}</Text></View>
          </View>
          <Text style={styles.stepDescription}>Monitors whale wallet movements, exchange inflows/outflows, and unusual volume spikes for manipulation detection. Analyzes smart money positioning via derivatives data and large transaction patterns.</Text>
        </View>

        {/* Step 4: Timing */}
        <View style={[styles.stepCard, { borderLeftColor: getBorderColor(timingStatus) }]}>
          <View style={styles.stepHeader}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>4</Text></View>
              <Text style={styles.stepTitle}>Timing Analysis</Text>
            </View>
            <Text style={[styles.stepStatus, { backgroundColor: getStatusBg(timingStatus), color: getStatusColor(timingStatus) }]}>{timingStatus}</Text>
          </View>
          <View style={styles.stepContent}>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Trade Now?</Text><Text style={[styles.metricValue, { color: data.timing.tradeNow ? BRAND.success : BRAND.warning }]}>{data.timing.tradeNow ? 'YES' : 'WAIT'}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>RSI Zone</Text><Text style={styles.metricValue}>{(data.assetScan.indicators?.rsi || 50) > 70 ? 'Overbought' : (data.assetScan.indicators?.rsi || 50) < 30 ? 'Oversold' : 'Neutral'}</Text></View>
          </View>
          <Text style={styles.stepDescription}>Evaluates optimal entry timing using momentum oscillators, volatility cycles, and market session analysis. Considers upcoming economic events, funding rate resets, and liquidity conditions.</Text>
        </View>

        <PageFooter pageNum={1} totalPages={2} />
      </Page>

      {/* PAGE 2: Steps 5-7 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLogoContainer}>
            <Text style={styles.pageHeaderLogoT}>Trade</Text>
            <Text style={styles.pageHeaderLogoP}>Path</Text>
          </View>
          <Text style={styles.pageHeaderSymbol}>{data.symbol}/USDT Analysis Report</Text>
        </View>

        {/* Step 5: Trade Plan */}
        <View style={[styles.stepCard, { borderLeftColor: getBorderColor(planStatus) }]}>
          <View style={styles.stepHeader}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>5</Text></View>
              <Text style={styles.stepTitle}>Trade Plan</Text>
            </View>
            <Text style={[styles.stepStatus, { backgroundColor: getStatusBg(planStatus), color: getStatusColor(planStatus) }]}>{planStatus}</Text>
          </View>
          <Text style={styles.stepDescription}>Calculates optimal entry zones using Fibonacci retracements, pivot points, and liquidity clusters. Sets stop-loss below key support and take-profits at resistance levels with dynamic R:R optimization.</Text>
          <View style={styles.stepContent}>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Direction</Text><Text style={[styles.metricValue, { color: isLong ? BRAND.success : BRAND.danger }]}>{(data.tradePlan.direction || 'N/A').toUpperCase()}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Risk/Reward</Text><Text style={styles.metricValue}>{(data.tradePlan.riskReward || 0).toFixed(1)}:1</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Win Rate</Text><Text style={styles.metricValue}>{data.tradePlan.winRateEstimate || 50}%</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Avg Entry</Text><Text style={styles.metricValue}>{formatPrice(data.tradePlan.averageEntry)}</Text></View>
          </View>
          <View style={styles.levelsGrid}>
            <View style={styles.levelBox}>
              <Text style={[styles.levelTitle, { color: BRAND.primary }]}>Entry Levels</Text>
              {data.tradePlan.entries?.slice(0, 3).map((e, i) => (
                <View key={i} style={styles.levelRow}><Text style={[styles.levelLabel, { color: BRAND.primary }]}>E{i + 1}</Text><Text style={styles.levelPrice}>{formatPrice(e.price)} ({e.percentage}%)</Text></View>
              ))}
            </View>
            <View style={styles.levelBox}>
              <Text style={[styles.levelTitle, { color: BRAND.danger }]}>Stop Loss</Text>
              <View style={styles.levelRow}><Text style={[styles.levelLabel, { color: BRAND.danger }]}>SL</Text><Text style={styles.levelPrice}>{formatPrice(data.tradePlan.stopLoss?.price)}</Text></View>
              <View style={styles.levelRow}><Text style={styles.levelLabel}>Risk</Text><Text style={styles.levelPrice}>-{(data.tradePlan.stopLoss?.percentage || 0).toFixed(2)}%</Text></View>
            </View>
            <View style={styles.levelBox}>
              <Text style={[styles.levelTitle, { color: BRAND.success }]}>Take Profits</Text>
              {data.tradePlan.takeProfits?.slice(0, 3).map((tp, i) => (
                <View key={i} style={styles.levelRow}><Text style={[styles.levelLabel, { color: BRAND.success }]}>TP{i + 1}</Text><Text style={styles.levelPrice}>{formatPrice(tp.price)} (+{(tp.percentage || 0).toFixed(1)}%)</Text></View>
              ))}
            </View>
          </View>
        </View>

        {/* Step 6: Trap Check */}
        <View style={[styles.stepCard, { borderLeftColor: getBorderColor(trapStatus) }]}>
          <View style={styles.stepHeader}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>6</Text></View>
              <Text style={styles.stepTitle}>Trap Check</Text>
            </View>
            <Text style={[styles.stepStatus, { backgroundColor: getStatusBg(trapStatus), color: getStatusColor(trapStatus) }]}>{trapStatus}</Text>
          </View>
          <View style={styles.stepContent}>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Bull Trap</Text><Text style={[styles.metricValue, { color: data.trapCheck?.traps?.bullTrap ? BRAND.danger : BRAND.success }]}>{data.trapCheck?.traps?.bullTrap ? 'DETECTED' : 'NONE'}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Bear Trap</Text><Text style={[styles.metricValue, { color: data.trapCheck?.traps?.bearTrap ? BRAND.danger : BRAND.success }]}>{data.trapCheck?.traps?.bearTrap ? 'DETECTED' : 'NONE'}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Fakeout Risk</Text><Text style={[styles.metricValue, { color: getStatusColor(data.trapCheck?.traps?.fakeoutRisk || 'low') }]}>{(data.trapCheck?.traps?.fakeoutRisk || 'LOW').toUpperCase()}</Text></View>
          </View>
          <Text style={styles.stepDescription}>Detects potential bull/bear traps by analyzing breakout volume, liquidation heatmaps, and order book imbalances. Validates price movements against historical fakeout patterns at key levels.</Text>
        </View>

        {/* Step 7: Final Verdict with Trade Summary */}
        <View style={[styles.verdictCard, { backgroundColor: isLong ? '#dcfce7' : '#fee2e2' }]}>
          <View style={styles.stepHeader}>
            <View style={styles.stepTitleRow}>
              <View style={[styles.stepNumber, { backgroundColor: isLong ? BRAND.success : BRAND.danger }]}><Text style={styles.stepNumberText}>7</Text></View>
              <Text style={styles.stepTitle}>Final Verdict</Text>
            </View>
            <Text style={[styles.stepStatus, { backgroundColor: isLong ? BRAND.success : BRAND.danger, color: '#ffffff' }]}>{score}/100</Text>
          </View>
          <Text style={[styles.verdictTitle, { color: isLong ? BRAND.success : BRAND.danger }]}>
            ✓ {(data.tradePlan.direction || '').toUpperCase()} Position Recommended
          </Text>
          <Text style={styles.verdictText}>
            {data.verdict.aiSummary || `Based on comprehensive 7-step analysis, market conditions favor a ${isLong ? 'bullish' : 'bearish'} position on ${data.symbol}/USDT. Recommended entry zone around ${formatPrice(data.tradePlan.averageEntry)} with a ${(data.tradePlan.riskReward || 0).toFixed(1)}:1 risk-reward ratio. Set stop-loss at ${formatPrice(data.tradePlan.stopLoss?.price)} to manage risk.`}
          </Text>
          {/* Trade Summary inside Verdict */}
          <View style={styles.verdictSummary}>
            <View style={styles.verdictSummaryItem}><Text style={styles.verdictSummaryLabel}>Direction</Text><Text style={[styles.verdictSummaryValue, { color: isLong ? BRAND.success : BRAND.danger }]}>{isLong ? 'LONG' : 'SHORT'}</Text></View>
            <View style={styles.verdictSummaryItem}><Text style={styles.verdictSummaryLabel}>Entry Price</Text><Text style={styles.verdictSummaryValue}>{formatPrice(data.tradePlan.averageEntry)}</Text></View>
            <View style={styles.verdictSummaryItem}><Text style={styles.verdictSummaryLabel}>Stop Loss</Text><Text style={[styles.verdictSummaryValue, { color: BRAND.danger }]}>{formatPrice(data.tradePlan.stopLoss?.price)}</Text></View>
            <View style={styles.verdictSummaryItem}><Text style={styles.verdictSummaryLabel}>Take Profit</Text><Text style={[styles.verdictSummaryValue, { color: BRAND.success }]}>{formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</Text></View>
          </View>
        </View>

        <PageFooter pageNum={2} totalPages={2} />
      </Page>
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
