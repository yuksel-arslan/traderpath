'use client';

// ===========================================
// Analysis Report PDF Generator
// Clean, Professional Single-Page Summary
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

// Clean, modern styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#0f172a',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  logoSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symbolBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  symbolLetter: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  titleSection: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subtitle: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  directionBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 12,
  },
  directionText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  score: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },

  // Chart placeholder
  chartSection: {
    height: 180,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  chartImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  chartPlaceholder: {
    fontSize: 12,
    color: '#64748b',
  },

  // Grid for analysis cards
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 15,
  },
  gridItem: {
    width: '33.33%',
    paddingHorizontal: 5,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
    height: 70,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cardStatus: {
    fontSize: 8,
    fontWeight: 'bold',
  },
  cardContent: {
    fontSize: 8,
    color: '#94a3b8',
    lineHeight: 1.4,
  },

  // Trade levels section
  levelsSection: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  levelCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 12,
  },
  levelTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  levelLabel: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  levelPrice: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  levelPercent: {
    fontSize: 8,
    color: '#94a3b8',
  },

  // Verdict section
  verdictSection: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  verdictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  verdictIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verdictTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  verdictText: {
    fontSize: 9,
    color: '#e2e8f0',
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  footerText: {
    fontSize: 7,
    color: '#64748b',
  },
  disclaimer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#422006',
    borderRadius: 6,
  },
  disclaimerText: {
    fontSize: 7,
    color: '#fbbf24',
    textAlign: 'center',
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
    entries: Array<{ price: number; percentage: number }>;
    averageEntry: number;
    stopLoss: { price: number; percentage: number };
    takeProfits: Array<{ price: number; percentage: number }>;
    riskReward: number;
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

// Generate chart URL using QuickChart
function generateChartUrl(data: AnalysisReportData): string {
  const entry = data.tradePlan.averageEntry || 0;
  const sl = data.tradePlan.stopLoss?.price || 0;
  const tp1 = data.tradePlan.takeProfits?.[0]?.price || 0;
  const tp2 = data.tradePlan.takeProfits?.[1]?.price || 0;
  const current = data.assetScan.currentPrice || entry;

  const isLong = data.tradePlan.direction === 'long';
  const prices = [sl, entry, current, tp1, tp2].filter(p => p > 0).sort((a, b) => a - b);
  const min = Math.min(...prices) * 0.98;
  const max = Math.max(...prices) * 1.02;

  const chartConfig = {
    type: 'bar',
    data: {
      labels: ['Stop Loss', 'Entry', 'Current', 'TP1', 'TP2'],
      datasets: [{
        data: [sl, entry, current, tp1, tp2],
        backgroundColor: [
          '#ef4444',
          '#06b6d4',
          '#f59e0b',
          '#22c55e',
          '#10b981',
        ],
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `${data.symbol}/USDT - ${isLong ? 'LONG' : 'SHORT'}`,
          color: '#ffffff',
          font: { size: 14, weight: 'bold' }
        }
      },
      scales: {
        x: {
          min: min,
          max: max,
          grid: { color: '#334155' },
          ticks: { color: '#94a3b8' }
        },
        y: {
          grid: { display: false },
          ticks: { color: '#94a3b8' }
        }
      }
    }
  };

  const encoded = encodeURIComponent(JSON.stringify(chartConfig));
  return `https://quickchart.io/chart?c=${encoded}&backgroundColor=%230f172a&width=500&height=200`;
}

// PDF Document Component
const AnalysisReportDocument = ({ data }: { data: AnalysisReportData }) => {
  const isLong = data.tradePlan.direction === 'long';
  const score = (data.verdict.overallScore || 0) * 10;

  // Status labels
  const marketStatus = data.marketPulse.trend?.direction === 'bullish' ? 'Bullish' :
                       data.marketPulse.trend?.direction === 'bearish' ? 'Bearish' : 'Neutral';
  const assetStatus = (data.assetScan.priceChange24h || 0) >= 0 ? 'Stable' : 'Declining';
  const safetyStatus = data.safetyCheck.riskLevel === 'low' ? 'Safe' :
                       data.safetyCheck.riskLevel === 'high' ? 'Risky' : 'Caution';
  const timingStatus = data.timing.tradeNow ? 'Good' : 'Wait';
  const planStatus = data.tradePlan.averageEntry ? 'Ready' : 'Pending';
  const trapStatus = data.trapCheck?.traps?.bullTrap || data.trapCheck?.traps?.bearTrap ? 'Warning' : 'Clear';

  const getStatusColor = (status: string) => {
    if (['Bullish', 'Safe', 'Good', 'Ready', 'Clear', 'Stable'].includes(status)) return '#22c55e';
    if (['Bearish', 'Risky', 'Warning', 'Declining'].includes(status)) return '#ef4444';
    return '#f59e0b';
  };

  const chartUrl = generateChartUrl(data);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoSection}>
            <View style={styles.symbolBadge}>
              <Text style={styles.symbolLetter}>{data.symbol.charAt(0)}</Text>
            </View>
            <View style={styles.titleSection}>
              <Text style={styles.title}>{data.symbol}/USDT Analysis</Text>
              <Text style={styles.subtitle}>{data.generatedAt} • TradePath</Text>
            </View>
          </View>
          <View style={styles.scoreSection}>
            <View style={[styles.directionBadge, { backgroundColor: isLong ? '#166534' : '#991b1b' }]}>
              <Text style={styles.directionText}>{isLong ? '↗ BULLISH' : '↘ BEARISH'}</Text>
            </View>
            <Text style={styles.score}>{score}/100</Text>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartSection}>
          <Image src={chartUrl} style={styles.chartImage} />
        </View>

        {/* Analysis Cards Grid - 6 cards in 2 rows */}
        <View style={styles.grid}>
          {/* Market Pulse */}
          <View style={styles.gridItem}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Market Pulse</Text>
                <Text style={[styles.cardStatus, { color: getStatusColor(marketStatus) }]}>{marketStatus}</Text>
              </View>
              <Text style={styles.cardContent}>
                Fear & Greed: {data.marketPulse.fearGreedIndex} ({data.marketPulse.fearGreedLabel}){'\n'}
                BTC Dom: {data.marketPulse.btcDominance?.toFixed(1)}%
              </Text>
            </View>
          </View>

          {/* Asset Scan */}
          <View style={styles.gridItem}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Asset Scan</Text>
                <Text style={[styles.cardStatus, { color: getStatusColor(assetStatus) }]}>{assetStatus}</Text>
              </View>
              <Text style={styles.cardContent}>
                Price: {formatPrice(data.assetScan.currentPrice)}{'\n'}
                24h: {(data.assetScan.priceChange24h || 0) >= 0 ? '+' : ''}{(data.assetScan.priceChange24h || 0).toFixed(2)}%
              </Text>
            </View>
          </View>

          {/* Safety Check */}
          <View style={styles.gridItem}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Safety Check</Text>
                <Text style={[styles.cardStatus, { color: getStatusColor(safetyStatus) }]}>{safetyStatus}</Text>
              </View>
              <Text style={styles.cardContent}>
                Risk: {(data.safetyCheck.riskLevel || 'N/A').toUpperCase()}{'\n'}
                Whale: {data.safetyCheck.whaleActivity?.bias || 'neutral'}
              </Text>
            </View>
          </View>

          {/* Timing */}
          <View style={styles.gridItem}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Timing</Text>
                <Text style={[styles.cardStatus, { color: getStatusColor(timingStatus) }]}>{timingStatus}</Text>
              </View>
              <Text style={styles.cardContent}>
                RSI: {data.assetScan.indicators?.rsi?.toFixed(0) || 'N/A'}{'\n'}
                MACD: {(data.assetScan.indicators?.macd?.histogram || 0) > 0 ? 'Bullish' : 'Bearish'}
              </Text>
            </View>
          </View>

          {/* Trade Plan */}
          <View style={styles.gridItem}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Trade Plan</Text>
                <Text style={[styles.cardStatus, { color: getStatusColor(planStatus) }]}>{planStatus}</Text>
              </View>
              <Text style={styles.cardContent}>
                R/R: {(data.tradePlan.riskReward || 0).toFixed(1)}:1{'\n'}
                Direction: {(data.tradePlan.direction || 'N/A').toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Trap Check */}
          <View style={styles.gridItem}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Trap Check</Text>
                <Text style={[styles.cardStatus, { color: getStatusColor(trapStatus) }]}>{trapStatus}</Text>
              </View>
              <Text style={styles.cardContent}>
                Bull Trap: {data.trapCheck?.traps?.bullTrap ? 'Yes' : 'No'}{'\n'}
                Bear Trap: {data.trapCheck?.traps?.bearTrap ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>
        </View>

        {/* Trade Levels */}
        <View style={styles.levelsSection}>
          {/* Entry */}
          <View style={styles.levelCard}>
            <Text style={[styles.levelTitle, { color: '#06b6d4' }]}>Entry Levels</Text>
            {data.tradePlan.entries?.slice(0, 3).map((e, i) => (
              <View key={i} style={styles.levelRow}>
                <Text style={[styles.levelLabel, { color: '#06b6d4' }]}>E{i + 1}</Text>
                <Text style={styles.levelPrice}>{formatPrice(e.price)}</Text>
                <Text style={styles.levelPercent}>{e.percentage}%</Text>
              </View>
            ))}
            <View style={[styles.levelRow, { borderTopWidth: 1, borderTopColor: '#334155', marginTop: 4, paddingTop: 4 }]}>
              <Text style={styles.levelPercent}>Avg Entry</Text>
              <Text style={styles.levelPrice}>{formatPrice(data.tradePlan.averageEntry)}</Text>
            </View>
          </View>

          {/* Stop Loss */}
          <View style={styles.levelCard}>
            <Text style={[styles.levelTitle, { color: '#ef4444' }]}>Stop Loss</Text>
            <View style={styles.levelRow}>
              <Text style={[styles.levelLabel, { color: '#ef4444' }]}>SL</Text>
              <Text style={styles.levelPrice}>{formatPrice(data.tradePlan.stopLoss?.price)}</Text>
              <Text style={styles.levelPercent}>-{(data.tradePlan.stopLoss?.percentage || 0).toFixed(2)}%</Text>
            </View>
          </View>

          {/* Take Profits */}
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

        {/* Final Verdict */}
        <View style={[styles.verdictSection, { backgroundColor: isLong ? '#14532d' : '#7f1d1d' }]}>
          <View style={styles.verdictHeader}>
            <Text style={[styles.verdictTitle, { color: isLong ? '#4ade80' : '#f87171' }]}>
              ✓ Final Verdict: {(data.tradePlan.direction || '').toUpperCase()} Recommended
            </Text>
          </View>
          <Text style={styles.verdictText}>
            {data.verdict.aiSummary ||
              `Market conditions favor ${isLong ? 'bullish' : 'bearish'} continuation. Entry zone ${formatPrice(data.tradePlan.averageEntry)} with ${(data.tradePlan.riskReward || 0).toFixed(1)}:1 risk-reward ratio. Set stop-loss at ${formatPrice(data.tradePlan.stopLoss?.price)} to protect against downside.`
            }
          </Text>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ⚠ Disclaimer: This is not financial advice. Crypto trading carries significant risk. Always do your own research and never invest more than you can afford to lose.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by TradePath • AI-Powered Analysis</Text>
          <Text style={styles.footerText}>Report ID: {data.analysisId?.slice(-8)}</Text>
          <Text style={styles.footerText}>© 2024 TradePath</Text>
        </View>
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
