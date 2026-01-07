'use client';

// ===========================================
// Analysis Report PDF Generator
// Clean, professional design with full content
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
const COLORS = {
  // Brand
  logoRed: '#dc2626',
  logoGreen: '#16a34a',
  // Status
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#d97706',
  info: '#2563eb',
  // Neutral
  black: '#0f172a',
  dark: '#1e293b',
  gray: '#64748b',
  lightGray: '#94a3b8',
  border: '#e2e8f0',
  bgLight: '#f8fafc',
  white: '#ffffff',
};

// Styles
const styles = StyleSheet.create({
  // Page
  page: {
    backgroundColor: COLORS.white,
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: COLORS.black,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
    marginBottom: 20,
  },
  logo: {
    flexDirection: 'row',
  },
  logoT: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.logoRed,
  },
  logoP: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.logoGreen,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  symbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  subtitle: {
    fontSize: 9,
    color: COLORS.gray,
    marginTop: 2,
  },

  // Summary Box
  summaryBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgLight,
    borderRadius: 6,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 8,
    color: COLORS.gray,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 10,
  },

  // Section
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  // Step Card
  stepCard: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  stepBadge: {
    fontSize: 8,
    fontWeight: 'bold',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    color: COLORS.white,
  },
  stepMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metric: {
    width: '25%',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 7,
    color: COLORS.gray,
  },
  metricValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: COLORS.black,
  },

  // Trade Levels
  levelsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  levelBox: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  levelPrice: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  levelPercent: {
    fontSize: 7,
    marginTop: 1,
  },

  // Chart
  chartContainer: {
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    padding: 6,
    backgroundColor: COLORS.bgLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  chartImage: {
    width: '100%',
    height: 200,
  },

  // AI Expert
  aiExpert: {
    backgroundColor: '#fef3c7',
    borderRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fcd34d',
    marginBottom: 12,
  },
  aiExpertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiExpertBadge: {
    backgroundColor: '#f59e0b',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  aiExpertBadgeText: {
    fontSize: 7,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  aiExpertTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#92400e',
  },
  aiExpertContent: {
    fontSize: 8,
    color: '#78350f',
    lineHeight: 1.4,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerText: {
    fontSize: 7,
    color: COLORS.lightGray,
  },
  pageNumber: {
    fontSize: 8,
    color: COLORS.gray,
  },

  // Two columns
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  col: {
    flex: 1,
  },
});

// Helper
function formatPrice(price: number): string {
  if (!price) return '$0';
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
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
  };
  safetyCheck: {
    riskLevel: string;
    manipulation: { pumpDumpRisk: string };
    whaleActivity: { bias: string };
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
    takeProfits: Array<{ price: number; percentage?: number; riskReward?: number }>;
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
  aiExpertComment?: string;
}

// Header Component
const Header = ({ symbol }: { symbol: string }) => (
  <View style={styles.header}>
    <View style={styles.logo}>
      <Text style={styles.logoT}>Trade</Text>
      <Text style={styles.logoP}>Path</Text>
    </View>
    <View style={styles.headerRight}>
      <Text style={styles.symbol}>{symbol}/USDT</Text>
      <Text style={styles.subtitle}>7-Step AI Analysis Report</Text>
    </View>
  </View>
);

// Footer Component
const Footer = ({ pageNum, totalPages }: { pageNum: number; totalPages: number }) => (
  <View style={styles.footer}>
    <Text style={styles.footerText}>
      TradePath AI • For educational purposes only • Not financial advice
    </Text>
    <Text style={styles.pageNumber}>Page {pageNum}/{totalPages}</Text>
  </View>
);

// PDF Document
const AnalysisReportDocument = ({ data }: { data: AnalysisReportData }) => {
  const isLong = data.tradePlan.direction === 'long';
  const score = Math.round((data.verdict.overallScore || 0) * 10);
  const directionColor = isLong ? COLORS.success : COLORS.danger;
  const totalPages = 2;

  return (
    <Document>
      {/* PAGE 1: Summary + Steps 1-6 */}
      <Page size="A4" style={styles.page}>
        <Header symbol={data.symbol} />

        {/* Summary Box */}
        <View style={styles.summaryBox}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Direction</Text>
            <Text style={[styles.summaryValue, { color: directionColor }]}>
              {isLong ? '↗ LONG' : '↘ SHORT'}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Score</Text>
            <Text style={[styles.summaryValue, { color: score >= 70 ? COLORS.success : score >= 50 ? COLORS.warning : COLORS.danger }]}>
              {score}/100
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Entry</Text>
            <Text style={styles.summaryValue}>{formatPrice(data.tradePlan.averageEntry)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Risk/Reward</Text>
            <Text style={styles.summaryValue}>{(data.tradePlan.riskReward || 0).toFixed(1)}:1</Text>
          </View>
        </View>

        {/* Steps in 2 columns */}
        <View style={styles.twoCol}>
          {/* Left Column */}
          <View style={styles.col}>
            {/* Step 1: Market Pulse */}
            <View style={[styles.stepCard, { borderLeftColor: COLORS.info }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>1. Market Pulse</Text>
                <Text style={[styles.stepBadge, { backgroundColor: data.marketPulse.trend?.direction === 'bullish' ? COLORS.success : data.marketPulse.trend?.direction === 'bearish' ? COLORS.danger : COLORS.warning }]}>
                  {(data.marketPulse.trend?.direction || 'neutral').toUpperCase()}
                </Text>
              </View>
              <View style={styles.stepMetrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Fear & Greed</Text>
                  <Text style={styles.metricValue}>{data.marketPulse.fearGreedIndex}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>BTC Dom.</Text>
                  <Text style={styles.metricValue}>{data.marketPulse.btcDominance?.toFixed(1)}%</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Trend</Text>
                  <Text style={styles.metricValue}>{data.marketPulse.trend?.strength || 0}%</Text>
                </View>
              </View>
            </View>

            {/* Step 2: Asset Scanner */}
            <View style={[styles.stepCard, { borderLeftColor: '#06b6d4' }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>2. Asset Scanner</Text>
                <Text style={[styles.stepBadge, { backgroundColor: (data.assetScan.priceChange24h || 0) >= 0 ? COLORS.success : COLORS.danger }]}>
                  {(data.assetScan.priceChange24h || 0) >= 0 ? 'BULLISH' : 'BEARISH'}
                </Text>
              </View>
              <View style={styles.stepMetrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Price</Text>
                  <Text style={styles.metricValue}>{formatPrice(data.assetScan.currentPrice)}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>24h</Text>
                  <Text style={[styles.metricValue, { color: (data.assetScan.priceChange24h || 0) >= 0 ? COLORS.success : COLORS.danger }]}>
                    {(data.assetScan.priceChange24h || 0).toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>RSI</Text>
                  <Text style={styles.metricValue}>{data.assetScan.indicators?.rsi?.toFixed(0) || '-'}</Text>
                </View>
              </View>
            </View>

            {/* Step 3: Safety Check */}
            <View style={[styles.stepCard, { borderLeftColor: '#f97316' }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>3. Safety Check</Text>
                <Text style={[styles.stepBadge, { backgroundColor: data.safetyCheck.riskLevel === 'low' ? COLORS.success : data.safetyCheck.riskLevel === 'high' ? COLORS.danger : COLORS.warning }]}>
                  {(data.safetyCheck.riskLevel || 'medium').toUpperCase()}
                </Text>
              </View>
              <View style={styles.stepMetrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Whale</Text>
                  <Text style={styles.metricValue}>{(data.safetyCheck.whaleActivity?.bias || '-').toUpperCase()}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Pump/Dump</Text>
                  <Text style={styles.metricValue}>{(data.safetyCheck.manipulation?.pumpDumpRisk || '-').toUpperCase()}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Right Column */}
          <View style={styles.col}>
            {/* Step 4: Timing */}
            <View style={[styles.stepCard, { borderLeftColor: '#a855f7' }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>4. Timing</Text>
                <Text style={[styles.stepBadge, { backgroundColor: data.timing.tradeNow ? COLORS.success : COLORS.warning }]}>
                  {data.timing.tradeNow ? 'READY' : 'WAIT'}
                </Text>
              </View>
              <View style={styles.stepMetrics}>
                <View style={[styles.metric, { width: '100%' }]}>
                  <Text style={styles.metricLabel}>Reason</Text>
                  <Text style={styles.metricValue}>{(data.timing.reason || '-').slice(0, 40)}</Text>
                </View>
              </View>
            </View>

            {/* Step 5: Trade Plan */}
            <View style={[styles.stepCard, { borderLeftColor: '#6366f1' }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>5. Trade Plan</Text>
                <Text style={[styles.stepBadge, { backgroundColor: directionColor }]}>
                  {isLong ? 'LONG' : 'SHORT'}
                </Text>
              </View>
              <View style={styles.stepMetrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>R:R</Text>
                  <Text style={styles.metricValue}>{(data.tradePlan.riskReward || 0).toFixed(1)}:1</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Win Rate</Text>
                  <Text style={styles.metricValue}>{data.tradePlan.winRateEstimate || 0}%</Text>
                </View>
              </View>
            </View>

            {/* Step 6: Trap Check */}
            <View style={[styles.stepCard, { borderLeftColor: COLORS.danger }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>6. Trap Check</Text>
                <Text style={[styles.stepBadge, { backgroundColor: (data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? COLORS.danger : COLORS.success }]}>
                  {(data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? 'WARNING' : 'CLEAR'}
                </Text>
              </View>
              <View style={styles.stepMetrics}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Bull Trap</Text>
                  <Text style={[styles.metricValue, { color: data.trapCheck?.traps?.bullTrap ? COLORS.danger : COLORS.success }]}>
                    {data.trapCheck?.traps?.bullTrap ? 'YES' : 'NO'}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Bear Trap</Text>
                  <Text style={[styles.metricValue, { color: data.trapCheck?.traps?.bearTrap ? COLORS.danger : COLORS.success }]}>
                    {data.trapCheck?.traps?.bearTrap ? 'YES' : 'NO'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Trade Levels */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trade Levels</Text>
          <View style={styles.levelsRow}>
            <View style={styles.levelBox}>
              <Text style={[styles.levelLabel, { color: COLORS.info }]}>ENTRY</Text>
              <Text style={styles.levelPrice}>{formatPrice(data.tradePlan.averageEntry)}</Text>
            </View>
            <View style={styles.levelBox}>
              <Text style={[styles.levelLabel, { color: COLORS.danger }]}>STOP LOSS</Text>
              <Text style={[styles.levelPrice, { color: COLORS.danger }]}>{formatPrice(data.tradePlan.stopLoss?.price)}</Text>
              <Text style={[styles.levelPercent, { color: COLORS.danger }]}>-{(data.tradePlan.stopLoss?.percentage || 0).toFixed(1)}%</Text>
            </View>
            <View style={styles.levelBox}>
              <Text style={[styles.levelLabel, { color: COLORS.success }]}>TP1</Text>
              <Text style={[styles.levelPrice, { color: COLORS.success }]}>{formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</Text>
            </View>
            <View style={styles.levelBox}>
              <Text style={[styles.levelLabel, { color: COLORS.success }]}>TP2</Text>
              <Text style={[styles.levelPrice, { color: COLORS.success }]}>{formatPrice(data.tradePlan.takeProfits?.[1]?.price)}</Text>
            </View>
            <View style={styles.levelBox}>
              <Text style={[styles.levelLabel, { color: COLORS.success }]}>TP3</Text>
              <Text style={[styles.levelPrice, { color: COLORS.success }]}>{formatPrice(data.tradePlan.takeProfits?.[2]?.price)}</Text>
            </View>
          </View>
        </View>

        {/* Final Verdict */}
        <View style={[styles.stepCard, { borderLeftColor: directionColor, backgroundColor: isLong ? '#f0fdf4' : '#fef2f2' }]}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepTitle}>7. Final Verdict</Text>
            <Text style={[styles.stepBadge, { backgroundColor: directionColor }]}>
              {score}/100
            </Text>
          </View>
          {data.verdict.aiSummary && (
            <Text style={{ fontSize: 8, color: COLORS.dark, lineHeight: 1.4, marginTop: 4 }}>
              {data.verdict.aiSummary.slice(0, 300)}{data.verdict.aiSummary.length > 300 ? '...' : ''}
            </Text>
          )}
        </View>

        <Footer pageNum={1} totalPages={totalPages} />
      </Page>

      {/* PAGE 2: Chart + AI Expert */}
      <Page size="A4" style={styles.page}>
        <Header symbol={data.symbol} />

        {/* Chart */}
        {data.chartImage && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Trade Plan Chart</Text>
            <Image src={data.chartImage} style={styles.chartImage} />
          </View>
        )}

        {/* Quick Reference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Reference</Text>
          <View style={styles.levelsRow}>
            <View style={[styles.levelBox, { flex: 2 }]}>
              <Text style={[styles.levelLabel, { color: COLORS.info }]}>ENTRY ZONE</Text>
              <Text style={[styles.levelPrice, { fontSize: 14 }]}>{formatPrice(data.tradePlan.averageEntry)}</Text>
            </View>
            <View style={[styles.levelBox, { flex: 2 }]}>
              <Text style={[styles.levelLabel, { color: COLORS.danger }]}>STOP LOSS</Text>
              <Text style={[styles.levelPrice, { fontSize: 14, color: COLORS.danger }]}>{formatPrice(data.tradePlan.stopLoss?.price)}</Text>
              <Text style={[styles.levelPercent, { color: COLORS.danger }]}>-{(data.tradePlan.stopLoss?.percentage || 0).toFixed(1)}%</Text>
            </View>
            <View style={[styles.levelBox, { flex: 3 }]}>
              <Text style={[styles.levelLabel, { color: COLORS.success }]}>TAKE PROFITS</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: 9, color: COLORS.success }}>TP1: {formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</Text>
                <Text style={{ fontSize: 9, color: COLORS.success }}>TP2: {formatPrice(data.tradePlan.takeProfits?.[1]?.price)}</Text>
                <Text style={{ fontSize: 9, color: COLORS.success }}>TP3: {formatPrice(data.tradePlan.takeProfits?.[2]?.price)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* AI Expert Comment */}
        {data.aiExpertComment && (
          <View style={styles.aiExpert}>
            <View style={styles.aiExpertHeader}>
              <View style={styles.aiExpertBadge}>
                <Text style={styles.aiExpertBadgeText}>AI EXPERT</Text>
              </View>
              <Text style={styles.aiExpertTitle}>Expert Analysis</Text>
            </View>
            <Text style={styles.aiExpertContent}>
              {data.aiExpertComment}
            </Text>
          </View>
        )}

        {/* Report Info */}
        <View style={{ marginTop: 'auto', paddingTop: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: COLORS.border }}>
            <View>
              <Text style={{ fontSize: 7, color: COLORS.gray }}>REPORT ID</Text>
              <Text style={{ fontSize: 9, color: COLORS.dark }}>{data.analysisId?.slice(-16) || 'N/A'}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 7, color: COLORS.gray }}>GENERATED</Text>
              <Text style={{ fontSize: 9, color: COLORS.dark }}>{data.generatedAt}</Text>
            </View>
            <View>
              <Text style={{ fontSize: 7, color: COLORS.gray }}>POWERED BY</Text>
              <Text style={{ fontSize: 9, color: COLORS.dark }}>Gemini 2.5 Flash AI</Text>
            </View>
          </View>
        </View>

        <Footer pageNum={2} totalPages={totalPages} />
      </Page>
    </Document>
  );
};

// Capture chart
export async function captureChartAsImage(elementId: string = 'trade-plan-chart'): Promise<string | null> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn('Chart element not found:', elementId);
      return null;
    }

    element.scrollIntoView({ behavior: 'instant', block: 'center' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to capture chart:', error);
    return null;
  }
}

// Export function
export async function generateAnalysisReport(data: AnalysisReportData, captureChart: boolean = true): Promise<void> {
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
