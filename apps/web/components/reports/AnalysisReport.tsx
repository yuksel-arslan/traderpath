'use client';

// ===========================================
// TradePath Analysis Report - Clean Design
// Professional, readable, single-page focus
// ===========================================

import {
  Document,
  Page,
  Text,
  View,
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
  red: '#dc2626',
  green: '#16a34a',
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.white,
    padding: 25,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: C.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: C.primary,
  },
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  symbol: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  date: {
    fontSize: 8,
    color: C.secondary,
    marginTop: 2,
  },

  // Verdict Banner
  verdictBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    marginBottom: 15,
  },
  verdictLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  verdictAction: {
    fontSize: 24,
    fontWeight: 'bold',
    color: C.white,
  },
  verdictScore: {
    fontSize: 16,
    color: C.white,
    opacity: 0.9,
  },
  verdictRight: {
    alignItems: 'flex-end',
  },
  verdictDirection: {
    fontSize: 12,
    fontWeight: 'bold',
    color: C.white,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
  },

  // Trade Plan Box
  tradePlanBox: {
    backgroundColor: C.bg,
    borderRadius: 6,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: C.border,
  },
  tradePlanTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tradePlanGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  tradePlanItem: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  tradePlanLabel: {
    fontSize: 7,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tradePlanPrice: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  tradePlanPercent: {
    fontSize: 7,
    marginTop: 2,
  },

  // Steps Section
  stepsSection: {
    marginBottom: 15,
  },
  stepsTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  stepsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  stepCard: {
    width: '32%',
    backgroundColor: C.bg,
    borderRadius: 4,
    padding: 8,
    borderLeftWidth: 3,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepNumber: {
    fontSize: 7,
    color: C.secondary,
  },
  stepName: {
    fontSize: 8,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 4,
  },
  stepBadge: {
    fontSize: 6,
    fontWeight: 'bold',
    color: C.white,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  stepDesc: {
    fontSize: 7,
    color: C.secondary,
    marginTop: 4,
    lineHeight: 1.3,
  },
  stepMetric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  stepMetricLabel: {
    fontSize: 6,
    color: C.secondary,
  },
  stepMetricValue: {
    fontSize: 7,
    fontWeight: 'bold',
  },

  // AI Summary
  aiSummary: {
    backgroundColor: '#fef3c7',
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  aiSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiSummaryBadge: {
    backgroundColor: '#f59e0b',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  aiSummaryBadgeText: {
    fontSize: 6,
    fontWeight: 'bold',
    color: C.white,
  },
  aiSummaryTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#92400e',
  },
  aiSummaryText: {
    fontSize: 8,
    color: '#78350f',
    lineHeight: 1.4,
  },

  // Risk Warning
  riskWarning: {
    backgroundColor: C.bg,
    borderRadius: 4,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  riskWarningText: {
    fontSize: 7,
    color: C.secondary,
    textAlign: 'center',
    lineHeight: 1.4,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 15,
    left: 25,
    right: 25,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerLeft: {
    flexDirection: 'row',
    gap: 20,
  },
  footerItem: {
    alignItems: 'flex-start',
  },
  footerLabel: {
    fontSize: 6,
    color: C.secondary,
  },
  footerValue: {
    fontSize: 7,
    color: C.primary,
  },
  footerRight: {
    alignItems: 'flex-end',
  },
  footerDisclaimer: {
    fontSize: 6,
    color: C.secondary,
    maxWidth: 200,
    textAlign: 'right',
  },

  // Page 2
  page2Section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },

  // Step Explanations
  stepExplanation: {
    backgroundColor: C.bg,
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  stepExplanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepExplanationNumber: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stepExplanationNumberText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: C.white,
  },
  stepExplanationTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    flex: 1,
  },
  stepExplanationBadge: {
    fontSize: 7,
    fontWeight: 'bold',
    color: C.white,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  stepExplanationDesc: {
    fontSize: 8,
    color: C.secondary,
    marginBottom: 6,
    lineHeight: 1.4,
  },
  stepExplanationMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  stepExplanationMetric: {
    minWidth: 80,
  },
  stepExplanationMetricLabel: {
    fontSize: 7,
    color: C.secondary,
  },
  stepExplanationMetricValue: {
    fontSize: 9,
    fontWeight: 'bold',
    color: C.primary,
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

function getVerdictColor(action: string): string {
  const a = (action || '').toLowerCase();
  if (a.includes('go') || a.includes('buy')) return C.success;
  if (a.includes('wait') || a.includes('conditional')) return C.warning;
  return C.danger;
}

function getStepColor(stepId: number): string {
  const colors = ['#2563eb', '#06b6d4', '#f97316', '#a855f7', '#6366f1', '#dc2626', '#16a34a'];
  return colors[stepId - 1] || C.primary;
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
    marketRegime?: string;
    trend: { direction: string; strength: number };
  };
  assetScan: {
    currentPrice: number;
    priceChange24h: number;
    volume24h?: number;
    indicators: { rsi: number; macd: { histogram: number } };
    trend?: { primary: string };
  };
  safetyCheck: {
    riskLevel: string;
    riskScore?: number;
    manipulation: { pumpDumpRisk: string };
    whaleActivity: { bias: string; largeTransactions?: number };
  };
  timing: {
    tradeNow: boolean;
    reason: string;
    entryZone?: { min: number; max: number };
    conditions?: string[];
  };
  tradePlan: {
    direction: string;
    entries?: Array<{ price: number; percentage?: number }>;
    averageEntry: number;
    stopLoss: { price: number; percentage?: number };
    takeProfits: Array<{ price: number; percentage?: number; riskReward?: number }>;
    riskReward: number;
    winRateEstimate?: number;
    positionSize?: number;
  };
  trapCheck?: {
    traps: { bullTrap: boolean; bearTrap: boolean; fakeoutRisk: string };
    liquidityZones?: Array<{ price: number; type: string }>;
  };
  verdict: {
    action: string;
    overallScore: number;
    aiSummary?: string;
  };
  aiExpertComment?: string;
}

// Step descriptions for explanations
const STEP_EXPLANATIONS = {
  1: {
    name: 'Market Pulse',
    desc: 'Genel piyasa durumunu analiz eder. BTC dominansı, korku/açgözlülük endeksi ve piyasa trendi değerlendirilir.',
  },
  2: {
    name: 'Asset Scanner',
    desc: 'Varlığın teknik analizini yapar. Fiyat hareketleri, RSI, MACD ve trend yönü incelenir.',
  },
  3: {
    name: 'Safety Check',
    desc: 'Risk ve manipülasyon kontrolü yapar. Balina aktivitesi ve pump-dump riskleri taranır.',
  },
  4: {
    name: 'Timing',
    desc: 'Optimal giriş zamanını belirler. Mevcut fiyatın giriş bölgesinde olup olmadığı kontrol edilir.',
  },
  5: {
    name: 'Trade Plan',
    desc: 'Detaylı işlem planı oluşturur. Giriş, stop-loss ve kar hedefleri hesaplanır.',
  },
  6: {
    name: 'Trap Check',
    desc: 'Bull/bear tuzaklarını tespit eder. Likidite bölgeleri ve fakeout riskleri analiz edilir.',
  },
  7: {
    name: 'Final Verdict',
    desc: 'Tüm analizleri birleştirerek nihai karar verir. GO, WAIT veya AVOID önerisi sunar.',
  },
};

// Document
const AnalysisReportDocument = ({ data }: { data: AnalysisReportData }) => {
  const isLong = data.tradePlan.direction === 'long';
  const score = Math.round((data.verdict.overallScore || 0) * 10);
  const verdictColor = getVerdictColor(data.verdict.action);
  const directionText = isLong ? 'LONG' : 'SHORT';
  const directionColor = isLong ? C.success : C.danger;

  return (
    <Document>
      {/* PAGE 1: Summary */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={[styles.logoText, { color: C.red }]}>Trade</Text>
            <Text style={[styles.logoText, { color: C.green }]}>Path</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.symbol}>{data.symbol}/USDT</Text>
            <Text style={styles.date}>{data.generatedAt}</Text>
          </View>
        </View>

        {/* Verdict Banner */}
        <View style={[styles.verdictBanner, { backgroundColor: verdictColor }]}>
          <View style={styles.verdictLeft}>
            <Text style={styles.verdictAction}>{data.verdict.action || 'ANALYZE'}</Text>
            <Text style={styles.verdictScore}>Score: {score}/100</Text>
          </View>
          <View style={styles.verdictRight}>
            <Text style={[styles.verdictDirection, { backgroundColor: directionColor }]}>
              {directionText}
            </Text>
          </View>
        </View>

        {/* Trade Plan */}
        <View style={styles.tradePlanBox}>
          <Text style={styles.tradePlanTitle}>Trade Plan</Text>
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
              <Text style={[styles.tradePlanPercent, { color: C.success }]}>+{(data.tradePlan.takeProfits?.[0]?.percentage || 0).toFixed(1)}%</Text>
            </View>
            <View style={styles.tradePlanItem}>
              <Text style={[styles.tradePlanLabel, { color: C.success }]}>TP2</Text>
              <Text style={[styles.tradePlanPrice, { color: C.success }]}>{formatPrice(data.tradePlan.takeProfits?.[1]?.price)}</Text>
              <Text style={[styles.tradePlanPercent, { color: C.success }]}>+{(data.tradePlan.takeProfits?.[1]?.percentage || 0).toFixed(1)}%</Text>
            </View>
            <View style={styles.tradePlanItem}>
              <Text style={[styles.tradePlanLabel, { color: C.success }]}>TP3</Text>
              <Text style={[styles.tradePlanPrice, { color: C.success }]}>{formatPrice(data.tradePlan.takeProfits?.[2]?.price)}</Text>
              <Text style={[styles.tradePlanPercent, { color: C.success }]}>+{(data.tradePlan.takeProfits?.[2]?.percentage || 0).toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        {/* Steps Overview */}
        <View style={styles.stepsSection}>
          <Text style={styles.stepsTitle}>7-Step Analysis Overview</Text>
          <View style={styles.stepsGrid}>
            {/* Step 1 */}
            <View style={[styles.stepCard, { borderLeftColor: getStepColor(1) }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepNumber}>1.</Text>
                <Text style={styles.stepName}>Market</Text>
                <Text style={[styles.stepBadge, { backgroundColor: data.marketPulse.trend?.direction === 'bullish' ? C.success : data.marketPulse.trend?.direction === 'bearish' ? C.danger : C.warning }]}>
                  {(data.marketPulse.trend?.direction || 'N').slice(0, 4).toUpperCase()}
                </Text>
              </View>
              <View style={styles.stepMetric}>
                <Text style={styles.stepMetricLabel}>Fear/Greed</Text>
                <Text style={styles.stepMetricValue}>{data.marketPulse.fearGreedIndex}</Text>
              </View>
            </View>

            {/* Step 2 */}
            <View style={[styles.stepCard, { borderLeftColor: getStepColor(2) }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepNumber}>2.</Text>
                <Text style={styles.stepName}>Asset</Text>
                <Text style={[styles.stepBadge, { backgroundColor: (data.assetScan.priceChange24h || 0) >= 0 ? C.success : C.danger }]}>
                  {(data.assetScan.priceChange24h || 0) >= 0 ? 'UP' : 'DOWN'}
                </Text>
              </View>
              <View style={styles.stepMetric}>
                <Text style={styles.stepMetricLabel}>RSI</Text>
                <Text style={styles.stepMetricValue}>{data.assetScan.indicators?.rsi?.toFixed(0) || '-'}</Text>
              </View>
            </View>

            {/* Step 3 */}
            <View style={[styles.stepCard, { borderLeftColor: getStepColor(3) }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepNumber}>3.</Text>
                <Text style={styles.stepName}>Safety</Text>
                <Text style={[styles.stepBadge, { backgroundColor: data.safetyCheck.riskLevel === 'low' ? C.success : data.safetyCheck.riskLevel === 'high' ? C.danger : C.warning }]}>
                  {(data.safetyCheck.riskLevel || 'MED').slice(0, 3).toUpperCase()}
                </Text>
              </View>
              <View style={styles.stepMetric}>
                <Text style={styles.stepMetricLabel}>Whale</Text>
                <Text style={styles.stepMetricValue}>{(data.safetyCheck.whaleActivity?.bias || '-').slice(0, 6)}</Text>
              </View>
            </View>

            {/* Step 4 */}
            <View style={[styles.stepCard, { borderLeftColor: getStepColor(4) }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepNumber}>4.</Text>
                <Text style={styles.stepName}>Timing</Text>
                <Text style={[styles.stepBadge, { backgroundColor: data.timing.tradeNow ? C.success : C.warning }]}>
                  {data.timing.tradeNow ? 'NOW' : 'WAIT'}
                </Text>
              </View>
              <View style={styles.stepMetric}>
                <Text style={[styles.stepMetricLabel, { flex: 1 }]} numberOfLines={1}>
                  {(data.timing.reason || '-').slice(0, 20)}
                </Text>
              </View>
            </View>

            {/* Step 5 */}
            <View style={[styles.stepCard, { borderLeftColor: getStepColor(5) }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepNumber}>5.</Text>
                <Text style={styles.stepName}>Plan</Text>
                <Text style={[styles.stepBadge, { backgroundColor: directionColor }]}>
                  {directionText}
                </Text>
              </View>
              <View style={styles.stepMetric}>
                <Text style={styles.stepMetricLabel}>R:R</Text>
                <Text style={styles.stepMetricValue}>{(data.tradePlan.riskReward || 0).toFixed(1)}:1</Text>
              </View>
            </View>

            {/* Step 6 */}
            <View style={[styles.stepCard, { borderLeftColor: getStepColor(6) }]}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepNumber}>6.</Text>
                <Text style={styles.stepName}>Traps</Text>
                <Text style={[styles.stepBadge, { backgroundColor: (data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? C.danger : C.success }]}>
                  {(data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? 'WARN' : 'OK'}
                </Text>
              </View>
              <View style={styles.stepMetric}>
                <Text style={styles.stepMetricLabel}>Fakeout</Text>
                <Text style={styles.stepMetricValue}>{(data.trapCheck?.traps?.fakeoutRisk || 'low').slice(0, 4)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* AI Summary */}
        {data.verdict.aiSummary && (
          <View style={styles.aiSummary}>
            <View style={styles.aiSummaryHeader}>
              <View style={styles.aiSummaryBadge}>
                <Text style={styles.aiSummaryBadgeText}>AI</Text>
              </View>
              <Text style={styles.aiSummaryTitle}>Analysis Summary</Text>
            </View>
            <Text style={styles.aiSummaryText}>
              {data.verdict.aiSummary.slice(0, 400)}{data.verdict.aiSummary.length > 400 ? '...' : ''}
            </Text>
          </View>
        )}

        {/* Risk Warning */}
        <View style={styles.riskWarning}>
          <Text style={styles.riskWarningText}>
            Bu rapor eğitim amaçlıdır ve yatırım tavsiyesi değildir. Kripto para piyasaları yüksek risk içerir.
            Yatırım kararlarınızı vermeden önce kendi araştırmanızı yapın.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>REPORT ID</Text>
              <Text style={styles.footerValue}>{data.analysisId?.slice(-12) || 'N/A'}</Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>CURRENT PRICE</Text>
              <Text style={styles.footerValue}>{formatPrice(data.assetScan.currentPrice)}</Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>WIN RATE EST.</Text>
              <Text style={styles.footerValue}>{data.tradePlan.winRateEstimate || 0}%</Text>
            </View>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.footerDisclaimer}>
              TradePath AI Analysis • Page 1/2
            </Text>
          </View>
        </View>
      </Page>

      {/* PAGE 2: Detailed Steps */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={[styles.logoText, { color: C.red }]}>Trade</Text>
            <Text style={[styles.logoText, { color: C.green }]}>Path</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.symbol}>{data.symbol}/USDT</Text>
            <Text style={styles.date}>Detailed Analysis</Text>
          </View>
        </View>

        {/* Detailed Steps */}
        <View style={styles.page2Section}>
          <Text style={styles.sectionTitle}>Step-by-Step Analysis Details</Text>

          {/* Step 1 */}
          <View style={[styles.stepExplanation, { borderLeftColor: getStepColor(1) }]}>
            <View style={styles.stepExplanationHeader}>
              <View style={[styles.stepExplanationNumber, { backgroundColor: getStepColor(1) }]}>
                <Text style={styles.stepExplanationNumberText}>1</Text>
              </View>
              <Text style={styles.stepExplanationTitle}>{STEP_EXPLANATIONS[1].name}</Text>
              <Text style={[styles.stepExplanationBadge, { backgroundColor: data.marketPulse.trend?.direction === 'bullish' ? C.success : data.marketPulse.trend?.direction === 'bearish' ? C.danger : C.warning }]}>
                {(data.marketPulse.trend?.direction || 'neutral').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.stepExplanationDesc}>{STEP_EXPLANATIONS[1].desc}</Text>
            <View style={styles.stepExplanationMetrics}>
              <View style={styles.stepExplanationMetric}>
                <Text style={styles.stepExplanationMetricLabel}>Fear & Greed Index</Text>
                <Text style={styles.stepExplanationMetricValue}>{data.marketPulse.fearGreedIndex} ({data.marketPulse.fearGreedLabel})</Text>
              </View>
              <View style={styles.stepExplanationMetric}>
                <Text style={styles.stepExplanationMetricLabel}>BTC Dominance</Text>
                <Text style={styles.stepExplanationMetricValue}>{data.marketPulse.btcDominance?.toFixed(1)}%</Text>
              </View>
              <View style={styles.stepExplanationMetric}>
                <Text style={styles.stepExplanationMetricLabel}>Trend Strength</Text>
                <Text style={styles.stepExplanationMetricValue}>{data.marketPulse.trend?.strength || 0}%</Text>
              </View>
            </View>
          </View>

          {/* Step 2 */}
          <View style={[styles.stepExplanation, { borderLeftColor: getStepColor(2) }]}>
            <View style={styles.stepExplanationHeader}>
              <View style={[styles.stepExplanationNumber, { backgroundColor: getStepColor(2) }]}>
                <Text style={styles.stepExplanationNumberText}>2</Text>
              </View>
              <Text style={styles.stepExplanationTitle}>{STEP_EXPLANATIONS[2].name}</Text>
              <Text style={[styles.stepExplanationBadge, { backgroundColor: (data.assetScan.priceChange24h || 0) >= 0 ? C.success : C.danger }]}>
                {(data.assetScan.priceChange24h || 0) >= 0 ? 'BULLISH' : 'BEARISH'}
              </Text>
            </View>
            <Text style={styles.stepExplanationDesc}>{STEP_EXPLANATIONS[2].desc}</Text>
            <View style={styles.stepExplanationMetrics}>
              <View style={styles.stepExplanationMetric}>
                <Text style={styles.stepExplanationMetricLabel}>Current Price</Text>
                <Text style={styles.stepExplanationMetricValue}>{formatPrice(data.assetScan.currentPrice)}</Text>
              </View>
              <View style={styles.stepExplanationMetric}>
                <Text style={styles.stepExplanationMetricLabel}>24h Change</Text>
                <Text style={[styles.stepExplanationMetricValue, { color: (data.assetScan.priceChange24h || 0) >= 0 ? C.success : C.danger }]}>
                  {(data.assetScan.priceChange24h || 0).toFixed(2)}%
                </Text>
              </View>
              <View style={styles.stepExplanationMetric}>
                <Text style={styles.stepExplanationMetricLabel}>RSI (14)</Text>
                <Text style={styles.stepExplanationMetricValue}>{data.assetScan.indicators?.rsi?.toFixed(1) || '-'}</Text>
              </View>
            </View>
          </View>

          {/* Step 3 */}
          <View style={[styles.stepExplanation, { borderLeftColor: getStepColor(3) }]}>
            <View style={styles.stepExplanationHeader}>
              <View style={[styles.stepExplanationNumber, { backgroundColor: getStepColor(3) }]}>
                <Text style={styles.stepExplanationNumberText}>3</Text>
              </View>
              <Text style={styles.stepExplanationTitle}>{STEP_EXPLANATIONS[3].name}</Text>
              <Text style={[styles.stepExplanationBadge, { backgroundColor: data.safetyCheck.riskLevel === 'low' ? C.success : data.safetyCheck.riskLevel === 'high' ? C.danger : C.warning }]}>
                {(data.safetyCheck.riskLevel || 'MEDIUM').toUpperCase()} RISK
              </Text>
            </View>
            <Text style={styles.stepExplanationDesc}>{STEP_EXPLANATIONS[3].desc}</Text>
            <View style={styles.stepExplanationMetrics}>
              <View style={styles.stepExplanationMetric}>
                <Text style={styles.stepExplanationMetricLabel}>Whale Activity</Text>
                <Text style={styles.stepExplanationMetricValue}>{data.safetyCheck.whaleActivity?.bias || '-'}</Text>
              </View>
              <View style={styles.stepExplanationMetric}>
                <Text style={styles.stepExplanationMetricLabel}>Pump/Dump Risk</Text>
                <Text style={styles.stepExplanationMetricValue}>{data.safetyCheck.manipulation?.pumpDumpRisk || '-'}</Text>
              </View>
            </View>
          </View>

          {/* Step 4 */}
          <View style={[styles.stepExplanation, { borderLeftColor: getStepColor(4) }]}>
            <View style={styles.stepExplanationHeader}>
              <View style={[styles.stepExplanationNumber, { backgroundColor: getStepColor(4) }]}>
                <Text style={styles.stepExplanationNumberText}>4</Text>
              </View>
              <Text style={styles.stepExplanationTitle}>{STEP_EXPLANATIONS[4].name}</Text>
              <Text style={[styles.stepExplanationBadge, { backgroundColor: data.timing.tradeNow ? C.success : C.warning }]}>
                {data.timing.tradeNow ? 'TRADE NOW' : 'WAIT'}
              </Text>
            </View>
            <Text style={styles.stepExplanationDesc}>{STEP_EXPLANATIONS[4].desc}</Text>
            <View style={styles.stepExplanationMetrics}>
              <View style={[styles.stepExplanationMetric, { flex: 1 }]}>
                <Text style={styles.stepExplanationMetricLabel}>Reason</Text>
                <Text style={styles.stepExplanationMetricValue}>{data.timing.reason || '-'}</Text>
              </View>
            </View>
          </View>

          {/* Step 5 */}
          <View style={[styles.stepExplanation, { borderLeftColor: getStepColor(5) }]}>
            <View style={styles.stepExplanationHeader}>
              <View style={[styles.stepExplanationNumber, { backgroundColor: getStepColor(5) }]}>
                <Text style={styles.stepExplanationNumberText}>5</Text>
              </View>
              <Text style={styles.stepExplanationTitle}>{STEP_EXPLANATIONS[5].name}</Text>
              <Text style={[styles.stepExplanationBadge, { backgroundColor: directionColor }]}>
                {directionText} POSITION
              </Text>
            </View>
            <Text style={styles.stepExplanationDesc}>{STEP_EXPLANATIONS[5].desc}</Text>
            <View style={styles.stepExplanationMetrics}>
              <View style={styles.stepExplanationMetric}>
                <Text style={styles.stepExplanationMetricLabel}>Risk/Reward</Text>
                <Text style={styles.stepExplanationMetricValue}>{(data.tradePlan.riskReward || 0).toFixed(2)}:1</Text>
              </View>
              <View style={styles.stepExplanationMetric}>
                <Text style={styles.stepExplanationMetricLabel}>Win Rate Est.</Text>
                <Text style={styles.stepExplanationMetricValue}>{data.tradePlan.winRateEstimate || 0}%</Text>
              </View>
              <View style={styles.stepExplanationMetric}>
                <Text style={styles.stepExplanationMetricLabel}>Entry Price</Text>
                <Text style={styles.stepExplanationMetricValue}>{formatPrice(data.tradePlan.averageEntry)}</Text>
              </View>
            </View>
          </View>

          {/* Step 6 */}
          <View style={[styles.stepExplanation, { borderLeftColor: getStepColor(6) }]}>
            <View style={styles.stepExplanationHeader}>
              <View style={[styles.stepExplanationNumber, { backgroundColor: getStepColor(6) }]}>
                <Text style={styles.stepExplanationNumberText}>6</Text>
              </View>
              <Text style={styles.stepExplanationTitle}>{STEP_EXPLANATIONS[6].name}</Text>
              <Text style={[styles.stepExplanationBadge, { backgroundColor: (data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? C.danger : C.success }]}>
                {(data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap) ? 'WARNING' : 'CLEAR'}
              </Text>
            </View>
            <Text style={styles.stepExplanationDesc}>{STEP_EXPLANATIONS[6].desc}</Text>
            <View style={styles.stepExplanationMetrics}>
              <View style={styles.stepExplanationMetric}>
                <Text style={styles.stepExplanationMetricLabel}>Bull Trap</Text>
                <Text style={[styles.stepExplanationMetricValue, { color: data.trapCheck?.traps?.bullTrap ? C.danger : C.success }]}>
                  {data.trapCheck?.traps?.bullTrap ? 'DETECTED' : 'None'}
                </Text>
              </View>
              <View style={styles.stepExplanationMetric}>
                <Text style={styles.stepExplanationMetricLabel}>Bear Trap</Text>
                <Text style={[styles.stepExplanationMetricValue, { color: data.trapCheck?.traps?.bearTrap ? C.danger : C.success }]}>
                  {data.trapCheck?.traps?.bearTrap ? 'DETECTED' : 'None'}
                </Text>
              </View>
              <View style={styles.stepExplanationMetric}>
                <Text style={styles.stepExplanationMetricLabel}>Fakeout Risk</Text>
                <Text style={styles.stepExplanationMetricValue}>{data.trapCheck?.traps?.fakeoutRisk || 'Low'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* AI Expert Comment */}
        {data.aiExpertComment && (
          <View style={styles.aiSummary}>
            <View style={styles.aiSummaryHeader}>
              <View style={styles.aiSummaryBadge}>
                <Text style={styles.aiSummaryBadgeText}>AI EXPERT</Text>
              </View>
              <Text style={styles.aiSummaryTitle}>Expert Analysis</Text>
            </View>
            <Text style={styles.aiSummaryText}>{data.aiExpertComment}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>GENERATED</Text>
              <Text style={styles.footerValue}>{data.generatedAt}</Text>
            </View>
            <View style={styles.footerItem}>
              <Text style={styles.footerLabel}>POWERED BY</Text>
              <Text style={styles.footerValue}>Gemini 2.5 Flash AI</Text>
            </View>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.footerDisclaimer}>
              TradePath AI Analysis • Page 2/2
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

// Export function - simplified without chart capture
export async function generateAnalysisReport(data: AnalysisReportData): Promise<void> {
  const blob = await pdf(<AnalysisReportDocument data={data} />).toBlob();
  const filename = `TradePath_${data.symbol}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, filename);
}

export { AnalysisReportDocument };
export type { AnalysisReportData };
