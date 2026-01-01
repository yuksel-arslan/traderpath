'use client';

// ===========================================
// Analysis Report PDF Generator
// Professional AI-based trading report
// Each analysis step on separate page with AI commentary
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
import { getPDFTranslations, type PDFTranslations } from './pdf-translations';

// Styles - using Helvetica (built-in PDF font)
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
    paddingBottom: 80,
    fontFamily: 'Helvetica',
  },
  // Cover Page
  coverPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 48,
    fontWeight: 700,
    color: '#3b82f6',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 60,
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 10,
  },
  coverSymbol: {
    fontSize: 24,
    fontWeight: 600,
    color: '#3b82f6',
    marginBottom: 40,
  },
  coverMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 5,
  },
  verdictBadge: {
    marginTop: 40,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8,
  },
  verdictText: {
    fontSize: 24,
    fontWeight: 700,
    color: '#ffffff',
  },
  scoreText: {
    fontSize: 18,
    color: '#ffffff',
    marginTop: 5,
  },
  // Content Pages
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLogo: {
    fontSize: 16,
    fontWeight: 700,
    color: '#3b82f6',
  },
  headerSymbol: {
    fontSize: 12,
    color: '#6b7280',
  },
  stepBadge: {
    backgroundColor: '#3b82f6',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  stepBadgeText: {
    fontSize: 10,
    fontWeight: 600,
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  label: {
    fontSize: 11,
    color: '#6b7280',
  },
  value: {
    fontSize: 11,
    fontWeight: 600,
    color: '#111827',
  },
  valueGreen: {
    fontSize: 11,
    fontWeight: 600,
    color: '#10b981',
  },
  valueRed: {
    fontSize: 11,
    fontWeight: 600,
    color: '#ef4444',
  },
  valueYellow: {
    fontSize: 11,
    fontWeight: 600,
    color: '#f59e0b',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },
  gridItem: {
    width: '50%',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  gridItemThird: {
    width: '33.33%',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  gridItemFourth: {
    width: '25%',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  miniCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 10,
  },
  miniCardLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 3,
  },
  miniCardValue: {
    fontSize: 14,
    fontWeight: 600,
    color: '#111827',
  },
  // AI Commentary - prominent section
  aiCommentary: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 15,
    marginTop: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  aiTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1d4ed8',
    marginBottom: 8,
  },
  aiIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  aiText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
  },
  // Trade Plan visual
  tradePlanVisual: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
  },
  levelBar: {
    height: 30,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginVertical: 10,
    position: 'relative',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  entryLabel: {
    width: 60,
    fontSize: 11,
    fontWeight: 600,
    color: '#10b981',
  },
  entryPrice: {
    flex: 1,
    fontSize: 12,
    fontWeight: 600,
    color: '#111827',
  },
  entryPercent: {
    fontSize: 10,
    color: '#6b7280',
  },
  stopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  tpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  // Footer with disclaimer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
  },
  footerDisclaimer: {
    fontSize: 7,
    color: '#9ca3af',
    lineHeight: 1.4,
    textAlign: 'center',
  },
  poweredBy: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 30,
  },
  geminiLogo: {
    fontSize: 14,
    fontWeight: 700,
    color: '#4285F4',
  },
  disclaimer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  disclaimerTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: '#92400e',
    marginBottom: 5,
  },
  disclaimerText: {
    fontSize: 9,
    color: '#92400e',
    lineHeight: 1.5,
  },
  bullet: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  bulletPoint: {
    width: 15,
    fontSize: 10,
    color: '#6b7280',
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    color: '#374151',
  },
  // Key insight box
  keyInsight: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  keyInsightTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: '#92400e',
    marginBottom: 5,
  },
  keyInsightText: {
    fontSize: 9,
    color: '#78350f',
    lineHeight: 1.5,
  },
});

// Helper function to format price
function formatPrice(price: number): string {
  if (!price) return '$0';
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  if (price >= 0.01) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(8)}`;
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
    marketRegime: string;
    trend: { direction: string; strength: number };
    aiSummary?: string;
  };
  assetScan: {
    currentPrice: number;
    priceChange24h: number;
    timeframes: Array<{ tf: string; trend: string; strength: number }>;
    levels: { support: number[]; resistance: number[] };
    indicators: {
      rsi: number;
      macd: { histogram: number };
    };
    aiInsight?: string;
  };
  safetyCheck: {
    riskLevel: string;
    manipulation: { pumpDumpRisk: string };
    whaleActivity: { bias: string };
    smartMoney: { positioning: string };
    warnings: string[];
    aiInsight?: string;
  };
  timing: {
    tradeNow: boolean;
    reason: string;
    entryZones: Array<{ priceLow: number; priceHigh: number; probability: number; eta: string }>;
    conditions: Array<{ name: string; met: boolean }>;
    aiInsight?: string;
  };
  tradePlan: {
    direction: string;
    entries: Array<{ price: number; percentage: number; type: string }>;
    averageEntry: number;
    stopLoss: { price: number; percentage: number; reason: string };
    takeProfits: Array<{ price: number; percentage: number; reason: string }>;
    riskReward: number;
    winRateEstimate: number;
    positionSizePercent: number;
    aiInsight?: string;
  };
  trapCheck: {
    traps: {
      bullTrap: boolean;
      bearTrap: boolean;
      fakeoutRisk: string;
    };
    liquidityGrab: { zones: number[] };
    counterStrategy: string[];
    aiInsight?: string;
  };
  verdict: {
    action: string;
    overallScore: number;
    confidenceFactors: Array<{ factor: string; positive: boolean }>;
    aiSummary?: string;
  };
}


// AI Educational Commentary Generator Functions
function generateMarketPulseEducation(data: AnalysisReportData): string {
  const fg = data.marketPulse.fearGreedIndex;
  const btcDom = data.marketPulse.btcDominance;
  const trend = data.marketPulse.trend?.direction || 'neutral';

  let commentary = '';

  if (fg <= 25) {
    commentary += `Market is in extreme fear zone (${fg}). Historically, these levels can create good opportunities for long-term buyers. However, the decline may continue, a gradual entry strategy is recommended. `;
  } else if (fg >= 75) {
    commentary += `Market is in extreme greed zone (${fg}). These levels are often observed before corrections. Consider profit-taking rather than opening new positions. `;
  } else {
    commentary += `Market sentiment is at balanced levels (${fg}). Neither extreme fear nor greed is dominant. `;
  }

  if (btcDom > 55) {
    commentary += `Bitcoin dominance is high (${btcDom?.toFixed(1)}%), this is a period when altcoins show weak performance against BTC. `;
  } else if (btcDom < 45) {
    commentary += `Bitcoin dominance is low (${btcDom?.toFixed(1)}%), could be altcoin season. `;
  }

  if (trend === 'bullish') {
    commentary += `Overall trend is bullish. Trading with the trend is advantageous in terms of risk/reward.`;
  } else if (trend === 'bearish') {
    commentary += `Overall trend is bearish. Short positions or staying on the sidelines could be considered.`;
  }

  return commentary;
}

function generateAssetScanEducation(data: AnalysisReportData): string {
  const rsi = data.assetScan.indicators?.rsi || 50;
  const price = data.assetScan.currentPrice;
  const change = data.assetScan.priceChange24h || 0;
  const supports = data.assetScan.levels?.support || [];
  const resistances = data.assetScan.levels?.resistance || [];

  let commentary = '';

  if (rsi > 70) {
    commentary += `RSI is in overbought zone (${rsi.toFixed(1)}). Price may correct in the short term. Be cautious with new purchases. `;
  } else if (rsi < 30) {
    commentary += `RSI is in oversold zone (${rsi.toFixed(1)}). Potential bottom reversal signal. Gradual buying strategy can be applied. `;
  } else if (rsi > 50 && rsi < 70) {
    commentary += `RSI (${rsi.toFixed(1)}) shows upward momentum but not yet in overbought zone. `;
  } else {
    commentary += `RSI (${rsi.toFixed(1)}) is trading in neutral zones. `;
  }

  if (supports.length > 0) {
    const nearestSupport = supports[0];
    const distToSupport = ((price - nearestSupport) / price) * 100;
    commentary += `Nearest support is at ${formatPrice(nearestSupport)}, ${distToSupport.toFixed(1)}% away from price. `;
  }

  if (resistances.length > 0) {
    const nearestResistance = resistances[0];
    const distToResistance = ((nearestResistance - price) / price) * 100;
    commentary += `Nearest resistance is at ${formatPrice(nearestResistance)}, ${distToResistance.toFixed(1)}% above price.`;
  }

  return commentary;
}

function generateSafetyCheckEducation(data: AnalysisReportData): string {
  const risk = data.safetyCheck.riskLevel;
  const pumpDump = data.safetyCheck.manipulation?.pumpDumpRisk;
  const whale = data.safetyCheck.whaleActivity?.bias;
  const smartMoney = data.safetyCheck.smartMoney?.positioning;

  let commentary = '';

  if (risk === 'high') {
    commentary += `Risk level is HIGH. It is recommended to reduce position size to 50% of normal and keep stop-loss levels tighter. `;
  } else if (risk === 'medium') {
    commentary += `Risk level is MEDIUM. Trading with normal position size is possible, but stop-loss must be used. `;
  } else {
    commentary += `Risk level is LOW. Conditions appear favorable for trading. `;
  }

  if (pumpDump === 'high') {
    commentary += `Pump-dump risk is high! Be careful of sudden price movements. Use limit orders. `;
  }

  if (whale === 'accumulating') {
    commentary += `Whales are accumulating - potential bullish signal. `;
  } else if (whale === 'distributing') {
    commentary += `Whales are distributing - potential bearish risk. `;
  }

  if (smartMoney === 'long') {
    commentary += `Smart money is in long position. Institutional interest is positive.`;
  } else if (smartMoney === 'short') {
    commentary += `Smart money is in short position. Be cautious.`;
  }

  return commentary;
}

function generateTimingEducation(data: AnalysisReportData): string {
  const tradeNow = data.timing.tradeNow;
  const zones = data.timing.entryZones || [];
  const conditions = data.timing.conditions || [];

  let commentary = '';

  if (tradeNow) {
    commentary += `Suitable conditions for trading now exist. `;
  } else {
    commentary += `Trading is not recommended now. Waiting for better entry levels makes sense. `;
  }

  const metConditions = conditions.filter(c => c.met).length;
  const totalConditions = conditions.length;

  if (totalConditions > 0) {
    commentary += `${metConditions}/${totalConditions} entry conditions are met. `;
    if (metConditions < totalConditions / 2) {
      commentary += `Most conditions are not yet met, patience is recommended. `;
    }
  }

  if (zones.length > 0) {
    const bestZone = zones[0];
    commentary += `Best entry zone is in the range of ${formatPrice(bestZone.priceLow)} - ${formatPrice(bestZone.priceHigh)}, with ${bestZone.probability}% probability.`;
  }

  return commentary;
}

function generateTradePlanEducation(data: AnalysisReportData): string {
  const plan = data.tradePlan;
  const direction = plan.direction;
  const entries = plan.entries || [];
  const stopLoss = plan.stopLoss;
  const takeProfits = plan.takeProfits || [];
  const rr = plan.riskReward || 0;

  let commentary = '';

  commentary += `**WHY WERE THESE LEVELS SELECTED?**\n\n`;

  // Entry explanation
  if (entries.length > 0) {
    commentary += `ENTRY LEVELS: `;
    if (entries.length > 1) {
      commentary += `${entries.length} staged entries are recommended. This strategy (DCA) divides the position at different levels rather than taking the entire position at once. `;
      commentary += `Average entry price is calculated as ${formatPrice(plan.averageEntry)}. `;
    } else {
      commentary += `Single entry point is set at ${formatPrice(entries[0].price)}. `;
    }
    commentary += `These levels are based on technical support/resistance, momentum and volume analysis.\n\n`;
  }

  // Stop loss explanation
  if (stopLoss) {
    const slPercent = Math.abs(stopLoss.percentage || 0);
    commentary += `STOP LOSS: ${formatPrice(stopLoss.price)} (-${slPercent.toFixed(2)}%) - `;
    if (stopLoss.reason) {
      commentary += `${stopLoss.reason} `;
    } else {
      if (direction === 'long') {
        commentary += `This level is below the nearest strong support. Breaking this level could signal a trend reversal. `;
      } else {
        commentary += `This level is above the nearest strong resistance. `;
      }
    }
    commentary += `Using stop-loss is MANDATORY to protect capital.\n\n`;
  }

  // Take profit explanation
  if (takeProfits.length > 0) {
    commentary += `TAKE PROFIT TARGETS: `;
    takeProfits.forEach((tp, i) => {
      commentary += `TP${i+1}: ${formatPrice(tp.price)} (+${tp.percentage?.toFixed(1)}%) `;
    });
    commentary += `\nGradual profit-taking is recommended: close part of your position at each target.\n\n`;
  }

  // Risk/Reward explanation
  commentary += `RISK/REWARD RATIO: ${rr.toFixed(2)}:1 - `;
  if (rr >= 3) {
    commentary += `Excellent risk/reward ratio! This trade has high positive expectancy.`;
  } else if (rr >= 2) {
    commentary += `Good risk/reward ratio. Professional traders typically look for at least 2:1 ratio.`;
  } else if (rr >= 1) {
    commentary += `Acceptable risk/reward ratio but not ideal.`;
  } else {
    commentary += `Low risk/reward ratio. This trade may not be recommended.`;
  }

  return commentary;
}

function generateTrapCheckEducation(data: AnalysisReportData): string {
  const traps = data.trapCheck.traps;
  const strategies = data.trapCheck.counterStrategy || [];

  let commentary = '';

  commentary += `TRAP ANALYSIS: `;

  if (traps?.bullTrap) {
    commentary += `BULL TRAP RISK DETECTED! Price may appear to have broken upward but this could be fake. Wait for confirmation. `;
  }

  if (traps?.bearTrap) {
    commentary += `BEAR TRAP RISK DETECTED! Price may appear to have broken downward but this could be fake. Don't panic sell. `;
  }

  if (traps?.fakeoutRisk === 'high') {
    commentary += `Fakeout risk is high. Instead of immediately trading on breakouts, wait for at least a 4-hour candle close. `;
  }

  if (!traps?.bullTrap && !traps?.bearTrap && traps?.fakeoutRisk !== 'high') {
    commentary += `No significant trap risk detected. Trading with normal caution is possible. `;
  }

  if (strategies.length > 0) {
    commentary += `\n\nPROTECTION STRATEGIES:\n`;
    strategies.forEach((s, i) => {
      commentary += `${i+1}. ${s}\n`;
    });
  }

  return commentary;
}

function generateVerdictEducation(data: AnalysisReportData): string {
  const verdict = data.verdict;
  const score = verdict.overallScore || 0;
  const action = verdict.action?.toLowerCase() || '';
  const positives = (verdict.confidenceFactors || []).filter(f => f.positive);
  const negatives = (verdict.confidenceFactors || []).filter(f => !f.positive);

  let commentary = '';

  commentary += `OVERALL ASSESSMENT: `;

  if (score >= 8) {
    commentary += `Very strong signal (${score}/10). Most indicators are pointing in the same direction. `;
  } else if (score >= 6) {
    commentary += `Good signal (${score}/10). Positive factors dominate but there are some risks. `;
  } else if (score >= 4) {
    commentary += `Neutral signal (${score}/10). No clear direction is evident. Waiting might be wise. `;
  } else {
    commentary += `Weak or negative signal (${score}/10). Trading is not recommended. `;
  }

  if (positives.length > 0) {
    commentary += `\n\nSTRENGTHS: `;
    positives.forEach(p => {
      commentary += `${p.factor}; `;
    });
  }

  if (negatives.length > 0) {
    commentary += `\n\nRISK FACTORS: `;
    negatives.forEach(n => {
      commentary += `${n.factor}; `;
    });
  }

  commentary += `\n\nRESULT: ${verdict.action}`;

  return commentary;
}

// Reusable Footer Component
const PageFooter = ({ pageNumber, t }: { pageNumber: number; t: PDFTranslations }) => (
  <View style={styles.footer}>
    <View style={styles.footerRow}>
      <Text style={styles.footerText}>{t.footerTitle}</Text>
      <Text style={styles.footerText}>{t.footerPowered}</Text>
      <Text style={styles.footerText}>{t.page} {pageNumber}</Text>
    </View>
    <Text style={styles.footerDisclaimer}>{t.disclaimer}</Text>
  </View>
);

// AI Commentary Section Component
const AICommentary = ({ title, content }: { title: string; content: string }) => (
  <View style={styles.aiCommentary}>
    <Text style={styles.aiTitle}>{title}</Text>
    <Text style={styles.aiText}>{content}</Text>
  </View>
);

// PDF Document Component - Each step on separate page
const AnalysisReportDocument = ({ data, t }: { data: AnalysisReportData; t: PDFTranslations }) => {
  const getVerdictColor = () => {
    const action = data.verdict.action?.toLowerCase() || '';
    if (action.includes('go') && !action.includes('avoid')) return '#10b981';
    if (action.includes('avoid')) return '#ef4444';
    return '#f59e0b';
  };

  return (
    <Document>
      {/* Page 1: Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.logo}>{t.title}</Text>
          <Text style={styles.subtitle}>{t.subtitle}</Text>

          <Text style={styles.coverTitle}>{t.reportTitle}</Text>
          <Text style={styles.coverSymbol}>{data.symbol}/USDT</Text>

          <Text style={styles.coverMeta}>{t.generatedAt} {data.generatedAt}</Text>
          <Text style={styles.coverMeta}>{t.analysisId} {data.analysisId}</Text>

          <View style={[styles.verdictBadge, { backgroundColor: getVerdictColor() }]}>
            <Text style={styles.verdictText}>{data.verdict.action}</Text>
            <Text style={styles.scoreText}>{t.score} {data.verdict.overallScore}/10</Text>
          </View>

          {/* Powered by Gemini */}
          <Text style={styles.poweredBy}>{t.poweredBy}</Text>
          <Text style={styles.geminiLogo}>Google Gemini 2.5 Flash</Text>
        </View>

        <PageFooter pageNumber={1} t={t} />
      </Page>

      {/* Page 2: Step 1 - Market Pulse */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} {t.reportTitle}</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{t.step} 1 {t.of} 7</Text>
        </View>
        <Text style={styles.sectionTitle}>{t.marketPulse}</Text>
        <Text style={styles.sectionSubtitle}>{t.marketPulseDesc}</Text>

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.btcDominance}</Text>
              <Text style={styles.miniCardValue}>{data.marketPulse.btcDominance?.toFixed(1) || 0}%</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.fearGreed}</Text>
              <Text style={styles.miniCardValue}>{data.marketPulse.fearGreedIndex || 0} ({data.marketPulse.fearGreedLabel || 'N/A'})</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.marketRegime}</Text>
              <Text style={styles.miniCardValue}>{data.marketPulse.marketRegime || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.trend}</Text>
              <Text style={styles.miniCardValue}>{data.marketPulse.trend?.direction || 'N/A'} ({data.marketPulse.trend?.strength || 0}%)</Text>
            </View>
          </View>
        </View>

        <AICommentary
          title={t.aiMarketPulse}
          content={data.marketPulse.aiSummary || generateMarketPulseEducation(data)}
        />

        <PageFooter pageNumber={2} t={t} />
      </Page>

      {/* Page 3: Step 2 - Asset Scan */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} {t.reportTitle}</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{t.step} 2 {t.of} 7</Text>
        </View>
        <Text style={styles.sectionTitle}>{t.assetScan}</Text>
        <Text style={styles.sectionSubtitle}>{t.assetScanDesc} {data.symbol}</Text>

        <View style={styles.grid}>
          <View style={styles.gridItemFourth}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.currentPrice}</Text>
              <Text style={styles.miniCardValue}>{formatPrice(data.assetScan.currentPrice)}</Text>
            </View>
          </View>
          <View style={styles.gridItemFourth}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.change24h}</Text>
              <Text style={[styles.miniCardValue, { color: (data.assetScan.priceChange24h || 0) >= 0 ? '#10b981' : '#ef4444' }]}>
                {(data.assetScan.priceChange24h || 0) >= 0 ? '+' : ''}{(data.assetScan.priceChange24h || 0).toFixed(2)}%
              </Text>
            </View>
          </View>
          <View style={styles.gridItemFourth}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.rsi}</Text>
              <Text style={styles.miniCardValue}>{data.assetScan.indicators?.rsi?.toFixed(1) || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.gridItemFourth}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.macd}</Text>
              <Text style={styles.miniCardValue}>{(data.assetScan.indicators?.macd?.histogram || 0) > 0 ? t.positive : t.negative}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.supportResistance}</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t.support}</Text>
            <Text style={styles.valueGreen}>{data.assetScan.levels?.support?.slice(0, 3).map(s => formatPrice(s)).join(' / ') || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t.resistance}</Text>
            <Text style={styles.valueRed}>{data.assetScan.levels?.resistance?.slice(0, 3).map(r => formatPrice(r)).join(' / ') || 'N/A'}</Text>
          </View>
        </View>

        <AICommentary
          title={t.aiAssetScan}
          content={data.assetScan.aiInsight || generateAssetScanEducation(data)}
        />

        <PageFooter pageNumber={3} t={t} />
      </Page>

      {/* Page 4: Step 3 - Safety Check */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} {t.reportTitle}</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{t.step} 3 {t.of} 7</Text>
        </View>
        <Text style={styles.sectionTitle}>{t.safetyCheck}</Text>
        <Text style={styles.sectionSubtitle}>{t.safetyCheckDesc}</Text>

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.riskLevel}</Text>
              <Text style={[styles.miniCardValue, {
                color: data.safetyCheck.riskLevel === 'high' ? '#ef4444' :
                       data.safetyCheck.riskLevel === 'medium' ? '#f59e0b' : '#10b981'
              }]}>{(data.safetyCheck.riskLevel || 'N/A').toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.pumpDumpRisk}</Text>
              <Text style={styles.miniCardValue}>{(data.safetyCheck.manipulation?.pumpDumpRisk || 'N/A').toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.whaleActivity}</Text>
              <Text style={styles.miniCardValue}>{(data.safetyCheck.whaleActivity?.bias || 'N/A').toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.smartMoney}</Text>
              <Text style={styles.miniCardValue}>{(data.safetyCheck.smartMoney?.positioning || 'N/A').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {data.safetyCheck.warnings && data.safetyCheck.warnings.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.warnings}</Text>
            {data.safetyCheck.warnings.map((warning, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletPoint}>!</Text>
                <Text style={styles.bulletText}>{warning}</Text>
              </View>
            ))}
          </View>
        )}

        <AICommentary
          title={t.aiSafetyCheck}
          content={data.safetyCheck.aiInsight || generateSafetyCheckEducation(data)}
        />

        <PageFooter pageNumber={4} t={t} />
      </Page>

      {/* Page 5: Step 4 - Timing */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} {t.reportTitle}</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{t.step} 4 {t.of} 7</Text>
        </View>
        <Text style={styles.sectionTitle}>{t.timing}</Text>
        <Text style={styles.sectionSubtitle}>{t.timingDesc}</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.tradeNow} {data.timing.tradeNow ? t.yes : t.no}</Text>
          <Text style={styles.aiText}>{data.timing.reason || 'N/A'}</Text>
        </View>

        {data.timing.entryZones && data.timing.entryZones.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.entryZones}</Text>
            {data.timing.entryZones.map((zone, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.label}>{t.zone} {i + 1} ({zone.eta || 'N/A'})</Text>
                <Text style={styles.value}>{formatPrice(zone.priceLow)} - {formatPrice(zone.priceHigh)} (%{zone.probability || 0})</Text>
              </View>
            ))}
          </View>
        )}

        {data.timing.conditions && data.timing.conditions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.entryConditions}</Text>
            {data.timing.conditions.map((cond, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.label}>{cond.name}</Text>
                <Text style={cond.met ? styles.valueGreen : styles.valueRed}>{cond.met ? t.met : t.notMet}</Text>
              </View>
            ))}
          </View>
        )}

        <AICommentary
          title={t.aiTiming}
          content={data.timing.aiInsight || generateTimingEducation(data)}
        />

        <PageFooter pageNumber={5} t={t} />
      </Page>

      {/* Page 6: Step 5 - Trade Plan (DETAILED) */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} {t.reportTitle}</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{t.step} 5 {t.of} 7</Text>
        </View>
        <Text style={styles.sectionTitle}>{t.tradePlan}</Text>
        <Text style={styles.sectionSubtitle}>{t.tradePlanDesc}</Text>

        <View style={styles.grid}>
          <View style={styles.gridItemFourth}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.direction}</Text>
              <Text style={[styles.miniCardValue, { color: data.tradePlan.direction === 'long' ? '#10b981' : '#ef4444' }]}>
                {(data.tradePlan.direction || 'N/A').toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.gridItemFourth}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.riskReward}</Text>
              <Text style={styles.miniCardValue}>{(data.tradePlan.riskReward || 0).toFixed(1)}:1</Text>
            </View>
          </View>
          <View style={styles.gridItemFourth}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.winRate}</Text>
              <Text style={styles.miniCardValue}>{data.tradePlan.winRateEstimate || 0}%</Text>
            </View>
          </View>
          <View style={styles.gridItemFourth}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.position}</Text>
              <Text style={styles.miniCardValue}>{(data.tradePlan.positionSizePercent || 0).toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.entryLevels}</Text>
          {data.tradePlan.entries?.map((entry, i) => (
            <View key={i} style={styles.entryRow}>
              <Text style={styles.entryLabel}>E{i + 1}</Text>
              <Text style={styles.entryPrice}>{formatPrice(entry.price)}</Text>
              <Text style={styles.entryPercent}>{entry.percentage}% ({entry.type})</Text>
            </View>
          ))}
          <View style={styles.row}>
            <Text style={styles.label}>{t.averageEntry}</Text>
            <Text style={styles.value}>{formatPrice(data.tradePlan.averageEntry)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.stopLoss}</Text>
          <View style={styles.stopRow}>
            <Text style={[styles.entryLabel, { color: '#ef4444' }]}>SL</Text>
            <Text style={styles.entryPrice}>{formatPrice(data.tradePlan.stopLoss?.price)}</Text>
            <Text style={styles.entryPercent}>-{(data.tradePlan.stopLoss?.percentage || 0).toFixed(2)}%</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.profitTargets}</Text>
          {data.tradePlan.takeProfits?.map((tp, i) => (
            <View key={i} style={styles.tpRow}>
              <Text style={[styles.entryLabel, { color: '#10b981' }]}>TP{i + 1}</Text>
              <Text style={styles.entryPrice}>{formatPrice(tp.price)}</Text>
              <Text style={styles.entryPercent}>+{tp.percentage?.toFixed(1)}%</Text>
            </View>
          ))}
        </View>

        <PageFooter pageNumber={6} t={t} />
      </Page>

      {/* Page 7: Trade Plan - AI Explanation */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} {t.reportTitle}</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{t.step} 5 {t.of} 7 - {t.continued}</Text>
        </View>
        <Text style={styles.sectionTitle}>{t.tradePlanExplanation}</Text>
        <Text style={styles.sectionSubtitle}>{t.whyTheseLevels}</Text>

        <AICommentary
          title={t.aiTradePlan}
          content={data.tradePlan.aiInsight || generateTradePlanEducation(data)}
        />

        <View style={styles.keyInsight}>
          <Text style={styles.keyInsightTitle}>{t.importantReminder}</Text>
          <Text style={styles.keyInsightText}>{t.reminderText}</Text>
        </View>

        <PageFooter pageNumber={7} t={t} />
      </Page>

      {/* Page 8: Step 6 - Trap Check */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} {t.reportTitle}</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{t.step} 6 {t.of} 7</Text>
        </View>
        <Text style={styles.sectionTitle}>{t.trapCheck}</Text>
        <Text style={styles.sectionSubtitle}>{t.trapCheckDesc}</Text>

        <View style={styles.grid}>
          <View style={styles.gridItemThird}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.bullTrap}</Text>
              <Text style={[styles.miniCardValue, { color: data.trapCheck.traps?.bullTrap ? '#ef4444' : '#10b981' }]}>
                {data.trapCheck.traps?.bullTrap ? t.detected : t.none}
              </Text>
            </View>
          </View>
          <View style={styles.gridItemThird}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.bearTrap}</Text>
              <Text style={[styles.miniCardValue, { color: data.trapCheck.traps?.bearTrap ? '#ef4444' : '#10b981' }]}>
                {data.trapCheck.traps?.bearTrap ? t.detected : t.none}
              </Text>
            </View>
          </View>
          <View style={styles.gridItemThird}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>{t.fakeoutRisk}</Text>
              <Text style={[styles.miniCardValue, {
                color: data.trapCheck.traps?.fakeoutRisk === 'high' ? '#ef4444' :
                       data.trapCheck.traps?.fakeoutRisk === 'medium' ? '#f59e0b' : '#10b981'
              }]}>{(data.trapCheck.traps?.fakeoutRisk || 'N/A').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {data.trapCheck.counterStrategy && data.trapCheck.counterStrategy.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.protectionStrategies}</Text>
            {data.trapCheck.counterStrategy.map((strategy, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletPoint}>-</Text>
                <Text style={styles.bulletText}>{strategy}</Text>
              </View>
            ))}
          </View>
        )}

        <AICommentary
          title={t.aiTrapCheck}
          content={data.trapCheck.aiInsight || generateTrapCheckEducation(data)}
        />

        <PageFooter pageNumber={8} t={t} />
      </Page>

      {/* Page 9: Step 7 - Final Verdict */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} {t.reportTitle}</Text>
        </View>

        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{t.step} 7 {t.of} 7</Text>
        </View>
        <Text style={styles.sectionTitle}>{t.verdict}</Text>
        <Text style={styles.sectionSubtitle}>{t.verdictDesc}</Text>

        <View style={[styles.card, { backgroundColor: getVerdictColor() + '15' }]}>
          <View style={styles.row}>
            <Text style={[styles.cardTitle, { color: getVerdictColor(), fontSize: 18 }]}>{data.verdict.action}</Text>
            <Text style={[styles.miniCardValue, { color: getVerdictColor(), fontSize: 24 }]}>{data.verdict.overallScore}/10</Text>
          </View>
        </View>

        {data.verdict.confidenceFactors && data.verdict.confidenceFactors.length > 0 && (
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t.positiveFactors}</Text>
                {data.verdict.confidenceFactors.filter(f => f.positive).map((f, i) => (
                  <View key={i} style={styles.bullet}>
                    <Text style={styles.bulletPoint}>+</Text>
                    <Text style={[styles.bulletText, { color: '#10b981' }]}>{f.factor}</Text>
                  </View>
                ))}
                {data.verdict.confidenceFactors.filter(f => f.positive).length === 0 && (
                  <Text style={styles.aiText}>{t.noPositiveFactors}</Text>
                )}
              </View>
            </View>
            <View style={styles.gridItem}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{t.riskFactors}</Text>
                {data.verdict.confidenceFactors.filter(f => !f.positive).map((f, i) => (
                  <View key={i} style={styles.bullet}>
                    <Text style={styles.bulletPoint}>-</Text>
                    <Text style={[styles.bulletText, { color: '#ef4444' }]}>{f.factor}</Text>
                  </View>
                ))}
                {data.verdict.confidenceFactors.filter(f => !f.positive).length === 0 && (
                  <Text style={styles.aiText}>{t.noRiskFactors}</Text>
                )}
              </View>
            </View>
          </View>
        )}

        <AICommentary
          title={t.aiVerdict}
          content={data.verdict.aiSummary || generateVerdictEducation(data)}
        />

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>{t.legalDisclaimer}</Text>
          <Text style={styles.disclaimerText}>{t.legalText}</Text>
        </View>

        <PageFooter pageNumber={9} t={t} />
      </Page>
    </Document>
  );
};

// Export function to generate and download PDF
export async function generateAnalysisReport(data: AnalysisReportData, language: string = 'en'): Promise<void> {
  const t = getPDFTranslations(language);
  const blob = await pdf(<AnalysisReportDocument data={data} t={t} />).toBlob();
  const langSuffix = language === 'en' ? 'Report' : 'Rapor';
  const filename = `TradePath_${data.symbol}_${langSuffix}_${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, filename);
}

// Export the document component for preview if needed
export { AnalysisReportDocument };
export type { AnalysisReportData };
