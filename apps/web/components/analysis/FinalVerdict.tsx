'use client';

import { CheckCircle, XCircle, AlertCircle, TrendingUp, TrendingDown, Minus, Brain, Target, MessageSquare } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '../../lib/utils';
import { TradePlanChart } from './TradePlanChart';

interface ComponentScore {
  step: string;
  score: number;
  weight: number;
}

interface ConfidenceFactor {
  factor: string;
  positive: boolean;
  impact: 'high' | 'medium' | 'low';
}

interface TradePlanData {
  direction?: 'long' | 'short';
  entries?: { price: number; percentage: number }[];
  averageEntry?: number;
  stopLoss?: { price: number; percentage: number };
  takeProfits?: { price: number; percentage: number; riskReward: number }[];
  currentPrice?: number;
  support?: number[];
  resistance?: number[];
}

// Step result interfaces
interface MarketPulseData {
  btcTrend?: string;
  btcDominance?: number;
  marketRegime?: string;
  fearGreedIndex?: number;
  overallSentiment?: string;
}

interface AssetScannerData {
  trend?: string;
  trendStrength?: string;
  rsiValue?: number;
  macdSignal?: string;
  overallSignal?: string;
  volatility?: string;
}

interface SafetyCheckData {
  overallRisk?: string;
  pumpDumpRisk?: string;
  whaleActivity?: string;
  washTradingRisk?: string;
  smartMoneyFlow?: string;
}

interface TimingData {
  entryTiming?: string;
  optimalEntry?: string;
  entryConditions?: string[];
  waitForEvents?: string[];
}

interface TrapCheckData {
  bullTrapRisk?: string;
  bearTrapRisk?: string;
  liquidationZones?: string;
  stopHuntRisk?: string;
}

// AllResults is Record<number, unknown> from AnalysisFlow
type AllResultsData = Record<number, unknown>;

interface FinalVerdictData {
  overallScore: number;
  verdict: 'go' | 'conditional_go' | 'wait' | 'avoid';
  componentScores: ComponentScore[];
  confidenceFactors: ConfidenceFactor[];
  recommendation: string;
  analysisId: string;
  createdAt: string;
  expiresAt: string;
  aiVerdict?: string;
}

interface FinalVerdictProps {
  data?: FinalVerdictData;
  symbol: string;
  allResults?: AllResultsData;
}

export function FinalVerdict({ data, symbol, allResults }: FinalVerdictProps) {
  const router = useRouter();

  if (!data) {
    return (
      <div className="p-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          Final Verdict - {symbol}
        </h3>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // Extract all step data from allResults
  const marketPulse = allResults?.[1] as MarketPulseData | undefined;
  const assetScanner = allResults?.[2] as AssetScannerData | undefined;
  const safetyCheck = allResults?.[3] as SafetyCheckData | undefined;
  const timing = allResults?.[4] as TimingData | undefined;
  const tradePlan = allResults?.[5] as TradePlanData | undefined;
  const trapCheck = allResults?.[6] as TrapCheckData | undefined;

  // Check if we have valid trade plan data for the chart
  const hasValidTradePlan = tradePlan &&
    tradePlan.direction &&
    tradePlan.entries?.length &&
    tradePlan.stopLoss?.price &&
    tradePlan.takeProfits?.length;

  // Build comprehensive context message with all 7 steps
  const buildComprehensiveContext = () => {
    const sections: string[] = [];

    // Header
    sections.push(`📊 FULL ${symbol} ANALYSIS REPORT`);
    sections.push(`═══════════════════════════════════════`);
    sections.push('');

    // Step 1: Market Pulse
    sections.push('📈 STEP 1: MARKET PULSE');
    if (marketPulse) {
      if (marketPulse.marketRegime) sections.push(`• Market Regime: ${marketPulse.marketRegime}`);
      if (marketPulse.btcTrend) sections.push(`• BTC Trend: ${marketPulse.btcTrend}`);
      if (marketPulse.btcDominance) sections.push(`• BTC Dominance: ${marketPulse.btcDominance}%`);
      if (marketPulse.fearGreedIndex) sections.push(`• Fear & Greed: ${marketPulse.fearGreedIndex}`);
      if (marketPulse.overallSentiment) sections.push(`• Overall Sentiment: ${marketPulse.overallSentiment}`);
    } else {
      sections.push('• Data not available');
    }
    sections.push('');

    // Step 2: Asset Scanner
    sections.push('🎯 STEP 2: ASSET SCANNER');
    if (assetScanner) {
      if (assetScanner.trend) sections.push(`• Trend: ${assetScanner.trend}`);
      if (assetScanner.trendStrength) sections.push(`• Trend Strength: ${assetScanner.trendStrength}`);
      if (assetScanner.rsiValue) sections.push(`• RSI: ${assetScanner.rsiValue}`);
      if (assetScanner.macdSignal) sections.push(`• MACD Signal: ${assetScanner.macdSignal}`);
      if (assetScanner.overallSignal) sections.push(`• Overall Signal: ${assetScanner.overallSignal}`);
      if (assetScanner.volatility) sections.push(`• Volatility: ${assetScanner.volatility}`);
    } else {
      sections.push('• Data not available');
    }
    sections.push('');

    // Step 3: Safety Check
    sections.push('🛡️ STEP 3: SAFETY CHECK');
    if (safetyCheck) {
      if (safetyCheck.overallRisk) sections.push(`• Overall Risk: ${safetyCheck.overallRisk}`);
      if (safetyCheck.pumpDumpRisk) sections.push(`• Pump & Dump Risk: ${safetyCheck.pumpDumpRisk}`);
      if (safetyCheck.whaleActivity) sections.push(`• Whale Activity: ${safetyCheck.whaleActivity}`);
      if (safetyCheck.washTradingRisk) sections.push(`• Wash Trading Risk: ${safetyCheck.washTradingRisk}`);
      if (safetyCheck.smartMoneyFlow) sections.push(`• Smart Money Flow: ${safetyCheck.smartMoneyFlow}`);
    } else {
      sections.push('• Data not available');
    }
    sections.push('');

    // Step 4: Timing Analysis
    sections.push('⏰ STEP 4: TIMING ANALYSIS');
    if (timing) {
      if (timing.entryTiming) sections.push(`• Entry Timing: ${timing.entryTiming}`);
      if (timing.optimalEntry) sections.push(`• Optimal Entry: ${timing.optimalEntry}`);
      if (timing.entryConditions?.length) {
        sections.push(`• Entry Conditions: ${timing.entryConditions.join(', ')}`);
      }
      if (timing.waitForEvents?.length) {
        sections.push(`• Wait For: ${timing.waitForEvents.join(', ')}`);
      }
    } else {
      sections.push('• Data not available');
    }
    sections.push('');

    // Step 5: Trade Plan
    sections.push('📋 STEP 5: TRADE PLAN');
    if (tradePlan && hasValidTradePlan) {
      sections.push(`• Direction: ${tradePlan.direction?.toUpperCase()}`);
      sections.push(`• Entry: $${tradePlan.entries?.[0]?.price?.toLocaleString()} (${tradePlan.entries?.length} levels)`);
      sections.push(`• Stop Loss: $${tradePlan.stopLoss?.price?.toLocaleString()} (${tradePlan.stopLoss?.percentage?.toFixed(1)}%)`);
      tradePlan.takeProfits?.forEach((tp, i) => {
        sections.push(`• TP${i + 1}: $${tp.price?.toLocaleString()} (${tp.riskReward?.toFixed(1)}R)`);
      });
    } else {
      sections.push('• Data not available');
    }
    sections.push('');

    // Step 6: Trap Check
    sections.push('⚠️ STEP 6: TRAP CHECK');
    if (trapCheck) {
      if (trapCheck.bullTrapRisk) sections.push(`• Bull Trap Risk: ${trapCheck.bullTrapRisk}`);
      if (trapCheck.bearTrapRisk) sections.push(`• Bear Trap Risk: ${trapCheck.bearTrapRisk}`);
      if (trapCheck.liquidationZones) sections.push(`• Liquidation Zones: ${trapCheck.liquidationZones}`);
      if (trapCheck.stopHuntRisk) sections.push(`• Stop Hunt Risk: ${trapCheck.stopHuntRisk}`);
    } else {
      sections.push('• Data not available');
    }
    sections.push('');

    // Step 7: Final Verdict
    sections.push('✅ STEP 7: FINAL VERDICT');
    sections.push(`• Verdict: ${data.verdict?.toUpperCase()}`);
    sections.push(`• Score: ${data.overallScore}/10`);
    if (data.recommendation) {
      sections.push(`• Recommendation: ${data.recommendation}`);
    }
    sections.push('');

    // Question for AI Expert
    sections.push('═══════════════════════════════════════');
    sections.push('');
    sections.push('Based on this complete 7-step analysis, please provide your expert opinion:');
    sections.push('1. Do you agree with the overall verdict?');
    sections.push('2. Are there any additional risks I should consider?');
    sections.push('3. What would you change in this trade plan?');
    sections.push('4. Is the risk/reward ratio acceptable?');

    return sections.join('\n');
  };

  // Create trade plan context for AI Expert
  const handleAskAIExpert = () => {
    const contextMessage = buildComprehensiveContext();

    // Encode and navigate to AI Expert (Nexus - Risk Assessment)
    const encodedContext = encodeURIComponent(contextMessage);
    router.push(`/ai-expert/nexus?context=${encodedContext}`);
  };

  const getVerdictStyle = () => {
    switch (data.verdict) {
      case 'go': return 'from-green-500/20 to-green-500/5 border-green-500/30';
      case 'conditional_go': return 'from-blue-500/20 to-blue-500/5 border-blue-500/30';
      case 'wait': return 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30';
      case 'avoid': return 'from-red-500/20 to-red-500/5 border-red-500/30';
      default: return 'from-gray-500/20 to-gray-500/5 border-gray-500/30';
    }
  };

  const getVerdictIcon = () => {
    switch (data.verdict) {
      case 'go': return <TrendingUp className="w-8 h-8 text-green-500" />;
      case 'conditional_go': return <Target className="w-8 h-8 text-blue-500" />;
      case 'wait': return <Minus className="w-8 h-8 text-yellow-500" />;
      case 'avoid': return <TrendingDown className="w-8 h-8 text-red-500" />;
      default: return <Minus className="w-8 h-8 text-gray-500" />;
    }
  };

  const getVerdictColor = () => {
    switch (data.verdict) {
      case 'go': return 'text-green-500';
      case 'conditional_go': return 'text-blue-500';
      case 'wait': return 'text-yellow-500';
      case 'avoid': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getVerdictLabel = () => {
    switch (data.verdict) {
      case 'go': return 'GO';
      case 'conditional_go': return 'CONDITIONAL GO';
      case 'wait': return 'WAIT';
      case 'avoid': return 'AVOID';
      default: return 'UNKNOWN';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 7) return 'text-green-500';
    if (score >= 5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 7) return 'bg-green-500';
    if (score >= 5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getImpactStyle = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-purple-500/20 text-purple-400';
      case 'medium': return 'bg-blue-500/20 text-blue-400';
      case 'low': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const positiveFactors = data.confidenceFactors?.filter(f => f.positive) || [];
  const negativeFactors = data.confidenceFactors?.filter(f => !f.positive) || [];

  return (
    <div className="space-y-6">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <CheckCircle className="w-5 h-5 text-emerald-500" />
        Final Verdict - {symbol}
      </h3>

      {/* Main Verdict Card */}
      <div className={cn("p-6 rounded-lg bg-gradient-to-br border", getVerdictStyle())}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {getVerdictIcon()}
            <div>
              <p className="text-sm text-muted-foreground">Overall Verdict</p>
              <p className={cn("text-3xl font-bold uppercase", getVerdictColor())}>
                {getVerdictLabel()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Score</p>
            <p className={cn("text-4xl font-bold", getScoreColor(data.overallScore ?? 0))}>
              {data.overallScore ?? 0}<span className="text-lg text-muted-foreground">/10</span>
            </p>
          </div>
        </div>

        {/* Recommendation */}
        <div className="mt-4 p-3 bg-background/50 rounded-lg">
          <p className="text-sm">{data.recommendation}</p>
        </div>
      </div>

      {/* Trade Plan Chart - TradingView Lightweight Charts */}
      {hasValidTradePlan && (
        <TradePlanChart
          symbol={symbol}
          direction={tradePlan.direction!}
          entries={tradePlan.entries!}
          stopLoss={tradePlan.stopLoss!}
          takeProfits={tradePlan.takeProfits!}
          currentPrice={tradePlan.currentPrice || tradePlan.averageEntry || tradePlan.entries![0].price}
          support={tradePlan.support}
          resistance={tradePlan.resistance}
        />
      )}

      {/* Ask AI Expert Button - Always show with full analysis */}
      <div className="flex justify-center">
        <button
          onClick={handleAskAIExpert}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105 transition-all duration-200"
        >
          <MessageSquare className="w-5 h-5" />
          Ask AI Expert to Review Full Analysis
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">NEXUS</span>
        </button>
      </div>

      {/* Component Scores - Premium Radial Design */}
      {data.componentScores && data.componentScores.length > 0 && (
        <div className="bg-card rounded-xl p-5 border">
          <h4 className="font-semibold mb-5 text-lg">Component Scores</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {data.componentScores.map((cs, i) => {
              const score = cs.score ?? 0;
              const weight = cs.weight ?? 0;
              const percentage = (score / 10) * 100;
              const circumference = 2 * Math.PI * 36;
              const offset = circumference - (percentage / 100) * circumference;

              // Dynamic colors based on score
              const getGaugeColor = () => {
                if (score >= 7) return { stroke: '#22c55e', glow: 'rgba(34, 197, 94, 0.4)', bg: 'bg-green-500/10' };
                if (score >= 5) return { stroke: '#eab308', glow: 'rgba(234, 179, 8, 0.4)', bg: 'bg-yellow-500/10' };
                return { stroke: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)', bg: 'bg-red-500/10' };
              };

              const gaugeColor = getGaugeColor();

              return (
                <div key={i} className="group flex flex-col items-center">
                  {/* Radial Gauge */}
                  <div className="relative w-24 h-24 mb-2">
                    {/* Outer Glow */}
                    <div
                      className="absolute inset-2 rounded-full blur-lg opacity-50 group-hover:opacity-70 transition-opacity"
                      style={{ backgroundColor: gaugeColor.glow }}
                    />

                    {/* SVG Gauge */}
                    <svg className="w-24 h-24 transform -rotate-90 relative z-10" viewBox="0 0 80 80">
                      {/* Background Circle */}
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="6"
                        className="text-muted/30"
                      />

                      {/* Progress Arc */}
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        fill="none"
                        stroke={gaugeColor.stroke}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{
                          transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)',
                          filter: `drop-shadow(0 0 8px ${gaugeColor.glow})`
                        }}
                      />

                      {/* Tick marks */}
                      {[0, 72, 144, 216, 288].map((angle) => (
                        <line
                          key={angle}
                          x1={40 + 30 * Math.cos((angle - 90) * Math.PI / 180)}
                          y1={40 + 30 * Math.sin((angle - 90) * Math.PI / 180)}
                          x2={40 + 34 * Math.cos((angle - 90) * Math.PI / 180)}
                          y2={40 + 34 * Math.sin((angle - 90) * Math.PI / 180)}
                          stroke="currentColor"
                          strokeWidth="1"
                          className="text-muted-foreground/30"
                        />
                      ))}
                    </svg>

                    {/* Center Score */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                      <span
                        className="text-xl font-black"
                        style={{ color: gaugeColor.stroke }}
                      >
                        {score.toFixed(1)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">/10</span>
                    </div>

                    {/* Weight Badge */}
                    <div className={cn(
                      "absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-background shadow-lg z-30",
                      gaugeColor.bg
                    )}>
                      <span style={{ color: gaugeColor.stroke }}>{(weight * 100).toFixed(0)}%</span>
                    </div>
                  </div>

                  {/* Step Name */}
                  <span className="text-xs font-medium text-center text-muted-foreground group-hover:text-foreground transition-colors line-clamp-2">
                    {cs.step || `Step ${i + 1}`}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-5 pt-4 border-t border-border/50">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-[11px] text-muted-foreground">≥7 Strong</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              <span className="text-[11px] text-muted-foreground">5-7 Moderate</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-[11px] text-muted-foreground">&lt;5 Weak</span>
            </div>
          </div>
        </div>
      )}

      {/* Confidence Factors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
          <h4 className="font-medium text-green-500 flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4" />
            Bullish Factors
          </h4>
          <ul className="space-y-2">
            {positiveFactors.length > 0 ? positiveFactors.map((factor, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="flex-1">{factor.factor}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded", getImpactStyle(factor.impact))}>
                  {factor.impact}
                </span>
              </li>
            )) : (
              <li className="text-sm text-muted-foreground">No bullish factors identified</li>
            )}
          </ul>
        </div>

        <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
          <h4 className="font-medium text-red-500 flex items-center gap-2 mb-3">
            <XCircle className="w-4 h-4" />
            Risk Factors
          </h4>
          <ul className="space-y-2">
            {negativeFactors.length > 0 ? negativeFactors.map((factor, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="flex-1">{factor.factor}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded", getImpactStyle(factor.impact))}>
                  {factor.impact}
                </span>
              </li>
            )) : (
              <li className="text-sm text-muted-foreground">No risk factors identified</li>
            )}
          </ul>
        </div>
      </div>

      {/* AI Verdict */}
      {data.aiVerdict && (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-4 border border-blue-500/20">
          <div className="flex items-start gap-3">
            <Brain className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-purple-500 mb-1">AI Analysis</p>
              <p className="text-sm whitespace-pre-wrap">{data.aiVerdict}</p>
            </div>
          </div>
        </div>
      )}

      {/* Meta Info */}
      {(data.analysisId || data.expiresAt) && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {data.analysisId && <span>Analysis ID: {data.analysisId}</span>}
          {data.expiresAt && <span>Valid until: {new Date(data.expiresAt).toLocaleString()}</span>}
        </div>
      )}
    </div>
  );
}
