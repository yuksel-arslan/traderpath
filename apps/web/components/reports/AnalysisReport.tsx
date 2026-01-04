'use client';

// ===========================================
// Analysis Report PDF Generator
// Professional Light Theme with Cover Page
// 3 steps per page format
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

// Professional light theme styles
const styles = StyleSheet.create({
  // Cover Page
  coverPage: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverLogo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 5,
  },
  coverTagline: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 60,
  },
  coverSymbolBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  coverSymbolLetter: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  coverSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 40,
  },
  coverVerdictBadge: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 15,
  },
  coverVerdictText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  coverScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#111827',
  },
  coverScoreLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 60,
  },
  coverMeta: {
    fontSize: 10,
    color: '#9ca3af',
    marginBottom: 3,
  },
  coverPowered: {
    marginTop: 40,
    fontSize: 10,
    color: '#9ca3af',
  },

  // Content Pages
  page: {
    backgroundColor: '#ffffff',
    padding: 40,
    paddingBottom: 70,
    fontFamily: 'Helvetica',
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  pageHeaderLogo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  pageHeaderSymbol: {
    fontSize: 12,
    color: '#6b7280',
  },

  // Step Card (fits 3 per page)
  stepCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  stepStatus: {
    fontSize: 10,
    fontWeight: 'bold',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  stepContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  stepMetric: {
    width: '25%',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#111827',
  },
  stepDescription: {
    fontSize: 9,
    color: '#6b7280',
    lineHeight: 1.5,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // Trade Levels
  levelsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  levelBox: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  levelTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  levelLabel: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  levelPrice: {
    fontSize: 9,
    color: '#111827',
  },

  // Final Verdict
  verdictCard: {
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
  },
  verdictTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  verdictText: {
    fontSize: 11,
    color: '#374151',
    lineHeight: 1.6,
  },

  // Chart section
  chartSection: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    height: 180,
  },
  chartImage: {
    width: '100%',
    height: '100%',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },

  // Disclaimer
  disclaimer: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 15,
    marginTop: 20,
  },
  disclaimerTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 5,
  },
  disclaimerText: {
    fontSize: 8,
    color: '#92400e',
    lineHeight: 1.5,
  },
});

// Helper function to format price
function formatPrice(price: number): string {
  if (!price) return '$0';
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

// Analysis data types
interface AnalysisReportData {
  symbol: string;
  generatedAt: string;
  analysisId: string;
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

// Generate chart URL - Light theme
function generateChartUrl(data: AnalysisReportData): string {
  const entry = data.tradePlan.averageEntry || 0;
  const sl = data.tradePlan.stopLoss?.price || 0;
  const tp1 = data.tradePlan.takeProfits?.[0]?.price || 0;
  const tp2 = data.tradePlan.takeProfits?.[1]?.price || 0;
  const current = data.assetScan.currentPrice || entry;
  const isLong = data.tradePlan.direction === 'long';

  const prices = [sl, entry, current, tp1, tp2].filter(p => p > 0);
  const minPrice = Math.min(...prices) * 0.97;
  const maxPrice = Math.max(...prices) * 1.03;

  const annotations: any = {
    current: { type: 'line', yMin: current, yMax: current, borderColor: '#f59e0b', borderWidth: 2, borderDash: [5, 5], label: { display: true, content: `Current: ${formatPrice(current)}`, position: 'start', backgroundColor: '#f59e0b', font: { size: 10 } } },
    entry: { type: 'line', yMin: entry, yMax: entry, borderColor: '#3b82f6', borderWidth: 2, label: { display: true, content: `Entry: ${formatPrice(entry)}`, position: 'start', backgroundColor: '#3b82f6', color: '#fff', font: { size: 10 } } },
    sl: { type: 'line', yMin: sl, yMax: sl, borderColor: '#ef4444', borderWidth: 2, label: { display: true, content: `SL: ${formatPrice(sl)}`, position: 'start', backgroundColor: '#ef4444', color: '#fff', font: { size: 10 } } },
  };
  if (tp1) annotations.tp1 = { type: 'line', yMin: tp1, yMax: tp1, borderColor: '#22c55e', borderWidth: 2, label: { display: true, content: `TP1: ${formatPrice(tp1)}`, position: 'end', backgroundColor: '#22c55e', font: { size: 10 } } };
  if (tp2) annotations.tp2 = { type: 'line', yMin: tp2, yMax: tp2, borderColor: '#10b981', borderWidth: 2, label: { display: true, content: `TP2: ${formatPrice(tp2)}`, position: 'end', backgroundColor: '#10b981', font: { size: 10 } } };

  const chartConfig = {
    type: 'line',
    data: { labels: ['', '', '', '', ''], datasets: [{ data: [current, current, current, current, current], borderColor: 'transparent', pointRadius: 0 }] },
    options: {
      plugins: { legend: { display: false }, title: { display: true, text: `${data.symbol}/USDT - ${isLong ? 'LONG' : 'SHORT'} Trade Plan`, font: { size: 14, weight: 'bold' } }, annotation: { annotations } },
      scales: { x: { display: false }, y: { min: minPrice, max: maxPrice, grid: { color: '#e5e7eb' }, ticks: { font: { size: 10 }, callback: (v: number) => '$' + v.toLocaleString() } } }
    }
  };

  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&backgroundColor=%23f3f4f6&width=550&height=200`;
}

// Status helpers
const getStatusColor = (status: string) => {
  const positive = ['Bullish', 'Safe', 'Good', 'Ready', 'Clear', 'Stable', 'Low'];
  const negative = ['Bearish', 'Risky', 'Warning', 'Declining', 'High'];
  if (positive.some(p => status.toLowerCase().includes(p.toLowerCase()))) return '#16a34a';
  if (negative.some(n => status.toLowerCase().includes(n.toLowerCase()))) return '#dc2626';
  return '#ca8a04';
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
  if (positive.some(p => status.toLowerCase().includes(p.toLowerCase()))) return '#22c55e';
  if (negative.some(n => status.toLowerCase().includes(n.toLowerCase()))) return '#ef4444';
  return '#f59e0b';
};

// Footer Component
const PageFooter = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
  <View style={styles.footer}>
    <Text style={styles.footerText}>TradePath AI Analysis Report</Text>
    <Text style={styles.footerText}>Confidential</Text>
    <Text style={styles.footerText}>Page {pageNum} of {totalPages}</Text>
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

  const chartUrl = generateChartUrl(data);

  return (
    <Document>
      {/* PAGE 1: Cover Page */}
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverLogo}>TradePath</Text>
        <Text style={styles.coverTagline}>AI-Powered Trading Analysis</Text>

        <View style={styles.coverSymbolBadge}>
          <Text style={styles.coverSymbolLetter}>{data.symbol.charAt(0)}</Text>
        </View>

        <Text style={styles.coverTitle}>{data.symbol}/USDT</Text>
        <Text style={styles.coverSubtitle}>Comprehensive Analysis Report</Text>

        <View style={[styles.coverVerdictBadge, { backgroundColor: isLong ? '#16a34a' : '#dc2626' }]}>
          <Text style={styles.coverVerdictText}>{isLong ? '↗ LONG' : '↘ SHORT'} RECOMMENDED</Text>
        </View>

        <Text style={styles.coverScore}>{score}/100</Text>
        <Text style={styles.coverScoreLabel}>Overall Score</Text>

        <Text style={styles.coverMeta}>Generated: {data.generatedAt}</Text>
        <Text style={styles.coverMeta}>Report ID: {data.analysisId?.slice(-12)}</Text>

        <Text style={styles.coverPowered}>Powered by Google Gemini AI</Text>
      </Page>

      {/* PAGE 2: Steps 1-3 + Chart */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderLogo}>TradePath</Text>
          <Text style={styles.pageHeaderSymbol}>{data.symbol}/USDT Analysis</Text>
        </View>

        {/* Chart */}
        <View style={styles.chartSection}>
          <Image src={chartUrl} style={styles.chartImage} />
        </View>

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
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Trend</Text><Text style={[styles.metricValue, { color: getStatusColor(marketStatus) }]}>{data.marketPulse.trend?.direction?.toUpperCase()}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Strength</Text><Text style={styles.metricValue}>{data.marketPulse.trend?.strength}%</Text></View>
          </View>
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
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>24h Change</Text><Text style={[styles.metricValue, { color: (data.assetScan.priceChange24h || 0) >= 0 ? '#16a34a' : '#dc2626' }]}>{(data.assetScan.priceChange24h || 0) >= 0 ? '+' : ''}{(data.assetScan.priceChange24h || 0).toFixed(2)}%</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>RSI (14)</Text><Text style={styles.metricValue}>{data.assetScan.indicators?.rsi?.toFixed(0) || 'N/A'}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>MACD</Text><Text style={[styles.metricValue, { color: (data.assetScan.indicators?.macd?.histogram || 0) > 0 ? '#16a34a' : '#dc2626' }]}>{(data.assetScan.indicators?.macd?.histogram || 0) > 0 ? 'Bullish' : 'Bearish'}</Text></View>
          </View>
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
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Pump/Dump Risk</Text><Text style={styles.metricValue}>{(data.safetyCheck.manipulation?.pumpDumpRisk || 'N/A').toUpperCase()}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Whale Activity</Text><Text style={styles.metricValue}>{(data.safetyCheck.whaleActivity?.bias || 'neutral').toUpperCase()}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Smart Money</Text><Text style={styles.metricValue}>{(data.safetyCheck.smartMoney?.positioning || 'neutral').toUpperCase()}</Text></View>
          </View>
        </View>

        <PageFooter pageNum={2} totalPages={4} />
      </Page>

      {/* PAGE 3: Steps 4-6 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderLogo}>TradePath</Text>
          <Text style={styles.pageHeaderSymbol}>{data.symbol}/USDT Analysis</Text>
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
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Trade Now?</Text><Text style={[styles.metricValue, { color: data.timing.tradeNow ? '#16a34a' : '#ca8a04' }]}>{data.timing.tradeNow ? 'YES' : 'WAIT'}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>RSI Zone</Text><Text style={styles.metricValue}>{(data.assetScan.indicators?.rsi || 50) > 70 ? 'Overbought' : (data.assetScan.indicators?.rsi || 50) < 30 ? 'Oversold' : 'Neutral'}</Text></View>
          </View>
          <Text style={styles.stepDescription}>{data.timing.reason || 'Entry timing based on technical indicators and market conditions.'}</Text>
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
          <View style={styles.stepContent}>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Direction</Text><Text style={[styles.metricValue, { color: isLong ? '#16a34a' : '#dc2626' }]}>{(data.tradePlan.direction || 'N/A').toUpperCase()}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Risk/Reward</Text><Text style={styles.metricValue}>{(data.tradePlan.riskReward || 0).toFixed(1)}:1</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Win Rate Est.</Text><Text style={styles.metricValue}>{data.tradePlan.winRateEstimate || 50}%</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Avg Entry</Text><Text style={styles.metricValue}>{formatPrice(data.tradePlan.averageEntry)}</Text></View>
          </View>
          <View style={styles.levelsGrid}>
            <View style={styles.levelBox}>
              <Text style={[styles.levelTitle, { color: '#3b82f6' }]}>Entry Levels</Text>
              {data.tradePlan.entries?.slice(0, 2).map((e, i) => (
                <View key={i} style={styles.levelRow}><Text style={[styles.levelLabel, { color: '#3b82f6' }]}>E{i + 1}</Text><Text style={styles.levelPrice}>{formatPrice(e.price)} ({e.percentage}%)</Text></View>
              ))}
            </View>
            <View style={styles.levelBox}>
              <Text style={[styles.levelTitle, { color: '#dc2626' }]}>Stop Loss</Text>
              <View style={styles.levelRow}><Text style={[styles.levelLabel, { color: '#dc2626' }]}>SL</Text><Text style={styles.levelPrice}>{formatPrice(data.tradePlan.stopLoss?.price)} (-{(data.tradePlan.stopLoss?.percentage || 0).toFixed(1)}%)</Text></View>
            </View>
            <View style={styles.levelBox}>
              <Text style={[styles.levelTitle, { color: '#16a34a' }]}>Take Profits</Text>
              {data.tradePlan.takeProfits?.slice(0, 2).map((tp, i) => (
                <View key={i} style={styles.levelRow}><Text style={[styles.levelLabel, { color: '#16a34a' }]}>TP{i + 1}</Text><Text style={styles.levelPrice}>{formatPrice(tp.price)} (+{(tp.percentage || 0).toFixed(1)}%)</Text></View>
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
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Bull Trap</Text><Text style={[styles.metricValue, { color: data.trapCheck?.traps?.bullTrap ? '#dc2626' : '#16a34a' }]}>{data.trapCheck?.traps?.bullTrap ? 'DETECTED' : 'NONE'}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Bear Trap</Text><Text style={[styles.metricValue, { color: data.trapCheck?.traps?.bearTrap ? '#dc2626' : '#16a34a' }]}>{data.trapCheck?.traps?.bearTrap ? 'DETECTED' : 'NONE'}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Fakeout Risk</Text><Text style={[styles.metricValue, { color: getStatusColor(data.trapCheck?.traps?.fakeoutRisk || 'low') }]}>{(data.trapCheck?.traps?.fakeoutRisk || 'LOW').toUpperCase()}</Text></View>
          </View>
          <Text style={styles.stepDescription}>Analysis of potential market traps. Wait for confirmation if risk is elevated.</Text>
        </View>

        <PageFooter pageNum={3} totalPages={4} />
      </Page>

      {/* PAGE 4: Final Verdict + Disclaimer */}
      <Page size="A4" style={styles.page}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageHeaderLogo}>TradePath</Text>
          <Text style={styles.pageHeaderSymbol}>{data.symbol}/USDT Analysis</Text>
        </View>

        {/* Step 7: Final Verdict */}
        <View style={[styles.verdictCard, { backgroundColor: isLong ? '#dcfce7' : '#fee2e2' }]}>
          <View style={styles.stepHeader}>
            <View style={styles.stepTitleRow}>
              <View style={[styles.stepNumber, { backgroundColor: isLong ? '#16a34a' : '#dc2626' }]}><Text style={styles.stepNumberText}>7</Text></View>
              <Text style={styles.stepTitle}>Final Verdict</Text>
            </View>
            <Text style={[styles.stepStatus, { backgroundColor: isLong ? '#16a34a' : '#dc2626', color: '#ffffff' }]}>{score}/100</Text>
          </View>
          <Text style={[styles.verdictTitle, { color: isLong ? '#16a34a' : '#dc2626' }]}>
            ✓ {(data.tradePlan.direction || '').toUpperCase()} Position Recommended
          </Text>
          <Text style={styles.verdictText}>
            {data.verdict.aiSummary || `Based on comprehensive 7-step analysis, market conditions favor a ${isLong ? 'bullish' : 'bearish'} position on ${data.symbol}/USDT. Recommended entry zone around ${formatPrice(data.tradePlan.averageEntry)} with a ${(data.tradePlan.riskReward || 0).toFixed(1)}:1 risk-reward ratio. Set stop-loss at ${formatPrice(data.tradePlan.stopLoss?.price)} to manage risk. Take profits gradually at designated TP levels.`}
          </Text>
        </View>

        {/* Summary Box */}
        <View style={[styles.stepCard, { borderLeftColor: '#3b82f6' }]}>
          <Text style={[styles.stepTitle, { marginBottom: 10 }]}>Trade Summary</Text>
          <View style={styles.stepContent}>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Direction</Text><Text style={[styles.metricValue, { color: isLong ? '#16a34a' : '#dc2626' }]}>{isLong ? 'LONG' : 'SHORT'}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Entry</Text><Text style={styles.metricValue}>{formatPrice(data.tradePlan.averageEntry)}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Stop Loss</Text><Text style={[styles.metricValue, { color: '#dc2626' }]}>{formatPrice(data.tradePlan.stopLoss?.price)}</Text></View>
            <View style={styles.stepMetric}><Text style={styles.metricLabel}>Take Profit</Text><Text style={[styles.metricValue, { color: '#16a34a' }]}>{formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</Text></View>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>⚠ Important Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            This report is for educational and informational purposes only and does not constitute financial, investment, or trading advice. Cryptocurrency trading involves substantial risk of loss and is not suitable for all investors. Past performance does not guarantee future results. The analysis provided is based on AI algorithms and historical data, which may not accurately predict future market movements. Always conduct your own research (DYOR) and consult with a qualified financial advisor before making any investment decisions. Never invest more than you can afford to lose. TradePath and its affiliates are not responsible for any losses incurred as a result of using this report.
          </Text>
        </View>

        <PageFooter pageNum={4} totalPages={4} />
      </Page>
    </Document>
  );
};

// Export function
export async function generateAnalysisReport(data: AnalysisReportData): Promise<void> {
  const blob = await pdf(<AnalysisReportDocument data={data} />).toBlob();
  const filename = `TradePath_${data.symbol}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, filename);
}

export { AnalysisReportDocument };
export type { AnalysisReportData };
