'use client';

// ===========================================
// AI Concierge Page - Capital Flow Integrated
// "Where money flows, potential exists"
// ===========================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  Mic,
  MicOff,
  Send,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Target,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Globe,
  Activity,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Crown,
} from 'lucide-react';
import { authFetch } from '@/lib/api';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { UpgradeCard } from '@/components/modals/UpgradePrompt';
import { StyledMessage } from '@/components/concierge';

// Lazy load TradePlanChart
const TradePlanChart = dynamic(
  () => import('@/components/analysis/TradePlanChart').then(mod => ({ default: mod.TradePlanChart })),
  { ssr: false, loading: () => <div className="h-[300px] bg-gray-200 dark:bg-white/[0.03] rounded-xl animate-pulse" /> }
);

// Types
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: {
    verdict?: string;
    score?: number;
    analysisId?: string;
    direction?: string;
    scanComplete?: boolean;
    chartData?: Array<{ time: number; open: number; high: number; low: number; close: number }>;
    tradePlan?: {
      entry?: number;
      averageEntry?: number;
      stopLoss?: number | { price: number };
      takeProfits?: Array<number | { price: number; percentage?: number; riskReward?: number }>;
      direction?: string;
    };
  };
}

interface CapitalFlowData {
  globalLiquidity: {
    bias: 'risk_on' | 'risk_off' | 'neutral';
    fedBalanceSheet: { trend: string };
    dxy: { trend: string; value: number };
    vix: { value: number; level: string };
  };
  markets: Array<{
    market: string;
    flow7d: number;
    flow30d: number;
    phase: 'early' | 'mid' | 'late' | 'exit';
    rotationSignal: 'entering' | 'stable' | 'exiting' | null;
  }>;
  recommendation: {
    primaryMarket: string;
    action: 'analyze' | 'wait' | 'avoid';
    confidence: number;
    reasoning: string;
  };
}


// Verdict Badge
function VerdictBadge({ verdict, score }: { verdict: string; score?: number }) {
  const verdictUpper = verdict?.toUpperCase() || '';
  const config = {
    'GO': { bg: 'from-emerald-500 to-green-600', text: 'GO', shadow: 'shadow-emerald-500/30' },
    'CONDITIONAL_GO': { bg: 'from-amber-500 to-yellow-600', text: 'CONDITIONAL', shadow: 'shadow-amber-500/30' },
    'COND': { bg: 'from-amber-500 to-yellow-600', text: 'CONDITIONAL', shadow: 'shadow-amber-500/30' },
    'WAIT': { bg: 'from-slate-500 to-gray-600', text: 'WAIT', shadow: 'shadow-slate-500/30' },
    'AVOID': { bg: 'from-red-500 to-rose-600', text: 'AVOID', shadow: 'shadow-red-500/30' },
  }[verdictUpper] || { bg: 'from-slate-500 to-gray-600', text: verdict, shadow: '' };

  return (
    <div className={cn(
      "inline-flex items-center gap-3 px-5 py-2.5 rounded-xl",
      "bg-gradient-to-r shadow-lg",
      config.bg, config.shadow
    )}>
      <span className="text-lg font-bold text-white">{config.text}</span>
      {score !== undefined && (
        <span className="text-white/80 font-medium">{score}/10</span>
      )}
    </div>
  );
}

// Quick Command Button
function QuickCommand({
  icon: Icon,
  label,
  onClick,
  gradient,
  badge
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  gradient: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-2 px-3 py-2 rounded-xl",
        "bg-gradient-to-r backdrop-blur-sm border border-border shadow-sm",
        "hover:scale-[1.02] hover:shadow-lg transition-all duration-200",
        gradient
      )}
    >
      <Icon className="w-4 h-4 text-foreground/80" />
      <span className="text-sm font-semibold text-foreground/90">{label}</span>
      {badge && (
        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded">
          {badge}
        </span>
      )}
    </button>
  );
}

export default function ConciergePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [capitalFlow, setCapitalFlow] = useState<CapitalFlowData | null>(null);
  const [flowLoading, setFlowLoading] = useState(true);
  const [scanInProgress, setScanInProgress] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const scanPollRef = useRef<NodeJS.Timeout | null>(null);
  const scanStartTimeRef = useRef<number>(0);

  // Feature gate for AI Features (includes Concierge)
  const { hasAccess, currentTier, loading: featureLoading } = useFeatureGate();
  const hasConciergeAccess = hasAccess('ai_features');

  // Fetch Capital Flow data
  useEffect(() => {
    const fetchCapitalFlow = async () => {
      try {
        setFlowLoading(true);
        const res = await authFetch('/api/capital-flow/summary');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setCapitalFlow(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch capital flow:', error);
      } finally {
        setFlowLoading(false);
      }
    };

    fetchCapitalFlow();
    const interval = setInterval(fetchCapitalFlow, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Fetch credits
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const res = await authFetch('/api/credits/balance');
        const data = await res.json();
        if (data.success) {
          setCredits(data.data?.balance || 0);
        }
      } catch (error) {
        console.error('Failed to fetch credits:', error);
      }
    };
    fetchCredits();
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass = (window as unknown as Record<string, any>).SpeechRecognition || (window as unknown as Record<string, any>).webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = navigator.language?.startsWith('tr') ? 'tr-TR' : 'en-US';

        recognition.onresult = (event: { results: { length: number; [key: number]: { length: number; [key: number]: { transcript: string } } } }) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            if (event.results[i]?.length > 0 && event.results[i][0]?.transcript) {
              transcript += event.results[i][0].transcript;
            }
          }
          if (transcript) {
            setInput(transcript);
          }
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* noop */ }
      }
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (scanPollRef.current) {
        clearInterval(scanPollRef.current);
      }
    };
  }, []);

  // Poll for scan results
  const startScanPolling = useCallback(() => {
    setScanInProgress(true);
    scanStartTimeRef.current = Date.now();

    if (scanPollRef.current) {
      clearInterval(scanPollRef.current);
    }

    scanPollRef.current = setInterval(async () => {
      const elapsedMs = Date.now() - scanStartTimeRef.current;
      const elapsedMinutes = elapsedMs / 60000;

      if (elapsedMinutes > 5) {
        if (scanPollRef.current) {
          clearInterval(scanPollRef.current);
          scanPollRef.current = null;
        }
        setScanInProgress(false);
        return;
      }

      try {
        const res = await authFetch('/api/analysis/top-coins?limit=5&tradeableOnly=true');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data && data.data.length > 0) {
            const latestScan = new Date(data.data[0].scannedAt).getTime();
            if (latestScan > scanStartTimeRef.current) {
              if (scanPollRef.current) {
                clearInterval(scanPollRef.current);
                scanPollRef.current = null;
              }
              setScanInProgress(false);

              const topCoins = data.data.slice(0, 5);
              const coinList = topCoins.map((coin: Record<string, any>, i: number) => {
                const emoji = coin.verdict === 'GO' ? '🟢' : coin.verdict === 'CONDITIONAL_GO' ? '🟡' : '🟠';
                return `${i + 1}. ${emoji} **${coin.symbol}** - Score: ${coin.reliabilityScore}/100`;
              }).join('\n');

              const completionMessage: ChatMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                content: `**Scan Complete!**\n\n**Top 5 High-Probability Coins:**\n${coinList}\n\nClick below to view detailed analysis.`,
                timestamp: new Date(),
                data: { scanComplete: true },
              };

              setMessages(prev => [...prev, completionMessage]);
            }
          }
        }
      } catch (error) {
        console.error('Error polling for scan results:', error);
      }
    }, 10000);
  }, []);

  // Send message
  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    setInput('');

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const browserLang = typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] || 'en' : 'en';
      const res = await authFetch('/api/concierge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText, language: browserLang }),
      });

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || data.response || 'Sorry, I could not process your request.',
        timestamp: new Date(),
        data: data.verdict ? {
          verdict: data.verdict,
          score: data.score,
          analysisId: data.analysisId,
          direction: data.direction,
          chartData: data.chartData,
          tradePlan: data.tradePlan,
        } : undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (data.creditsRemaining !== undefined) {
        setCredits(data.creditsRemaining);
      }

      if (data.intent === 'TOP_COINS_SCAN' && data.success && data.creditsSpent > 0) {
        startScanPolling();
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle listening
  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        // Already started or browser error
        setIsListening(false);
      }
    }
  };

  // Quick commands — follows the 4-step pipeline
  const getSmartCommands = () => {
    const commands = [
      // Step 1: Capital Flow
      { icon: Globe, label: 'Capital Flow Overview', command: 'Where is money flowing right now?', gradient: 'from-teal-500/20 to-cyan-500/20 hover:from-teal-500/30 hover:to-cyan-500/30' },
      // Step 2: AI Recommendation
      { icon: Target, label: 'AI Recommendation', command: 'What should I trade based on capital flow?', gradient: 'from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30' },
    ];

    // Step 3: Dynamic analysis based on Capital Flow recommendation
    if (capitalFlow?.recommendation?.primaryMarket) {
      const market = capitalFlow.recommendation.primaryMarket;
      const action = capitalFlow.recommendation?.action || 'analyze';
      commands.push({
        icon: TrendingUp,
        label: `Analyze ${market.toUpperCase()}`,
        command: `Analyze the best ${market} asset right now`,
        gradient: action === 'avoid'
          ? 'from-red-500/20 to-rose-500/20 hover:from-red-500/30 hover:to-rose-500/30'
          : 'from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30',
      });
    }

    // Additional: Top Coins
    commands.push({
      icon: Crown,
      label: 'Top 5 Coins',
      command: 'Give me top 5 highest probability coins',
      gradient: 'from-purple-500/20 to-violet-500/20 hover:from-purple-500/30 hover:to-violet-500/30',
    });

    // Automation: Set Alert
    commands.push({
      icon: Activity,
      label: 'Set Alert',
      command: 'Set a BTC alert when price drops to 55000',
      gradient: 'from-rose-500/20 to-pink-500/20 hover:from-rose-500/30 hover:to-pink-500/30',
    });

    // Automation: Morning Briefing
    commands.push({
      icon: Clock,
      label: 'Morning Briefing',
      command: 'Set my morning briefing to 11:00 AM every day',
      gradient: 'from-sky-500/20 to-blue-500/20 hover:from-sky-500/30 hover:to-blue-500/30',
    });

    return commands;
  };

  // Get bias icon and color
  const getBiasDisplay = (bias: string) => {
    switch (bias) {
      case 'risk_on':
        return { icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/20', label: 'Risk On' };
      case 'risk_off':
        return { icon: TrendingDown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/20', label: 'Risk Off' };
      default:
        return { icon: Activity, color: 'text-gray-500 dark:text-white/30', bg: 'bg-gray-100 dark:bg-gray-500/20', label: 'Neutral' };
    }
  };

  const biasDisplay = capitalFlow?.globalLiquidity?.bias ? getBiasDisplay(capitalFlow.globalLiquidity.bias) : null;

  // Show upgrade prompt if user doesn't have access
  if (!featureLoading && !hasConciergeAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 mb-4 shadow-xl">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            AI Concierge
          </h1>
          <p className="text-muted-foreground">
            Your Capital Flow aware trading assistant
          </p>
        </div>

        {/* Upgrade Card */}
        <div className="w-full max-w-xl">
          <UpgradeCard
            feature="ai_features"
            currentTier={currentTier}
            message="Upgrade to Elite to access AI Concierge - your personal trading assistant that understands natural language and provides instant analysis based on Capital Flow intelligence."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-10rem)] flex flex-col text-foreground overflow-hidden">
      <div className="max-w-[1400px] mx-auto w-full px-3 sm:px-6 flex flex-col flex-1 min-h-0">
        {/* Header */}
        <div className="shrink-0 pt-3 sm:pt-4 pb-2 sm:pb-3">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-[#14B8A6] rounded-full" />
                <div className="w-2 h-2 bg-[#EF5A6F] rounded-full" />
              </div>
              <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-[#14B8A6] to-[#EF5A6F] bg-clip-text text-transparent">
                CONCIERGE
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider hidden sm:inline">
                AI-powered · Capital Flow
              </span>
              {credits !== null && (
                <span className="text-[11px] text-muted-foreground">
                  <span className="text-foreground font-semibold">{credits.toLocaleString()}</span> credits
                </span>
              )}
            </div>
          </header>

          {/* Capital Flow Summary Bar — compact on mobile */}
          {!flowLoading && capitalFlow && Array.isArray(capitalFlow.markets) && capitalFlow.markets.length > 0 && capitalFlow.recommendation && (
            <div className="mt-2 p-2 sm:p-3 rounded-xl bg-muted/50 border border-border">
              {/* Mobile: horizontal scroll row */}
              <div className="flex items-center gap-2 sm:hidden overflow-x-auto scrollbar-hide pb-1">
                {/* Bias chip */}
                <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shrink-0", biasDisplay?.bg)}>
                  {biasDisplay && <biasDisplay.icon className={cn("w-3.5 h-3.5", biasDisplay.color)} />}
                  <span className={cn("text-xs font-bold whitespace-nowrap", biasDisplay?.color)}>{biasDisplay?.label}</span>
                </div>
                {/* Recommendation chip */}
                <div className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shrink-0",
                  capitalFlow.recommendation?.action === 'analyze'
                    ? "bg-emerald-100 dark:bg-emerald-500/20"
                    : capitalFlow.recommendation?.action === 'wait'
                    ? "bg-amber-100 dark:bg-amber-500/20"
                    : "bg-red-100 dark:bg-red-500/20"
                )}>
                  <span className="text-xs font-bold text-foreground capitalize whitespace-nowrap">
                    {capitalFlow.recommendation?.action || 'wait'} {String(capitalFlow.recommendation?.primaryMarket || '').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Desktop: full layout */}
              <div className="hidden sm:flex sm:flex-col lg:flex-row lg:items-center gap-4">
                {/* Global Liquidity Status */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className={cn("p-2 rounded-lg", biasDisplay?.bg)}>
                    {biasDisplay && <biasDisplay.icon className={cn("w-5 h-5", biasDisplay.color)} />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Global Liquidity</p>
                    <p className={cn("font-bold", biasDisplay?.color)}>{biasDisplay?.label}</p>
                  </div>
                </div>

                <div className="hidden lg:block w-px h-10 bg-border" />

                {/* Recommendation */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className={cn(
                    "p-2 rounded-lg",
                    capitalFlow.recommendation?.action === 'analyze'
                      ? "bg-emerald-100 dark:bg-emerald-500/20"
                      : capitalFlow.recommendation?.action === 'wait'
                      ? "bg-amber-100 dark:bg-amber-500/20"
                      : "bg-red-100 dark:bg-red-500/20"
                  )}>
                    {capitalFlow.recommendation?.action === 'analyze' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : capitalFlow.recommendation?.action === 'wait' ? (
                      <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Recommendation</p>
                    <p className="font-bold text-foreground capitalize">
                      {capitalFlow.recommendation?.action || 'wait'} {String(capitalFlow.recommendation?.primaryMarket || 'market').toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {flowLoading && (
            <div className="mt-2 p-3 sm:p-4 rounded-xl bg-card border border-border animate-pulse">
              <div className="h-10 sm:h-16 bg-muted rounded-xl" />
            </div>
          )}
        </div>

        {/* Main Content — flex-1 fills remaining space */}
        <div className="flex-1 min-h-0 flex flex-col pb-3 sm:pb-4">
          {/* Chat Area — full width */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 flex flex-col rounded-xl bg-card border border-border overflow-hidden">
              {/* Messages — flex-1 fills available space */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
                {/* Welcome State — categorized command list */}
                {messages.length === 0 && (
                  <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="text-center pt-4 sm:pt-6 pb-4 sm:pb-6">
                      <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 mb-3 shadow-lg">
                        <Bot className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      </div>
                      <h2 className="text-base sm:text-lg font-semibold text-foreground mb-1">
                        AI Concierge
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                        Select a command below, type your own, or speak using the microphone.
                      </p>
                    </div>

                    {/* Command Categories */}
                    <div className="flex-1 overflow-y-auto px-1 sm:px-2 space-y-4 sm:space-y-5 pb-4">
                      {/* Analysis */}
                      <div>
                        <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5 text-teal-500" />
                          Analysis
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                          {[
                            { label: 'Analyze BTC on 4h', command: 'Analyze BTC on 4h timeframe' },
                            { label: 'Quick ETH analysis', command: 'Quick analysis of ETH' },
                            { label: 'SOL 15m scalping', command: 'Analyze SOL 15m scalping' },
                            { label: 'Best crypto to trade now', command: "What's the best crypto to trade right now?" },
                          ].map((item) => (
                            <button
                              key={item.command}
                              onClick={() => sendMessage(item.command)}
                              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-accent text-left transition-colors group"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                              <span className="text-xs sm:text-sm text-foreground group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Capital Flow */}
                      <div>
                        <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-cyan-500" />
                          Capital Flow
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                          {[
                            { label: 'Where is money flowing?', command: 'Where is money flowing right now?' },
                            { label: 'Strongest market inflow', command: 'Which market has the strongest inflow?' },
                            { label: 'AI trade recommendation', command: 'What should I trade based on capital flow?' },
                            { label: 'Market status', command: 'Show me the current market status' },
                          ].map((item) => (
                            <button
                              key={item.command}
                              onClick={() => sendMessage(item.command)}
                              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-accent text-left transition-colors group"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                              <span className="text-xs sm:text-sm text-foreground group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Discovery */}
                      <div>
                        <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          Discovery
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                          {[
                            { label: 'Top 5 high-probability coins', command: 'Give me top 5 highest probability coins' },
                            { label: 'Top movers today', command: 'Show me top movers today' },
                            { label: 'Market sentiment', command: "What's the current market sentiment?" },
                          ].map((item) => (
                            <button
                              key={item.command}
                              onClick={() => sendMessage(item.command)}
                              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-accent text-left transition-colors group"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="text-xs sm:text-sm text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Alerts & Automation */}
                      <div>
                        <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-rose-500" />
                          Alerts & Automation
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                          {[
                            { label: 'Set BTC price alert', command: 'Set a BTC alert when price drops to 55000' },
                            { label: 'Morning briefing', command: 'Set my morning briefing to 11:00 AM every day' },
                          ].map((item) => (
                            <button
                              key={item.command}
                              onClick={() => sendMessage(item.command)}
                              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-accent text-left transition-colors group"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="text-xs sm:text-sm text-foreground group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">{item.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat Messages */}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex",
                      msg.role === 'user' ? "justify-end" : "justify-start"
                    )}
                  >
                    <div className={cn(
                      "max-w-[92%] sm:max-w-[85%] rounded-xl px-3 py-2.5 sm:px-4 sm:py-3",
                      msg.role === 'user'
                        ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white"
                        : "bg-muted border border-border"
                    )}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">AI Concierge</span>
                        </div>
                      )}
                      <StyledMessage content={msg.content} />

                      {/* Verdict Card */}
                      {msg.data?.verdict && (
                        <div className="mt-4 p-4 rounded-xl bg-card border border-border">
                          <div className="flex items-center justify-between mb-3">
                            <VerdictBadge verdict={msg.data.verdict} score={msg.data.score} />
                            {msg.data.direction && typeof msg.data.direction === 'string' && (
                              <span className={cn(
                                "px-3 py-1 rounded-lg text-sm font-semibold",
                                msg.data.direction.toLowerCase() === 'long'
                                  ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                                  : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                              )}>
                                {msg.data.direction.toUpperCase()}
                              </span>
                            )}
                          </div>

                          {msg.data.analysisId && (
                            <Link
                              href={`/analyze/details/${msg.data.analysisId}`}
                              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-teal-100 hover:bg-teal-200 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 text-teal-700 dark:text-teal-400 font-semibold transition-colors border border-teal-200 dark:border-teal-500/20"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View Full Analysis
                            </Link>
                          )}
                        </div>
                      )}

                      {/* Chart */}
                      {msg.data?.tradePlan && (
                        (() => {
                          try {
                            // Handle both simple and full tradePlan structures
                            const tp = msg.data.tradePlan;
                            if (!tp) return null;

                            // Get entry price - handle both averageEntry and entry
                            const entryPrice = Number(tp.averageEntry || tp.entry) || 0;

                            // Get stop loss price - handle both object and number
                            const slPrice = typeof tp.stopLoss === 'object' && tp.stopLoss
                              ? Number((tp.stopLoss as { price?: number }).price) || 0
                              : Number(tp.stopLoss) || 0;

                            // Get take profits - handle both object array and number array
                            const tpArr = Array.isArray(tp.takeProfits)
                              ? tp.takeProfits.map((item, i) => {
                                  const price = typeof item === 'object' && item
                                    ? Number((item as { price?: number }).price) || 0
                                    : Number(item) || 0;
                                  const percentage = typeof item === 'object' && item
                                    ? Number((item as { percentage?: number }).percentage) || 0
                                    : 0;
                                  let riskReward = typeof item === 'object' && item
                                    ? Number((item as { riskReward?: number }).riskReward) || 0
                                    : 0;
                                  // Calculate per-TP R:R if not provided by backend
                                  if (!riskReward && price && entryPrice && slPrice) {
                                    const risk = Math.abs(entryPrice - slPrice);
                                    riskReward = risk > 0 ? parseFloat((Math.abs(price - entryPrice) / risk).toFixed(1)) : (i + 1);
                                  }
                                  if (!riskReward) riskReward = i + 1;
                                  return { price, percentage, riskReward };
                                }).filter(t => t.price > 0)
                              : [];

                            // Get direction
                            const dir = ((msg.data?.direction || tp.direction || 'long') as string).toLowerCase() as 'long' | 'short';

                            // Only render if we have valid entry and stopLoss prices
                            if (entryPrice <= 0 || slPrice <= 0) return null;

                            return (
                              <div className="mt-3 sm:mt-4 rounded-xl overflow-hidden bg-gray-50 dark:bg-white/[0.03] max-w-full">
                                <TradePlanChart
                                  symbol="Analysis"
                                  direction={dir}
                                  entries={[{ price: entryPrice, percentage: 100 }]}
                                  stopLoss={{ price: slPrice, percentage: 0 }}
                                  takeProfits={tpArr.length > 0 ? tpArr : [{ price: entryPrice * 1.05, percentage: 100, riskReward: 1 }]}
                                  currentPrice={entryPrice}
                                  analysisTime={msg.timestamp}
                                />
                              </div>
                            );
                          } catch (error) {
                            console.error('Error rendering TradePlanChart:', error);
                            return null;
                          }
                        })()
                      )}

                      {/* Scan Complete Button */}
                      {msg.data?.scanComplete && (
                        <div className="mt-4">
                          <button
                            onClick={() => router.push('/top-coins')}
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold transition-all shadow-lg"
                          >
                            <Crown className="w-5 h-5" />
                            View All Top Coins
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Loading */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-teal-500/5 to-emerald-500/5 dark:from-teal-500/10 dark:to-emerald-500/10 border border-teal-500/20 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 rounded-full border-2 border-teal-500/30 border-t-teal-500 animate-spin" />
                          <Bot className="w-4 h-4 text-teal-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-white/70">Processing...</span>
                          <div className="flex gap-1 mt-1">
                            <div className="w-12 h-1 rounded-full bg-teal-500 animate-pulse" />
                            <div className="w-8 h-1 rounded-full bg-teal-500/50 animate-pulse" style={{ animationDelay: '200ms' }} />
                            <div className="w-4 h-1 rounded-full bg-teal-500/30 animate-pulse" style={{ animationDelay: '400ms' }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scan in Progress */}
                {scanInProgress && !isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
                        <div>
                          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Scanning markets...</span>
                          <p className="text-xs text-amber-600/70 dark:text-amber-400/70">Results will appear automatically</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area — shrink-0 so it stays at bottom */}
              <div className="shrink-0 p-2 sm:p-3 border-t border-border bg-muted/50">
                {/* Quick suggestions — scrollable on mobile */}
                {messages.length > 0 && (
                  <div className="flex gap-2 mb-2 overflow-x-auto scrollbar-hide pb-1">
                    {getSmartCommands().slice(0, 3).map((cmd, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(cmd.command)}
                        className="px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-lg bg-card hover:bg-accent text-muted-foreground border border-border transition-colors whitespace-nowrap shrink-0"
                      >
                        {cmd.label}
                      </button>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                  className="flex items-center gap-2 sm:gap-3"
                >
                  {speechSupported && (
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={cn(
                        "p-2.5 sm:p-3 rounded-xl transition-all border shrink-0",
                        isListening
                          ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse border-red-400"
                          : "bg-card text-muted-foreground hover:bg-accent border-border"
                      )}
                    >
                      {isListening ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  )}

                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? '🎤 Speak now...' : 'Ask anything...'}
                    className="flex-1 min-w-0 px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-card border border-border text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-colors"
                    disabled={isLoading}
                  />

                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      "p-2.5 sm:p-3 rounded-xl transition-all shrink-0",
                      input.trim() && !isLoading
                        ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30 hover:shadow-xl"
                        : "bg-gray-200 dark:bg-white/[0.05] text-gray-400 cursor-not-allowed"
                    )}
                  >
                    <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
