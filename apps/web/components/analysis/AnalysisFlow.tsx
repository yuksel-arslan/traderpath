'use client';

// ===========================================
// 7-Step Analysis Flow - Immersive Experience
// Each step is a journey, not just a checkbox
// ===========================================

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Target,
  Shield,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  Lock,
  Loader2,
  ChevronRight,
  Play,
  Zap,
  Brain,
  TrendingUp,
  Eye
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { CREDIT_COSTS } from '@tradepath/types';
import { MarketPulse } from './MarketPulse';
import { AssetScanner } from './AssetScanner';
import { SafetyCheck } from './SafetyCheck';
import { TimingAnalysis } from './TimingAnalysis';
import { TradePlan } from './TradePlan';
import { TrapCheck } from './TrapCheck';
import { FinalVerdict } from './FinalVerdict';
import { DownloadReportButton } from '../reports/DownloadReportButton';

interface AnalysisFlowProps {
  symbol: string;
  accountSize?: number;
  onComplete?: () => void;
  onCreditsUpdate?: (remaining: number) => void;
}

// API endpoints for each step
const STEP_ENDPOINTS: Record<number, { url: string; method: string }> = {
  1: { url: '/api/analysis/market-pulse', method: 'GET' },
  2: { url: '/api/analysis/asset-scan', method: 'POST' },
  3: { url: '/api/analysis/safety-check', method: 'POST' },
  4: { url: '/api/analysis/timing', method: 'POST' },
  5: { url: '/api/analysis/trade-plan', method: 'POST' },
  6: { url: '/api/analysis/trap-check', method: 'POST' },
  7: { url: '/api/analysis/full', method: 'POST' },
};

// Detailed step information - educational content
const STEPS = [
  {
    id: 1,
    name: 'Market Pulse',
    icon: Globe,
    color: 'blue',
    cost: CREDIT_COSTS.STEP_MARKET_PULSE,
    shortDesc: 'Overall market analysis',
    fullDesc: 'Understand the current market environment before making any trade decision.',
    whyMatters: 'Even the best coin analysis fails in a crashing market. We check BTC dominance, Fear & Greed Index, and overall market trend to ensure conditions favor your trade.',
    checks: [
      'BTC Dominance & Trend',
      'Fear & Greed Index',
      'Market Regime (Bull/Bear/Neutral)',
      'Global Market Momentum'
    ],
    duration: '~5 seconds',
  },
  {
    id: 2,
    name: 'Asset Scanner',
    icon: Target,
    color: 'cyan',
    cost: CREDIT_COSTS.STEP_ASSET_SCANNER,
    shortDesc: 'Technical analysis',
    fullDesc: 'Deep dive into the specific asset using professional-grade technical indicators.',
    whyMatters: 'We analyze the coin across multiple timeframes using RSI, MACD, Bollinger Bands, and more. This reveals the true trend direction and momentum.',
    checks: [
      'Multi-Timeframe Analysis (15m, 1h, 4h, 1d)',
      'RSI with Wilder Smoothing',
      'MACD Momentum & Divergence',
      'Support & Resistance Levels'
    ],
    duration: '~8 seconds',
  },
  {
    id: 3,
    name: 'Safety Check',
    icon: Shield,
    color: 'orange',
    cost: CREDIT_COSTS.STEP_SAFETY_CHECK,
    shortDesc: 'Risk assessment',
    fullDesc: 'Detect manipulation, whale activity, and potential red flags that could trap you.',
    whyMatters: 'Crypto markets are full of manipulation. We scan for pump & dump schemes, wash trading, whale movements, and spoofing to protect your capital.',
    checks: [
      'Pump & Dump Detection',
      'Whale Activity Tracking',
      'Wash Trading Analysis',
      'Smart Money Positioning'
    ],
    duration: '~10 seconds',
  },
  {
    id: 4,
    name: 'Timing',
    icon: Clock,
    color: 'purple',
    cost: CREDIT_COSTS.STEP_TIMING,
    shortDesc: 'Entry optimization',
    fullDesc: 'Calculate the optimal entry point and timing for maximum edge.',
    whyMatters: 'Entering at the wrong time can turn a winning trade into a loser. We identify the best entry zones and tell you exactly when to pull the trigger.',
    checks: [
      'Optimal Entry Price Zones',
      'Entry Condition Checklist',
      'Wait-For Events',
      'Time-Based Triggers'
    ],
    duration: '~6 seconds',
  },
  {
    id: 5,
    name: 'Trade Plan',
    icon: FileText,
    color: 'indigo',
    cost: CREDIT_COSTS.STEP_TRADE_PLAN,
    shortDesc: 'Execution strategy',
    fullDesc: 'Complete trade execution plan with entries, exits, and position sizing.',
    whyMatters: 'Professional traders never enter without a plan. We calculate your exact entry levels, stop loss, take profit targets, and position size based on your risk tolerance.',
    checks: [
      'DCA Entry Levels',
      'Stop Loss Placement',
      'Multiple Take Profit Targets',
      'Risk/Reward Calculation'
    ],
    duration: '~8 seconds',
  },
  {
    id: 6,
    name: 'Trap Check',
    icon: AlertTriangle,
    color: 'red',
    cost: CREDIT_COSTS.STEP_TRAP_CHECK,
    shortDesc: 'Trap detection',
    fullDesc: 'Identify potential bull/bear traps and liquidation zones.',
    whyMatters: 'The market loves to trap retail traders. We scan for fakeouts, stop hunts, and liquidity grab zones so you don\'t become exit liquidity.',
    checks: [
      'Bull Trap Detection',
      'Bear Trap Detection',
      'Liquidity Grab Zones',
      'Stop Hunt Analysis'
    ],
    duration: '~7 seconds',
  },
  {
    id: 7,
    name: 'Final Verdict',
    icon: CheckCircle,
    color: 'green',
    cost: CREDIT_COSTS.STEP_FINAL_VERDICT,
    shortDesc: 'GO/NO-GO decision',
    fullDesc: 'AI-powered final recommendation combining all analysis steps.',
    whyMatters: 'This is the moment of truth. Our AI weighs all factors from previous steps and gives you a clear verdict: GO, WAIT, or AVOID with confidence scores.',
    checks: [
      'Weighted Component Scores',
      'Confidence Factors',
      'Risk-Adjusted Recommendation',
      'AI-Powered Summary'
    ],
    duration: '~3 seconds',
  },
];

const colorClasses = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500', ring: 'ring-blue-500' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-500', ring: 'ring-cyan-500' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-500', ring: 'ring-orange-500' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-500', ring: 'ring-purple-500' },
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-500', ring: 'ring-indigo-500' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500', ring: 'ring-red-500' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-500', ring: 'ring-green-500' },
};

export function AnalysisFlow({ symbol, accountSize = 10000, onComplete, onCreditsUpdate }: AnalysisFlowProps) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'intro' | 'result'>('intro');
  const [loading, setLoading] = useState(false);
  const [isRunningFull, setIsRunningFull] = useState(false);
  const [results, setResults] = useState<Record<number, unknown>>({});
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const callStepAPI = useCallback(async (stepId: number) => {
    const endpoint = STEP_ENDPOINTS[stepId];
    if (!endpoint) throw new Error('Invalid step');

    const options: RequestInit = {
      method: endpoint.method,
      headers: getAuthHeaders(),
    };

    if (endpoint.method === 'POST') {
      options.body = JSON.stringify({ symbol, accountSize });
    }

    const response = await fetch(endpoint.url, options);
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 402) {
        throw new Error('Insufficient credits. Please purchase more credits.');
      }
      throw new Error(data.error?.message || 'Analysis failed');
    }

    if (data.remainingCredits !== undefined && onCreditsUpdate) {
      onCreditsUpdate(data.remainingCredits);
    }

    return data.data;
  }, [symbol, accountSize, getAuthHeaders, onCreditsUpdate]);

  const handleRunStep = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const data = await callStepAPI(activeStep);

      setCompletedSteps((prev) => [...prev, activeStep]);
      setResults((prev) => ({ ...prev, [activeStep]: data }));
      setViewMode('result');
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (activeStep < 7) {
      setActiveStep(activeStep + 1);
      setViewMode('intro');
    }
  };

  const handleViewResult = (stepId: number) => {
    if (completedSteps.includes(stepId)) {
      setActiveStep(stepId);
      setViewMode('result');
    }
  };

  const handleRunFullAnalysis = async () => {
    setIsRunningFull(true);
    setError(null);
    setActiveStep(1);
    setViewMode('intro');

    try {
      const response = await fetch('/api/analysis/full', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ symbol, accountSize }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402) {
          throw new Error('Insufficient credits (15 required). Please purchase more credits.');
        }
        throw new Error(data.error?.message || 'Full analysis failed');
      }

      if (data.remainingCredits !== undefined && onCreditsUpdate) {
        onCreditsUpdate(data.remainingCredits);
      }

      const analysisData = data.data;
      const steps = analysisData.steps;

      const allResults: Record<number, unknown> = {
        1: steps.marketPulse,
        2: steps.assetScan,
        3: steps.safetyCheck,
        4: steps.timing,
        5: steps.tradePlan,
        6: steps.trapCheck,
        7: steps.verdict,
      };

      // Animate through steps with proper pacing
      for (let stepId = 1; stepId <= 7; stepId++) {
        setActiveStep(stepId);
        setViewMode('intro');
        await new Promise((resolve) => setTimeout(resolve, 600));

        setCompletedSteps((prev) => [...prev, stepId]);
        setResults((prev) => ({ ...prev, [stepId]: allResults[stepId] }));
        setViewMode('result');
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }

      onComplete?.();
    } catch (err) {
      console.error('Full analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Full analysis failed');
    } finally {
      setIsRunningFull(false);
    }
  };

  const currentStep = STEPS[activeStep - 1];
  const colors = colorClasses[currentStep.color as keyof typeof colorClasses];
  const isStepCompleted = completedSteps.includes(activeStep);
  const canProceed = activeStep === 1 || completedSteps.includes(activeStep - 1);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const stepColors = colorClasses[step.color as keyof typeof colorClasses];
            const completed = completedSteps.includes(step.id);
            const active = activeStep === step.id;
            const unlocked = step.id === 1 || completedSteps.includes(step.id - 1);

            return (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => completed && handleViewResult(step.id)}
                  disabled={!completed}
                  className={cn(
                    'relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                    completed && `${stepColors.bg} border-current ${stepColors.text}`,
                    active && !completed && `ring-2 ${stepColors.ring} border-current ${stepColors.text}`,
                    !unlocked && 'bg-muted border-muted-foreground/20 text-muted-foreground',
                    unlocked && !completed && !active && 'bg-background border-muted-foreground/30',
                    completed && 'cursor-pointer hover:scale-110'
                  )}
                >
                  {completed ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : !unlocked ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </button>
                {index < STEPS.length - 1 && (
                  <div className={cn(
                    'flex-1 h-1 mx-2 rounded',
                    completed ? 'bg-green-500' : 'bg-muted'
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Labels */}
        <div className="flex items-center justify-between text-[10px]">
          {STEPS.map((step) => (
            <div key={step.id} className="w-10 text-center text-muted-foreground">
              {step.name.split(' ')[0]}
            </div>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center gap-2"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Active Step Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeStep}-${viewMode}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'rounded-xl border-2 overflow-hidden',
            colors.border
          )}
        >
          {/* Step Header */}
          <div className={cn('p-6', colors.bg)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-14 h-14 rounded-xl flex items-center justify-center',
                  'bg-background/50 backdrop-blur',
                  colors.text
                )}>
                  <currentStep.icon className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Step {activeStep} of 7</span>
                    {isStepCompleted && (
                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                        Completed
                      </span>
                    )}
                  </div>
                  <h2 className={cn('text-2xl font-bold', colors.text)}>
                    {currentStep.name}
                  </h2>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-muted-foreground">Cost</div>
                <div className={cn('text-xl font-bold', colors.text)}>
                  {currentStep.cost === 0 ? 'FREE' : `${currentStep.cost} credits`}
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-6">
            {viewMode === 'intro' && !isStepCompleted ? (
              /* Step Introduction */
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{currentStep.fullDesc}</h3>
                  <p className="text-muted-foreground">{currentStep.whyMatters}</p>
                </div>

                {/* What We Check */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    What We Analyze
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {currentStep.checks.map((check, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <ChevronRight className={cn('w-4 h-4', colors.text)} />
                        <span>{check}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="w-4 h-4" />
                    <span>Analysis time: {currentStep.duration}</span>
                  </div>

                  {canProceed ? (
                    <button
                      onClick={handleRunStep}
                      disabled={loading || isRunningFull}
                      className={cn(
                        'px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all',
                        'bg-gradient-to-r from-blue-500 to-purple-600 text-white',
                        'hover:shadow-lg hover:scale-105',
                        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
                      )}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          Run {currentStep.name}
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Lock className="w-4 h-4" />
                      <span>Complete previous step first</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Step Results */
              <div className="space-y-6">
                {activeStep === 1 && <MarketPulse data={results[1]} />}
                {activeStep === 2 && <AssetScanner data={results[2]} symbol={symbol} />}
                {activeStep === 3 && <SafetyCheck data={results[3]} symbol={symbol} />}
                {activeStep === 4 && <TimingAnalysis data={results[4]} symbol={symbol} />}
                {activeStep === 5 && <TradePlan data={results[5]} symbol={symbol} />}
                {activeStep === 6 && <TrapCheck data={results[6]} symbol={symbol} />}
                {activeStep === 7 && <FinalVerdict data={results[7]} symbol={symbol} />}

                {/* Download Report Button - Shows when all 7 steps are completed */}
                {activeStep === 7 && isStepCompleted && completedSteps.length === 7 && (
                  <div className="flex justify-center pt-6 border-t mt-6">
                    <DownloadReportButton
                      analysisData={results}
                      symbol={symbol}
                    />
                  </div>
                )}

                {/* Next Step Button */}
                {activeStep < 7 && isStepCompleted && (
                  <div className="flex justify-end pt-4 border-t">
                    <button
                      onClick={handleNextStep}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition"
                    >
                      Continue to {STEPS[activeStep].name}
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Full Analysis Bundle CTA */}
      {completedSteps.length === 0 && !isRunningFull && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-6 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-xl border border-blue-500/20"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Full Analysis Bundle</h3>
                <p className="text-sm text-muted-foreground">
                  Run all 7 steps automatically and save 25% on credits
                </p>
              </div>
            </div>
            <button
              onClick={handleRunFullAnalysis}
              disabled={isRunningFull}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition-all flex items-center gap-2"
            >
              <TrendingUp className="w-5 h-5" />
              Run Full Analysis (15 credits)
            </button>
          </div>
        </motion.div>
      )}

      {/* Running Full Analysis Indicator */}
      {isRunningFull && (
        <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="font-medium">Running full analysis...</span>
            <span className="text-sm text-muted-foreground">
              Step {activeStep} of 7: {STEPS[activeStep - 1].name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
