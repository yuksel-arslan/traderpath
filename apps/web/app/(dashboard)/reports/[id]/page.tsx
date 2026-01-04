'use client';

// ===========================================
// Report View Page - Professional HTML Report
// ===========================================

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Loader2,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Brain,
  Eye,
} from 'lucide-react';
import { cn } from '../../../../lib/utils';
import { TradePlanChart } from '../../../../components/analysis/TradePlanChart';

interface ReportData {
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
    indicators: { rsi: number; macd: { histogram: number } };
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
    traps: { bullTrap: boolean; bearTrap: boolean; fakeoutRisk: string };
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

function formatPrice(price: number): string {
  if (!price) return '$0';
  if (price >= 1000) return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(2)}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

export default function ReportViewPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id as string;

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch(`/api/reports/${reportId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to load report');

        const data = await response.json();
        if (data.success && data.data.reportData) {
          setReport(data.data.reportData);
        } else {
          throw new Error('Report data not found');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId, router]);

  const handleDownloadPDF = async () => {
    if (!report) return;
    try {
      const { generateAnalysisReport } = await import('../../../../components/reports/AnalysisReport');
      await generateAnalysisReport(report);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      alert('Failed to generate PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Report Not Found</h1>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Link href="/reports" className="text-primary hover:underline">Back to Reports</Link>
      </div>
    );
  }

  const isLong = report.tradePlan.direction === 'long';
  const verdictColor = report.verdict.action?.toLowerCase().includes('go') && !report.verdict.action?.toLowerCase().includes('avoid')
    ? 'green' : report.verdict.action?.toLowerCase().includes('avoid') ? 'red' : 'yellow';

  const chartEntries = report.tradePlan.entries?.map(e => ({ price: e.price, percentage: e.percentage })) || [];
  const chartTakeProfits = report.tradePlan.takeProfits?.map(tp => ({ price: tp.price, percentage: tp.percentage, riskReward: 0 })) || [];

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-6 max-w-[1600px] mx-auto">
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="p-2 hover:bg-accent rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{report.symbol}/USDT</h1>
            <p className="text-xs text-muted-foreground">{report.generatedAt} • ID: {report.analysisId?.slice(-8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={cn(
            "px-4 py-2 rounded-lg font-bold text-lg",
            verdictColor === 'green' ? 'bg-green-500/20 text-green-500' :
            verdictColor === 'red' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/20 text-yellow-500'
          )}>
            {report.verdict.action} • {report.verdict.overallScore}/10
          </div>
          <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Chart */}
        <div className="lg:col-span-2">
          <TradePlanChart
            symbol={report.symbol}
            direction={report.tradePlan.direction as 'long' | 'short'}
            entries={chartEntries}
            stopLoss={{ price: report.tradePlan.stopLoss?.price || 0, percentage: report.tradePlan.stopLoss?.percentage || 0 }}
            takeProfits={chartTakeProfits}
            currentPrice={report.assetScan.currentPrice}
            support={report.assetScan.levels?.support}
            resistance={report.assetScan.levels?.resistance}
          />
        </div>

        {/* Right Column - Key Metrics */}
        <div className="space-y-4">
          {/* Direction & Risk/Reward */}
          <div className={cn("p-4 rounded-lg border-2", isLong ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {isLong ? <TrendingUp className="w-6 h-6 text-green-500" /> : <TrendingDown className="w-6 h-6 text-red-500" />}
                <span className={cn("text-2xl font-bold", isLong ? 'text-green-500' : 'text-red-500')}>{report.tradePlan.direction?.toUpperCase()}</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{report.tradePlan.riskReward?.toFixed(1)}:1</div>
                <div className="text-xs text-muted-foreground">R/R Ratio</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-background/50 rounded p-2">
                <div className="text-muted-foreground text-xs">Win Rate</div>
                <div className="font-semibold">{report.tradePlan.winRateEstimate}%</div>
              </div>
              <div className="bg-background/50 rounded p-2">
                <div className="text-muted-foreground text-xs">Position</div>
                <div className="font-semibold">{report.tradePlan.positionSizePercent?.toFixed(1)}%</div>
              </div>
            </div>
          </div>

          {/* Entry Levels */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold text-cyan-500 mb-2 text-sm">Entry Levels</h3>
            {report.tradePlan.entries?.map((e, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                <span className="text-cyan-500">E{i + 1}</span>
                <span className="font-mono">{formatPrice(e.price)}</span>
                <span className="text-muted-foreground">{e.percentage}%</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 font-semibold">
              <span>Avg Entry</span>
              <span className="font-mono">{formatPrice(report.tradePlan.averageEntry)}</span>
            </div>
          </div>

          {/* Stop Loss */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <h3 className="font-semibold text-red-500 mb-2 text-sm">Stop Loss</h3>
            <div className="flex justify-between text-sm">
              <span className="font-mono text-lg">{formatPrice(report.tradePlan.stopLoss?.price)}</span>
              <span className="text-red-400">-{report.tradePlan.stopLoss?.percentage?.toFixed(2)}%</span>
            </div>
          </div>

          {/* Take Profits */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <h3 className="font-semibold text-green-500 mb-2 text-sm">Take Profits</h3>
            {report.tradePlan.takeProfits?.map((tp, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-green-500/10 last:border-0">
                <span className="text-green-500">TP{i + 1}</span>
                <span className="font-mono">{formatPrice(tp.price)}</span>
                <span className="text-green-400">+{tp.percentage?.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analysis Details - Compact Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Market Pulse */}
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-xs">1</span>
            Market Pulse
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Fear/Greed</span><span className="font-semibold">{report.marketPulse.fearGreedIndex}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">BTC Dom</span><span className="font-semibold">{report.marketPulse.btcDominance?.toFixed(1)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Regime</span><span className="font-semibold">{report.marketPulse.marketRegime}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Trend</span><span className="font-semibold">{report.marketPulse.trend?.direction}</span></div>
          </div>
        </div>

        {/* Asset Scan */}
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-xs">2</span>
            Asset Scan
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Price</span><span className="font-semibold">{formatPrice(report.assetScan.currentPrice)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">24h</span><span className={cn("font-semibold", report.assetScan.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500')}>{report.assetScan.priceChange24h?.toFixed(2)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">RSI</span><span className="font-semibold">{report.assetScan.indicators?.rsi?.toFixed(0)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">MACD</span><span className={cn("font-semibold", report.assetScan.indicators?.macd?.histogram > 0 ? 'text-green-500' : 'text-red-500')}>{report.assetScan.indicators?.macd?.histogram > 0 ? '+' : '-'}</span></div>
          </div>
        </div>

        {/* Safety Check */}
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-xs">3</span>
            Safety Check
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Risk</span><span className={cn("font-semibold uppercase", report.safetyCheck.riskLevel === 'high' ? 'text-red-500' : report.safetyCheck.riskLevel === 'medium' ? 'text-yellow-500' : 'text-green-500')}>{report.safetyCheck.riskLevel}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">P&D Risk</span><span className="font-semibold uppercase">{report.safetyCheck.manipulation?.pumpDumpRisk}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Whales</span><span className="font-semibold uppercase">{report.safetyCheck.whaleActivity?.bias}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Smart $</span><span className="font-semibold uppercase">{report.safetyCheck.smartMoney?.positioning}</span></div>
          </div>
        </div>

        {/* Trap Check */}
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-xs">6</span>
            Trap Check
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Bull Trap</span><span className={cn("font-semibold", report.trapCheck.traps?.bullTrap ? 'text-red-500' : 'text-green-500')}>{report.trapCheck.traps?.bullTrap ? 'YES' : 'NO'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Bear Trap</span><span className={cn("font-semibold", report.trapCheck.traps?.bearTrap ? 'text-red-500' : 'text-green-500')}>{report.trapCheck.traps?.bearTrap ? 'YES' : 'NO'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Fakeout</span><span className={cn("font-semibold uppercase", report.trapCheck.traps?.fakeoutRisk === 'high' ? 'text-red-500' : 'text-green-500')}>{report.trapCheck.traps?.fakeoutRisk}</span></div>
          </div>
        </div>
      </div>

      {/* Timing & Conditions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Timing */}
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-xs">4</span>
            Timing
            <span className={cn("ml-auto px-2 py-0.5 rounded text-xs font-medium", report.timing.tradeNow ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500')}>
              {report.timing.tradeNow ? 'TRADE NOW' : 'WAIT'}
            </span>
          </h3>
          {report.timing.entryZones?.length > 0 && (
            <div className="space-y-1">
              {report.timing.entryZones.slice(0, 3).map((zone, i) => (
                <div key={i} className="flex justify-between text-xs bg-muted/50 rounded p-2">
                  <span>Zone {i + 1}</span>
                  <span className="font-mono">{formatPrice(zone.priceLow)} - {formatPrice(zone.priceHigh)}</span>
                  <span className="text-muted-foreground">{zone.probability}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verdict Factors */}
        <div className="bg-card border rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <span className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center text-xs">7</span>
            Verdict Factors
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-green-500 mb-1">Positive</p>
              {report.verdict.confidenceFactors?.filter(f => f.positive).slice(0, 3).map((f, i) => (
                <div key={i} className="flex items-center gap-1 text-xs py-0.5">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="truncate">{f.factor}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs text-red-500 mb-1">Risks</p>
              {report.verdict.confidenceFactors?.filter(f => !f.positive).slice(0, 3).map((f, i) => (
                <div key={i} className="flex items-center gap-1 text-xs py-0.5">
                  <XCircle className="w-3 h-3 text-red-500" />
                  <span className="truncate">{f.factor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {report.verdict.aiSummary && (
        <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-blue-500 text-sm">AI Summary</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{report.verdict.aiSummary}</p>
        </div>
      )}

      {/* Compact Disclaimer */}
      <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
        <p className="text-xs text-muted-foreground text-center">
          <strong className="text-yellow-500">Disclaimer:</strong> This is not financial advice. Crypto trading carries significant risk. Always do your own research.
        </p>
      </div>
    </div>
  );
}
