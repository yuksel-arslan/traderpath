'use client';

// ===========================================
// 7-Step Analysis Flow
// Smart Mode: Educational (step-by-step) vs Quick (one-click)
// ===========================================

import { useState, useCallback, useEffect, useRef } from 'react';
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
  Eye,
  GraduationCap,
  Rocket,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAuthToken, getApiUrl } from '../../lib/api';
import { CREDIT_COSTS } from '@traderpath/types';
import { MarketPulse } from './MarketPulse';
import { AssetScanner } from './AssetScanner';
import { SafetyCheck } from './SafetyCheck';
import { TimingAnalysis } from './TimingAnalysis';
import { TradePlan } from './TradePlan';
import { TrapCheck } from './TrapCheck';
import { FinalVerdict } from './FinalVerdict';
import { TradePlanChart } from './TradePlanChart';
import { DownloadReportButton } from '../reports/DownloadReportButton';
import { AnalysisProgressBar } from './AnalysisProgressBar';

type TradeType = 'scalping' | 'dayTrade' | 'swing';

interface AnalysisFlowProps {
  symbol: string;
  tradeType?: TradeType;
  interval?: string;
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
  5: { url: '/api/analysis/trap-check', method: 'POST' },
  6: { url: '/api/analysis/trade-plan', method: 'POST' },
  7: { url: '/api/analysis/full', method: 'POST' },
};

// Step definitions - NEW ORDER: Trap Check before Trade Plan (decision before plan)
const STEPS = [
  {
    id: 1,
    name: 'Market Pulse',
    icon: Globe,
    color: 'blue',
    cost: CREDIT_COSTS.STEP_MARKET_PULSE,
    shortDesc: 'Overall market analysis',
    fullDesc: 'Understand the current market environment before making any trade decision.',
    whyMatters: 'Even the best coin analysis fails in a crashing market. We check BTC dominance, Fear & Greed Index, and overall market trend.',
    checks: ['BTC Dominance & Trend', 'Fear & Greed Index', 'Market Regime', 'Global Momentum'],
    duration: '~5 sec',
  },
  {
    id: 2,
    name: 'Asset Scanner',
    icon: Target,
    color: 'cyan',
    cost: CREDIT_COSTS.STEP_ASSET_SCANNER,
    shortDesc: 'Technical analysis',
    fullDesc: 'Deep dive into the specific asset using professional-grade technical indicators.',
    whyMatters: 'We analyze the coin across multiple timeframes using RSI, MACD, Bollinger Bands, and more.',
    checks: ['Multi-Timeframe Analysis', 'RSI & MACD', 'Support & Resistance', 'Trend Direction'],
    duration: '~8 sec',
  },
  {
    id: 3,
    name: 'Safety Check',
    icon: Shield,
    color: 'orange',
    cost: CREDIT_COSTS.STEP_SAFETY_CHECK,
    shortDesc: 'Risk assessment',
    fullDesc: 'Detect manipulation, whale activity, and potential red flags.',
    whyMatters: 'Crypto markets are full of manipulation. We scan for pump & dump schemes and whale movements.',
    checks: ['Pump & Dump Detection', 'Whale Activity', 'Wash Trading', 'Smart Money'],
    duration: '~10 sec',
  },
  {
    id: 4,
    name: 'Timing Analysis',
    icon: Clock,
    color: 'purple',
    cost: CREDIT_COSTS.STEP_TIMING,
    shortDesc: 'Entry optimization',
    fullDesc: 'Calculate the optimal entry point and timing for maximum edge.',
    whyMatters: 'Entering at the wrong time can turn a winning trade into a loser.',
    checks: ['Entry Price Zones', 'Entry Conditions', 'Wait-For Events', 'Time Triggers'],
    duration: '~6 sec',
  },
  {
    id: 5,
    name: 'Trap Check',
    icon: AlertTriangle,
    color: 'red',
    cost: CREDIT_COSTS.STEP_TRAP_CHECK,
    shortDesc: 'Trap detection',
    fullDesc: 'Identify potential bull/bear traps and liquidation zones.',
    whyMatters: 'The market loves to trap retail traders. We scan for fakeouts and stop hunts.',
    checks: ['Bull Trap Detection', 'Bear Trap Detection', 'Liquidity Zones', 'Stop Hunt'],
    duration: '~7 sec',
  },
  {
    id: 6,
    name: 'Trade Plan',
    icon: FileText,
    color: 'indigo',
    cost: CREDIT_COSTS.STEP_TRADE_PLAN,
    shortDesc: 'Execution strategy',
    fullDesc: 'Complete trade execution plan with entries, exits, and position sizing. Only generated for GO signals.',
    whyMatters: 'Professional traders never enter without a plan. We calculate your exact levels based on all previous analysis.',
    checks: ['DCA Entry Levels', 'Stop Loss', 'Take Profit Targets', 'Risk/Reward'],
    duration: '~8 sec',
  },
  {
    id: 7,
    name: 'Final Verdict',
    icon: CheckCircle,
    color: 'green',
    cost: CREDIT_COSTS.STEP_FINAL_VERDICT,
    shortDesc: 'GO/NO-GO decision',
    fullDesc: 'AI-powered final recommendation combining all analysis steps.',
    whyMatters: 'Our AI weighs all factors and gives you a clear verdict: GO, WAIT, or AVOID.',
    checks: ['Component Scores', 'Confidence Factors', 'Risk Assessment', 'AI Summary'],
    duration: '~3 sec',
  },
];

const colorClasses = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-500' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-500' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-500' },
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-500' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-500' },
};

// localStorage keys for user preferences
const STORAGE_KEYS = {
  ANALYSIS_MODE: 'tradepath_analysis_mode',
  HAS_COMPLETED_ANALYSIS: 'tradepath_has_completed_analysis',
};

type AnalysisMode = 'educational' | 'quick';

export function AnalysisFlow({ symbol, tradeType = 'dayTrade', interval = '4h', accountSize = 10000, onComplete, onCreditsUpdate }: AnalysisFlowProps) {
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'intro' | 'result'>('intro');
  const [loading, setLoading] = useState(false);
  const [isRunningFull, setIsRunningFull] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<Record<number, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [reportSaved, setReportSaved] = useState(false);
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null);
  const saveAttemptedRef = useRef(false);

  // Smart Analysis Mode state
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('educational');
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(true);
  const [showStepDetails, setShowStepDetails] = useState(false);
  const [modeInitialized, setModeInitialized] = useState(false);

  // Initialize mode from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasCompleted = localStorage.getItem(STORAGE_KEYS.HAS_COMPLETED_ANALYSIS);
    const savedMode = localStorage.getItem(STORAGE_KEYS.ANALYSIS_MODE) as AnalysisMode | null;

    if (hasCompleted === 'true') {
      setIsFirstTimeUser(false);
      // Use saved preference or default to quick for returning users
      setAnalysisMode(savedMode || 'quick');
    } else {
      // First time user - default to educational
      setIsFirstTimeUser(true);
      setAnalysisMode('educational');
    }
    setModeInitialized(true);
  }, []);

  // Save mode preference when changed
  const handleModeChange = (newMode: AnalysisMode) => {
    setAnalysisMode(newMode);
    localStorage.setItem(STORAGE_KEYS.ANALYSIS_MODE, newMode);
  };

  // Mark user as experienced when analysis completes
  const markAnalysisCompleted = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.HAS_COMPLETED_ANALYSIS, 'true');
    setIsFirstTimeUser(false);
  }, []);

  const getAuthHeaders = useCallback(async () => {
    const token = await getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const callStepAPI = useCallback(async (stepId: number) => {
    const endpoint = STEP_ENDPOINTS[stepId];
    if (!endpoint) throw new Error('Invalid step');

    const headers = await getAuthHeaders();

    const options: RequestInit = {
      method: endpoint.method,
      headers,
    };

    if (endpoint.method === 'POST') {
      options.body = JSON.stringify({ symbol, accountSize, interval, tradeType });
    }

    const response = await fetch(getApiUrl(endpoint.url), options);

    // Safely parse JSON response
    const responseText = await response.text();
    let data: any;
    try {
      data = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error('Invalid response from server');
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required. Please login again.');
      }
      if (response.status === 402) {
        throw new Error('Insufficient credits. Please purchase more credits.');
      }
      throw new Error(data.error?.message || 'Analysis failed');
    }

    if (data.remainingCredits !== undefined && onCreditsUpdate) {
      onCreditsUpdate(data.remainingCredits);
    }

    return data.data;
  }, [symbol, accountSize, interval, tradeType, getAuthHeaders, onCreditsUpdate]);

  // Auto-save report when all 7 steps are completed
  const saveReportToDatabase = useCallback(async () => {
    if (completedSteps.length !== 7 || saveAttemptedRef.current || reportSaved) return;

    saveAttemptedRef.current = true;

    try {
      const token = await getAuthToken();
      if (!token) return;

      // Build report data from results
      // Note: tradePlan can be null for WAIT/AVOID verdicts (new integrated flow)
      // NEW ORDER: Trap Check (5) before Trade Plan (6)
      const verdict = results[7] as { action?: string; verdict?: string; overallScore?: number; analysisId?: string; hasTradePlan?: boolean } | undefined;
      const tradePlan = results[6] as { direction?: string } | null;

      // Use the analysisId from the verdict API response (consistent with FinalVerdict component)
      // This ensures the AI Expert page can find the report using the same ID
      // Fallback generates a proper UUID (required by database schema)
      const reportAnalysisId = verdict?.analysisId || crypto.randomUUID();

      const reportData = {
        symbol,
        generatedAt: new Date().toISOString(),
        analysisId: reportAnalysisId,
        marketPulse: results[1],
        assetScan: results[2],
        safetyCheck: results[3],
        timing: results[4],
        trapCheck: results[5],
        tradePlan: results[6],
        verdict: results[7],
      };

      const response = await fetch(getApiUrl('/api/reports'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          symbol,
          analysisId: reportAnalysisId,
          reportData: { ...reportData, tradeType }, // Include tradeType in reportData
          verdict: verdict?.action || verdict?.verdict || 'N/A',
          score: verdict?.overallScore || 0,
          direction: tradePlan?.direction || null,
          interval: '1h', // 50 periods × 1h = 50 hours (~2 days) validity
          tradeType, // Send tradeType separately for direct DB storage
        }),
      });

      if (response.ok) {
        setReportSaved(true);
        setSavedAnalysisId(reportAnalysisId);
        console.log('Report auto-saved successfully with analysisId:', reportAnalysisId);
      }
    } catch (error) {
      console.error('Failed to auto-save report:', error);
    }
  }, [completedSteps.length, results, symbol, reportSaved]);

  // Effect to trigger auto-save when analysis completes
  useEffect(() => {
    if (completedSteps.length === 7 && !saveAttemptedRef.current) {
      saveReportToDatabase();
    }
  }, [completedSteps.length, saveReportToDatabase]);

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

  const handleRunFullAnalysis = async (skipAnimation = false) => {
    setIsRunningFull(true);
    setError(null);
    setActiveStep(1);
    setViewMode('intro');

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl('/api/analysis/full'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ symbol, accountSize, tradeType }),
      });

      // Safely parse JSON response
      const responseText = await response.text();
      let data: any;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        if (response.status === 402) {
          throw new Error('Insufficient credits (25 required). Please purchase more credits.');
        }
        throw new Error(data.error?.message || 'Full analysis failed');
      }

      if (data.remainingCredits !== undefined && onCreditsUpdate) {
        onCreditsUpdate(data.remainingCredits);
      }

      const analysisData = data.data;
      const steps = analysisData.steps;

      // Note: tradePlan can be null for WAIT/AVOID verdicts
      // NEW ORDER: Trap Check (5) before Trade Plan (6) - decision before plan
      const allResults: Record<number, unknown> = {
        1: steps.marketPulse,
        2: steps.assetScan,
        3: steps.safetyCheck,
        4: steps.timing,
        5: steps.trapCheck,
        6: steps.tradePlan, // Can be null for WAIT/AVOID
        7: { ...steps.verdict, preliminaryVerdict: steps.preliminaryVerdict },
      };

      if (skipAnimation) {
        // Quick mode: instant results, go directly to final verdict
        setCompletedSteps([1, 2, 3, 4, 5, 6, 7]);
        setResults(allResults);
        setActiveStep(7);
        setViewMode('result');
      } else {
        // Educational mode: animate through steps
        for (let stepId = 1; stepId <= 7; stepId++) {
          setActiveStep(stepId);
          setViewMode('intro');
          await new Promise((resolve) => setTimeout(resolve, 400));

          setCompletedSteps((prev) => [...prev, stepId]);
          setResults((prev) => ({ ...prev, [stepId]: allResults[stepId] }));
          setViewMode('result');
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }

      // Mark that user has completed an analysis
      markAnalysisCompleted();
      onComplete?.();
    } catch (err) {
      console.error('Full analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Full analysis failed');
    } finally {
      setIsRunningFull(false);
    }
  };

  // Quick analysis handler
  const handleQuickAnalysis = () => {
    handleRunFullAnalysis(true);
  };

  const currentStep = STEPS[activeStep - 1];
  const colors = colorClasses[currentStep.color as keyof typeof colorClasses];
  const isStepCompleted = completedSteps.includes(activeStep);
  const canProceed = activeStep === 1 || completedSteps.includes(activeStep - 1);

  // Don't render until mode is initialized from localStorage
  if (!modeInitialized) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Analysis Mode Selector - Only show before analysis starts */}
      {completedSteps.length === 0 && !isRunningFull && (
        <div className="bg-card border rounded-xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">Analysis Mode</h3>
              <p className="text-sm text-muted-foreground">
                {isFirstTimeUser
                  ? 'First time? We recommend Educational mode to learn how our analysis works.'
                  : 'Choose how you want to run your analysis'}
              </p>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
              <button
                onClick={() => handleModeChange('educational')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                  analysisMode === 'educational'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Educational</span>
              </button>
              <button
                onClick={() => handleModeChange('quick')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
                  analysisMode === 'quick'
                    ? 'bg-background shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Rocket className="w-4 h-4" />
                <span>Quick</span>
              </button>
            </div>
          </div>

          {/* Mode Description */}
          <div className={cn(
            'mt-4 p-3 rounded-lg text-sm',
            analysisMode === 'educational' ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-amber-500/10 border border-amber-500/20'
          )}>
            {analysisMode === 'educational' ? (
              <div className="flex items-start gap-3">
                <GraduationCap className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-blue-500">Step-by-Step Learning</p>
                  <p className="text-muted-foreground mt-1">
                    Go through each analysis step one-by-one. See what each step analyzes and why it matters before running it.
                    Perfect for understanding the full analysis process.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Rocket className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-500">Instant Results</p>
                  <p className="text-muted-foreground mt-1">
                    Run all 7 analysis steps at once and jump straight to the Final Verdict.
                    You can expand individual step details anytime after the analysis completes.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Analysis Button - Only show in Quick mode */}
          {analysisMode === 'quick' && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleQuickAnalysis}
                disabled={isRunningFull}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all"
              >
                <Rocket className="w-5 h-5" />
                <span>Run Quick Analysis</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Premium Step Progress Bar */}
      <div className="bg-card border rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <AnalysisProgressBar
            completedSteps={completedSteps}
            activeStep={activeStep}
            isRunning={isRunningFull}
            onStepClick={handleViewResult}
            size="md"
            showLabels={true}
            animated={true}
          />
        </div>

        {/* Show/Hide Step Details Toggle - After quick analysis completes */}
        {completedSteps.length === 7 && analysisMode === 'quick' && !isRunningFull && (
          <button
            onClick={() => setShowStepDetails(!showStepDetails)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
          >
            {showStepDetails ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>Hide step details</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Show all step details</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Step Card */}
      <div className={cn('bg-card border rounded-lg overflow-hidden', colors.border)}>
        {/* Step Header */}
        <div className={cn('p-5 border-b', colors.bg)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center bg-background/50', colors.text)}>
                <currentStep.icon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Step {activeStep} of 7</span>
                  {isStepCompleted && (
                    <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">Done</span>
                  )}
                </div>
                <h2 className="text-xl font-bold">{currentStep.name}</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-5">
          {viewMode === 'intro' && !isStepCompleted ? (
            <div className="space-y-5">
              <div>
                <p className="font-medium mb-1">{currentStep.fullDesc}</p>
                <p className="text-sm text-muted-foreground">{currentStep.whyMatters}</p>
              </div>

              {/* What We Check */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                  <Eye className="w-4 h-4" />
                  What We Analyze
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {currentStep.checks.map((check, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ChevronRight className={cn('w-3 h-3', colors.text)} />
                      <span>{check}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="w-4 h-4" />
                  <span>{currentStep.duration}</span>
                </div>

                {canProceed ? (
                  <button
                    onClick={handleRunStep}
                    disabled={loading || isRunningFull}
                    className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all border border-slate-300 dark:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 gradient-text-rg-animate" />
                        <span className="gradient-text-rg-animate">Run {currentStep.name}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Lock className="w-4 h-4" />
                    <span>Complete previous step first</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {activeStep === 1 && <MarketPulse data={results[1]} />}
              {activeStep === 2 && <AssetScanner data={results[2]} symbol={symbol} />}
              {activeStep === 3 && <SafetyCheck data={results[3]} symbol={symbol} />}
              {activeStep === 4 && <TimingAnalysis data={results[4]} symbol={symbol} />}
              {activeStep === 5 && <TrapCheck data={results[5]} symbol={symbol} />}
              {activeStep === 6 && (
                results[6] ? (
                  <TradePlan data={results[6]} symbol={symbol} />
                ) : (
                  <div className="p-6 bg-muted/30 rounded-lg text-center">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-amber-500" />
                    <p className="font-medium">No Trade Plan Generated</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Trade plans are only generated for GO or CONDITIONAL_GO signals.
                      Current verdict recommends WAIT or AVOID.
                    </p>
                  </div>
                )
              )}
              {activeStep === 7 && <FinalVerdict data={results[7]} symbol={symbol} allResults={results} />}

              {/* Download Report Button */}
              {activeStep === 7 && isStepCompleted && completedSteps.length === 7 && (
                <div className="flex flex-col items-center gap-3 pt-5 border-t">
                  {reportSaved && (
                    <div className="flex items-center gap-2 text-sm text-green-500">
                      <CheckCircle className="w-4 h-4" />
                      <span>Report saved - View in Reports page</span>
                    </div>
                  )}
                  <DownloadReportButton analysisData={results} symbol={symbol} analysisId={savedAnalysisId || undefined} tradeType={tradeType} />

                  {/* Hidden TradePlanChart for PDF capture - must have id="trade-plan-chart" for capture to work */}
                  {results[6] && (
                    <div
                      style={{
                        position: 'fixed',
                        left: '-2000px',
                        top: '0',
                        width: '800px',
                        height: '600px',
                        background: '#ffffff',
                        pointerEvents: 'none',
                        overflow: 'hidden',
                      }}
                    >
                      <TradePlanChart
                        symbol={symbol}
                        entries={(results[6] as { entries?: Array<{ price: number; percentage: number }> })?.entries ?? []}
                        stopLoss={(results[6] as { stopLoss?: { price: number; percentage: number } })?.stopLoss ?? { price: 0, percentage: 0 }}
                        takeProfits={(results[6] as { takeProfits?: Array<{ price: number; percentage: number; riskReward?: number }> })?.takeProfits?.map((tp, i) => ({ ...tp, riskReward: tp.riskReward ?? (i + 1) })) ?? []}
                        direction={((results[6] as { direction?: 'long' | 'short' })?.direction) || 'long'}
                        currentPrice={(results[2] as { currentPrice?: number })?.currentPrice ?? 0}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Next Step Button */}
              {activeStep < 7 && isStepCompleted && (
                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={handleNextStep}
                    className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition"
                  >
                    Continue to {STEPS[activeStep].name}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full Analysis Bundle CTA - Only in Educational mode */}
      {completedSteps.length === 0 && !isRunningFull && analysisMode === 'educational' && (
        <div className="mt-6 p-5 bg-card border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-11 h-11 rounded-lg flex items-center justify-center shadow-lg"
                style={{
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.25)',
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.95))',
                }}
              >
                <Brain className="w-5 h-5 gradient-text-rg-animate" />
              </div>
              <div>
                <h3 className="font-semibold">Full Analysis Bundle</h3>
                <p className="text-sm text-muted-foreground">Run all 7 steps automatically • Save 25%</p>
              </div>
            </div>
            <button
              onClick={() => handleRunFullAnalysis(false)}
              disabled={isRunningFull}
              className="px-5 py-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all border border-slate-300 dark:border-slate-600"
            >
              <TrendingUp className="w-4 h-4 gradient-text-rg-animate" />
              <span className="gradient-text-rg-animate">Full Analysis</span>
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Step Details - After Quick Analysis */}
      {showStepDetails && completedSteps.length === 7 && (
        <div className="mt-6 space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Step Details
          </h3>
          {STEPS.slice(0, 6).map((step) => {
            const stepColors = colorClasses[step.color as keyof typeof colorClasses];
            return (
              <div key={step.id} className={cn('bg-card border rounded-lg overflow-hidden', stepColors.border)}>
                <div className={cn('p-4 border-b', stepColors.bg)}>
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center bg-background/50', stepColors.text)}>
                      <step.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{step.name}</span>
                        <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">Done</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{step.shortDesc}</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  {step.id === 1 && <MarketPulse data={results[1] as Parameters<typeof MarketPulse>[0]['data']} />}
                  {step.id === 2 && <AssetScanner data={results[2] as Parameters<typeof AssetScanner>[0]['data']} symbol={symbol} />}
                  {step.id === 3 && <SafetyCheck data={results[3] as Parameters<typeof SafetyCheck>[0]['data']} symbol={symbol} />}
                  {step.id === 4 && <TimingAnalysis data={results[4] as Parameters<typeof TimingAnalysis>[0]['data']} symbol={symbol} />}
                  {step.id === 5 && <TrapCheck data={results[5] as Parameters<typeof TrapCheck>[0]['data']} symbol={symbol} />}
                  {step.id === 6 && (
                    results[6] ? (
                      <TradePlan data={results[6] as Parameters<typeof TradePlan>[0]['data']} symbol={symbol} />
                    ) : (
                      <div className="p-4 bg-muted/30 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">No trade plan generated (WAIT/AVOID verdict)</p>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Running Full Analysis Indicator */}
      {isRunningFull && (
        <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
            <span className="font-medium">Running full analysis...</span>
            <span className="text-sm text-muted-foreground">
              Step {activeStep}/7: {STEPS[activeStep - 1].name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
