'use client';

// ===========================================
// Analysis Dialog - Popup-based Analysis Flow
// Guides user through entire analysis process
// ===========================================

import { useState, useCallback, useRef, useEffect } from 'react';
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
  ChevronRight,
  Play,
  TrendingUp,
  Download,
  Mail,
  ArrowLeft,
  Zap,
  Eye,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getAuthToken, getApiUrl } from '../../lib/api';
import { CREDIT_COSTS } from '@traderpath/types';
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
  const saveAttemptedRef = useRef(false);

  // Email state
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

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
      saveAttemptedRef.current = false;
      setShowEmailInput(false);
      setEmailSent(false);
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
        setSavedAnalysisId(reportAnalysisId);
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
          throw new Error('Insufficient credits (25 required). Please purchase more credits.');
        }
        throw new Error(data.error?.message || 'Full analysis failed');
      }

      const analysisData = data.data;
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

  // Handle email send (placeholder - would need backend implementation)
  const handleSendEmail = async () => {
    if (!email || !savedAnalysisId) return;

    setEmailSending(true);
    try {
      // This would call a backend endpoint to send the report via email
      // For now, just simulate success
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setEmailSent(true);
      setShowEmailInput(false);
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setEmailSending(false);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm isolate">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col relative z-[101]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-3">
            {dialogStep !== 'mode-select' && (
              <button
                onClick={() => setDialogStep('mode-select')}
                disabled={isRunning}
                className="p-1.5 hover:bg-muted rounded-lg transition disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <CoinIcon symbol={symbol} size={32} />
            <div>
              <h2 className="font-semibold text-lg">{symbol}/USDT Analysis</h2>
              <p className="text-sm text-muted-foreground">
                {coinName} - {TRADE_TYPE_LABELS[tradeType]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isRunning}
            className="p-2 hover:bg-muted rounded-lg transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 1: Mode Selection */}
          {dialogStep === 'mode-select' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold mb-2">Choose Analysis Mode</h3>
                <p className="text-muted-foreground">
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
                  className={cn(
                    'p-5 rounded-xl border-2 text-left transition-all hover:shadow-lg',
                    analysisMode === 'educational'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-border hover:border-blue-500/50'
                  )}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      analysisMode === 'educational' ? 'bg-blue-500 text-white' : 'bg-muted'
                    )}>
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Educational</h4>
                      {isFirstTimeUser && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">Recommended</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Watch each of the 7 analysis steps run in sequence. Perfect for learning how our AI evaluates trades.
                  </p>
                </button>

                {/* Quick Mode */}
                <button
                  onClick={() => handleModeSelect('quick')}
                  className={cn(
                    'p-5 rounded-xl border-2 text-left transition-all hover:shadow-lg',
                    analysisMode === 'quick'
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-border hover:border-amber-500/50'
                  )}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      analysisMode === 'quick' ? 'bg-amber-500 text-white' : 'bg-muted'
                    )}>
                      <Rocket className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Quick</h4>
                      {!isFirstTimeUser && (
                        <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full">Fast</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Get instant results. All 7 steps run at once and you jump straight to the Final Verdict.
                  </p>
                </button>
              </div>

              {/* What We Analyze */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                  <Eye className="w-4 h-4" />
                  7-Step Analysis Process
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {STEPS.slice(0, 4).map((step) => (
                    <div key={step.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <step.icon className={cn('w-3.5 h-3.5', colorClasses[step.color as keyof typeof colorClasses].text)} />
                      <span>{step.name}</span>
                    </div>
                  ))}
                  {STEPS.slice(4).map((step) => (
                    <div key={step.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <step.icon className={cn('w-3.5 h-3.5', colorClasses[step.color as keyof typeof colorClasses].text)} />
                      <span>{step.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartAnalysis}
                className={cn(
                  'w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all hover:shadow-lg hover:scale-[1.02]',
                  analysisMode === 'educational'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                )}
              >
                {analysisMode === 'educational' ? (
                  <>
                    <GraduationCap className="w-5 h-5" />
                    <span>Start Educational Analysis</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    <span>Run Quick Analysis</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Analyzing */}
          {dialogStep === 'analyzing' && (
            <div className="space-y-6">
              {/* Progress */}
              <div className="bg-muted/30 rounded-lg p-4">
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
              <div className={cn('rounded-lg p-5 border', colors.bg, colors.border)}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center bg-background/50', colors.text)}>
                    <currentStep.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Step {activeStep} of 7</div>
                    <h3 className="text-lg font-bold">{currentStep.name}</h3>
                  </div>
                  {isRunning && activeStep === completedSteps.length + 1 && (
                    <Loader2 className="w-5 h-5 animate-spin ml-auto text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{currentStep.shortDesc}</p>
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {analysisMode === 'educational' && (
                <p className="text-center text-sm text-muted-foreground">
                  Analyzing {symbol}... This takes about 30 seconds.
                </p>
              )}
            </div>
          )}

          {/* Step 3: Results */}
          {dialogStep === 'results' && (
            <div className="space-y-5">
              {/* Progress */}
              <div className="bg-muted/30 rounded-lg p-3">
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
              <div className={cn('rounded-lg border overflow-hidden', colors.border)}>
                <div className={cn('p-4 border-b', colors.bg)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center bg-background/50', colors.text)}>
                        <currentStep.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Step {activeStep} of 7</div>
                        <h3 className="font-semibold">{currentStep.name}</h3>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">Complete</span>
                  </div>
                </div>
                <div className="p-4 max-h-[300px] overflow-y-auto">
                  {activeStep === 1 && <MarketPulse data={results[1]} />}
                  {activeStep === 2 && <AssetScanner data={results[2]} symbol={symbol} />}
                  {activeStep === 3 && <SafetyCheck data={results[3]} symbol={symbol} />}
                  {activeStep === 4 && <TimingAnalysis data={results[4]} symbol={symbol} />}
                  {activeStep === 5 && <TrapCheck data={results[5]} symbol={symbol} />}
                  {activeStep === 6 && (
                    results[6] ? (
                      <TradePlan data={results[6]} symbol={symbol} />
                    ) : (
                      <div className="p-4 bg-muted/30 rounded-lg text-center">
                        <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                        <p className="font-medium text-sm">No Trade Plan Generated</p>
                        <p className="text-xs text-muted-foreground">
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
                  className="px-3 py-2 text-sm border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <div className="flex gap-1">
                  {STEPS.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => handleViewStep(step.id)}
                      className={cn(
                        'w-8 h-8 rounded-full text-xs font-medium transition',
                        activeStep === step.id
                          ? 'bg-primary text-primary-foreground'
                          : completedSteps.includes(step.id)
                          ? 'bg-muted hover:bg-muted/80'
                          : 'bg-muted/50 cursor-not-allowed'
                      )}
                    >
                      {step.id}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setActiveStep(Math.min(7, activeStep + 1))}
                  disabled={activeStep === 7}
                  className="px-3 py-2 text-sm border rounded-lg hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>

              {/* Save/Email Actions */}
              {reportSaved && (
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-green-500">
                    <CheckCircle className="w-4 h-4" />
                    <span>Report saved successfully</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={onClose}
                      className="flex-1 sm:flex-none px-4 py-2 border rounded-lg font-medium hover:bg-muted transition flex items-center justify-center gap-2"
                    >
                      <TrendingUp className="w-4 h-4" />
                      View in Reports
                    </button>

                    {!showEmailInput && !emailSent && (
                      <button
                        onClick={() => setShowEmailInput(true)}
                        className="flex-1 sm:flex-none px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition flex items-center justify-center gap-2"
                      >
                        <Mail className="w-4 h-4" />
                        Email Report
                      </button>
                    )}
                  </div>

                  {/* Email Input */}
                  {showEmailInput && (
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email..."
                        className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                      />
                      <button
                        onClick={handleSendEmail}
                        disabled={!email || emailSending}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        {emailSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4" />
                        )}
                        Send
                      </button>
                    </div>
                  )}

                  {emailSent && (
                    <div className="flex items-center gap-2 text-sm text-green-500">
                      <CheckCircle className="w-4 h-4" />
                      <span>Report sent to {email}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Verdict Summary (only in results) */}
        {dialogStep === 'results' && verdict && (
          <div className={cn(
            'p-4 border-t',
            isGo ? 'bg-green-500/10' : 'bg-amber-500/10'
          )}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  isGo ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'
                )}>
                  {isGo ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Final Verdict</div>
                  <div className={cn(
                    'font-bold text-lg',
                    isGo ? 'text-green-500' : 'text-amber-500'
                  )}>
                    {verdictAction}
                  </div>
                </div>
              </div>
              {verdict.overallScore !== undefined && (
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Score</div>
                  <div className="font-bold text-lg">{(verdict.overallScore * 10).toFixed(0)}%</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
