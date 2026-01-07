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
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface MarketData {
  btcPrice: number;
  btcChange24h: number;
  fearGreedIndex: number;
  fearGreedLabel: string;
  btcDominance: number;
}

interface AnalysisPreview {
  score: number;
  verdict: 'GO' | 'CONDITIONAL_GO' | 'WAIT' | 'AVOID';
  direction: 'LONG' | 'SHORT';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  rsi: number;
  macdSignal: string;
  safetyStatus: string;
  whaleActivity: string;
}

// Calculate analysis based on real market data
function calculateAnalysis(data: MarketData): AnalysisPreview {
  const { btcPrice, btcChange24h, fearGreedIndex } = data;

  // RSI estimation based on 24h change
  const estimatedRsi = Math.min(100, Math.max(0, 50 + btcChange24h * 5));

  // MACD signal based on momentum
  const macdSignal =
    btcChange24h > 2
      ? 'Strong bullish momentum'
      : btcChange24h > 0
        ? 'Bullish crossover forming'
        : btcChange24h > -2
          ? 'Neutral consolidation'
          : 'Bearish pressure';

  // Direction based on multiple factors
  const bullishFactors =
    (btcChange24h > 0 ? 1 : 0) +
    (fearGreedIndex > 50 ? 1 : 0) +
    (estimatedRsi > 40 && estimatedRsi < 70 ? 1 : 0);

  const direction: 'LONG' | 'SHORT' = bullishFactors >= 2 ? 'LONG' : 'SHORT';

  // Calculate levels based on current price
  const volatility = Math.abs(btcChange24h) * 0.5 + 2; // 2-5% base volatility
  const entry = btcPrice;
  const stopLoss =
    direction === 'LONG'
      ? btcPrice * (1 - volatility / 100)
      : btcPrice * (1 + volatility / 100);
  const takeProfit =
    direction === 'LONG'
      ? btcPrice * (1 + (volatility * 2) / 100)
      : btcPrice * (1 - (volatility * 2) / 100);

  // Score calculation
  let score = 50;
  if (direction === 'LONG') {
    if (fearGreedIndex > 25 && fearGreedIndex < 75) score += 10; // Not extreme
    if (btcChange24h > 0) score += 15;
    if (estimatedRsi > 30 && estimatedRsi < 70) score += 10;
    if (data.btcDominance > 50) score += 5;
  } else {
    if (fearGreedIndex < 30) score += 15; // Fear = good for shorts
    if (btcChange24h < 0) score += 15;
    if (estimatedRsi > 70) score += 10; // Overbought
  }
  score = Math.min(95, Math.max(40, score));

  // Verdict based on score
  const verdict: AnalysisPreview['verdict'] =
    score >= 75 ? 'GO' : score >= 60 ? 'CONDITIONAL_GO' : score >= 45 ? 'WAIT' : 'AVOID';

  // Safety based on Fear & Greed
  const safetyStatus =
    fearGreedIndex > 80 || fearGreedIndex < 20 ? 'Caution advised' : 'Normal conditions';

  const whaleActivity =
    Math.abs(btcChange24h) > 5 ? 'High volatility detected' : 'Normal activity';

  return {
    score,
    verdict,
    direction,
    entry,
    stopLoss,
    takeProfit,
    rsi: Math.round(estimatedRsi),
    macdSignal,
    safetyStatus,
    whaleActivity,
  };
}

export function LiveAnalysisPreview() {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        let btcDominance = 57; // Default fallback
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
    // Refresh every 5 minutes
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

  const isLong = analysis?.direction === 'LONG';
  const verdictColor = analysis?.verdict === 'GO' || analysis?.verdict === 'CONDITIONAL_GO' ? 'green' : analysis?.verdict === 'WAIT' ? 'amber' : 'red';

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card border rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500/10 via-amber-500/10 to-green-500/10 p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full flex items-center justify-center text-white font-bold">
              ₿
            </div>
            <div>
              <h3 className="font-bold">BTC/USDT Analysis</h3>
              <p className="text-sm text-muted-foreground">
                {loading ? 'Loading...' : 'Live data • Auto-refreshes'}
              </p>
            </div>
          </div>
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          ) : (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1',
                  isLong ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                )}
              >
                {isLong ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isLong ? 'BULLISH' : 'BEARISH'}
              </span>
              <span className="text-2xl font-bold">{analysis?.score || 0}/100</span>
            </div>
          )}
        </div>

        {/* Analysis Steps Preview */}
        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Market Pulse */}
                <div className="p-4 bg-accent/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Globe className="w-5 h-5 text-amber-500" />
                    <span className="font-semibold">Market Pulse</span>
                    <span
                      className={cn(
                        'ml-auto text-sm',
                        marketData && marketData.fearGreedIndex > 50 ? 'text-green-500' : 'text-red-500'
                      )}
                    >
                      {marketData?.fearGreedLabel}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Fear & Greed: {marketData?.fearGreedIndex} ({marketData?.fearGreedLabel}) • BTC Dominance:{' '}
                    {marketData?.btcDominance.toFixed(1)}%
                  </p>
                </div>

                {/* Safety Check */}
                <div className="p-4 bg-accent/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-amber-500" />
                    <span className="font-semibold">Safety Check</span>
                    <span
                      className={cn(
                        'ml-auto text-sm',
                        analysis?.safetyStatus === 'Normal conditions' ? 'text-green-500' : 'text-amber-500'
                      )}
                    >
                      {analysis?.safetyStatus === 'Normal conditions' ? 'Safe' : 'Caution'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {analysis?.safetyStatus} • {analysis?.whaleActivity}
                  </p>
                </div>

                {/* Timing */}
                <div className="p-4 bg-accent/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-5 h-5 text-cyan-500" />
                    <span className="font-semibold">Timing Analysis</span>
                    <span
                      className={cn(
                        'ml-auto text-sm',
                        analysis && analysis.rsi > 30 && analysis.rsi < 70 ? 'text-cyan-500' : 'text-amber-500'
                      )}
                    >
                      {analysis && analysis.rsi > 30 && analysis.rsi < 70 ? 'Good' : 'Caution'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    RSI: {analysis?.rsi} • MACD: {analysis?.macdSignal}
                  </p>
                </div>

                {/* Trade Plan */}
                <div className="p-4 bg-accent/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-amber-500" />
                    <span className="font-semibold">Trade Plan</span>
                    <span className="ml-auto text-green-500 text-sm">Ready</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Entry: {formatPrice(analysis?.entry || 0)} • TP: {formatPrice(analysis?.takeProfit || 0)} • SL:{' '}
                    {formatPrice(analysis?.stopLoss || 0)}
                  </p>
                </div>
              </div>

              {/* Verdict */}
              <div
                className={cn(
                  'p-4 rounded-lg border',
                  verdictColor === 'green'
                    ? 'bg-green-500/10 border-green-500/20'
                    : verdictColor === 'amber'
                      ? 'bg-amber-500/10 border-amber-500/20'
                      : 'bg-red-500/10 border-red-500/20'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0',
                      verdictColor === 'green'
                        ? 'bg-gradient-to-br from-green-500 to-emerald-500'
                        : verdictColor === 'amber'
                          ? 'bg-gradient-to-br from-amber-500 to-orange-500'
                          : 'bg-gradient-to-br from-red-500 to-rose-500'
                    )}
                  >
                    {verdictColor === 'green' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4
                      className={cn(
                        'font-bold mb-1',
                        verdictColor === 'green'
                          ? 'text-green-500'
                          : verdictColor === 'amber'
                            ? 'text-amber-500'
                            : 'text-red-500'
                      )}
                    >
                      Final Verdict: {analysis?.direction} {analysis?.verdict === 'GO' ? 'Recommended' : analysis?.verdict === 'CONDITIONAL_GO' ? 'with Conditions' : analysis?.verdict === 'WAIT' ? '- Wait for Better Entry' : '- Not Recommended'}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {isLong
                        ? `Market conditions ${analysis?.score && analysis.score >= 70 ? 'favor bullish continuation' : 'suggest caution'}. Entry zone ${formatPrice((analysis?.entry || 0) * 0.995)}-${formatPrice((analysis?.entry || 0) * 1.005)} with ${((analysis?.takeProfit || 0) / (analysis?.entry || 1) - 1).toFixed(1)}:1 risk-reward ratio.`
                        : `Market conditions suggest ${analysis?.score && analysis.score >= 70 ? 'bearish pressure' : 'mixed signals'}. Consider short positions with proper risk management.`}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Blur overlay for full report */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-10 flex items-end justify-center pb-4">
              <Link
                href="/register"
                className="px-6 py-3 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold flex items-center gap-2 shadow-lg border border-slate-300 dark:border-slate-600"
              >
                <Eye className="w-5 h-5 gradient-text-rg-animate" />
                <span className="gradient-text-rg-animate">Get Full Analysis Free</span>
              </Link>
            </div>
            <div className="blur-sm pointer-events-none opacity-50">
              <div className="grid grid-cols-3 gap-4 p-4 bg-accent/30 rounded-lg">
                <div className="h-20 bg-accent rounded"></div>
                <div className="h-20 bg-accent rounded"></div>
                <div className="h-20 bg-accent rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
