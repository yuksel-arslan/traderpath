'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authFetch } from '@/lib/api';
import {
  ArrowLeft,
  Globe,
  TrendingUp,
  TrendingDown,
  Loader2,
  Download,
  FileImage,
  FileText,
  Mail,
  ChevronDown,
  DollarSign,
  Landmark,
  Activity,
  BarChart3,
  Coins,
  Gem,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';

interface GlobalLiquidity {
  fedBalanceSheet: { value: number; change30d: number; trend: string };
  m2MoneySupply: { value: number; change30d: number; yoyGrowth: number };
  dxy: { value: number; change7d: number; trend: string };
  vix: { value: number; level: string };
  yieldCurve: { spread10y2y: number; inverted: boolean; interpretation: string };
  lastUpdated: string;
}

interface MarketFlow {
  market: string;
  currentValue: number;
  flow7d: number;
  flow30d: number;
  flowVelocity: number;
  phase: string;
  daysInPhase: number;
}

interface SectorFlow {
  name: string;
  flow7d: number;
  flow30d: number;
  dominance: number;
  trending: string;
  phase: string;
  topAssets: string[];
}

interface Recommendation {
  action: string;
  market: string;
  confidence: number;
  reasoning: string;
  direction?: string;
}

interface CapitalFlowReportData {
  liquidity: GlobalLiquidity;
  markets: MarketFlow[];
  sectors: SectorFlow[];
  recommendation: Recommendation;
  sellRecommendation?: Recommendation;
  liquidityBias: string;
  timestamp: string;
}

interface Report {
  id: string;
  symbol: string;
  verdict: string;
  score: number;
  direction: string | null;
  generatedAt: string;
  expiresAt: string;
  reportData: CapitalFlowReportData;
}

export default function CapitalFlowReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = params?.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!reportId) return;

    const fetchReport = async () => {
      try {
        const response = await authFetch(`/api/reports/${reportId}`);
        const result = await response.json();

        if (result.success) {
          setReport(result.data);
        } else {
          setError(result.error || 'Failed to load report');
        }
      } catch (err) {
        console.error('Failed to fetch report:', err);
        setError('Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  const handleExportPNG = async () => {
    if (!contentRef.current || exporting) return;
    setExporting(true);
    setExportDropdownOpen(false);

    try {
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#0B1120',
        scale: 3,
        logging: false,
        useCORS: true,
      });

      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.download = `TraderPath_CapitalFlow_${date}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export:', err);
      alert('Failed to export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportJPG = async () => {
    if (!contentRef.current || exporting) return;
    setExporting(true);
    setExportDropdownOpen(false);

    try {
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#0B1120',
        scale: 2.5,
        logging: false,
        useCORS: true,
      });

      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.download = `TraderPath_CapitalFlow_${date}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.95);
      link.click();
    } catch (err) {
      console.error('Failed to export:', err);
      alert('Failed to export. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportSnapshot = async () => {
    if (!contentRef.current || exporting) return;
    setExporting(true);
    setExportDropdownOpen(false);

    try {
      const canvas = await html2canvas(contentRef.current, {
        backgroundColor: '#0B1120',
        scale: 2,
        logging: false,
        useCORS: true,
      });

      const link = document.createElement('a');
      const date = new Date().toISOString().split('T')[0];
      link.download = `TraderPath_CapitalFlow_${date}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Failed to export snapshot:', err);
      alert('Failed to export snapshot. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p className="text-slate-600 dark:text-slate-400">{error || 'Report not found'}</p>
        <button
          onClick={() => router.push('/reports')}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </button>
      </div>
    );
  }

  const data = report.reportData;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/reports')}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Reports
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition"
            >
              {exporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export
              <ChevronDown className="w-4 h-4" />
            </button>

            {exportDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50">
                <button
                  onClick={handleExportPNG}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <FileImage className="w-4 h-4 text-teal-500" />
                  Download PNG
                </button>
                <button
                  onClick={handleExportJPG}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <FileImage className="w-4 h-4 text-blue-500" />
                  Download JPG
                </button>
                <button
                  onClick={handleExportSnapshot}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <FileText className="w-4 h-4 text-teal-500" />
                  Download Snapshot
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div ref={contentRef} className="max-w-7xl mx-auto px-4 py-8">
        {/* Report Header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
              <Globe className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Capital Flow Report</h1>
              <p className="text-slate-500 dark:text-slate-400">
                Generated: {new Date(report.generatedAt).toLocaleString()}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className={cn(
                "px-4 py-2 rounded-full text-sm font-bold",
                report.verdict.toUpperCase() === 'BUY' && "bg-emerald-500/20 text-emerald-400",
                report.verdict.toUpperCase() === 'SELL' && "bg-red-500/20 text-red-400",
                report.verdict.toUpperCase() !== 'BUY' && report.verdict.toUpperCase() !== 'SELL' && "bg-blue-500/20 text-blue-400"
              )}>
                {report.verdict.toUpperCase()}
              </span>
              <span className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium">
                {report.score}% Confidence
              </span>
            </div>
          </div>
        </div>

        {/* Layer 1: Global Liquidity */}
        {data.liquidity && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-blue-500" />
              Layer 1: Global Liquidity
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Fed Balance Sheet</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  ${data.liquidity.fedBalanceSheet?.value?.toFixed(2)}T
                </div>
                <div className={cn(
                  "text-sm flex items-center gap-1",
                  (data.liquidity.fedBalanceSheet?.change30d || 0) >= 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  {(data.liquidity.fedBalanceSheet?.change30d || 0) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {data.liquidity.fedBalanceSheet?.change30d?.toFixed(1)}%
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">M2 Money Supply</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  ${data.liquidity.m2MoneySupply?.value?.toFixed(2)}T
                </div>
                <div className={cn(
                  "text-sm flex items-center gap-1",
                  (data.liquidity.m2MoneySupply?.yoyGrowth || 0) >= 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  {(data.liquidity.m2MoneySupply?.yoyGrowth || 0) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {data.liquidity.m2MoneySupply?.yoyGrowth?.toFixed(1)}% YoY
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">DXY (Dollar Index)</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {data.liquidity.dxy?.value?.toFixed(2)}
                </div>
                <div className={cn(
                  "text-sm flex items-center gap-1",
                  (data.liquidity.dxy?.change7d || 0) >= 0 ? "text-red-500" : "text-emerald-500"
                )}>
                  {(data.liquidity.dxy?.change7d || 0) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {data.liquidity.dxy?.change7d?.toFixed(1)}% 7d
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">VIX (Fear Index)</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {data.liquidity.vix?.value?.toFixed(1)}
                </div>
                <div className={cn(
                  "text-sm capitalize",
                  data.liquidity.vix?.level === 'fear' || data.liquidity.vix?.level === 'extreme_fear' ? "text-red-500" : "text-emerald-500"
                )}>
                  {data.liquidity.vix?.level?.replace('_', ' ')}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Yield Curve</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white">
                  {data.liquidity.yieldCurve?.spread10y2y?.toFixed(2)}%
                </div>
                <div className={cn(
                  "text-sm",
                  data.liquidity.yieldCurve?.inverted ? "text-red-500" : "text-emerald-500"
                )}>
                  {data.liquidity.yieldCurve?.inverted ? 'Inverted' : 'Normal'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Layer 2: Market Flows */}
        {data.markets && data.markets.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-teal-500" />
              Layer 2: Market Flows
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.markets.map((market) => {
                const icons: Record<string, typeof Coins> = {
                  crypto: Coins,
                  stocks: Activity,
                  bonds: Landmark,
                  metals: Gem,
                };
                const Icon = icons[market.market] || Activity;
                return (
                  <div key={market.market} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-5 h-5 text-teal-500" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
                        {market.market}
                      </span>
                    </div>
                    <div className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                      ${(market.currentValue / 1e12).toFixed(2)}T
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-medium",
                        market.flow7d >= 0 ? "text-emerald-500" : "text-red-500"
                      )}>
                        {market.flow7d >= 0 ? '+' : ''}{market.flow7d?.toFixed(1)}% 7d
                      </span>
                      <span className={cn(
                        "px-2 py-0.5 text-xs rounded-full uppercase",
                        market.phase === 'early' && "bg-emerald-500/20 text-emerald-400",
                        market.phase === 'mid' && "bg-yellow-500/20 text-yellow-400",
                        market.phase === 'late' && "bg-orange-500/20 text-orange-400",
                        market.phase === 'exit' && "bg-red-500/20 text-red-400"
                      )}>
                        {market.phase}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Layer 3: Sectors */}
        {data.sectors && data.sectors.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-500" />
              Layer 3: Sector Activity
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.sectors.slice(0, 8).map((sector) => (
                <div key={sector.name} className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {sector.name}
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    {sector.trending === 'up' ? (
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                    ) : sector.trending === 'down' ? (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    ) : (
                      <Minus className="w-4 h-4 text-slate-400" />
                    )}
                    <span className={cn(
                      "text-sm font-medium",
                      sector.flow7d >= 0 ? "text-emerald-500" : "text-red-500"
                    )}>
                      {sector.flow7d >= 0 ? '+' : ''}{sector.flow7d?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {sector.dominance?.toFixed(1)}% dominance
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Layer 4: Recommendation */}
        {data.recommendation && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Layer 4: AI Recommendation
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* BUY Recommendation */}
              <div className={cn(
                "rounded-xl p-6",
                data.recommendation.action === 'BUY'
                  ? "bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30"
                  : "bg-slate-50 dark:bg-slate-800"
              )}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-emerald-500">{data.recommendation.action}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                      {data.recommendation.market}
                    </div>
                  </div>
                  <div className="ml-auto text-2xl font-bold text-emerald-500">
                    {data.recommendation.confidence}%
                  </div>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {data.recommendation.reasoning}
                </p>
              </div>

              {/* SELL Recommendation */}
              {data.sellRecommendation && (
                <div className={cn(
                  "rounded-xl p-6",
                  data.sellRecommendation.action === 'SELL'
                    ? "bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30"
                    : "bg-slate-50 dark:bg-slate-800"
                )}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                      <TrendingDown className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-red-500">{data.sellRecommendation.action}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                        {data.sellRecommendation.market}
                      </div>
                    </div>
                    <div className="ml-auto text-2xl font-bold text-red-500">
                      {data.sellRecommendation.confidence}%
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {data.sellRecommendation.reasoning}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Report ID: {report.id}
        </div>
      </div>
    </div>
  );
}
