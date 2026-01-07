'use client';

// ===========================================
// TradePath Analysis Report - Template Based
// Clean, fixed layout - just fill in the data
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

// Brand colors
const C = {
  primary: '#0f172a',
  secondary: '#64748b',
  success: '#16a34a',
  danger: '#dc2626',
  warning: '#d97706',
  info: '#2563eb',
  border: '#e2e8f0',
  bg: '#f8fafc',
  white: '#ffffff',
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    padding: 30,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
  },
  logo: {
    flexDirection: 'row',
  },
  logoRed: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  logoGreen: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  symbol: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 8,
    color: C.secondary,
    marginTop: 2,
  },

  // Verdict Box
  verdictBox: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verdictText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: C.white,
  },
  verdictScore: {
    fontSize: 14,
    color: C.white,
    opacity: 0.9,
    marginTop: 4,
  },
  directionBadge: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  directionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: C.white,
  },

  // Trade Plan Grid
  tradePlanSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    color: C.primary,
  },
  tradePlanGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  tradePlanItem: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 6,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  tradePlanLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  tradePlanPrice: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  tradePlanPercent: {
    fontSize: 8,
    marginTop: 2,
  },

  // Steps Grid
  stepsSection: {
    marginBottom: 20,
  },
  stepsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stepItem: {
    width: '32%',
    backgroundColor: C.bg,
    borderRadius: 6,
    padding: 10,
    borderLeftWidth: 4,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepName: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  stepBadge: {
    fontSize: 7,
    fontWeight: 'bold',
    color: C.white,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  stepMetrics: {
    marginTop: 4,
  },
  stepMetric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  stepMetricLabel: {
    fontSize: 7,
    color: C.secondary,
  },
  stepMetricValue: {
    fontSize: 8,
    fontWeight: 'bold',
  },

  // AI Expert Box
  aiExpertBox: {
    backgroundColor: '#ecfdf5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  aiExpertTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#047857',
    marginBottom: 6,
  },
  aiExpertText: {
    fontSize: 8,
    color: '#065f46',
    lineHeight: 1.5,
  },

  // Risk Warning
  riskWarning: {
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
  },
  riskText: {
    fontSize: 7,
    color: '#92400e',
    textAlign: 'center',
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
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerText: {
    fontSize: 7,
    color: C.secondary,
  },

  // Page 2 - Chart
  chartSection: {
    marginBottom: 20,
  },
  chartContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  chartHeader: {
    backgroundColor: C.bg,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  chartTitle: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  chartImage: {
    width: '100%',
    height: 280,
  },

  // Quick Reference Box
  quickRefBox: {
    backgroundColor: C.bg,
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  quickRefGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  quickRefItem: {
    flex: 1,
    alignItems: 'center',
  },
  quickRefLabel: {
    fontSize: 8,
    color: C.secondary,
    marginBottom: 4,
  },
  quickRefValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Analysis Summary
  summaryBox: {
    backgroundColor: C.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
    color: C.primary,
  },
  summaryText: {
    fontSize: 8,
    color: C.secondary,
    lineHeight: 1.5,
  },
});

// Helpers
function formatPrice(price: number): string {
  if (!price || isNaN(price)) return '-';
  if (price >= 10000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 100) return `$${price.toFixed(2)}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(8)}`;
}

function getVerdictBg(action: string): string {
  const a = (action || '').toLowerCase();
  if (a.includes('go') && !a.includes('wait') && !a.includes('conditional')) return C.success;
  if (a.includes('wait') || a.includes('conditional')) return C.warning;
  return C.danger;
}

// Data type
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
  aiExpertComment?: string;
}

// PDF Document Component
const AnalysisReportDocument = ({ data }: { data: AnalysisReportData }) => {
  const isLong = data.tradePlan.direction === 'long';
  const score = Math.round((data.verdict.overallScore || 0) * 10);
  const verdictBg = getVerdictBg(data.verdict.action);

  return (
    <Document>
      {/* PAGE 1: Summary */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoRed}>Trade</Text>
            <Text style={styles.logoGreen}>Path</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.symbol}>{data.symbol}/USDT</Text>
            <Text style={styles.date}>{data.generatedAt}</Text>
          </View>
        </View>

        {/* Verdict Box */}
        <View style={[styles.verdictBox, { backgroundColor: verdictBg }]}>
          <View>
            <Text style={styles.verdictText}>{data.verdict.action || 'ANALYZE'}</Text>
            <Text style={styles.verdictScore}>Score: {score}/100</Text>
          </View>
          <View style={styles.directionBadge}>
            <Text style={styles.directionText}>{isLong ? 'LONG' : 'SHORT'}</Text>
          </View>
        </View>

        {/* Trade Plan */}
        <View style={styles.tradePlanSection}>
          <Text style={styles.sectionTitle}>Trade Plan</Text>
          <View style={styles.tradePlanGrid}>
            <View style={styles.tradePlanItem}>
              <Text style={[styles.tradePlanLabel, { color: C.info }]}>ENTRY</Text>
              <Text style={styles.tradePlanPrice}>{formatPrice(data.tradePlan.averageEntry)}</Text>
            </View>
            <View style={styles.tradePlanItem}>
              <Text style={[styles.tradePlanLabel, { color: C.danger }]}>STOP LOSS</Text>
              <Text style={[styles.tradePlanPrice, { color: C.danger }]}>{formatPrice(data.tradePlan.stopLoss?.price)}</Text>
              <Text style={[styles.tradePlanPercent, { color: C.danger }]}>-{(data.tradePlan.stopLoss?.percentage || 0).toFixed(1)}%</Text>
            </View>
            <View style={styles.tradePlanItem}>
              <Text style={[styles.tradePlanLabel, { color: C.success }]}>TP1</Text>
              <Text style={[styles.tradePlanPrice, { color: C.success }]}>{formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</Text>
            </View>
            <View style={styles.tradePlanItem}>
              <Text style={[styles.tradePlanLabel, { color: C.success }]}>TP2</Text>
              <Text style={[styles.tradePlanPrice, { color: C.success }]}>{formatPrice(data.tradePlan.takeProfits?.[1]?.price)}</Text>
            </View>
            <View style={styles.tradePlanItem}>
              <Text style={[styles.tradePlanLabel, { color: C.success }]}>TP3</Text>
              <Text style={[styles.tradePlanPrice, { color: C.success }]}>{formatPrice(data.tradePlan.takeProfits?.[2]?.price)}</Text>
            </View>
          </View>
        </View>

        {/* 6 Steps Grid */}
        <View style={styles.stepsSection}>
          <Text style={styles.sectionTitle}>Analysis Steps</Text>
          <View style={styles.stepsGrid}>
            {/* Step 1: Market */}
            <View style={[styles.stepItem, { borderLeftColor: '#2563eb' }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepName}>1. Market</Text>
                <Text style={[styles.stepBadge, { backgroundColor: data.marketPulse.trend?.direction === 'bullish' ? C.success : C.warning }]}>
                  {(data.marketPulse.trend?.direction || 'N/A').slice(0, 4).toUpperCase()}
                </Text>
              </View>
              <View style={styles.stepMetrics}>
                <View style={styles.stepMetric}>
                  <Text style={styles.stepMetricLabel}>Fear/Greed</Text>
                  <Text style={styles.stepMetricValue}>{data.marketPulse.fearGreedIndex}</Text>
                </View>
                <View style={styles.stepMetric}>
                  <Text style={styles.stepMetricLabel}>BTC Dom.</Text>
                  <Text style={styles.stepMetricValue}>{data.marketPulse.btcDominance?.toFixed(1)}%</Text>
                </View>
              </View>
            </View>

            {/* Step 2: Asset */}
            <View style={[styles.stepItem, { borderLeftColor: '#06b6d4' }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepName}>2. Asset</Text>
                <Text style={[styles.stepBadge, { backgroundColor: (data.assetScan.priceChange24h || 0) >= 0 ? C.success : C.danger }]}>
                  {(data.assetScan.priceChange24h || 0) >= 0 ? 'UP' : 'DOWN'}
                </Text>
              </View>
              <View style={styles.stepMetrics}>
                <View style={styles.stepMetric}>
                  <Text style={styles.stepMetricLabel}>Price</Text>
                  <Text style={styles.stepMetricValue}>{formatPrice(data.assetScan.currentPrice)}</Text>
                </View>
                <View style={styles.stepMetric}>
                  <Text style={styles.stepMetricLabel}>RSI</Text>
                  <Text style={styles.stepMetricValue}>{data.assetScan.indicators?.rsi?.toFixed(0) || '-'}</Text>
                </View>
              </View>
            </View>

            {/* Step 3: Safety */}
            <View style={[styles.stepItem, { borderLeftColor: '#f97316' }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepName}>3. Safety</Text>
                <Text style={[styles.stepBadge, { backgroundColor: data.safetyCheck.riskLevel === 'low' ? C.success : C.warning }]}>
                  {(data.safetyCheck.riskLevel || 'MED').toUpperCase()}
                </Text>
              </View>
              <View style={styles.stepMetrics}>
                <View style={styles.stepMetric}>
                  <Text style={styles.stepMetricLabel}>Whale</Text>
                  <Text style={styles.stepMetricValue}>{data.safetyCheck.whaleActivity?.bias || '-'}</Text>
                </View>
              </View>
            </View>

            {/* Step 4: Timing */}
            <View style={[styles.stepItem, { borderLeftColor: '#a855f7' }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepName}>4. Timing</Text>
                <Text style={[styles.stepBadge, { backgroundColor: data.timing.tradeNow ? C.success : C.warning }]}>
                  {data.timing.tradeNow ? 'NOW' : 'WAIT'}
                </Text>
              </View>
              <View style={styles.stepMetrics}>
                <View style={styles.stepMetric}>
                  <Text style={[styles.stepMetricLabel, { width: '100%' }]} numberOfLines={1}>
                    {(data.timing.reason || '-').slice(0, 25)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Step 5: Plan */}
            <View style={[styles.stepItem, { borderLeftColor: '#6366f1' }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepName}>5. Plan</Text>
                <Text style={[styles.stepBadge, { backgroundColor: isLong ? C.success : C.danger }]}>
                  {isLong ? 'LONG' : 'SHORT'}
                </Text>
              </View>
              <View style={styles.stepMetrics}>
                <View style={styles.stepMetric}>
                  <Text style={styles.stepMetricLabel}>R:R</Text>
                  <Text style={styles.stepMetricValue}>{(data.tradePlan.riskReward || 0).toFixed(1)}:1</Text>
                </View>
                <View style={styles.stepMetric}>
                  <Text style={styles.stepMetricLabel}>Win%</Text>
                  <Text style={styles.stepMetricValue}>{data.tradePlan.winRateEstimate || 0}%</Text>
                </View>
              </View>
            </View>

            {/* Step 6: Traps */}
            <View style={[styles.stepItem, { borderLeftColor: '#dc2626' }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepName}>6. Traps</Text>
                <Text style={[styles.stepBadge, { backgroundColor: (data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? C.danger : C.success }]}>
                  {(data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? 'WARN' : 'OK'}
                </Text>
              </View>
              <View style={styles.stepMetrics}>
                <View style={styles.stepMetric}>
                  <Text style={styles.stepMetricLabel}>Fakeout</Text>
                  <Text style={styles.stepMetricValue}>{data.trapCheck?.traps?.fakeoutRisk || 'low'}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* AI Expert Comment */}
        {data.aiExpertComment && (
          <View style={styles.aiExpertBox}>
            <Text style={styles.aiExpertTitle}>AI Expert Analysis</Text>
            <Text style={styles.aiExpertText}>{data.aiExpertComment}</Text>
          </View>
        )}

        {/* Risk Warning */}
        <View style={styles.riskWarning}>
          <Text style={styles.riskText}>
            This report is for educational purposes only and is not investment advice. Cryptocurrency investments carry high risk.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Report ID: {data.analysisId?.slice(-12)}</Text>
          <Text style={styles.footerText}>TradePath AI • Page 1/2</Text>
        </View>
      </Page>

      {/* PAGE 2: Chart */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoRed}>Trade</Text>
            <Text style={styles.logoGreen}>Path</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.symbol}>{data.symbol}/USDT</Text>
            <Text style={styles.date}>Trade Plan Chart</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartSection}>
          {data.chartImage ? (
            <View style={styles.chartContainer}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>{data.symbol}/USDT - Entry, Stop Loss & Take Profit Levels</Text>
              </View>
              <Image src={data.chartImage} style={styles.chartImage} />
            </View>
          ) : (
            <View style={[styles.chartContainer, { height: 300, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 12, color: C.secondary }}>Chart not available</Text>
            </View>
          )}
        </View>

        {/* Quick Reference */}
        <View style={styles.quickRefBox}>
          <Text style={styles.sectionTitle}>Quick Reference</Text>
          <View style={styles.quickRefGrid}>
            <View style={styles.quickRefItem}>
              <Text style={styles.quickRefLabel}>ENTRY ZONE</Text>
              <Text style={[styles.quickRefValue, { color: C.info }]}>{formatPrice(data.tradePlan.averageEntry)}</Text>
            </View>
            <View style={styles.quickRefItem}>
              <Text style={styles.quickRefLabel}>STOP LOSS</Text>
              <Text style={[styles.quickRefValue, { color: C.danger }]}>{formatPrice(data.tradePlan.stopLoss?.price)}</Text>
            </View>
            <View style={styles.quickRefItem}>
              <Text style={styles.quickRefLabel}>TP1</Text>
              <Text style={[styles.quickRefValue, { color: C.success }]}>{formatPrice(data.tradePlan.takeProfits?.[0]?.price)}</Text>
            </View>
            <View style={styles.quickRefItem}>
              <Text style={styles.quickRefLabel}>TP2</Text>
              <Text style={[styles.quickRefValue, { color: C.success }]}>{formatPrice(data.tradePlan.takeProfits?.[1]?.price)}</Text>
            </View>
            <View style={styles.quickRefItem}>
              <Text style={styles.quickRefLabel}>TP3</Text>
              <Text style={[styles.quickRefValue, { color: C.success }]}>{formatPrice(data.tradePlan.takeProfits?.[2]?.price)}</Text>
            </View>
          </View>
        </View>

        {/* AI Summary */}
        {data.verdict.aiSummary && (
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>AI Analysis Summary</Text>
            <Text style={styles.summaryText}>{data.verdict.aiSummary}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated: {data.generatedAt}</Text>
          <Text style={styles.footerText}>TradePath AI • Page 2/2</Text>
        </View>
      </Page>
    </Document>
  );
};

// Chart capture function
export async function captureChartAsImage(): Promise<string | null> {
  try {
    const element = document.getElementById('trade-plan-chart');
    if (!element) {
      console.warn('Chart element not found');
      return null;
    }

    const parent = element.parentElement;
    const originalStyle = parent?.getAttribute('style') || '';

    // Move into view for capture
    if (parent) {
      parent.style.cssText = 'position: fixed; left: 0; top: 0; width: 800px; z-index: 9999; background: #fff;';
    }

    await new Promise(resolve => setTimeout(resolve, 1500));

    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true,
      width: 800,
      windowWidth: 800,
    });

    if (parent) {
      parent.style.cssText = originalStyle;
    }

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Chart capture failed:', error);
    return null;
  }
}

// Main export function
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
