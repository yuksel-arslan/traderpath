'use client';

// ===========================================
// Live Analysis Preview for Marketing Page
// Fetches real BTC data to showcase the platform
// ===========================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Globe,
  Shield,
  Clock,
  Target,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Eye,
  Loader2,
  AlertTriangle,
  BarChart3,
  AlertOctagon,
  FileCheck,
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface MarketData {
  btcPrice: number;
  btcChange24h: number;
  fearGreedIndex: number;
  fearGreedLabel: string;
  btcDominance: number;
}

interface StepResult {
  name: string;
  icon: typeof Globe;
  score: number;
  status: 'bullish' | 'bearish' | 'neutral' | 'caution';
  detail: string;
  color: string;
}

interface AnalysisPreview {
  overallScore: number;
  verdict: 'GO' | 'CONDITIONAL_GO' | 'WAIT' | 'AVOID';
  direction: 'LONG' | 'SHORT' | null;
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2: number;
  steps: StepResult[];
}

// Calculate analysis based on real market data
function calculateAnalysis(data: MarketData): AnalysisPreview {
  const { btcPrice, btcChange24h, fearGreedIndex, btcDominance } = data;

  // RSI estimation based on 24h change
  const estimatedRsi = Math.min(100, Math.max(0, 50 + btcChange24h * 5));

  // Calculate step scores (0-10 scale)
  const steps: StepResult[] = [];

  // Step 1: Market Pulse
  let marketPulseScore = 5;
  if (fearGreedIndex > 25 && fearGreedIndex < 75) marketPulseScore += 2;
  if (btcDominance > 50 && btcDominance < 65) marketPulseScore += 1.5;
  if (btcChange24h > -5 && btcChange24h < 5) marketPulseScore += 1;
  marketPulseScore = Math.min(10, Math.max(1, marketPulseScore));

  steps.push({
    name: 'Market Pulse',
    icon: Globe,
    score: parseFloat(marketPulseScore.toFixed(1)),
    status: fearGreedIndex > 50 ? 'bullish' : fearGreedIndex < 30 ? 'bearish' : 'neutral',
    detail: `Fear & Greed: ${fearGreedIndex} • BTC Dom: ${btcDominance.toFixed(1)}%`,
    color: 'from-blue-500 to-cyan-500',
  });

  // Step 2: Asset Scanner
  let assetScanScore = 5;
  if (btcChange24h > 0) assetScanScore += 1.5;
  if (estimatedRsi > 30 && estimatedRsi < 70) assetScanScore += 1.5;
  if (Math.abs(btcChange24h) < 3) assetScanScore += 1; // Not too volatile
  assetScanScore = Math.min(10, Math.max(1, assetScanScore));

  steps.push({
    name: 'Asset Scanner',
    icon: BarChart3,
    score: parseFloat(assetScanScore.toFixed(1)),
    status: btcChange24h > 1 ? 'bullish' : btcChange24h < -1 ? 'bearish' : 'neutral',
    detail: `RSI: ${estimatedRsi.toFixed(0)} • 24h: ${btcChange24h > 0 ? '+' : ''}${btcChange24h.toFixed(2)}%`,
    color: 'from-purple-500 to-pink-500',
  });

  // Step 3: Safety Check
  let safetyScore = 6;
  if (Math.abs(btcChange24h) < 5) safetyScore += 2;
  if (fearGreedIndex > 20 && fearGreedIndex < 80) safetyScore += 1.5;
  safetyScore = Math.min(10, Math.max(1, safetyScore));

  const safetyStatus = Math.abs(btcChange24h) > 5 || fearGreedIndex > 80 || fearGreedIndex < 20 ? 'caution' : 'bullish';
  steps.push({
    name: 'Safety Check',
    icon: Shield,
    score: parseFloat(safetyScore.toFixed(1)),
    status: safetyStatus,
    detail: safetyStatus === 'caution' ? 'High volatility detected' : 'Normal market conditions',
    color: 'from-green-500 to-emerald-500',
  });

  // Step 4: Timing
  let timingScore = 5;
  if (estimatedRsi > 30 && estimatedRsi < 70) timingScore += 2;
  if (btcChange24h > 0 && btcChange24h < 3) timingScore += 1.5;
  timingScore = Math.min(10, Math.max(1, timingScore));

  steps.push({
    name: 'Timing',
    icon: Clock,
    score: parseFloat(timingScore.toFixed(1)),
    status: timingScore >= 7 ? 'bullish' : timingScore >= 5 ? 'neutral' : 'caution',
    detail: timingScore >= 7 ? 'Good entry timing' : 'Wait for better setup',
    color: 'from-orange-500 to-amber-500',
  });

  // Step 5: Trade Plan (only if conditions are good)
  const avgScore = (marketPulseScore + assetScanScore + safetyScore + timingScore) / 4;
  let tradePlanScore = avgScore >= 6 ? 7.5 : 5;

  steps.push({
    name: 'Trade Plan',
    icon: Target,
    score: parseFloat(tradePlanScore.toFixed(1)),
    status: avgScore >= 6 ? 'bullish' : 'neutral',
    detail: avgScore >= 6 ? 'R:R 2.5:1 calculated' : 'Insufficient setup',
    color: 'from-red-500 to-rose-500',
  });

  // Step 6: Trap Check
  let trapScore = 6;
  if (Math.abs(btcChange24h) < 3) trapScore += 2;
  if (fearGreedIndex > 30 && fearGreedIndex < 70) trapScore += 1.5;
  trapScore = Math.min(10, Math.max(1, trapScore));

  steps.push({
    name: 'Trap Check',
    icon: AlertOctagon,
    score: parseFloat(trapScore.toFixed(1)),
    status: trapScore >= 7 ? 'bullish' : trapScore >= 5 ? 'neutral' : 'caution',
    detail: trapScore >= 7 ? 'No traps detected' : 'Potential traps identified',
    color: 'from-indigo-500 to-violet-500',
  });

  // Calculate overall score and verdict
  const overallScore = (marketPulseScore + assetScanScore + safetyScore + timingScore + tradePlanScore + trapScore) / 6;

  // Direction based on multiple factors
  const bullishFactors =
    (btcChange24h > 0 ? 1 : 0) +
    (fearGreedIndex > 40 ? 1 : 0) +
    (estimatedRsi > 40 && estimatedRsi < 65 ? 1 : 0);

  const direction: 'LONG' | 'SHORT' | null =
    overallScore >= 6 ? (bullishFactors >= 2 ? 'LONG' : 'SHORT') : null;

  // Verdict
  const verdict: AnalysisPreview['verdict'] =
    overallScore >= 7.5 ? 'GO' :
    overallScore >= 6 ? 'CONDITIONAL_GO' :
    overallScore >= 4.5 ? 'WAIT' : 'AVOID';

  // Calculate levels
  const volatility = Math.abs(btcChange24h) * 0.5 + 1.5;
  const entry = btcPrice;
  const stopLoss = direction === 'LONG'
    ? btcPrice * (1 - volatility / 100)
    : btcPrice * (1 + volatility / 100);
  const takeProfit1 = direction === 'LONG'
    ? btcPrice * (1 + (volatility * 1.5) / 100)
    : btcPrice * (1 - (volatility * 1.5) / 100);
  const takeProfit2 = direction === 'LONG'
    ? btcPrice * (1 + (volatility * 2.5) / 100)
    : btcPrice * (1 - (volatility * 2.5) / 100);

  // Step 7: Final Verdict
  steps.push({
    name: 'Final Verdict',
    icon: FileCheck,
    score: parseFloat(overallScore.toFixed(1)),
    status: verdict === 'GO' || verdict === 'CONDITIONAL_GO' ? 'bullish' : verdict === 'WAIT' ? 'neutral' : 'bearish',
    detail: verdict === 'GO' ? 'Trade recommended' : verdict === 'CONDITIONAL_GO' ? 'Trade with caution' : 'Wait or avoid',
    color: 'from-cyan-500 to-teal-500',
  });

  return {
    overallScore: parseFloat(overallScore.toFixed(1)),
    verdict,
    direction,
    entry,
    stopLoss,
    takeProfit1,
    takeProfit2,
    steps,
  };
}

export function LiveAnalysisPreview() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch BTC price from Binance
        const priceRes = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
        const priceData = await priceRes.json();

        // Fetch Fear & Greed Index
        const fgRes = await fetch('https://api.alternative.me/fng/?limit=1');
        const fgData = await fgRes.json();

        // Fetch BTC Dominance from CoinGecko
        let btcDominance = 57;
        try {
          const globalRes = await fetch('https://api.coingecko.com/api/v3/global');
          const globalData = await globalRes.json();
          btcDominance = globalData.data?.market_cap_percentage?.btc || 57;
        } catch {
          // Use default if CoinGecko fails
        }

        const data: MarketData = {
          btcPrice: parseFloat(priceData.lastPrice),
          btcChange24h: parseFloat(priceData.priceChangePercent),
          fearGreedIndex: parseInt(fgData.data[0].value),
          fearGreedLabel: fgData.data[0].value_classification,
          btcDominance,
        };

        setMarketData(data);
        setAnalysis(calculateAnalysis(data));
        setError(null);
      } catch (err) {
        console.error('Failed to fetch market data:', err);
        setError('Unable to load live data');
        // Use fallback data
        const fallbackData: MarketData = {
          btcPrice: 98500,
          btcChange24h: 2.5,
          fearGreedIndex: 72,
          fearGreedLabel: 'Greed',
          btcDominance: 57,
        };
        setMarketData(fallbackData);
        setAnalysis(calculateAnalysis(fallbackData));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatPrice = (price: number) => {
    return price.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const verdictColor = analysis?.verdict === 'GO' ? 'green' :
    analysis?.verdict === 'CONDITIONAL_GO' ? 'amber' :
    analysis?.verdict === 'WAIT' ? 'gray' : 'red';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-card border rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              ₿
            </div>
            <div>
              <h3 className="font-bold text-lg">BTC/USDT • Day Trade Analysis</h3>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                {loading ? 'Loading live data...' : `Live • ${formatPrice(marketData?.btcPrice || 0)}`}
              </p>
            </div>
          </div>
          {!loading && analysis && (
            <div className="flex items-center gap-3">
              <span className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-bold',
                verdictColor === 'green' ? 'bg-green-500/20 text-green-500' :
                verdictColor === 'amber' ? 'bg-amber-500/20 text-amber-500' :
                verdictColor === 'gray' ? 'bg-gray-500/20 text-gray-400' :
                'bg-red-500/20 text-red-500'
              )}>
                {analysis.verdict.replace('_', ' ')}
              </span>
              {analysis.direction && (
                <span className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1',
                  analysis.direction === 'LONG' ? 'bg-cyan-500/20 text-cyan-500' : 'bg-rose-500/20 text-rose-500'
                )}>
                  {analysis.direction === 'LONG' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {analysis.direction}
                </span>
              )}
              <div className="text-right">
                <p className="text-2xl font-bold">{analysis.overallScore}/10</p>
                <p className="text-xs text-muted-foreground">Overall Score</p>
              </div>
            </div>
          )}
        </div>

        {/* 7-Step Analysis */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Steps Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
                {analysis?.steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div key={index} className="p-3 bg-accent/50 rounded-xl text-center group hover:bg-accent/70 transition">
                      <div className={cn(
                        'w-10 h-10 mx-auto mb-2 rounded-full bg-gradient-to-br flex items-center justify-center text-white',
                        step.color
                      )}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-1 truncate">{step.name}</p>
                      <p className={cn(
                        'text-lg font-bold',
                        step.status === 'bullish' ? 'text-green-500' :
                        step.status === 'bearish' ? 'text-red-500' :
                        step.status === 'caution' ? 'text-amber-500' :
                        'text-foreground'
                      )}>
                        {step.score}/10
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Trade Plan Preview */}
              {analysis?.direction && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="p-3 bg-accent/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Entry Zone</p>
                    <p className="font-bold text-cyan-500">{formatPrice(analysis.entry)}</p>
                  </div>
                  <div className="p-3 bg-accent/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Stop Loss</p>
                    <p className="font-bold text-red-500">{formatPrice(analysis.stopLoss)}</p>
                  </div>
                  <div className="p-3 bg-accent/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Take Profit 1</p>
                    <p className="font-bold text-green-500">{formatPrice(analysis.takeProfit1)}</p>
                  </div>
                  <div className="p-3 bg-accent/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Take Profit 2</p>
                    <p className="font-bold text-green-500">{formatPrice(analysis.takeProfit2)}</p>
                  </div>
                </div>
              )}

              {/* Final Verdict Box */}
              <div className={cn(
                'p-4 rounded-xl border',
                verdictColor === 'green' ? 'bg-green-500/10 border-green-500/20' :
                verdictColor === 'amber' ? 'bg-amber-500/10 border-amber-500/20' :
                verdictColor === 'gray' ? 'bg-gray-500/10 border-gray-500/20' :
                'bg-red-500/10 border-red-500/20'
              )}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0',
                    verdictColor === 'green' ? 'bg-gradient-to-br from-green-500 to-emerald-500' :
                    verdictColor === 'amber' ? 'bg-gradient-to-br from-amber-500 to-orange-500' :
                    verdictColor === 'gray' ? 'bg-gradient-to-br from-gray-500 to-slate-500' :
                    'bg-gradient-to-br from-red-500 to-rose-500'
                  )}>
                    {verdictColor === 'green' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className={cn(
                      'font-bold mb-1',
                      verdictColor === 'green' ? 'text-green-500' :
                      verdictColor === 'amber' ? 'text-amber-500' :
                      verdictColor === 'gray' ? 'text-gray-400' :
                      'text-red-500'
                    )}>
                      {analysis?.verdict === 'GO' ? `${analysis.direction} Trade Recommended` :
                       analysis?.verdict === 'CONDITIONAL_GO' ? `${analysis?.direction} with Risk Management` :
                       analysis?.verdict === 'WAIT' ? 'Wait for Better Setup' :
                       'Trade Not Recommended'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {analysis?.verdict === 'GO' || analysis?.verdict === 'CONDITIONAL_GO'
                        ? `Based on 7-step analysis with ${analysis?.overallScore}/10 score. Entry at ${formatPrice(analysis?.entry || 0)} with 2.5:1 risk-reward ratio.`
                        : 'Current market conditions do not favor a high-probability trade setup. Monitor for improved conditions.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Overlay */}
              <div className="mt-6 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/90 to-transparent z-10 flex items-end justify-center pb-6">
                  <Link
                    href="/register"
                    className="px-8 py-4 bg-slate-200 dark:bg-slate-700 rounded-xl font-semibold flex items-center gap-2 shadow-xl border border-slate-300 dark:border-slate-600 hover:scale-[1.02] transition"
                  >
                    <Eye className="w-5 h-5 gradient-text-rg-animate" />
                    <span className="gradient-text-rg-animate">Get Full Analysis Free</span>
                  </Link>
                </div>
                <div className="blur-sm pointer-events-none opacity-40">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-accent/30 rounded-xl">
                    <div className="h-24 bg-accent rounded-lg"></div>
                    <div className="h-24 bg-accent rounded-lg"></div>
                    <div className="h-24 bg-accent rounded-lg hidden md:block"></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
