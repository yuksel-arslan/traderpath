'use client';

// ===========================================
// Analysis Dialog - Popup-based Analysis Flow
// Guides user through entire analysis process
// Corporate Design with TraderPath Branding
// ===========================================

import { useState, useCallback, useRef, useEffect, useId } from 'react';
import { useRouter } from 'next/navigation';
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
  Activity,
  BarChart3,
  Layers,
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
import { AnalysisProgressBar, MLIS_STEPS as MLIS_PROGRESS_STEPS } from './AnalysisProgressBar';
import { TradeDecisionVisual, SignalIndicator, VerdictBadge, DirectionArrow, ScoreGauge } from './TradeDecisionVisual';

// MLIS Layer Result Component
interface MLISLayerData {
  name?: string;
  score?: number;
  signal?: string;
  weight?: number;
  indicators?: Record<string, unknown>;
  mlis?: boolean;
}

function MLISLayerResult({ data, layerName }: { data: MLISLayerData; layerName: string }) {
  const score = data?.score ?? 50;
  const signal = data?.signal || 'NEUTRAL';
  const indicators = data?.indicators || {};

  const getSignalColor = (sig: string) => {
    const s = sig.toUpperCase();
    if (s === 'BULLISH' || s === 'BUY') return 'text-green-400';
    if (s === 'BEARISH' || s === 'SELL') return 'text-red-400';
    return 'text-amber-400';
  };

  const getScoreColor = (s: number) => {
    if (s >= 70) return 'text-green-400';
    if (s >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-4">
      {/* Score and Signal */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
        <div>
          <div className="text-xs text-slate-400 mb-1">{layerName} Layer Score</div>
          <div className={cn("text-2xl font-bold", getScoreColor(score))}>
            {score.toFixed(0)}/100
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400 mb-1">Signal</div>
          <div className={cn("text-lg font-bold", getSignalColor(signal))}>
            {signal}
          </div>
        </div>
      </div>

      {/* Indicators Summary */}
      {Object.keys(indicators).length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-slate-400 font-medium">Key Indicators</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(indicators).slice(0, 6).map(([key, value]) => (
              <div
                key={key}
                className="px-3 py-2 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="text-xs text-slate-500">{key}</div>
                <div className="text-sm text-white font-medium">
                  {typeof value === 'number' ? value.toFixed(2) : String(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// MLIS Verdict Result Component
interface MLISVerdictData {
  overallScore?: number;
  confidence?: number;
  recommendation?: string;
  direction?: string;
  riskLevel?: string;
  keySignals?: string[];
  riskFactors?: string[];
  verdict?: string;
}

function MLISVerdictResult({ data, symbol }: { data: MLISVerdictData; symbol: string }) {
  const score = data?.overallScore ? data.overallScore * 10 : 50; // Convert back to 0-100
  const confidence = data?.confidence ?? 50;
  const recommendation = (data?.recommendation || 'HOLD') as 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  const direction = data?.direction || 'NEUTRAL';
  const riskLevel = (data?.riskLevel?.toLowerCase() || 'medium') as 'low' | 'medium' | 'high';
  const keySignals = data?.keySignals || [];
  const riskFactors = data?.riskFactors || [];

  // Convert direction to long/short
  const directionMapped = direction.toUpperCase() === 'LONG' ? 'long' : direction.toUpperCase() === 'SHORT' ? 'short' : null;

  return (
    <div className="space-y-4">
      {/* Visual Trade Decision */}
      <TradeDecisionVisual
        recommendation={recommendation}
        direction={directionMapped}
        confidence={confidence}
        riskLevel={riskLevel}
        symbol={symbol}
        size="md"
      />

      {/* Key Signals */}
      {keySignals.length > 0 && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="text-xs text-green-400 font-medium mb-2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Key Signals
          </div>
          <div className="space-y-1">
            {keySignals.slice(0, 4).map((signal, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="w-1 h-1 rounded-full bg-green-400" />
                {signal}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Factors */}
      {riskFactors.length > 0 && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="text-xs text-amber-400 font-medium mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Risk Factors
          </div>
          <div className="space-y-1">
            {riskFactors.slice(0, 3).map((factor, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                <span className="w-1 h-1 rounded-full bg-amber-400" />
                {factor}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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

// Analysis method type
type AnalysisMethod = 'classic' | 'mlis_pro';

interface AnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  coinName: string;
  timeframe: Timeframe;
  analysisMethod?: AnalysisMethod;
  onComplete?: () => void;
}

const TRADE_TYPE_LABELS: Record<TradeType, string> = {
  scalping: 'Scalping',
  dayTrade: 'Day Trade',
  swing: 'Swing Trade',
};

// Classic 7-Step definitions
const CLASSIC_STEPS = [
  { id: 1, name: 'Market Pulse', icon: Globe, color: 'blue', shortDesc: 'Overall market analysis' },
  { id: 2, name: 'Asset Scanner', icon: Target, color: 'cyan', shortDesc: 'Technical analysis' },
  { id: 3, name: 'Safety Check', icon: Shield, color: 'orange', shortDesc: 'Risk assessment' },
  { id: 4, name: 'Timing Analysis', icon: Clock, color: 'purple', shortDesc: 'Entry optimization' },
  { id: 5, name: 'Trap Check', icon: AlertTriangle, color: 'red', shortDesc: 'Trap detection' },
  { id: 6, name: 'Trade Plan', icon: FileText, color: 'indigo', shortDesc: 'Execution strategy' },
  { id: 7, name: 'Final Verdict', icon: CheckCircle, color: 'green', shortDesc: 'GO/NO-GO decision' },
];

// MLIS 5-Layer definitions
const MLIS_LAYERS = [
  { id: 1, name: 'Technical', icon: TrendingUp, color: 'blue', shortDesc: 'EMA, MACD, ADX trend analysis' },
  { id: 2, name: 'Momentum', icon: Zap, color: 'emerald', shortDesc: 'RSI, StochRSI, CCI signals' },
  { id: 3, name: 'Volatility', icon: Activity, color: 'orange', shortDesc: 'ATR, Bollinger assessment' },
  { id: 4, name: 'Volume', icon: BarChart3, color: 'cyan', shortDesc: 'OBV, CMF flow analysis' },
  { id: 5, name: 'Verdict', icon: CheckCircle, color: 'green', shortDesc: 'Final recommendation' },
];

// Keep STEPS as alias for classic (for backward compatibility)
const STEPS = CLASSIC_STEPS;

const colorClasses = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-500' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-500' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-500' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-500' },
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-500' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-500' },
  green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-500' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-500' },
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
  analysisMethod = 'classic',
  onComplete,
}: AnalysisDialogProps) {
  // Derive trade type from timeframe
  const tradeType = TIMEFRAME_TO_TRADE_TYPE[timeframe];
  const uniqueId = useId();
  const router = useRouter();
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
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const saveAttemptedRef = useRef(false);
  const pdfGeneratedRef = useRef(false);


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
      setSavedAnalysisId(null);
      setPdfGenerating(false);
      saveAttemptedRef.current = false;
      pdfGeneratedRef.current = false;
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

  // Save report to database (supports both Classic 7-step and MLIS 5-layer)
  const saveReportToDatabase = useCallback(async () => {
    // Determine expected steps based on method
    const isMLISMethod = analysisMethod === 'mlis_pro' || results[1]?.mlis === true;
    const expectedSteps = isMLISMethod ? 5 : 7;

    if (completedSteps.length !== expectedSteps || saveAttemptedRef.current || reportSaved) return;

    saveAttemptedRef.current = true;

    try {
      const token = await getAuthToken();
      if (!token) return;

      // Get verdict from different step based on method
      const verdictStep = isMLISMethod ? 5 : 7;
      const verdict = results[verdictStep] as { action?: string; verdict?: string; overallScore?: number; analysisId?: string; recommendation?: string; direction?: string } | undefined;
      const tradePlan = isMLISMethod ? null : (results[6] as { direction?: string } | null);
      const reportAnalysisId = verdict?.analysisId || crypto.randomUUID();

      // Build report data based on method
      const reportData = isMLISMethod ? {
        symbol,
        generatedAt: new Date().toISOString(),
        analysisId: reportAnalysisId,
        method: 'mlis_pro',
        technical: results[1],
        momentum: results[2],
        volatility: results[3],
        volume: results[4],
        verdict: results[5],
      } : {
        symbol,
        generatedAt: new Date().toISOString(),
        analysisId: reportAnalysisId,
        method: 'classic',
        marketPulse: results[1],
        assetScan: results[2],
        safetyCheck: results[3],
        timing: results[4],
        trapCheck: results[5],
        tradePlan: results[6],
        verdict: results[7],
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
          verdict: verdict?.action || verdict?.verdict || verdict?.recommendation || 'N/A',
          score: verdict?.overallScore || 0,
          direction: tradePlan?.direction || verdict?.direction || null,
          interval: timeframe,
          tradeType,
          method: isMLISMethod ? 'mlis_pro' : 'classic',
        }),
      });

      if (response.ok) {
        const responseData = await response.json();
        setReportSaved(true);
        // Store the analysis ID for PDF generation
        if (responseData?.data?.analysisId) {
          setSavedAnalysisId(responseData.data.analysisId);
        } else if (reportAnalysisId) {
          setSavedAnalysisId(reportAnalysisId);
        }
      }
    } catch (error) {
      console.error('Failed to auto-save report:', error);
    }
  }, [completedSteps.length, results, symbol, reportSaved, tradeType, timeframe, analysisMethod]);

  // Auto-save when complete (supports both 7-step and 5-layer)
  useEffect(() => {
    const isMLISMethod = analysisMethod === 'mlis_pro' || results[1]?.mlis === true;
    const expectedSteps = isMLISMethod ? 5 : 7;
    if (completedSteps.length === expectedSteps && !saveAttemptedRef.current) {
      saveReportToDatabase();
    }
  }, [completedSteps.length, saveReportToDatabase, analysisMethod, results]);

  // Auto-generate PDF when analysis is saved
  useEffect(() => {
    if (reportSaved && savedAnalysisId && !pdfGeneratedRef.current) {
      pdfGeneratedRef.current = true;
      setPdfGenerating(true);

      // Navigate to details page with ?pdf=true to auto-download PDF
      setTimeout(() => {
        onClose();
        router.push(`/analyze/details/${savedAnalysisId}?pdf=true`);
      }, 1500);
    }
  }, [reportSaved, savedAnalysisId, router, onClose]);

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
        body: JSON.stringify({ symbol, accountSize: 10000, interval: timeframe, tradeType, method: analysisMethod }),
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

      // Store analysis ID from the response
      if (analysisData.analysisId) {
        setSavedAnalysisId(analysisData.analysisId);
      }

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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let allResults: Record<number, any> = {};
      let totalSteps = 7;

      // Handle MLIS Pro vs Classic differently
      if (analysisMethod === 'mlis_pro' || analysisData.method === 'mlis_pro') {
        // MLIS Pro: 5 layers
        totalSteps = 5;
        const layers = analysisData.layers || {};

        // Default layer structure for safety
        const defaultLayer = { score: 50, confidence: 0, signals: [], weight: 0 };

        // Get recommendation with fallback
        const recommendation = analysisData.recommendation || 'HOLD';
        const overallScore = Number(analysisData.overallScore) || 50;

        allResults = {
          1: { name: 'Technical', ...defaultLayer, ...layers.technical, mlis: true },
          2: { name: 'Momentum', ...defaultLayer, ...layers.momentum, mlis: true },
          3: { name: 'Volatility', ...defaultLayer, ...layers.volatility, mlis: true },
          4: { name: 'Volume', ...defaultLayer, ...layers.volume, mlis: true },
          5: {
            name: 'Verdict',
            mlis: true,
            overallScore: overallScore / 10, // Convert to 0-10 scale
            confidence: analysisData.confidence || 50,
            recommendation: recommendation,
            direction: analysisData.direction || 'NEUTRAL',
            riskLevel: analysisData.riskLevel || 'MEDIUM',
            keySignals: analysisData.keySignals || [],
            riskFactors: analysisData.riskFactors || [],
            verdict: recommendation === 'STRONG_BUY' || recommendation === 'BUY' ? 'go' :
                     recommendation === 'HOLD' ? 'wait' : 'avoid',
          },
        };
      } else {
        // Classic 7-step analysis
        const steps = analysisData.steps || {};

        // Validate that we have the expected steps
        if (!steps.verdict) {
          throw new Error('Invalid analysis response: missing verdict');
        }

        allResults = {
          1: steps.marketPulse || {},
          2: steps.assetScan || {},
          3: steps.safetyCheck || {},
          4: steps.timing || {},
          5: steps.trapCheck || {},
          6: steps.tradePlan || {},
          7: { ...steps.verdict, preliminaryVerdict: steps.preliminaryVerdict },
        };
      }

      if (analysisMode === 'quick') {
        // Quick mode: instant results
        const completedIds = Array.from({ length: totalSteps }, (_, i) => i + 1);
        setCompletedSteps(completedIds);
        setResults(allResults);
        setActiveStep(totalSteps);
        setDialogStep('results');
      } else {
        // Educational mode: animate through steps
        for (let stepId = 1; stepId <= totalSteps; stepId++) {
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

  // Determine if this is MLIS based on method or results
  const isMLIS = analysisMethod === 'mlis_pro' || results[1]?.mlis === true;
  const activeSteps = isMLIS ? MLIS_LAYERS : CLASSIC_STEPS;
  const totalStepsCount = activeSteps.length;
  const currentStep = activeSteps[activeStep - 1] || activeSteps[0];
  const colors = colorClasses[currentStep.color as keyof typeof colorClasses];

  // Get verdict based on method
  const verdictStep = isMLIS ? results[5] : results[7];
  const verdict = verdictStep as { action?: string; verdict?: string; overallScore?: number; recommendation?: string } | undefined;
  // Get trade plan for direction (Classic: step 5, MLIS: step 5 verdict has direction)
  const tradePlanStep = isMLIS ? results[5] : results[5];
  const tradePlan = tradePlanStep as { direction?: string } | undefined;
  const direction = isMLIS
    ? (verdictStep as { direction?: string } | undefined)?.direction
    : tradePlan?.direction;
  // Handle verdict action for both Classic and MLIS
  const verdictAction = verdict?.action || verdict?.verdict || verdict?.recommendation || '';
  const normalizedVerdict = verdictAction.toLowerCase().replace('_', ' ');
  const isGo = (normalizedVerdict.includes('go') || normalizedVerdict.includes('buy') || normalizedVerdict.includes('strong buy'))
    && !normalizedVerdict.includes('wait') && !normalizedVerdict.includes('avoid') && !normalizedVerdict.includes('sell');

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

              {/* Analysis Process - Different for Classic vs MLIS */}
              <div
                className="rounded-xl p-4"
                style={{
                  background: analysisMethod === 'mlis_pro'
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.05))'
                    : 'rgba(255, 255, 255, 0.03)',
                  border: analysisMethod === 'mlis_pro'
                    ? '1px solid rgba(139, 92, 246, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {analysisMethod === 'mlis_pro' ? (
                  <>
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-sm text-slate-300">
                      <Layers className="w-4 h-4 text-purple-400" />
                      5-Layer MLIS Pro Analysis
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full font-bold">NEW</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      {MLIS_LAYERS.map((layer) => (
                        <div
                          key={layer.id}
                          className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg"
                          style={{ background: 'rgba(139, 92, 246, 0.1)' }}
                        >
                          <layer.icon className={cn('w-3.5 h-3.5', colorClasses[layer.color as keyof typeof colorClasses].text)} />
                          <span className="text-slate-300">{layer.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
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
                  </>
                )}
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
                  steps={isMLIS ? MLIS_PROGRESS_STEPS : undefined}
                />
              </div>

              {/* Current Step */}
              <div
                className="rounded-xl p-5"
                style={{
                  background: isMLIS
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.05))'
                    : 'linear-gradient(135deg, rgba(45, 212, 191, 0.1), rgba(248, 113, 113, 0.05))',
                  border: isMLIS
                    ? '1px solid rgba(139, 92, 246, 0.2)'
                    : '1px solid rgba(45, 212, 191, 0.2)',
                }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: isMLIS
                        ? 'linear-gradient(135deg, #A78BFA, #8B5CF6)'
                        : 'linear-gradient(135deg, #2DD4BF, #14B8A6)',
                      boxShadow: isMLIS
                        ? '0 8px 30px rgba(139, 92, 246, 0.3)'
                        : '0 8px 30px rgba(45, 212, 191, 0.3)',
                    }}
                  >
                    <currentStep.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">
                      {isMLIS ? `Layer ${activeStep} of ${totalStepsCount}` : `Step ${activeStep} of ${totalStepsCount}`}
                    </div>
                    <h3
                      className="text-lg font-bold"
                      style={{
                        background: isMLIS
                          ? 'linear-gradient(135deg, #C4B5FD, #A78BFA)'
                          : 'linear-gradient(135deg, #7FFFD4, #2DD4BF)',
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
                          background: isMLIS
                            ? 'linear-gradient(135deg, #A78BFA, #8B5CF6)'
                            : 'linear-gradient(135deg, #2DD4BF, #14B8A6)',
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
                  steps={isMLIS ? MLIS_PROGRESS_STEPS : undefined}
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
                        <div className="text-xs text-slate-400">
                          {isMLIS ? `Layer ${activeStep} of ${totalStepsCount}` : `Step ${activeStep} of ${totalStepsCount}`}
                        </div>
                        <h3
                          className="font-semibold"
                          style={{
                            background: isMLIS
                              ? 'linear-gradient(135deg, #A78BFA, #8B5CF6)'
                              : 'linear-gradient(135deg, #7FFFD4, #2DD4BF)',
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
                  {isMLIS ? (
                    // MLIS Layer Results
                    <>
                      {activeStep === 1 && <MLISLayerResult data={results[1]} layerName="Technical" />}
                      {activeStep === 2 && <MLISLayerResult data={results[2]} layerName="Momentum" />}
                      {activeStep === 3 && <MLISLayerResult data={results[3]} layerName="Volatility" />}
                      {activeStep === 4 && <MLISLayerResult data={results[4]} layerName="Volume" />}
                      {activeStep === 5 && <MLISVerdictResult data={results[5]} symbol={symbol} />}
                    </>
                  ) : (
                    // Classic 7-Step Results
                    <>
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
                    </>
                  )}
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
                  {activeSteps.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => handleViewStep(step.id)}
                      className="w-8 h-8 rounded-full text-xs font-medium transition"
                      style={{
                        background: activeStep === step.id
                          ? isMLIS
                            ? 'linear-gradient(135deg, #A78BFA, #8B5CF6)'
                            : 'linear-gradient(135deg, #2DD4BF, #14B8A6)'
                          : completedSteps.includes(step.id)
                          ? isMLIS ? 'rgba(139, 92, 246, 0.2)' : 'rgba(45, 212, 191, 0.2)'
                          : 'rgba(255, 255, 255, 0.05)',
                        color: activeStep === step.id
                          ? 'white'
                          : completedSteps.includes(step.id)
                          ? isMLIS ? '#A78BFA' : '#2DD4BF'
                          : 'rgba(255, 255, 255, 0.3)',
                        boxShadow: activeStep === step.id
                          ? isMLIS ? '0 0 15px rgba(139, 92, 246, 0.4)' : '0 0 15px rgba(45, 212, 191, 0.4)'
                          : 'none',
                        cursor: completedSteps.includes(step.id) ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {step.id}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setActiveStep(Math.min(totalStepsCount, activeStep + 1))}
                  disabled={activeStep === totalStepsCount}
                  className="px-4 py-2 text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: activeStep === totalStepsCount ? 'rgba(255, 255, 255, 0.3)' : 'white',
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
                    background: pdfGenerating
                      ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.05))'
                      : 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.05))',
                    border: pdfGenerating
                      ? '1px solid rgba(239, 68, 68, 0.2)'
                      : '1px solid rgba(34, 197, 94, 0.2)',
                  }}
                >
                  {pdfGenerating ? (
                    <>
                      <div className="flex items-center justify-center gap-2 text-red-400 mb-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-semibold">Generating PDF Report...</span>
                      </div>
                      <p className="text-sm text-slate-400 text-center">
                        Your analysis is complete! Preparing your PDF report for download...
                      </p>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
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
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(22, 163, 74, 0.08))'
                : 'linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(245, 158, 11, 0.08))',
              borderTop: `1px solid ${isGo ? 'rgba(34, 197, 94, 0.25)' : 'rgba(251, 191, 36, 0.25)'}`,
            }}
          >
            <div className="flex items-center justify-between gap-4">
              {/* Signal Light + Verdict Badge */}
              <div className="flex items-center gap-3">
                <SignalIndicator
                  verdict={verdict.verdict as 'go' | 'conditional_go' | 'wait' | 'avoid'}
                  size="sm"
                />
                <VerdictBadge
                  verdict={verdict.verdict as 'go' | 'conditional_go' | 'wait' | 'avoid'}
                  size="sm"
                />
              </div>

              {/* Direction Arrow (if available) */}
              {direction && (
                <DirectionArrow
                  direction={direction.toLowerCase() as 'long' | 'short'}
                  size="sm"
                  animated={false}
                />
              )}

              {/* Score Gauge */}
              {verdict.overallScore !== undefined && (
                <ScoreGauge
                  score={verdict.overallScore}
                  maxScore={10}
                  size="sm"
                  label="Score"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
