'use client';

// ===========================================
// Analysis Report PDF Generator
// Professional AI-based trading report
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

// Styles - using Helvetica (built-in PDF font)
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 40,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 15,
    marginTop: 20,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 10,
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
  // AI Summary
  aiSummary: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 15,
    marginTop: 10,
  },
  aiTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: '#3b82f6',
    marginBottom: 8,
  },
  aiText: {
    fontSize: 10,
    color: '#374151',
    lineHeight: 1.6,
  },
  // Trade Plan
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
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#9ca3af',
  },
  disclaimer: {
    marginTop: 30,
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

// PDF Document Component
const AnalysisReportDocument = ({ data }: { data: AnalysisReportData }) => {
  const getVerdictColor = () => {
    const action = data.verdict.action?.toLowerCase() || '';
    if (action.includes('go') && !action.includes('avoid')) return '#10b981';
    if (action.includes('avoid')) return '#ef4444';
    return '#f59e0b';
  };

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          <Text style={styles.logo}>TradePath</Text>
          <Text style={styles.subtitle}>AI-Powered Trading Analysis</Text>

          <Text style={styles.coverTitle}>7-Step Analysis Report</Text>
          <Text style={styles.coverSymbol}>{data.symbol}</Text>

          <Text style={styles.coverMeta}>Generated: {data.generatedAt}</Text>
          <Text style={styles.coverMeta}>Analysis ID: {data.analysisId}</Text>

          <View style={[styles.verdictBadge, { backgroundColor: getVerdictColor() }]}>
            <Text style={styles.verdictText}>{data.verdict.action}</Text>
            <Text style={styles.scoreText}>Score: {data.verdict.overallScore}/10</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>TradePath Analysis Report</Text>
          <Text>Page 1</Text>
        </View>
      </Page>

      {/* Market Pulse & Asset Scan */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} Analysis Report</Text>
        </View>

        {/* Step 1: Market Pulse */}
        <Text style={styles.sectionTitle}>Step 1: Market Pulse</Text>
        <Text style={styles.sectionSubtitle}>Overall market conditions and sentiment</Text>

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>BTC Dominance</Text>
              <Text style={styles.miniCardValue}>{data.marketPulse.btcDominance?.toFixed(1) || 0}%</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>Fear & Greed</Text>
              <Text style={styles.miniCardValue}>{data.marketPulse.fearGreedIndex || 0} ({data.marketPulse.fearGreedLabel || 'N/A'})</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>Market Regime</Text>
              <Text style={styles.miniCardValue}>{data.marketPulse.marketRegime || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>Trend</Text>
              <Text style={styles.miniCardValue}>{data.marketPulse.trend?.direction || 'N/A'} ({data.marketPulse.trend?.strength || 0}%)</Text>
            </View>
          </View>
        </View>

        {data.marketPulse.aiSummary && (
          <View style={styles.aiSummary}>
            <Text style={styles.aiTitle}>AI Analysis</Text>
            <Text style={styles.aiText}>{data.marketPulse.aiSummary}</Text>
          </View>
        )}

        {/* Step 2: Asset Scan */}
        <Text style={styles.sectionTitle}>Step 2: Asset Scanner</Text>
        <Text style={styles.sectionSubtitle}>Technical analysis for {data.symbol}</Text>

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>Current Price</Text>
              <Text style={styles.miniCardValue}>{formatPrice(data.assetScan.currentPrice)}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>24h Change</Text>
              <Text style={[styles.miniCardValue, { color: (data.assetScan.priceChange24h || 0) >= 0 ? '#10b981' : '#ef4444' }]}>
                {(data.assetScan.priceChange24h || 0) >= 0 ? '+' : ''}{(data.assetScan.priceChange24h || 0).toFixed(2)}%
              </Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>RSI (14)</Text>
              <Text style={styles.miniCardValue}>{data.assetScan.indicators?.rsi?.toFixed(1) || 'N/A'}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>MACD</Text>
              <Text style={styles.miniCardValue}>{(data.assetScan.indicators?.macd?.histogram || 0) > 0 ? 'Positive' : 'Negative'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Support & Resistance Levels</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Support</Text>
            <Text style={styles.valueGreen}>{data.assetScan.levels?.support?.slice(0, 3).map(s => formatPrice(s)).join(' / ') || 'N/A'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Resistance</Text>
            <Text style={styles.valueRed}>{data.assetScan.levels?.resistance?.slice(0, 3).map(r => formatPrice(r)).join(' / ') || 'N/A'}</Text>
          </View>
        </View>

        {data.assetScan.aiInsight && (
          <View style={styles.aiSummary}>
            <Text style={styles.aiTitle}>AI Analysis</Text>
            <Text style={styles.aiText}>{data.assetScan.aiInsight}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text>TradePath Analysis Report</Text>
          <Text>Page 2</Text>
        </View>
      </Page>

      {/* Safety Check & Timing */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} Analysis Report</Text>
        </View>

        {/* Step 3: Safety Check */}
        <Text style={styles.sectionTitle}>Step 3: Safety Check</Text>
        <Text style={styles.sectionSubtitle}>Risk assessment and manipulation detection</Text>

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>Risk Level</Text>
              <Text style={[styles.miniCardValue, {
                color: data.safetyCheck.riskLevel === 'high' ? '#ef4444' :
                       data.safetyCheck.riskLevel === 'medium' ? '#f59e0b' : '#10b981'
              }]}>{(data.safetyCheck.riskLevel || 'N/A').toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>Pump/Dump Risk</Text>
              <Text style={styles.miniCardValue}>{(data.safetyCheck.manipulation?.pumpDumpRisk || 'N/A').toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>Whale Activity</Text>
              <Text style={styles.miniCardValue}>{(data.safetyCheck.whaleActivity?.bias || 'N/A').toUpperCase()}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>Smart Money</Text>
              <Text style={styles.miniCardValue}>{(data.safetyCheck.smartMoney?.positioning || 'N/A').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {data.safetyCheck.warnings && data.safetyCheck.warnings.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Warnings</Text>
            {data.safetyCheck.warnings.map((warning, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletPoint}>!</Text>
                <Text style={styles.bulletText}>{warning}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Step 4: Timing */}
        <Text style={styles.sectionTitle}>Step 4: Timing Analysis</Text>
        <Text style={styles.sectionSubtitle}>Optimal entry timing and conditions</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Trade Now: {data.timing.tradeNow ? 'YES' : 'NO'}</Text>
          <Text style={styles.aiText}>{data.timing.reason || 'No specific reason provided'}</Text>
        </View>

        {data.timing.entryZones && data.timing.entryZones.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Entry Zones</Text>
            {data.timing.entryZones.map((zone, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.label}>Zone {i + 1} ({zone.eta || 'N/A'})</Text>
                <Text style={styles.value}>{formatPrice(zone.priceLow)} - {formatPrice(zone.priceHigh)} ({zone.probability || 0}%)</Text>
              </View>
            ))}
          </View>
        )}

        {data.timing.conditions && data.timing.conditions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Entry Conditions</Text>
            {data.timing.conditions.map((cond, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.label}>{cond.name}</Text>
                <Text style={cond.met ? styles.valueGreen : styles.valueRed}>{cond.met ? 'MET' : 'NOT MET'}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text>TradePath Analysis Report</Text>
          <Text>Page 3</Text>
        </View>
      </Page>

      {/* Trade Plan */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} Analysis Report</Text>
        </View>

        {/* Step 5: Trade Plan */}
        <Text style={styles.sectionTitle}>Step 5: Trade Plan</Text>
        <Text style={styles.sectionSubtitle}>Complete execution strategy</Text>

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>Direction</Text>
              <Text style={[styles.miniCardValue, { color: data.tradePlan.direction === 'long' ? '#10b981' : '#ef4444' }]}>
                {(data.tradePlan.direction || 'N/A').toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>Risk/Reward</Text>
              <Text style={styles.miniCardValue}>{(data.tradePlan.riskReward || 0).toFixed(1)}:1</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>Win Rate Est.</Text>
              <Text style={styles.miniCardValue}>{data.tradePlan.winRateEstimate || 0}%</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>Position Size</Text>
              <Text style={styles.miniCardValue}>{(data.tradePlan.positionSizePercent || 0).toFixed(1)}%</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Entry Levels</Text>
          {data.tradePlan.entries?.map((entry, i) => (
            <View key={i} style={styles.entryRow}>
              <Text style={styles.entryLabel}>E{i + 1}</Text>
              <Text style={styles.entryPrice}>{formatPrice(entry.price)}</Text>
              <Text style={styles.entryPercent}>{entry.percentage}% ({entry.type})</Text>
            </View>
          ))}
          <View style={styles.row}>
            <Text style={styles.label}>Average Entry</Text>
            <Text style={styles.value}>{formatPrice(data.tradePlan.averageEntry)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Stop Loss</Text>
          <View style={styles.stopRow}>
            <Text style={[styles.entryLabel, { color: '#ef4444' }]}>SL</Text>
            <Text style={styles.entryPrice}>{formatPrice(data.tradePlan.stopLoss?.price)}</Text>
            <Text style={styles.entryPercent}>-{(data.tradePlan.stopLoss?.percentage || 0).toFixed(2)}%</Text>
          </View>
          <Text style={styles.aiText}>{data.tradePlan.stopLoss?.reason || ''}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Take Profit Targets</Text>
          {data.tradePlan.takeProfits?.map((tp, i) => (
            <View key={i} style={styles.tpRow}>
              <Text style={[styles.entryLabel, { color: '#10b981' }]}>TP{i + 1}</Text>
              <Text style={styles.entryPrice}>{formatPrice(tp.price)}</Text>
              <Text style={styles.entryPercent}>{tp.percentage}%</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text>TradePath Analysis Report</Text>
          <Text>Page 4</Text>
        </View>
      </Page>

      {/* Trap Check & Final Verdict */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerLogo}>TradePath</Text>
          <Text style={styles.headerSymbol}>{data.symbol} Analysis Report</Text>
        </View>

        {/* Step 6: Trap Check */}
        <Text style={styles.sectionTitle}>Step 6: Trap Check</Text>
        <Text style={styles.sectionSubtitle}>Trap detection and liquidation zones</Text>

        <View style={styles.grid}>
          <View style={styles.gridItemThird}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>Bull Trap</Text>
              <Text style={[styles.miniCardValue, { color: data.trapCheck.traps?.bullTrap ? '#ef4444' : '#10b981' }]}>
                {data.trapCheck.traps?.bullTrap ? 'DETECTED' : 'NONE'}
              </Text>
            </View>
          </View>
          <View style={styles.gridItemThird}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>Bear Trap</Text>
              <Text style={[styles.miniCardValue, { color: data.trapCheck.traps?.bearTrap ? '#ef4444' : '#10b981' }]}>
                {data.trapCheck.traps?.bearTrap ? 'DETECTED' : 'NONE'}
              </Text>
            </View>
          </View>
          <View style={styles.gridItemThird}>
            <View style={styles.miniCard}>
              <Text style={styles.miniCardLabel}>Fakeout Risk</Text>
              <Text style={[styles.miniCardValue, {
                color: data.trapCheck.traps?.fakeoutRisk === 'high' ? '#ef4444' :
                       data.trapCheck.traps?.fakeoutRisk === 'medium' ? '#f59e0b' : '#10b981'
              }]}>{(data.trapCheck.traps?.fakeoutRisk || 'N/A').toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {data.trapCheck.counterStrategy && data.trapCheck.counterStrategy.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Counter Strategies</Text>
            {data.trapCheck.counterStrategy.map((strategy, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletPoint}>-</Text>
                <Text style={styles.bulletText}>{strategy}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Step 7: Final Verdict */}
        <Text style={styles.sectionTitle}>Step 7: Final Verdict</Text>
        <Text style={styles.sectionSubtitle}>AI-powered recommendation</Text>

        <View style={[styles.card, { backgroundColor: getVerdictColor() + '15' }]}>
          <View style={styles.row}>
            <Text style={[styles.cardTitle, { color: getVerdictColor() }]}>{data.verdict.action}</Text>
            <Text style={[styles.miniCardValue, { color: getVerdictColor() }]}>{data.verdict.overallScore}/10</Text>
          </View>
        </View>

        {data.verdict.confidenceFactors && data.verdict.confidenceFactors.length > 0 && (
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Bullish Factors</Text>
                {data.verdict.confidenceFactors.filter(f => f.positive).map((f, i) => (
                  <View key={i} style={styles.bullet}>
                    <Text style={styles.bulletPoint}>+</Text>
                    <Text style={[styles.bulletText, { color: '#10b981' }]}>{f.factor}</Text>
                  </View>
                ))}
                {data.verdict.confidenceFactors.filter(f => f.positive).length === 0 && (
                  <Text style={styles.aiText}>No bullish factors identified</Text>
                )}
              </View>
            </View>
            <View style={styles.gridItem}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Risk Factors</Text>
                {data.verdict.confidenceFactors.filter(f => !f.positive).map((f, i) => (
                  <View key={i} style={styles.bullet}>
                    <Text style={styles.bulletPoint}>-</Text>
                    <Text style={[styles.bulletText, { color: '#ef4444' }]}>{f.factor}</Text>
                  </View>
                ))}
                {data.verdict.confidenceFactors.filter(f => !f.positive).length === 0 && (
                  <Text style={styles.aiText}>No risk factors identified</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {data.verdict.aiSummary && (
          <View style={styles.aiSummary}>
            <Text style={styles.aiTitle}>AI Summary</Text>
            <Text style={styles.aiText}>{data.verdict.aiSummary}</Text>
          </View>
        )}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerTitle}>Disclaimer</Text>
          <Text style={styles.disclaimerText}>
            This analysis is for informational purposes only and should not be considered financial advice.
            Trading cryptocurrencies involves substantial risk of loss and is not suitable for all investors.
            Past performance is not indicative of future results. Always do your own research before making any investment decisions.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text>TradePath Analysis Report</Text>
          <Text>Page 5</Text>
        </View>
      </Page>
    </Document>
  );
};

// Export function to generate and download PDF
export async function generateAnalysisReport(data: AnalysisReportData): Promise<void> {
  const blob = await pdf(<AnalysisReportDocument data={data} />).toBlob();
  const filename = `TradePath_${data.symbol}_Analysis_${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, filename);
}

// Export the document component for preview if needed
export { AnalysisReportDocument };
export type { AnalysisReportData };
