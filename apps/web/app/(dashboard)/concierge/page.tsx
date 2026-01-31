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
  Zap,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Globe,
  Activity,
  BarChart3,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Crown,
  DollarSign,
  PieChart,
} from 'lucide-react';
import { authFetch } from '@/lib/api';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// Lazy load TradePlanChart
const TradePlanChart = dynamic(
  () => import('@/components/analysis/TradePlanChart').then(mod => ({ default: mod.TradePlanChart })),
  { ssr: false, loading: () => <div className="h-[300px] bg-slate-200 dark:bg-slate-800/50 rounded-xl animate-pulse" /> }
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
  marketFlows: Array<{
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

// Layer indicator component
function LayerBreadcrumb({ activeLayer = 0 }: { activeLayer?: number }) {
  const layers = [
    { num: 1, label: 'Global', icon: Globe },
    { num: 2, label: 'Market', icon: BarChart3 },
    { num: 3, label: 'Sector', icon: PieChart },
    { num: 4, label: 'Asset', icon: Target },
  ];

  return (
    <div className="flex items-center gap-1 text-xs">
      {layers.map((layer, idx) => (
        <div key={layer.num} className="flex items-center">
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-lg transition-all",
            activeLayer >= layer.num
              ? "bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400"
              : "text-slate-400 dark:text-slate-500"
          )}>
            <layer.icon className="w-3 h-3" />
            <span className="font-medium">L{layer.num}</span>
          </div>
          {idx < layers.length - 1 && (
            <ArrowRight className="w-3 h-3 text-slate-300 dark:text-slate-600 mx-0.5" />
          )}
        </div>
      ))}
    </div>
  );
}

// Flow Direction Indicator
function FlowIndicator({ flow, label }: { flow: number; label: string }) {
  const safeFlow = typeof flow === 'number' && !isNaN(flow) ? flow : 0;
  const isPositive = safeFlow >= 0;
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold",
        isPositive
          ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
          : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
      )}>
        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {isPositive ? '+' : ''}{safeFlow.toFixed(1)}%
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
    </div>
  );
}

// Phase Badge
function PhaseBadge({ phase }: { phase: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    early: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', label: 'EARLY' },
    mid: { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400', label: 'MID' },
    late: { bg: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-400', label: 'LATE' },
    exit: { bg: 'bg-red-100 dark:bg-red-500/20', text: 'text-red-700 dark:text-red-400', label: 'EXIT' },
  };
  const c = config[phase] || config.mid;
  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-bold", c.bg, c.text)}>
      {c.label}
    </span>
  );
}

// Market Flow Card
function MarketFlowCard({
  market,
  flow7d,
  phase,
  isRecommended,
  onClick
}: {
  market: string;
  flow7d: number;
  phase: string;
  isRecommended: boolean;
  onClick: () => void;
}) {
  const marketIcons: Record<string, string> = {
    crypto: '₿',
    stocks: '📈',
    bonds: '📊',
    metals: '🥇',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center p-3 rounded-xl border transition-all hover:scale-[1.02]",
        isRecommended
          ? "bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-500/10 dark:to-emerald-500/10 border-teal-300 dark:border-teal-500/30 shadow-lg shadow-teal-500/10"
          : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
      )}
    >
      {isRecommended && (
        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 flex items-center justify-center">
          <CheckCircle2 className="w-3 h-3 text-white" />
        </div>
      )}
      <span className="text-2xl mb-1">{marketIcons[market] || '📊'}</span>
      <span className="text-xs font-bold text-slate-800 dark:text-white uppercase">{market}</span>
      <FlowIndicator flow={flow7d} label="7d" />
      <PhaseBadge phase={phase} />
    </button>
  );
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
        "bg-gradient-to-r backdrop-blur-sm border border-slate-300 dark:border-white/10 shadow-sm",
        "hover:scale-[1.02] hover:shadow-lg transition-all duration-200",
        gradient
      )}
    >
      <Icon className="w-4 h-4 text-slate-700 dark:text-white/80" />
      <span className="text-sm font-semibold text-slate-800 dark:text-white/90">{label}</span>
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
  const [credits, setCredits] = useState<number | null>(null);
  const [capitalFlow, setCapitalFlow] = useState<CapitalFlowData | null>(null);
  const [flowLoading, setFlowLoading] = useState(true);
  const [scanInProgress, setScanInProgress] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const scanPollRef = useRef<NodeJS.Timeout | null>(null);
  const scanStartTimeRef = useRef<number>(0);

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
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = navigator.language?.startsWith('tr') ? 'tr-TR' : 'en-US';

        recognition.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setInput(text);
          setIsListening(false);
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
              const coinList = topCoins.map((coin: any, i: number) => {
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
      const res = await authFetch('/api/concierge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageText }),
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
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else if (recognitionRef.current) {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  // Quick commands based on Capital Flow recommendation
  const getSmartCommands = () => {
    const baseCommands = [
      { icon: Globe, label: 'Where is money flowing?', command: 'Where is money flowing right now?', gradient: 'from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30' },
      { icon: Target, label: 'Best opportunity?', command: 'What is the best trading opportunity right now?', gradient: 'from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30' },
    ];

    if (capitalFlow?.recommendation?.primaryMarket) {
      const market = capitalFlow.recommendation.primaryMarket;
      baseCommands.push({
        icon: TrendingUp,
        label: `Analyze ${market.toUpperCase()}`,
        command: `Analyze the best ${market} asset right now`,
        gradient: 'from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30',
      });
    }

    baseCommands.push({
      icon: Crown,
      label: 'Top 5 Coins',
      command: 'Give me top 5 highest probability coins',
      gradient: 'from-purple-500/20 to-violet-500/20 hover:from-purple-500/30 hover:to-violet-500/30',
    });

    return baseCommands;
  };

  // Get bias icon and color
  const getBiasDisplay = (bias: string) => {
    switch (bias) {
      case 'risk_on':
        return { icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/20', label: 'Risk On' };
      case 'risk_off':
        return { icon: TrendingDown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-500/20', label: 'Risk Off' };
      default:
        return { icon: Activity, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-500/20', label: 'Neutral' };
    }
  };

  const biasDisplay = capitalFlow?.globalLiquidity?.bias ? getBiasDisplay(capitalFlow.globalLiquidity.bias) : null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header with Capital Flow Context */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl blur-lg opacity-50" />
                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-xl">
                  <Bot className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  AI Concierge
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Capital Flow aware trading assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <LayerBreadcrumb activeLayer={1} />
              {credits !== null && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-100 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                  <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-amber-700 dark:text-amber-400 font-semibold text-sm">{credits.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Capital Flow Summary Bar */}
          {!flowLoading && capitalFlow && capitalFlow.marketFlows && capitalFlow.recommendation && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 shadow-sm">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Global Liquidity Status */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className={cn("p-2 rounded-lg", biasDisplay?.bg)}>
                    {biasDisplay && <biasDisplay.icon className={cn("w-5 h-5", biasDisplay.color)} />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Global Liquidity</p>
                    <p className={cn("font-bold", biasDisplay?.color)}>{biasDisplay?.label}</p>
                  </div>
                </div>

                <div className="hidden lg:block w-px h-10 bg-slate-200 dark:bg-white/10" />

                {/* Market Flows */}
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {capitalFlow.marketFlows.map((market) => (
                    <MarketFlowCard
                      key={market.market}
                      market={market.market}
                      flow7d={market.flow7d ?? 0}
                      phase={market.phase || 'mid'}
                      isRecommended={capitalFlow.recommendation?.primaryMarket === market.market}
                      onClick={() => sendMessage(`Analyze ${market.market} market`)}
                    />
                  ))}
                </div>

                <div className="hidden lg:block w-px h-10 bg-slate-200 dark:bg-white/10" />

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
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Recommendation</p>
                    <p className="font-bold text-slate-800 dark:text-white capitalize">
                      {capitalFlow.recommendation?.action || 'wait'} {(capitalFlow.recommendation?.primaryMarket || 'market').toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {flowLoading && (
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 animate-pulse">
              <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
              {/* Messages */}
              <div className="h-[450px] overflow-y-auto p-6 space-y-4">
                {/* Welcome State */}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full blur-2xl opacity-30 animate-pulse" />
                      <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                        <DollarSign className="w-10 h-10 text-white" />
                      </div>
                    </div>

                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                      Follow The Money
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">
                      {capitalFlow?.recommendation?.reasoning || 'Ask me about market flows, trading opportunities, or analyze any asset.'}
                    </p>

                    {/* Smart Quick Commands */}
                    <div className="flex flex-wrap justify-center gap-2">
                      {getSmartCommands().map((cmd, i) => (
                        <QuickCommand
                          key={i}
                          icon={cmd.icon}
                          label={cmd.label}
                          onClick={() => sendMessage(cmd.command)}
                          gradient={cmd.gradient}
                        />
                      ))}
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
                      "max-w-[85%] rounded-2xl px-4 py-3",
                      msg.role === 'user'
                        ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white"
                        : "bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10"
                    )}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                          <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">AI Concierge</span>
                        </div>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">{msg.content}</p>

                      {/* Verdict Card */}
                      {msg.data?.verdict && (
                        <div className="mt-4 p-4 rounded-xl bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10">
                          <div className="flex items-center justify-between mb-3">
                            <VerdictBadge verdict={msg.data.verdict} score={msg.data.score} />
                            {msg.data.direction && (
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
                                  const riskReward = typeof item === 'object' && item
                                    ? Number((item as { riskReward?: number }).riskReward) || (i + 1)
                                    : (i + 1);
                                  return { price, percentage, riskReward };
                                }).filter(t => t.price > 0)
                              : [];

                            // Get direction
                            const dir = ((msg.data?.direction || tp.direction || 'long') as string).toLowerCase() as 'long' | 'short';

                            // Only render if we have valid entry and stopLoss prices
                            if (entryPrice <= 0 || slPrice <= 0) return null;

                            return (
                              <div className="mt-4 rounded-xl overflow-hidden bg-slate-50 dark:bg-black/20">
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
                    <div className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Analyzing flows...</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scan in Progress */}
                {scanInProgress && !isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl px-4 py-3">
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

              {/* Input Area */}
              <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/30">
                {messages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {getSmartCommands().slice(0, 3).map((cmd, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(cmd.command)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 transition-colors"
                      >
                        {cmd.label}
                      </button>
                    ))}
                  </div>
                )}

                <form
                  onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                  className="flex items-center gap-3"
                >
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={cn(
                      "p-3 rounded-xl transition-all border",
                      isListening
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse border-red-400"
                        : "bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/10 border-slate-200 dark:border-white/10"
                    )}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about market flows, opportunities, or analyze assets..."
                    className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 transition-colors"
                    disabled={isLoading}
                  />

                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      "p-3 rounded-xl transition-all",
                      input.trim() && !isLoading
                        ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30 hover:shadow-xl"
                        : "bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed"
                    )}
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Capital Flow Link */}
            <Link
              href="/capital-flow"
              className="block p-4 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-500/10 dark:to-emerald-500/10 border border-teal-200 dark:border-teal-500/20 hover:border-teal-300 dark:hover:border-teal-500/30 transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg">
                  <Layers className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">Capital Flow Radar</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">See full 4-layer analysis</p>
                </div>
              </div>
              <div className="flex items-center text-teal-600 dark:text-teal-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
                Open Radar <ArrowRight className="w-4 h-4 ml-1" />
              </div>
            </Link>

            {/* Flow Philosophy */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-500" />
                Follow The Money
              </h3>
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <p><span className="font-semibold text-teal-600 dark:text-teal-400">L1:</span> Global Liquidity (Fed, DXY, VIX)</p>
                <p><span className="font-semibold text-teal-600 dark:text-teal-400">L2:</span> Market Flows (Crypto, Stocks...)</p>
                <p><span className="font-semibold text-teal-600 dark:text-teal-400">L3:</span> Sector Drill-Down</p>
                <p><span className="font-semibold text-teal-600 dark:text-teal-400">L4:</span> Asset Analysis</p>
              </div>
            </div>

            {/* Phase Legend */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-3">Market Phases</h3>
              <div className="space-y-2">
                {[
                  { phase: 'early', label: 'EARLY', desc: 'Best entry', color: 'text-emerald-600 dark:text-emerald-400' },
                  { phase: 'mid', label: 'MID', desc: 'Caution', color: 'text-amber-600 dark:text-amber-400' },
                  { phase: 'late', label: 'LATE', desc: 'No entry', color: 'text-orange-600 dark:text-orange-400' },
                  { phase: 'exit', label: 'EXIT', desc: 'Avoid', color: 'text-red-600 dark:text-red-400' },
                ].map((item) => (
                  <div key={item.phase} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PhaseBadge phase={item.phase} />
                      <span className="text-xs text-slate-600 dark:text-slate-400">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Analysis Cost */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/20">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Analysis Cost</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-white">25 credits</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Flow questions and insights are free!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
