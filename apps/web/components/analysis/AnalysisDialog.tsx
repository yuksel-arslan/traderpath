'use client';

// ===========================================
// Analysis Dialog - Popup-based Analysis Flow
// Guides user through entire analysis process
// Corporate Design with TraderPath Branding
// ===========================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Globe,
  Target,
  Shield,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Zap,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAuthToken, getApiUrl, authFetch } from '../../lib/api';
import { CREDIT_COSTS } from '@/lib/types';
import { useCreditNotification } from '../../contexts/CreditNotificationContext';
import { CoinIcon } from '../common/CoinIcon';

// Import analysis components
import { MarketPulse } from './MarketPulse';
import { AssetScanner } from './AssetScanner';
import { SafetyCheck } from './SafetyCheck';
import { TimingAnalysis } from './TimingAnalysis';
import { TradePlan } from './TradePlan';
import { TrapCheck } from './TrapCheck';
import { FinalVerdict } from './FinalVerdict';
import { AnalysisProgressBar } from './AnalysisProgressBar';
import { TradeDecisionVisual, SignalIndicator, VerdictBadge, DirectionArrow, ScoreGauge } from './TradeDecisionVisual';

// MLIS Layer Result Component
interface MLISLayerData {
  name?: string;
  score?: number;
  signal?: string;
  weight?: number;
  indicators?: Record<string, any>;
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

// ML Confirmation Result Component (Step 8)
interface MLConfirmationData {
  confirmationStatus?: string;
  agreementLevel?: string;
  agreementReason?: string;
  mlisRecommendation?: string;
  mlisDirection?: string;
  mlisScore?: number;
  mlisConfidence?: number;
  originalConfidence?: number;
  adjustedConfidence?: number;
  confidenceChange?: number;
  alignedSignals?: string[];
  conflictingSignals?: string[];
  warningMessage?: string;
}

function MLConfirmationResult({ data }: { data: MLConfirmationData }) {
  if (!data) return null;

  const status = data.confirmationStatus || 'UNCONFIRMED';
  const agreement = data.agreementLevel || 'NEUTRAL';
  const mlisScore = data.mlisScore ?? 0;
  const mlisConfidence = data.mlisConfidence ?? 0;
  const confidenceChange = data.confidenceChange ?? 0;
  const alignedSignals = data.alignedSignals || [];
  const conflictingSignals = data.conflictingSignals || [];

  const statusConfig: Record<string, { label: string; color: string; bgColor: string; borderColor: string }> = {
    CONFIRMED: { label: 'Confirmed', color: 'text-green-400', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20' },
    PARTIALLY_CONFIRMED: { label: 'Partially Confirmed', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/20' },
    UNCONFIRMED: { label: 'Unconfirmed', color: 'text-slate-400', bgColor: 'bg-slate-500/10', borderColor: 'border-slate-500/20' },
    CONTRADICTED: { label: 'Contradicted', color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/20' },
  };

  const config = statusConfig[status] || statusConfig.UNCONFIRMED;

  return (
    <div className="space-y-3">
      {/* Status Badge */}
      <div className={`flex items-center justify-between p-3 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${config.color}`} />
          <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
        </div>
        <span className="text-xs text-slate-400">{agreement.replace('_', ' ')}</span>
      </div>

      {/* MLIS Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
          <div className="text-xs text-slate-400">ML Score</div>
          <div className="text-lg font-bold text-purple-400">{mlisScore.toFixed(0)}</div>
        </div>
        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
          <div className="text-xs text-slate-400">ML Confidence</div>
          <div className="text-lg font-bold text-purple-400">{mlisConfidence.toFixed(0)}%</div>
        </div>
        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
          <div className="text-xs text-slate-400">Adjustment</div>
          <div className={`text-lg font-bold ${confidenceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {confidenceChange >= 0 ? '+' : ''}{confidenceChange.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Reason */}
      {data.agreementReason && (
        <p className="text-xs text-slate-400 px-1">{data.agreementReason}</p>
      )}

      {/* Aligned Signals */}
      {alignedSignals.length > 0 && (
        <div className="p-2 rounded-lg bg-green-500/10 border border-green-500/20">
          <div className="text-xs text-green-400 font-medium mb-1">Aligned Signals</div>
          {alignedSignals.slice(0, 3).map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="w-1 h-1 rounded-full bg-green-400" />{s}
            </div>
          ))}
        </div>
      )}

      {/* Conflicting Signals */}
      {conflictingSignals.length > 0 && (
        <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="text-xs text-red-400 font-medium mb-1">Conflicting Signals</div>
          {conflictingSignals.slice(0, 3).map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-slate-300">
              <span className="w-1 h-1 rounded-full bg-red-400" />{s}
            </div>
          ))}
        </div>
      )}

      {/* Warning */}
      {data.warningMessage && (
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-1.5 text-xs text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            {data.warningMessage}
          </div>
        </div>
      )}
    </div>
  );
}

// 6 standard timeframes — 2h and 1W removed per backend enum standardization
type Timeframe = '5m' | '15m' | '30m' | '1h' | '4h' | '1d';
type TradeType = 'scalping' | 'dayTrade' | 'swing';
type DialogStep = 'analyzing' | 'results' | 'duplicate_warning';

// Timeframe to trade type mapping
// - Scalping (1000 candles): 5m, 15m
// - Day Trade (500 candles): 30m, 1h, 4h
// - Swing Trade (250 candles): 1d
const TIMEFRAME_TO_TRADE_TYPE: Record<Timeframe, TradeType> = {
  '5m': 'scalping',
  '15m': 'scalping',
  '30m': 'dayTrade',
  '1h': 'dayTrade',
  '4h': 'dayTrade',
  '1d': 'swing',
};

interface CapitalFlowContextPayload {
  capitalFlowId: string;
  recommendedAssets: string[];
  direction?: 'BUY' | 'SELL';
  l1Bias?: 'risk_on' | 'risk_off' | 'neutral';
  l4Confidence?: number;
  // Top-Down Evidence Chain data
  l1Summary?: { bias: string; dxyTrend: string; vixLevel: string; vixValue: number };
  l2Summary?: { market: string; phase: string; flow7d: number }[];
  l3Summary?: { primaryMarket: string; topSectors: string[] };
  l4Summary?: { action: string; confidence: number; market: string };
}

interface AnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  coinName: string;
  timeframe: Timeframe;
  onComplete?: () => void;
  onReportReady?: (analysisId: string) => void;
  capitalFlowContext?: CapitalFlowContextPayload;
}

const TRADE_TYPE_LABELS: Record<TradeType, string> = {
  scalping: 'Scalping',
  dayTrade: 'Day Trade',
  swing: 'Swing Trade',
};

// Analysis Steps: 7-Step Classic + Step 8 ML Confirmation
const CLASSIC_STEPS = [
  { id: 1, name: 'Market Pulse', icon: Globe, color: 'blue', shortDesc: 'Overall market analysis' },
  { id: 2, name: 'Asset Scanner', icon: Target, color: 'cyan', shortDesc: 'Technical analysis' },
  { id: 3, name: 'Safety Check', icon: Shield, color: 'orange', shortDesc: 'Risk assessment' },
  { id: 4, name: 'Timing Analysis', icon: Clock, color: 'purple', shortDesc: 'Entry optimization' },
  { id: 5, name: 'Trap Check', icon: AlertTriangle, color: 'red', shortDesc: 'Trap detection' },
  { id: 6, name: 'Trade Plan', icon: FileText, color: 'indigo', shortDesc: 'Execution strategy' },
  { id: 7, name: 'Final Verdict', icon: CheckCircle, color: 'green', shortDesc: 'GO/NO-GO decision' },
  { id: 8, name: 'ML Confirmation', icon: Zap, color: 'purple', shortDesc: 'MLIS validation layer' },
];

// Keep STEPS as alias (for backward compatibility)
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

export function AnalysisDialog({
  isOpen,
  onClose,
  symbol,
  coinName,
  timeframe,
  onComplete,
  onReportReady,
  capitalFlowContext,
}: AnalysisDialogProps) {
  // Derive trade type from timeframe
  const tradeType = TIMEFRAME_TO_TRADE_TYPE[timeframe];
  const router = useRouter();
  const { notifyCreditDeduction, showCelebration, notifyInsufficientCredits } = useCreditNotification();

  // Dialog state - go directly to analysis
  const [dialogStep, setDialogStep] = useState<DialogStep>('analyzing');

  // Analysis state
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isRunning, setIsRunning] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<Record<number, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [reportSaved, setReportSaved] = useState(false);
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    message: string;
    existingId: string;
    minutesAgo: number;
    score: number;
  } | null>(null);
  const forceAnalysisRef = useRef(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const saveAttemptedRef = useRef(false);
  const pdfGeneratedRef = useRef(false);


  // Track if analysis has started to prevent double-running
  const analysisStartedRef = useRef(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setDialogStep('analyzing');
      setCompletedSteps([]);
      setActiveStep(1);
      setResults({});
      setError(null);
      setReportSaved(false);
      setSavedAnalysisId(null);
      setPdfGenerating(false);
      setDuplicateWarning(null);
      forceAnalysisRef.current = false;
      saveAttemptedRef.current = false;
      pdfGeneratedRef.current = false;
      analysisStartedRef.current = false;
    }
  }, [isOpen]);

  // Store handleStartAnalysis in a ref to avoid dependency issues
  const handleStartAnalysisRef = useRef<(() => Promise<void>) | null>(null);

  // Auto-start analysis when dialog opens
  useEffect(() => {
    if (isOpen && dialogStep === 'analyzing' && !analysisStartedRef.current && !isRunning) {
      analysisStartedRef.current = true;
      // Small delay to ensure state is fully initialized
      const timer = setTimeout(() => {
        handleStartAnalysisRef.current?.();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, dialogStep, isRunning]);

  const getAuthHeaders = useCallback(async () => {
    const token = await getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  // Save report to database (unified 7+1 step flow)
  const saveReportToDatabase = useCallback(async () => {
    // Wait until at least 7 steps are done (step 8 ML confirmation is optional)
    if (completedSteps.length < 7 || saveAttemptedRef.current || reportSaved) return;

    saveAttemptedRef.current = true;

    try {
      const token = await getAuthToken();
      if (!token) return;

      const verdict = results[7] as { action?: string; verdict?: string; overallScore?: number; analysisId?: string; recommendation?: string; direction?: string } | undefined;
      const tradePlanResult = results[6] as { direction?: string } | null;
      const reportAnalysisId = verdict?.analysisId || crypto.randomUUID();

      const reportData = {
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
        mlisConfirmation: results[8] || null,
        ragEnrichment: results[9] || null,
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
          direction: tradePlanResult?.direction || verdict?.direction || null,
          interval: timeframe,
          tradeType,
          method: 'classic',
        }),
      });

      if (response.ok) {
        await response.json();
        setReportSaved(true);
        // Only set savedAnalysisId if not already set from /api/analysis/full response
        // The reports endpoint may return a report ID (not analysis ID), which would
        // cause the report drawer to fetch a non-existent analysis
        if (!savedAnalysisId) {
          setSavedAnalysisId(reportAnalysisId);
        }
      }
    } catch (error) {
      console.error('Failed to auto-save report:', error);
    }
  }, [completedSteps.length, results, symbol, reportSaved, savedAnalysisId, tradeType, timeframe]);

  // Auto-save when 7 steps complete (step 8 ML confirmation doesn't block saving)
  useEffect(() => {
    if (completedSteps.length >= 7 && !saveAttemptedRef.current) {
      saveReportToDatabase();
    }
  }, [completedSteps.length, saveReportToDatabase]);

  // After report saved: wait for celebration animation then auto-open report page
  useEffect(() => {
    if (reportSaved && savedAnalysisId && !pdfGeneratedRef.current) {
      pdfGeneratedRef.current = true;
      setPdfGenerating(true);

      // Wait for celebration modal to finish before navigating
      const celebrationWaitTime = 5500; // 1500ms delay + 4000ms display time

      const timer = setTimeout(() => {
        onClose();
        if (onReportReady) {
          onReportReady(savedAnalysisId);
        } else {
          router.push(`/analyze/details/${savedAnalysisId}`);
        }
      }, celebrationWaitTime);

      return () => clearTimeout(timer);
    }
  }, [reportSaved, savedAnalysisId, router, onClose, onReportReady]);

  // Run full analysis
  const handleStartAnalysis = async () => {
    setDialogStep('analyzing');
    setIsRunning(true);
    setError(null);
    setActiveStep(1);

    try {
      const headers = await getAuthHeaders();
      const forceParam = forceAnalysisRef.current ? '?force=true' : '';
      forceAnalysisRef.current = false;
      const response = await fetch(getApiUrl(`/api/analysis/full${forceParam}`), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          symbol,
          accountSize: 10000,
          interval: timeframe,
          tradeType,
          ...(capitalFlowContext ? { capitalFlowContext } : {}),
        }),
      });

      const responseText = await response.text();
      let data: Record<string, any>;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        // Handle duplicate analysis warning (409)
        if (response.status === 409 && data.error?.code === 'RECENT_ANALYSIS_EXISTS') {
          setIsRunning(false);
          setDuplicateWarning({
            message: data.error.message,
            existingId: data.error.existingAnalysisId,
            minutesAgo: data.error.analyzedMinutesAgo,
            score: data.error.score,
          });
          setDialogStep('duplicate_warning');
          return;
        }

        if (response.status === 402) {
          const errorCode = data.error?.code;

          if (errorCode === 'DAILY_PASS_REQUIRED') {
            // Do NOT auto-purchase - user must purchase the pass explicitly
            const currentBalance = data.error?.currentBalance || 0;
            notifyInsufficientCredits(100, currentBalance);
            throw new Error('Daily Analysis Pass required (100 credits). Please go back and purchase a pass first.');
          } else if (errorCode === 'DAILY_LIMIT_REACHED') {
            throw new Error('Daily analysis limit reached (10/10). Your pass will reset at midnight UTC.');
          } else if (errorCode === 'INSUFFICIENT_CREDITS') {
            const currentBalance = data.error?.currentBalance || 0;
            notifyInsufficientCredits(data.error?.required || 100, currentBalance);
            throw new Error(data.error?.message || 'Insufficient credits. Please purchase more credits.');
          } else {
            throw new Error(data.error?.message || 'Analysis failed. Please try again.');
          }
        } else {
          throw new Error(data.error?.message || 'Full analysis failed');
        }
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
      const totalSteps = 8; // 7-Step + ML Confirmation

      // Unified analysis flow: 7-Step Classic + Step 8 ML Confirmation
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
        8: analysisData.mlisConfirmation || null, // Step 8: ML Confirmation
        9: analysisData.ragEnrichment || null, // Step 9: RAG Intelligence Layer
      };

      // Progressive reveal: show each step completing one-by-one
      // so the user can follow the analysis flow.
      const completedIds = analysisData.mlisConfirmation
        ? [1, 2, 3, 4, 5, 6, 7, 8]
        : [1, 2, 3, 4, 5, 6, 7];

      const STEP_REVEAL_MS = 900; // time each step is visible before next

      for (let i = 0; i < completedIds.length; i++) {
        await new Promise<void>(resolve => setTimeout(resolve, i === 0 ? 300 : STEP_REVEAL_MS));
        const stepId = completedIds[i];
        setActiveStep(stepId);
        setResults(prev => ({ ...prev, [stepId]: allResults[stepId] }));
        setCompletedSteps(completedIds.slice(0, i + 1));
      }

      // Store RAG enrichment data (step 9) without progressive reveal
      // so it's available when saveReportToDatabase fires
      if (allResults[9]) {
        setResults(prev => ({ ...prev, 9: allResults[9] }));
      }

      // Small pause on the last step so user sees completion
      await new Promise<void>(resolve => setTimeout(resolve, 600));
      setDialogStep('results');

      onComplete?.();
    } catch (err) {
      console.error('Full analysis failed:', err);
      setError(err instanceof Error ? err.message : 'Full analysis failed');
    } finally {
      setIsRunning(false);
    }
  };

  // Keep ref updated with latest handleStartAnalysis
  useEffect(() => {
    handleStartAnalysisRef.current = handleStartAnalysis;
  });

  // View step result
  const handleViewStep = (stepId: number) => {
    if (completedSteps.includes(stepId)) {
      setActiveStep(stepId);
    }
  };

  if (!isOpen) return null;

  // Always use unified 7+1 step flow
  const activeSteps = CLASSIC_STEPS;
  const totalStepsCount = activeSteps.length;
  const currentStep = activeSteps[activeStep - 1] || activeSteps[0];
  const colors = colorClasses[currentStep.color as keyof typeof colorClasses];

  // Get verdict from step 7
  const verdictStep = results[7];
  const verdict = verdictStep as { action?: string; verdict?: string; overallScore?: number; recommendation?: string } | undefined;
  // Get trade plan for direction (step 6)
  const tradePlanStep = results[6];
  const tradePlan = tradePlanStep as { direction?: string } | undefined;
  const direction = tradePlan?.direction;
  // Get ML Confirmation status from step 8
  const mlConfirmation = results[8] as { confirmationStatus?: string; agreementLevel?: string } | undefined;
  // Handle verdict action
  const verdictAction = verdict?.action || verdict?.verdict || verdict?.recommendation || '';
  // Guard: verdictAction could be non-string if verdict properties are non-string truthy values
  const normalizedVerdict = (typeof verdictAction === 'string' ? verdictAction : '').toLowerCase().replace('_', ' ');
  const isGo = (normalizedVerdict.includes('go') || normalizedVerdict.includes('buy') || normalizedVerdict.includes('strong buy'))
    && !normalizedVerdict.includes('wait') && !normalizedVerdict.includes('avoid') && !normalizedVerdict.includes('sell');

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] isolate',
        dialogStep === 'results'
          ? 'flex items-end sm:items-stretch sm:justify-end'
          : 'flex items-center justify-center p-4 sm:p-6'
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="analysis-dialog-title"
    >
      {/* Accessible title for screen readers */}
      <h2 id="analysis-dialog-title" className="sr-only">Analysis Results</h2>
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-[#030712]/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Container: centered modal during analysis, drawer for results */}
      <div className={cn(
        'relative overflow-hidden shadow-2xl border border-white/10 bg-[#0a0f1a] flex flex-col transition-all duration-300',
        dialogStep === 'results'
          ? 'w-full sm:w-[520px] sm:max-w-[50vw] max-h-[85vh] sm:max-h-full sm:h-full rounded-t-2xl sm:rounded-t-none sm:rounded-l-2xl animate-in slide-in-from-bottom sm:slide-in-from-right duration-300'
          : 'w-full max-w-2xl max-h-[90vh] rounded-2xl sm:rounded-3xl animate-in fade-in zoom-in-95 duration-200'
      )}>
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
          {/* Duplicate Warning */}
          {dialogStep === 'duplicate_warning' && duplicateWarning && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Recent Analysis Found
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-2">
                <span className="font-semibold text-gray-700 dark:text-gray-300">{symbol}</span> was analyzed on the <span className="font-semibold text-gray-700 dark:text-gray-300">{timeframe}</span> timeframe <span className="font-semibold text-amber-600 dark:text-amber-400">{duplicateWarning.minutesAgo} minutes ago</span>.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
                Score: {duplicateWarning.score.toFixed(1)}/10 — Running again will use your daily pass.
              </p>
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                <button
                  onClick={() => {
                    onClose();
                    router.push(`/analyze/details/${duplicateWarning.existingId}`);
                  }}
                  className="px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  View Existing
                </button>
                <button
                  onClick={() => {
                    forceAnalysisRef.current = true;
                    setDuplicateWarning(null);
                    setDialogStep('analyzing');
                    analysisStartedRef.current = false;
                  }}
                  className="px-4 py-2.5 text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                >
                  Analyze Again
                </button>
              </div>
            </div>
          )}

          {/* Analyzing */}
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
                  steps={undefined}
                />
              </div>

              {/* Current Step */}
              <div
                className="rounded-xl p-5"
                style={{
                  background: currentStep.id === 8
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.05))'
                    : 'linear-gradient(135deg, rgba(45, 212, 191, 0.1), rgba(248, 113, 113, 0.05))',
                  border: currentStep.id === 8
                    ? '1px solid rgba(139, 92, 246, 0.2)'
                    : '1px solid rgba(45, 212, 191, 0.2)',
                }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{
                      background: currentStep.id === 8
                        ? 'linear-gradient(135deg, #A78BFA, #8B5CF6)'
                        : 'linear-gradient(135deg, #2DD4BF, #14B8A6)',
                      boxShadow: currentStep.id === 8
                        ? '0 8px 30px rgba(139, 92, 246, 0.3)'
                        : '0 8px 30px rgba(45, 212, 191, 0.3)',
                    }}
                  >
                    <currentStep.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">
                      {`Step ${activeStep} of ${totalStepsCount}`}
                    </div>
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
                  steps={undefined}
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
                          {`Step ${activeStep} of ${totalStepsCount}`}
                        </div>
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
                    <>
                      {activeStep === 1 && <MarketPulse data={results[1]} />}
                      {activeStep === 2 && <AssetScanner data={results[2]} symbol={symbol} />}
                      {activeStep === 3 && <SafetyCheck data={results[3]} symbol={symbol} />}
                      {activeStep === 4 && <TimingAnalysis data={results[4]} symbol={symbol} />}
                      {activeStep === 5 && <TrapCheck data={results[5]} symbol={symbol} />}
                      {activeStep === 6 && (
                        results[6] ? (
                          <TradePlan data={results[6]} symbol={symbol} interval={timeframe} />
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
                      {activeStep === 7 && <FinalVerdict data={results[7]} symbol={symbol} allResults={results} interval={timeframe} />}
                      {activeStep === 8 && results[8] && (
                        <MLConfirmationResult data={results[8]} />
                      )}
                      {activeStep === 8 && !results[8] && (
                        <div
                          className="p-4 rounded-xl text-center"
                          style={{
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(99, 102, 241, 0.05))',
                            border: '1px solid rgba(139, 92, 246, 0.2)',
                          }}
                        >
                          <Zap className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                          <p className="font-medium text-sm text-white">ML Confirmation Unavailable</p>
                          <p className="text-xs text-slate-400">
                            MLIS validation could not be completed. Analysis results remain valid.
                          </p>
                        </div>
                      )}
                    </>
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
                          ? step.id === 8
                            ? 'linear-gradient(135deg, #A78BFA, #8B5CF6)'
                            : 'linear-gradient(135deg, #2DD4BF, #14B8A6)'
                          : completedSteps.includes(step.id)
                          ? 'rgba(45, 212, 191, 0.2)'
                          : 'rgba(255, 255, 255, 0.05)',
                        color: activeStep === step.id
                          ? 'white'
                          : completedSteps.includes(step.id)
                          ? '#2DD4BF'
                          : 'rgba(255, 255, 255, 0.3)',
                        boxShadow: activeStep === step.id
                          ? '0 0 15px rgba(45, 212, 191, 0.4)'
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
                      ? 'linear-gradient(135deg, rgba(45, 212, 191, 0.1), rgba(20, 184, 166, 0.05))'
                      : 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.05))',
                    border: pdfGenerating
                      ? '1px solid rgba(45, 212, 191, 0.2)'
                      : '1px solid rgba(34, 197, 94, 0.2)',
                  }}
                >
                  {pdfGenerating ? (
                    <>
                      <div className="flex items-center justify-center gap-2 text-teal-400 mb-3">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="font-semibold">Opening Analysis Details...</span>
                      </div>
                      <p className="text-sm text-slate-400 text-center">
                        Your analysis is complete! You will be redirected to the details page shortly...
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
              {direction && typeof direction === 'string' && (
                <DirectionArrow
                  direction={direction.toLowerCase() as 'long' | 'short'}
                  size="sm"
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
