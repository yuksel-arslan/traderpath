'use client';

// ===========================================
// Analysis Report PDF Generator
// Professional Multi-Page Format
// Each analysis step takes ~1/3 page
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

// Professional styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#0f172a',
    padding: 35,
    fontFamily: 'Helvetica',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#334155',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symbolBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  symbolLetter: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  titleSection: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  scoreSection: {
    alignItems: 'flex-end',
  },
  directionBadge: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  directionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  score: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#94a3b8',
  },

  // Chart section - Trade levels visualization
  chartSection: {
    height: 240,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    marginBottom: 25,
    padding: 15,
  },
  chartImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },

  // Analysis step card (1/3 page height ~220px)
  stepCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    minHeight: 180,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stepStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  stepContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  stepMetric: {
    width: '50%',
    paddingRight: 10,
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  stepDescription: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 1.6,
    marginTop: 10,
  },

  // Trade levels section
  levelsGrid: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  levelCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 15,
  },
  levelTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  levelLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  levelPrice: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  levelPercent: {
    fontSize: 10,
    color: '#94a3b8',
  },

  // Verdict section
  verdictSection: {
    borderRadius: 16,
    padding: 25,
    marginBottom: 20,
  },
  verdictTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  verdictText: {
    fontSize: 12,
    color: '#e2e8f0',
    lineHeight: 1.7,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 8,
    color: '#64748b',
  },
  disclaimer: {
    padding: 15,
    backgroundColor: '#422006',
    borderRadius: 10,
    marginBottom: 15,
  },
  disclaimerText: {
    fontSize: 9,
    color: '#fbbf24',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  pageNumber: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 10,
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
    confidenceFactors?: Array<{ factor: string; positive: boolean }>;
  };
}

// Generate chart URL using QuickChart - Horizontal price levels visualization
function generateChartUrl(data: AnalysisReportData): string {
  const entry = data.tradePlan.averageEntry || 0;
  const sl = data.tradePlan.stopLoss?.price || 0;
  const tp1 = data.tradePlan.takeProfits?.[0]?.price || 0;
  const tp2 = data.tradePlan.takeProfits?.[1]?.price || 0;
  const tp3 = data.tradePlan.takeProfits?.[2]?.price || 0;
  const current = data.assetScan.currentPrice || entry;

  const isLong = data.tradePlan.direction === 'long';

  // Create price range for y-axis
  const prices = [sl, entry, current, tp1, tp2, tp3].filter(p => p > 0);
  const minPrice = Math.min(...prices) * 0.97;
  const maxPrice = Math.max(...prices) * 1.03;

  // Create annotations for horizontal lines at each price level
  const annotations: any = {
    currentPrice: {
      type: 'line',
      yMin: current,
      yMax: current,
      borderColor: '#f59e0b',
      borderWidth: 3,
      borderDash: [6, 4],
      label: {
        display: true,
        content: `Current: $${current.toLocaleString()}`,
        position: 'start',
        backgroundColor: '#f59e0b',
        color: '#000',
        font: { size: 11, weight: 'bold' }
      }
    },
    entry: {
      type: 'line',
      yMin: entry,
      yMax: entry,
      borderColor: '#06b6d4',
      borderWidth: 3,
      label: {
        display: true,
        content: `Entry: $${entry.toLocaleString()}`,
        position: 'start',
        backgroundColor: '#06b6d4',
        color: '#000',
        font: { size: 11, weight: 'bold' }
      }
    },
    stopLoss: {
      type: 'line',
      yMin: sl,
      yMax: sl,
      borderColor: '#ef4444',
      borderWidth: 3,
      label: {
        display: true,
        content: `Stop Loss: $${sl.toLocaleString()}`,
        position: 'start',
        backgroundColor: '#ef4444',
        color: '#fff',
        font: { size: 11, weight: 'bold' }
      }
    }
  };

  if (tp1) {
    annotations.tp1 = {
      type: 'line',
      yMin: tp1,
      yMax: tp1,
      borderColor: '#22c55e',
      borderWidth: 2,
      label: {
        display: true,
        content: `TP1: $${tp1.toLocaleString()}`,
        position: 'end',
        backgroundColor: '#22c55e',
        color: '#000',
        font: { size: 10 }
      }
    };
  }
  if (tp2) {
    annotations.tp2 = {
      type: 'line',
      yMin: tp2,
      yMax: tp2,
      borderColor: '#10b981',
      borderWidth: 2,
      label: {
        display: true,
        content: `TP2: $${tp2.toLocaleString()}`,
        position: 'end',
        backgroundColor: '#10b981',
        color: '#000',
        font: { size: 10 }
      }
    };
  }
  if (tp3) {
    annotations.tp3 = {
      type: 'line',
      yMin: tp3,
      yMax: tp3,
      borderColor: '#059669',
      borderWidth: 2,
      label: {
        display: true,
        content: `TP3: $${tp3.toLocaleString()}`,
        position: 'end',
        backgroundColor: '#059669',
        color: '#fff',
        font: { size: 10 }
      }
    };
  }

  // Add colored zones
  if (isLong) {
    annotations.profitZone = {
      type: 'box',
      yMin: entry,
      yMax: maxPrice,
      backgroundColor: 'rgba(34, 197, 94, 0.1)',
      borderWidth: 0
    };
    annotations.lossZone = {
      type: 'box',
      yMin: minPrice,
      yMax: entry,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 0
    };
  }

  const chartConfig = {
    type: 'line',
    data: {
      labels: ['', '', '', '', '', '', '', '', '', ''],
      datasets: [{
        data: Array(10).fill(current),
        borderColor: 'transparent',
        pointRadius: 0,
      }]
    },
    options: {
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `${data.symbol}/USDT - ${isLong ? 'LONG' : 'SHORT'} Trade Plan`,
          color: '#ffffff',
          font: { size: 16, weight: 'bold' },
          padding: { bottom: 20 }
        },
        annotation: { annotations }
      },
      scales: {
        x: {
          display: false
        },
        y: {
          min: minPrice,
          max: maxPrice,
          grid: { color: '#334155' },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            callback: (v: number) => '$' + v.toLocaleString()
          }
        }
      }
    }
  };

  const encoded = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?c=${encoded}&backgroundColor=%231e293b&width=600&height=280`;
}

// Status color helper
const getStatusColor = (status: string) => {
  const positive = ['Bullish', 'Safe', 'Good', 'Ready', 'Clear', 'Stable', 'Low'];
  const negative = ['Bearish', 'Risky', 'Warning', 'Declining', 'High'];
  if (positive.some(p => status.toLowerCase().includes(p.toLowerCase()))) return '#22c55e';
  if (negative.some(n => status.toLowerCase().includes(n.toLowerCase()))) return '#ef4444';
  return '#f59e0b';
};

const getStatusBg = (status: string) => {
  const positive = ['Bullish', 'Safe', 'Good', 'Ready', 'Clear', 'Stable', 'Low'];
  const negative = ['Bearish', 'Risky', 'Warning', 'Declining', 'High'];
  if (positive.some(p => status.toLowerCase().includes(p.toLowerCase()))) return '#14532d';
  if (negative.some(n => status.toLowerCase().includes(n.toLowerCase()))) return '#7f1d1d';
  return '#78350f';
};

// PDF Document Component
const AnalysisReportDocument = ({ data }: { data: AnalysisReportData }) => {
  const isLong = data.tradePlan.direction === 'long';
  const score = (data.verdict.overallScore || 0) * 10;

  // Status labels
  const marketStatus = data.marketPulse.trend?.direction === 'bullish' ? 'Bullish' :
                       data.marketPulse.trend?.direction === 'bearish' ? 'Bearish' : 'Neutral';
  const assetStatus = (data.assetScan.priceChange24h || 0) >= 2 ? 'Strong' :
                      (data.assetScan.priceChange24h || 0) >= 0 ? 'Stable' : 'Declining';
  const safetyStatus = data.safetyCheck.riskLevel === 'low' ? 'Safe' :
                       data.safetyCheck.riskLevel === 'high' ? 'Risky' : 'Caution';
  const timingStatus = data.timing.tradeNow ? 'Good' : 'Wait';
  const planStatus = data.tradePlan.averageEntry ? 'Ready' : 'Pending';
  const trapStatus = data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap ? 'Warning' : 'Clear';

  const chartUrl = generateChartUrl(data);

  return (
    <Document>
      {/* PAGE 1: Header + Chart + Market Pulse + Asset Scan */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <View style={styles.symbolBadge}>
              <Text style={styles.symbolLetter}>{data.symbol.charAt(0)}</Text>
            </View>
            <View style={styles.titleSection}>
              <Text style={styles.title}>{data.symbol}/USDT Analysis</Text>
              <Text style={styles.subtitle}>{data.generatedAt} • TradePath AI Report</Text>
            </View>
          </View>
          <View style={styles.scoreSection}>
            <View style={[styles.directionBadge, { backgroundColor: isLong ? '#166534' : '#991b1b' }]}>
              <Text style={styles.directionText}>{isLong ? '↗ BULLISH' : '↘ BEARISH'}</Text>
            </View>
            <Text style={styles.score}>{score}/100</Text>
            <Text style={styles.scoreLabel}>Overall Score</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartSection}>
          <Image src={chartUrl} style={styles.chartImage} />
        </View>

        {/* Step 1: Market Pulse */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>1</Text></View>
              <Text style={styles.stepTitle}>Market Pulse</Text>
            </View>
            <Text style={[styles.stepStatus, { backgroundColor: getStatusBg(marketStatus), color: getStatusColor(marketStatus) }]}>
              {marketStatus}
            </Text>
          </View>
          <View style={styles.stepContent}>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>Fear & Greed Index</Text>
              <Text style={styles.metricValue}>{data.marketPulse.fearGreedIndex} ({data.marketPulse.fearGreedLabel})</Text>
            </View>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>BTC Dominance</Text>
              <Text style={styles.metricValue}>{data.marketPulse.btcDominance?.toFixed(1)}%</Text>
            </View>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>Market Trend</Text>
              <Text style={[styles.metricValue, { color: getStatusColor(marketStatus) }]}>
                {data.marketPulse.trend?.direction?.toUpperCase() || 'N/A'}
              </Text>
            </View>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>Trend Strength</Text>
              <Text style={styles.metricValue}>{data.marketPulse.trend?.strength || 0}%</Text>
            </View>
          </View>
          <Text style={styles.stepDescription}>
            Overall market conditions and sentiment analysis. Fear & Greed index below 25 indicates extreme fear (potential buying opportunity), above 75 indicates extreme greed (potential correction risk).
          </Text>
        </View>

        {/* Step 2: Asset Scan */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>2</Text></View>
              <Text style={styles.stepTitle}>Asset Scan</Text>
            </View>
            <Text style={[styles.stepStatus, { backgroundColor: getStatusBg(assetStatus), color: getStatusColor(assetStatus) }]}>
              {assetStatus}
            </Text>
          </View>
          <View style={styles.stepContent}>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>Current Price</Text>
              <Text style={styles.metricValue}>{formatPrice(data.assetScan.currentPrice)}</Text>
            </View>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>24h Change</Text>
              <Text style={[styles.metricValue, { color: (data.assetScan.priceChange24h || 0) >= 0 ? '#22c55e' : '#ef4444' }]}>
                {(data.assetScan.priceChange24h || 0) >= 0 ? '+' : ''}{(data.assetScan.priceChange24h || 0).toFixed(2)}%
              </Text>
            </View>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>RSI (14)</Text>
              <Text style={styles.metricValue}>{data.assetScan.indicators?.rsi?.toFixed(1) || 'N/A'}</Text>
            </View>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>MACD Signal</Text>
              <Text style={[styles.metricValue, { color: (data.assetScan.indicators?.macd?.histogram || 0) > 0 ? '#22c55e' : '#ef4444' }]}>
                {(data.assetScan.indicators?.macd?.histogram || 0) > 0 ? 'Bullish' : 'Bearish'}
              </Text>
            </View>
          </View>
          <Text style={styles.stepDescription}>
            Technical analysis of {data.symbol}. RSI above 70 indicates overbought conditions, below 30 indicates oversold. MACD crossover signals momentum shifts.
          </Text>
        </View>

        <Text style={styles.pageNumber}>Page 1 of 3</Text>
      </Page>

      {/* PAGE 2: Safety + Timing + Trade Plan */}
      <Page size="A4" style={styles.page}>
        {/* Step 3: Safety Check */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>3</Text></View>
              <Text style={styles.stepTitle}>Safety Check</Text>
            </View>
            <Text style={[styles.stepStatus, { backgroundColor: getStatusBg(safetyStatus), color: getStatusColor(safetyStatus) }]}>
              {safetyStatus}
            </Text>
          </View>
          <View style={styles.stepContent}>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>Risk Level</Text>
              <Text style={[styles.metricValue, { color: getStatusColor(safetyStatus) }]}>
                {(data.safetyCheck.riskLevel || 'N/A').toUpperCase()}
              </Text>
            </View>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>Pump & Dump Risk</Text>
              <Text style={styles.metricValue}>{(data.safetyCheck.manipulation?.pumpDumpRisk || 'N/A').toUpperCase()}</Text>
            </View>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>Whale Activity</Text>
              <Text style={styles.metricValue}>{(data.safetyCheck.whaleActivity?.bias || 'neutral').toUpperCase()}</Text>
            </View>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>Smart Money</Text>
              <Text style={styles.metricValue}>{(data.safetyCheck.smartMoney?.positioning || 'neutral').toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.stepDescription}>
            Market manipulation detection and whale activity analysis. High risk levels warrant smaller position sizes and tighter stop losses.
          </Text>
        </View>

        {/* Step 4: Timing Analysis */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>4</Text></View>
              <Text style={styles.stepTitle}>Timing Analysis</Text>
            </View>
            <Text style={[styles.stepStatus, { backgroundColor: getStatusBg(timingStatus), color: getStatusColor(timingStatus) }]}>
              {timingStatus}
            </Text>
          </View>
          <View style={styles.stepContent}>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>Trade Now?</Text>
              <Text style={[styles.metricValue, { color: data.timing.tradeNow ? '#22c55e' : '#f59e0b' }]}>
                {data.timing.tradeNow ? 'YES - Conditions Met' : 'WAIT - Not Optimal'}
              </Text>
            </View>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>RSI Zone</Text>
              <Text style={styles.metricValue}>
                {(data.assetScan.indicators?.rsi || 50) > 70 ? 'Overbought' :
                 (data.assetScan.indicators?.rsi || 50) < 30 ? 'Oversold' : 'Neutral'}
              </Text>
            </View>
          </View>
          <Text style={styles.stepDescription}>
            {data.timing.reason || 'Optimal entry timing based on technical indicators, market conditions, and momentum analysis.'}
          </Text>
        </View>

        {/* Step 5: Trade Plan */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>5</Text></View>
              <Text style={styles.stepTitle}>Trade Plan</Text>
            </View>
            <Text style={[styles.stepStatus, { backgroundColor: getStatusBg(planStatus), color: getStatusColor(planStatus) }]}>
              {planStatus}
            </Text>
          </View>
          <View style={styles.stepContent}>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>Direction</Text>
              <Text style={[styles.metricValue, { color: isLong ? '#22c55e' : '#ef4444' }]}>
                {(data.tradePlan.direction || 'N/A').toUpperCase()}
              </Text>
            </View>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>Risk/Reward</Text>
              <Text style={styles.metricValue}>{(data.tradePlan.riskReward || 0).toFixed(1)}:1</Text>
            </View>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>Win Rate Est.</Text>
              <Text style={styles.metricValue}>{data.tradePlan.winRateEstimate || 50}%</Text>
            </View>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>Average Entry</Text>
              <Text style={styles.metricValue}>{formatPrice(data.tradePlan.averageEntry)}</Text>
            </View>
          </View>
        </View>

        {/* Trade Levels Grid */}
        <View style={styles.levelsGrid}>
          <View style={styles.levelCard}>
            <Text style={[styles.levelTitle, { color: '#06b6d4' }]}>Entry Levels</Text>
            {data.tradePlan.entries?.slice(0, 3).map((e, i) => (
              <View key={i} style={styles.levelRow}>
                <Text style={[styles.levelLabel, { color: '#06b6d4' }]}>E{i + 1}</Text>
                <Text style={styles.levelPrice}>{formatPrice(e.price)}</Text>
                <Text style={styles.levelPercent}>{e.percentage}%</Text>
              </View>
            ))}
          </View>
          <View style={styles.levelCard}>
            <Text style={[styles.levelTitle, { color: '#ef4444' }]}>Stop Loss</Text>
            <View style={styles.levelRow}>
              <Text style={[styles.levelLabel, { color: '#ef4444' }]}>SL</Text>
              <Text style={styles.levelPrice}>{formatPrice(data.tradePlan.stopLoss?.price)}</Text>
              <Text style={styles.levelPercent}>-{(data.tradePlan.stopLoss?.percentage || 0).toFixed(2)}%</Text>
            </View>
          </View>
          <View style={styles.levelCard}>
            <Text style={[styles.levelTitle, { color: '#22c55e' }]}>Take Profits</Text>
            {data.tradePlan.takeProfits?.slice(0, 3).map((tp, i) => (
              <View key={i} style={styles.levelRow}>
                <Text style={[styles.levelLabel, { color: '#22c55e' }]}>TP{i + 1}</Text>
                <Text style={styles.levelPrice}>{formatPrice(tp.price)}</Text>
                <Text style={styles.levelPercent}>+{(tp.percentage || 0).toFixed(1)}%</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.pageNumber}>Page 2 of 3</Text>
      </Page>

      {/* PAGE 3: Trap Check + Final Verdict */}
      <Page size="A4" style={styles.page}>
        {/* Step 6: Trap Check */}
        <View style={styles.stepCard}>
          <View style={styles.stepHeader}>
            <View style={styles.stepTitleRow}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>6</Text></View>
              <Text style={styles.stepTitle}>Trap Check</Text>
            </View>
            <Text style={[styles.stepStatus, { backgroundColor: getStatusBg(trapStatus), color: getStatusColor(trapStatus) }]}>
              {trapStatus}
            </Text>
          </View>
          <View style={styles.stepContent}>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>Bull Trap Risk</Text>
              <Text style={[styles.metricValue, { color: data.trapCheck?.traps?.bullTrap ? '#ef4444' : '#22c55e' }]}>
                {data.trapCheck?.traps?.bullTrap ? 'DETECTED' : 'NONE'}
              </Text>
            </View>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>Bear Trap Risk</Text>
              <Text style={[styles.metricValue, { color: data.trapCheck?.traps?.bearTrap ? '#ef4444' : '#22c55e' }]}>
                {data.trapCheck?.traps?.bearTrap ? 'DETECTED' : 'NONE'}
              </Text>
            </View>
            <View style={styles.stepMetric}>
              <Text style={styles.metricLabel}>Fakeout Risk</Text>
              <Text style={[styles.metricValue, { color: getStatusColor(data.trapCheck?.traps?.fakeoutRisk || 'low') }]}>
                {(data.trapCheck?.traps?.fakeoutRisk || 'LOW').toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.stepDescription}>
            Analysis of potential market traps and false breakouts. Wait for confirmation candles before entering if trap risk is elevated.
          </Text>
        </View>

        {/* Step 7: Final Verdict */}
        <View style={[styles.verdictSection, { backgroundColor: isLong ? '#14532d' : '#7f1d1d' }]}>
          <View style={styles.stepHeader}>
            <View style={styles.stepTitleRow}>
              <View style={[styles.stepNumber, { backgroundColor: isLong ? '#22c55e' : '#ef4444' }]}>
                <Text style={styles.stepNumberText}>7</Text>
              </View>
              <Text style={styles.stepTitle}>Final Verdict</Text>
            </View>
            <Text style={[styles.stepStatus, { backgroundColor: isLong ? '#166534' : '#991b1b', color: '#ffffff' }]}>
              {(data.tradePlan.direction || '').toUpperCase()} • {score}/100
            </Text>
          </View>
          <Text style={[styles.verdictTitle, { color: isLong ? '#4ade80' : '#f87171' }]}>
            ✓ {(data.tradePlan.direction || '').toUpperCase()} Position Recommended
          </Text>
          <Text style={styles.verdictText}>
            {data.verdict.aiSummary ||
              `Based on comprehensive analysis, market conditions favor a ${isLong ? 'bullish' : 'bearish'} position on ${data.symbol}/USDT. Recommended entry zone around ${formatPrice(data.tradePlan.averageEntry)} with a ${(data.tradePlan.riskReward || 0).toFixed(1)}:1 risk-reward ratio. Set stop-loss at ${formatPrice(data.tradePlan.stopLoss?.price)} to protect against adverse movements. Take profits gradually at designated TP levels.`
            }
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ⚠ DISCLAIMER: This report is for educational and informational purposes only and does not constitute financial advice. Cryptocurrency trading involves substantial risk of loss. Past performance does not guarantee future results. Always conduct your own research and consult with a qualified financial advisor before making investment decisions. Never invest more than you can afford to lose.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by TradePath • AI-Powered Analysis</Text>
          <Text style={styles.footerText}>Report ID: {data.analysisId?.slice(-8)}</Text>
          <Text style={styles.footerText}>© 2024 TradePath. All rights reserved.</Text>
        </View>

        <Text style={styles.pageNumber}>Page 3 of 3</Text>
      </Page>
    </Document>
  );
};

// Export function to generate and download PDF
export async function generateAnalysisReport(data: AnalysisReportData, language: string = 'en'): Promise<void> {
  const blob = await pdf(<AnalysisReportDocument data={data} />).toBlob();
  const filename = `TradePath_${data.symbol}_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  saveAs(blob, filename);
}

// Export the document component for preview if needed
export { AnalysisReportDocument };
export type { AnalysisReportData };
