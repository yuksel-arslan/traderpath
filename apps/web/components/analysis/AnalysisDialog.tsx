'use client';

// ===========================================
// Analysis Dialog - Popup-based Analysis Flow
// Guides user through entire analysis process
// Corporate Design with TraderPath Branding
// ===========================================

import { useState, useCallback, useRef, useEffect, useId } from 'react';
import {
  X,
  GraduationCap,
  Rocket,
  Globe,
  Target,
  Shield,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Eye,
  Sparkles,
  Zap,
  ArrowRight,
  Brain,
  TrendingUp,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAuthToken, getApiUrl } from '../../lib/api';
import { CREDIT_COSTS } from '@traderpath/types';
import { useCreditNotification } from '../../contexts/CreditNotificationContext';
import { CoinIcon } from '../common/CoinIcon';
import { StarLogo } from '../common/TraderPathLogo';

// Import analysis components
import { MarketPulse } from './MarketPulse';
import { AssetScanner } from './AssetScanner';
import { SafetyCheck } from './SafetyCheck';
import { TimingAnalysis } from './TimingAnalysis';
import { TradePlan } from './TradePlan';
import { TrapCheck } from './TrapCheck';
import { FinalVerdict } from './FinalVerdict';
import { AnalysisProgressBar } from './AnalysisProgressBar';

type Timeframe = '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '1d' | '1W';
type TradeType = 'scalping' | 'dayTrade' | 'swing';
type AnalysisMode = 'educational' | 'quick';
type DialogStep = 'mode-select' | 'analyzing' | 'results';

// Timeframe to trade type mapping
// - Scalping (1000 candles): 5m, 15m
// - Day Trade (500 candles): 30m, 1h, 2h, 4h
// - Swing Trade (250 candles): 1d, 1W
const TIMEFRAME_TO_TRADE_TYPE: Record<Timeframe, TradeType> = {
  '5m': 'scalping',
  '15m': 'scalping',
  '30m': 'dayTrade',
  '1h': 'dayTrade',
  '2h': 'dayTrade',
  '4h': 'dayTrade',
  '1d': 'swing',
  '1W': 'swing',
};

interface AnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  coinName: string;
  timeframe: Timeframe;
  onComplete?: () => void;
}

const TRADE_TYPE_LABELS: Record<TradeType, string> = {
  scalping: 'Scalping',
  dayTrade: 'Day Trade',
  swing: 'Swing Trade',
};

// Step definitions
const STEPS = [
  { id: 1, name: 'Market Pulse', icon: Globe, color: 'blue', shortDesc: 'Overall market analysis' },
  { id: 2, name: 'Asset Scanner', icon: Target, color: 'cyan', shortDesc: 'Technical analysis' },
  { id: 3, name: 'Safety Check', icon: Shield, color: 'orange', shortDesc: 'Risk assessment' },
  { id: 4, name: 'Timing Analysis', icon: Clock, color: 'purple', shortDesc: 'Entry optimization' },
  { id: 5, name: 'Trap Check', icon: AlertTriangle, color: 'red', shortDesc: 'Trap detection' },
  { id: 6, name: 'Trade Plan', icon: FileText, color: 'indigo', shortDesc: 'Execution strategy' },
  { id: 7, name: 'Final Verdict', icon: CheckCircle, color: 'green', shortDesc: 'GO/NO-GO decision' },
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

// localStorage keys
const STORAGE_KEYS = {
  ANALYSIS_MODE: 'tradepath_analysis_mode',
  HAS_COMPLETED_ANALYSIS: 'tradepath_has_completed_analysis',
};

export function AnalysisDialog({
  isOpen,
  onClose,
  symbol,
  coinName,
  timeframe,
  onComplete,
}: AnalysisDialogProps) {
  // Derive trade type from timeframe
  const tradeType = TIMEFRAME_TO_TRADE_TYPE[timeframe];
  const uniqueId = useId();
  const { notifyCreditDeduction, showCelebration, notifyInsufficientCredits } = useCreditNotification();

  // Dialog state
  const [dialogStep, setDialogStep] = useState<DialogStep>('mode-select');
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('educational');
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(true);

  // Analysis state
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isRunning, setIsRunning] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<Record<number, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [reportSaved, setReportSaved] = useState(false);
  const saveAttemptedRef = useRef(false);


  // Initialize mode from localStorage
  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen) return;

    const hasCompleted = localStorage.getItem(STORAGE_KEYS.HAS_COMPLETED_ANALYSIS);
    const savedMode = localStorage.getItem(STORAGE_KEYS.ANALYSIS_MODE) as AnalysisMode | null;

    if (hasCompleted === 'true') {
      setIsFirstTimeUser(false);
      setAnalysisMode(savedMode || 'quick');
    } else {
      setIsFirstTimeUser(true);
      setAnalysisMode('educational');
    }
  }, [isOpen]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setDialogStep('mode-select');
      setCompletedSteps([]);
      setActiveStep(1);
      setResults({});
      setError(null);
      setReportSaved(false);
      saveAttemptedRef.current = false;
    }
  }, [isOpen]);

  const handleModeSelect = (mode: AnalysisMode) => {
    setAnalysisMode(mode);
    localStorage.setItem(STORAGE_KEYS.ANALYSIS_MODE, mode);
  };

  const getAuthHeaders = useCallback(async () => {
    const token = await getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  // Save report to database
  const saveReportToDatabase = useCallback(async () => {
    if (completedSteps.length !== 7 || saveAttemptedRef.current || reportSaved) return;

    saveAttemptedRef.current = true;

    try {
      const token = await getAuthToken();
      if (!token) return;

      const verdict = results[7] as { action?: string; verdict?: string; overallScore?: number; analysisId?: string } | undefined;
      const tradePlan = results[6] as { direction?: string } | null;
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
        // Full 40+ Indicator Details
        indicatorDetails: (results[2] as { indicatorDetails?: unknown })?.indicatorDetails || (results[3] as { indicatorDetails?: unknown })?.indicatorDetails,
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
          reportData: { ...reportData, tradeType },
          verdict: verdict?.action || verdict?.verdict || 'N/A',
          score: verdict?.overallScore || 0,
          direction: tradePlan?.direction || null,
          interval: timeframe,
          tradeType,
        }),
      });

      if (response.ok) {
        setReportSaved(true);
      }
    } catch (error) {
      console.error('Failed to auto-save report:', error);
    }
  }, [completedSteps.length, results, symbol, reportSaved, tradeType, timeframe]);

  // Auto-save when complete
  useEffect(() => {
    if (completedSteps.length === 7 && !saveAttemptedRef.current) {
      saveReportToDatabase();
    }
  }, [completedSteps.length, saveReportToDatabase]);

  // Run full analysis
  const handleStartAnalysis = async () => {
    setDialogStep('analyzing');
    setIsRunning(true);
    setError(null);
    setActiveStep(1);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl('/api/analysis/full'), {
        method: 'POST',
        headers,
        body: JSON.stringify({ symbol, accountSize: 10000, interval: timeframe, tradeType }),
      });

      const responseText = await response.text();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        if (response.status === 402) {
          notifyInsufficientCredits(25, data.data?.currentBalance || 0);
          throw new Error('Insufficient credits (25 required). Please purchase more credits.');
        }
        throw new Error(data.error?.message || 'Full analysis failed');
      }

      const analysisData = data.data;

      // Show credit deduction notification
      if (data.creditsSpent && data.remainingCredits !== undefined) {
        notifyCreditDeduction(data.creditsSpent, 'analysis', data.remainingCredits);
      }

      // Show celebration for trade type bonus (Scalping: +3, Day Trade: +2, Swing: +1)
      const tradeTypeBonus = tradeType === 'scalping' ? 3 : tradeType === 'dayTrade' ? 2 : 1;
      setTimeout(() => {
        showCelebration({
          credits: tradeTypeBonus,
          reason: 'trade_type_bonus',
          title: 'Analysis Bonus!',
          subtitle: `You earned a ${TRADE_TYPE_LABELS[tradeType]} completion bonus!`,
        });
      }, 1500); // Delay so user sees credit deduction first
      const steps = analysisData.steps;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allResults: Record<number, any> = {
        1: steps.marketPulse,
        2: steps.assetScan,
        3: steps.safetyCheck,
        4: steps.timing,
        5: steps.trapCheck,
        6: steps.tradePlan,
        7: { ...steps.verdict, preliminaryVerdict: steps.preliminaryVerdict },
      };

      if (analysisMode === 'quick') {
        // Quick mode: instant results
        setCompletedSteps([1, 2, 3, 4, 5, 6, 7]);
        setResults(allResults);
        setActiveStep(7);
        setDialogStep('results');
      } else {
        // Educational mode: animate through steps
        for (let stepId = 1; stepId <= 7; stepId++) {
          setActiveStep(stepId);
          await new Promise((resolve) => setTimeout(resolve, 300));
          setCompletedSteps((prev) => [...prev, stepId]);
          setResults((prev) => ({ ...prev, [stepId]: allResults[stepId] }));
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
        setDialogStep('results');
      }

      // Mark user as experienced
      localStorage.setItem(STORAGE_KEYS.HAS_COMPLETED_ANALYSIS, 'true');
      setIsFirstTimeUser(false);
      onComplete?.();
    } catch (err) {
      console.error('Full analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Full analysis failed');
    } finally {
      setIsRunning(false);
    }
  };

  // View step result
  const handleViewStep = (stepId: number) => {
    if (completedSteps.includes(stepId)) {
      setActiveStep(stepId);
    }
  };

  if (!isOpen) return null;

  const currentStep = STEPS[activeStep - 1];
  const colors = colorClasses[currentStep.color as keyof typeof colorClasses];
  const verdict = results[7] as { action?: string; verdict?: string; overallScore?: number } | undefined;
  const verdictAction = verdict?.action || verdict?.verdict || '';
  const isGo = verdictAction.toLowerCase().includes('go') && !verdictAction.toLowerCase().includes('wait') && !verdictAction.toLowerCase().includes('avoid');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 isolate">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-[#030712]/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl sm:rounded-3xl shadow-2xl border border-white/10 bg-[#0a0f1a] animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Animated background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl pointer-events-none">
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-30"
            style={{
              background: 'radial-gradient(circle, #2DD4BF 0%, transparent 70%)',
              animation: 'float 6s ease-in-out infinite',
            }}
          />
          <div
            className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-30"
            style={{
              background: 'radial-gradient(circle, #F87171 0%, transparent 70%)',
              animation: 'float 8s ease-in-out infinite reverse',
            }}
          />
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            {dialogStep !== 'mode-select' && (
              <button
                onClick={() => setDialogStep('mode-select')}
                disabled={isRunning}
                className="p-1.5 hover:bg-white/10 rounded-lg transition disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4 text-slate-400" />
              </button>
            )}
            <div className="relative w-10 h-10 sm:w-12 sm:h-12">
              {/* Morphing glow ring */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(135deg, #2DD4BF, #14B8A6, #F87171, #EF5A6F)',
                  borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                  boxShadow: '0 0 15px rgba(45, 212, 191, 0.4)',
                  animation: 'morph 8s ease-in-out infinite',
                }}
              />
              <div
                className="absolute flex items-center justify-center bg-[#0a0f1a]"
                style={{
                  inset: '2px',
                  borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                  animation: 'morph 8s ease-in-out infinite',
                }}
              >
                <CoinIcon symbol={symbol} size={24} />
              </div>
            </div>
            <div>
              <h2
                className="font-bold text-base sm:text-lg"
                style={{
                  background: 'linear-gradient(135deg, #7FFFD4, #2DD4BF, #F87171)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {symbol}/USDT Analysis
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                {coinName} - {TRADE_TYPE_LABELS[tradeType]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="p-2 hover:bg-white/10 rounded-lg transition disabled:opacity-50"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-y-auto p-5 sm:p-6">
          {/* Step 1: Mode Selection */}
          {dialogStep === 'mode-select' && (
            <div className="space-y-6">
              {/* Header with Logo */}
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="relative w-16 h-16">
                    <div
                      className="absolute inset-0"
                      style={{
                        background: 'linear-gradient(135deg, #2DD4BF, #14B8A6, #F87171, #EF5A6F)',
                        borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                        boxShadow: '0 0 20px rgba(45, 212, 191, 0.4), 0 0 40px rgba(248, 113, 113, 0.2)',
                        animation: 'morph 8s ease-in-out infinite',
                      }}
                    />
                    <div
                      className="absolute flex items-center justify-center bg-[#0a0f1a]"
                      style={{
                        inset: '3px',
                        borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                        animation: 'morph 8s ease-in-out infinite',
                      }}
                    >
                      <StarLogo size={32} uniqueId={`analysis-${uniqueId}`} animated={false} />
                    </div>
                  </div>
                </div>
                <h3
                  className="text-2xl sm:text-3xl font-bold mb-2"
                  style={{
                    background: 'linear-gradient(135deg, #7FFFD4, #2DD4BF, #F87171, #EF5A6F)',
                    backgroundSize: '200% 200%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: 'gradient-shift 4s ease infinite',
                  }}
                >
                  Choose Analysis Mode
                </h3>
                <p className="text-slate-400 text-sm">
                  {isFirstTimeUser
                    ? "First time? We recommend Educational mode to learn how our analysis works."
                    : "How would you like to run your analysis?"}
                </p>
              </div>

              {/* Mode Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Educational Mode */}
                <button
                  onClick={() => handleModeSelect('educational')}
                  className={`relative group p-5 rounded-2xl text-left transition-all duration-300 overflow-hidden ${
                    analysisMode === 'educational'
                      ? 'ring-2 ring-[#2DD4BF]'
                      : 'hover:scale-[1.02]'
                  }`}
                  style={{
                    background: analysisMode === 'educational'
                      ? 'linear-gradient(135deg, rgba(45, 212, 191, 0.2), rgba(20, 184, 166, 0.1))'
                      : 'linear-gradient(135deg, rgba(45, 212, 191, 0.1), rgba(20, 184, 166, 0.05))',
                    border: '1px solid rgba(45, 212, 191, 0.3)',
                  }}
                >
                  {/* Hover glow effect */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: 'radial-gradient(circle at center, rgba(45, 212, 191, 0.2) 0%, transparent 70%)',
                    }}
                  />

                  <div className="relative z-10">
                    {/* Badge */}
                    {isFirstTimeUser && (
                      <div
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold mb-3"
                        style={{
                          background: 'linear-gradient(135deg, #2DD4BF, #14B8A6)',
                          color: 'white',
                          boxShadow: '0 0 15px rgba(45, 212, 191, 0.4)',
                        }}
                      >
                        <Sparkles className="w-3 h-3" />
                        RECOMMENDED
                      </div>
                    )}

                    {/* Icon */}
                    <div className="relative mb-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #2DD4BF, #0D9488)',
                          boxShadow: '0 8px 30px rgba(45, 212, 191, 0.4)',
                        }}
                      >
                        <Brain className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-lg font-bold text-white mb-2">Educational</h4>

                    {/* Description */}
                    <p className="text-slate-400 text-sm mb-4">
                      Watch each of the 7 analysis steps run in sequence. Perfect for learning how our AI evaluates trades.
                    </p>

                    {/* Features */}
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-xs text-slate-300">
                        <div className="w-5 h-5 rounded-md bg-[#2DD4BF]/20 flex items-center justify-center">
                          <Eye className="w-3 h-3 text-[#2DD4BF]" />
                        </div>
                        Step-by-step visualization
                      </li>
                      <li className="flex items-center gap-2 text-xs text-slate-300">
                        <div className="w-5 h-5 rounded-md bg-[#2DD4BF]/20 flex items-center justify-center">
                          <GraduationCap className="w-3 h-3 text-[#2DD4BF]" />
                        </div>
                        Learn as you go
                      </li>
                    </ul>
                  </div>
                </button>

                {/* Quick Mode */}
                <button
                  onClick={() => handleModeSelect('quick')}
                  className={`relative group p-5 rounded-2xl text-left transition-all duration-300 overflow-hidden ${
                    analysisMode === 'quick'
                      ? 'ring-2 ring-[#F87171]'
                      : 'hover:scale-[1.02]'
                  }`}
                  style={{
                    background: analysisMode === 'quick'
                      ? 'linear-gradient(135deg, rgba(248, 113, 113, 0.2), rgba(239, 90, 111, 0.1))'
                      : 'linear-gradient(135deg, rgba(248, 113, 113, 0.1), rgba(239, 90, 111, 0.05))',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                  }}
                >
                  {/* Hover glow effect */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: 'radial-gradient(circle at center, rgba(248, 113, 113, 0.2) 0%, transparent 70%)',
                    }}
                  />

                  <div className="relative z-10">
                    {/* Badge */}
                    {!isFirstTimeUser && (
                      <div
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold mb-3"
                        style={{
                          background: 'linear-gradient(135deg, #F87171, #EF5A6F)',
                          color: 'white',
                          boxShadow: '0 0 15px rgba(248, 113, 113, 0.4)',
                        }}
                      >
                        <Zap className="w-3 h-3" />
                        FAST
                      </div>
                    )}

                    {/* Icon */}
                    <div className="relative mb-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #F87171, #DC2626)',
                          boxShadow: '0 8px 30px rgba(248, 113, 113, 0.4)',
                        }}
                      >
                        <Rocket className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-lg font-bold text-white mb-2">Quick</h4>

                    {/* Description */}
                    <p className="text-slate-400 text-sm mb-4">
                      Get instant results. All 7 steps run at once and you jump straight to the Final Verdict.
                    </p>

                    {/* Features */}
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-xs text-slate-300">
                        <div className="w-5 h-5 rounded-md bg-[#F87171]/20 flex items-center justify-center">
                          <Zap className="w-3 h-3 text-[#F87171]" />
                        </div>
                        Instant results
                      </li>
                      <li className="flex items-center gap-2 text-xs text-slate-300">
                        <div className="w-5 h-5 rounded-md bg-[#F87171]/20 flex items-center justify-center">
                          <TrendingUp className="w-3 h-3 text-[#F87171]" />
                        </div>
                        Jump to verdict
                      </li>
                    </ul>
                  </div>
                </button>
              </div>

              {/* 7-Step Analysis Process */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <h4 className="font-medium mb-3 flex items-center gap-2 text-sm text-slate-300">
                  <Eye className="w-4 h-4 text-[#2DD4BF]" />
                  7-Step Analysis Process
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {STEPS.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg"
                      style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    >
                      <step.icon className={cn('w-3.5 h-3.5', colorClasses[step.color as keyof typeof colorClasses].text)} />
                      <span className="text-slate-300">{step.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartAnalysis}
                className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] group"
                style={{
                  background: analysisMode === 'educational'
                    ? 'linear-gradient(135deg, #2DD4BF, #0D9488)'
                    : 'linear-gradient(135deg, #F87171, #DC2626)',
                  boxShadow: analysisMode === 'educational'
                    ? '0 10px 40px rgba(45, 212, 191, 0.4)'
                    : '0 10px 40px rgba(248, 113, 113, 0.4)',
                }}
              >
                {analysisMode === 'educational' ? (
                  <>
                    <Brain className="w-5 h-5 text-white" />
                    <span className="text-white">Start Educational Analysis</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5 text-white" />
                    <span className="text-white">Run Quick Analysis</span>
                  </>
                )}
                <ArrowRight className="w-4 h-4 text-white transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}

          {/* Step 2: Analyzing */}
          {dialogStep === 'analyzing' && (
            <div className="space-y-6">
              {/* Progress */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <AnalysisProgressBar
                  completedSteps={completedSteps}
                  activeStep={activeStep}
                  isRunning={isRunning}
                  onStepClick={handleViewStep}
                  size="sm"
                  showLabels={false}
                  animated={true}
                />
              </div>

              {/* Current Step */}
              <div
                className="rounded-xl p-5"
                style={{
                  background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.1), rgba(248, 113, 113, 0.05))',
                  border: '1px solid rgba(45, 212, 191, 0.2)',
                }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #2DD4BF, #14B8A6)',
                      boxShadow: '0 8px 30px rgba(45, 212, 191, 0.3)',
                    }}
                  >
                    <currentStep.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Step {activeStep} of 7</div>
                    <h3
                      className="text-lg font-bold"
                      style={{
                        background: 'linear-gradient(135deg, #7FFFD4, #2DD4BF)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      {currentStep.name}
                    </h3>
                  </div>
                  {isRunning && activeStep === completedSteps.length + 1 && (
                    <div className="ml-auto">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #2DD4BF, #14B8A6)',
                        }}
                      >
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-slate-400">{currentStep.shortDesc}</p>
              </div>

              {/* Error Display */}
              {error && (
                <div
                  className="p-4 rounded-xl flex items-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.15), rgba(239, 90, 111, 0.1))',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                  }}
                >
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-[#F87171]" />
                  <span className="text-[#FCA5A5] text-sm">{error}</span>
                </div>
              )}

              {analysisMode === 'educational' && (
                <p className="text-center text-sm text-slate-400">
                  Analyzing {symbol}... This takes about 30 seconds.
                </p>
              )}
            </div>
          )}

          {/* Step 3: Results */}
          {dialogStep === 'results' && (
            <div className="space-y-5">
              {/* Progress */}
              <div
                className="rounded-xl p-3"
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <AnalysisProgressBar
                  completedSteps={completedSteps}
                  activeStep={activeStep}
                  isRunning={false}
                  onStepClick={handleViewStep}
                  size="sm"
                  showLabels={false}
                  animated={false}
                />
              </div>

              {/* Current Step Result */}
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  border: '1px solid rgba(45, 212, 191, 0.2)',
                }}
              >
                <div
                  className="p-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.1), rgba(20, 184, 166, 0.05))',
                    borderBottom: '1px solid rgba(45, 212, 191, 0.2)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, #2DD4BF, #14B8A6)',
                        }}
                      >
                        <currentStep.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Step {activeStep} of 7</div>
                        <h3
                          className="font-semibold"
                          style={{
                            background: 'linear-gradient(135deg, #7FFFD4, #2DD4BF)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          {currentStep.name}
                        </h3>
                      </div>
                    </div>
                    <span
                      className="px-3 py-1 text-xs font-bold rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, #22C55E, #16A34A)',
                        color: 'white',
                        boxShadow: '0 0 15px rgba(34, 197, 94, 0.3)',
                      }}
                    >
                      Complete
                    </span>
                  </div>
                </div>
                <div className="p-4 max-h-[300px] overflow-y-auto bg-[#0a0f1a]">
                  {activeStep === 1 && <MarketPulse data={results[1]} />}
                  {activeStep === 2 && <AssetScanner data={results[2]} symbol={symbol} />}
                  {activeStep === 3 && <SafetyCheck data={results[3]} symbol={symbol} />}
                  {activeStep === 4 && <TimingAnalysis data={results[4]} symbol={symbol} />}
                  {activeStep === 5 && <TrapCheck data={results[5]} symbol={symbol} />}
                  {activeStep === 6 && (
                    results[6] ? (
                      <TradePlan data={results[6]} symbol={symbol} />
                    ) : (
                      <div
                        className="p-4 rounded-xl text-center"
                        style={{
                          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1), rgba(245, 158, 11, 0.05))',
                          border: '1px solid rgba(251, 191, 36, 0.2)',
                        }}
                      >
                        <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-amber-400" />
                        <p className="font-medium text-sm text-white">No Trade Plan Generated</p>
                        <p className="text-xs text-slate-400">
                          Trade plans are only generated for GO signals.
                        </p>
                      </div>
                    )
                  )}
                  {activeStep === 7 && <FinalVerdict data={results[7]} symbol={symbol} allResults={results} />}
                </div>
              </div>

              {/* Step Navigation */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
                  disabled={activeStep === 1}
                  className="px-4 py-2 text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: activeStep === 1 ? 'rgba(255, 255, 255, 0.3)' : 'white',
                  }}
                >
                  Previous
                </button>
                <div className="flex gap-1.5">
                  {STEPS.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => handleViewStep(step.id)}
                      className="w-8 h-8 rounded-full text-xs font-medium transition"
                      style={{
                        background: activeStep === step.id
                          ? 'linear-gradient(135deg, #2DD4BF, #14B8A6)'
                          : completedSteps.includes(step.id)
                          ? 'rgba(45, 212, 191, 0.2)'
                          : 'rgba(255, 255, 255, 0.05)',
                        color: activeStep === step.id ? 'white' : completedSteps.includes(step.id) ? '#2DD4BF' : 'rgba(255, 255, 255, 0.3)',
                        boxShadow: activeStep === step.id ? '0 0 15px rgba(45, 212, 191, 0.4)' : 'none',
                        cursor: completedSteps.includes(step.id) ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {step.id}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setActiveStep(Math.min(7, activeStep + 1))}
                  disabled={activeStep === 7}
                  className="px-4 py-2 text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: activeStep === 7 ? 'rgba(255, 255, 255, 0.3)' : 'white',
                  }}
                >
                  Next
                </button>
              </div>

              {/* Analysis Completed Message */}
              {reportSaved && (
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.05))',
                    border: '1px solid rgba(34, 197, 94, 0.2)',
                  }}
                >
                  <div className="flex items-center justify-center gap-2 text-[#22C55E] mb-3">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Analysis completed!</span>
                  </div>
                  <p className="text-sm text-slate-400 text-center mb-4">
                    Your analysis has been saved. View it in Recent Analyses below.
                  </p>
                  <button
                    onClick={onClose}
                    className="w-full px-4 py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 hover:scale-[1.02]"
                    style={{
                      background: 'linear-gradient(135deg, #2DD4BF, #0D9488)',
                      color: 'white',
                      boxShadow: '0 10px 40px rgba(45, 212, 191, 0.4)',
                    }}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Done
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Verdict Summary (only in results) */}
        {dialogStep === 'results' && verdict && (
          <div
            className="relative p-4"
            style={{
              background: isGo
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(22, 163, 74, 0.1))'
                : 'linear-gradient(135deg, rgba(251, 191, 36, 0.15), rgba(245, 158, 11, 0.1))',
              borderTop: `1px solid ${isGo ? 'rgba(34, 197, 94, 0.3)' : 'rgba(251, 191, 36, 0.3)'}`,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: isGo
                      ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                      : 'linear-gradient(135deg, #FBBF24, #F59E0B)',
                    boxShadow: isGo
                      ? '0 8px 30px rgba(34, 197, 94, 0.4)'
                      : '0 8px 30px rgba(251, 191, 36, 0.4)',
                  }}
                >
                  {isGo ? <CheckCircle className="w-5 h-5 text-white" /> : <AlertTriangle className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <div className="text-sm text-slate-400">Final Verdict</div>
                  <div
                    className="font-bold text-lg"
                    style={{
                      background: isGo
                        ? 'linear-gradient(135deg, #22C55E, #4ADE80)'
                        : 'linear-gradient(135deg, #FBBF24, #FCD34D)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {verdictAction}
                  </div>
                </div>
              </div>
              {verdict.overallScore !== undefined && (
                <div className="text-right">
                  <div className="text-sm text-slate-400">Score</div>
                  <div
                    className="font-bold text-lg"
                    style={{
                      background: 'linear-gradient(135deg, #7FFFD4, #2DD4BF)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {(verdict.overallScore * 10).toFixed(0)}%
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
