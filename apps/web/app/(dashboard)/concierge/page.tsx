'use client';

// ===========================================
// AI Concierge Page - 2026 Design Trends
// Glassmorphism, Gradient Orbs, Grain Texture
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
  BarChart3,
  Target,
  Zap,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Volume2,
  Clock,
  Activity,
  Brain,
  Shield,
  LineChart,
  CheckCircle2,
  Crown,
} from 'lucide-react';
import { authFetch, getApiUrl } from '@/lib/api';
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
      entry: number;
      stopLoss: number;
      takeProfits: number[];
    };
  };
}

interface MarketData {
  btcPrice: number;
  btcChange: number;
  ethPrice: number;
  ethChange: number;
  fearGreed: number;
  fearGreedLabel: string;
}

// Grain Texture Overlay
function GrainOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 opacity-[0.02]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
      }}
    />
  );
}

// Gradient Orbs
function GradientOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-teal-500/10 dark:from-teal-500/20 to-emerald-500/5 dark:to-emerald-500/10 rounded-full blur-3xl animate-float-slow" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-purple-500/10 dark:from-purple-500/15 to-blue-500/5 dark:to-blue-500/10 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '-3s' }} />
      <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-gradient-to-br from-amber-500/5 dark:from-amber-500/10 to-orange-500/5 rounded-full blur-3xl animate-orb-move" />
    </div>
  );
}

// Quick Command Button
function QuickCommand({
  icon: Icon,
  label,
  onClick,
  gradient
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  gradient: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex items-center gap-2 px-4 py-2.5 rounded-xl",
        "bg-gradient-to-r backdrop-blur-sm border border-slate-300 dark:border-white/10 shadow-sm",
        "hover:scale-[1.02] hover:shadow-lg transition-all duration-200",
        gradient
      )}
    >
      <Icon className="w-4 h-4 text-slate-700 dark:text-white/80 group-hover:text-slate-900 dark:group-hover:text-white" />
      <span className="text-sm font-semibold text-slate-800 dark:text-white/90 group-hover:text-slate-900 dark:group-hover:text-white">{label}</span>
    </button>
  );
}

// Stat Card
function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-xl",
      "bg-white dark:bg-white/5 backdrop-blur-sm border border-slate-300 dark:border-white/10 shadow-sm"
    )}>
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shadow-md", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</p>
        <p className="text-lg font-bold text-slate-800 dark:text-white">{value}</p>
      </div>
    </div>
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

export default function ConciergePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [scanInProgress, setScanInProgress] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const scanPollRef = useRef<NodeJS.Timeout | null>(null);
  const scanStartTimeRef = useRef<number>(0);

  // Fetch market data
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const [btcRes, ethRes, fgRes] = await Promise.all([
          fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'),
          fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT'),
          fetch('https://api.alternative.me/fng/?limit=1'),
        ]);

        const [btcData, ethData, fgData] = await Promise.all([
          btcRes.json(),
          ethRes.json(),
          fgRes.json(),
        ]);

        setMarketData({
          btcPrice: parseFloat(btcData.lastPrice),
          btcChange: parseFloat(btcData.priceChangePercent),
          ethPrice: parseFloat(ethData.lastPrice),
          ethChange: parseFloat(ethData.priceChangePercent),
          fearGreed: parseInt(fgData.data?.[0]?.value || '50'),
          fearGreedLabel: fgData.data?.[0]?.value_classification || 'Neutral',
        });
      } catch (error) {
        console.error('Failed to fetch market data:', error);
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000);
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

    // Clear any existing poll
    if (scanPollRef.current) {
      clearInterval(scanPollRef.current);
    }

    // Poll every 10 seconds for up to 5 minutes
    scanPollRef.current = setInterval(async () => {
      const elapsedMs = Date.now() - scanStartTimeRef.current;
      const elapsedMinutes = elapsedMs / 60000;

      // Stop polling after 5 minutes
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
            // Check if the scan data is fresh (scanned after we started polling)
            const latestScan = new Date(data.data[0].scannedAt).getTime();
            if (latestScan > scanStartTimeRef.current) {
              // Scan complete! Stop polling
              if (scanPollRef.current) {
                clearInterval(scanPollRef.current);
                scanPollRef.current = null;
              }
              setScanInProgress(false);

              // Add completion message with results
              const topCoins = data.data.slice(0, 5);
              const coinList = topCoins.map((coin: any, i: number) => {
                const emoji = coin.verdict === 'GO' ? '🟢' : coin.verdict === 'CONDITIONAL_GO' ? '🟡' : '🟠';
                return `${i + 1}. ${emoji} **${coin.symbol}** - Score: ${coin.reliabilityScore}/100`;
              }).join('\n');

              const completionMessage: ChatMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                content: `✅ **Scan Complete!**\n\n**Top 5 High-Probability Coins:**\n${coinList}\n\n👆 Click the button below to view detailed analysis.`,
                timestamp: new Date(),
                data: {
                  scanComplete: true,
                },
              };

              setMessages(prev => [...prev, completionMessage]);
            }
          }
        }
      } catch (error) {
        console.error('Error polling for scan results:', error);
      }
    }, 10000); // Poll every 10 seconds
  }, []);

  // Send message
  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    setShowWelcome(false);
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

      // Start polling if a scan was initiated
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

  // Quick commands
  const quickCommands = [
    { icon: TrendingUp, label: 'Analyze BTC', command: 'Analyze BTC 4h', gradient: 'from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30' },
    { icon: Activity, label: 'Analyze ETH', command: 'Analyze ETH 4h', gradient: 'from-blue-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:to-indigo-500/30' },
    { icon: Target, label: 'Top 5 Coins (300 Cr)', command: 'Give me top 5 highest probability coins', gradient: 'from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30' },
    { icon: Brain, label: 'Help', command: 'What can you do?', gradient: 'from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30' },
  ];

  return (
    <div className="relative min-h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <GrainOverlay />
      <GradientOrbs />

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
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
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">Your intelligent trading assistant</p>
            </div>
          </div>

          {credits !== null && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <Zap className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{credits.toLocaleString()}</span>
              <span className="text-amber-500/60 dark:text-amber-400/60 text-sm">credits</span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Area */}
          <div className="lg:col-span-2">
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-300 dark:border-white/10 shadow-xl">
              {/* Messages */}
              <div className="h-[500px] overflow-y-auto p-6 space-y-4">
                {/* Welcome Screen */}
                {showWelcome && messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full blur-2xl opacity-30 animate-pulse" />
                      <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                        <Bot className="w-12 h-12 text-white" />
                      </div>
                    </div>

                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                      Welcome to AI Concierge
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 max-w-md mb-8">
                      Ask me to analyze any coin, check market conditions, or get trading insights.
                    </p>

                    {/* Market Overview */}
                    {marketData && (
                      <div className="grid grid-cols-3 gap-3 w-full max-w-lg mb-8">
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10">
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">BTC</p>
                          <p className="text-lg font-bold text-slate-800 dark:text-white">${marketData.btcPrice.toLocaleString()}</p>
                          <p className={cn("text-sm font-semibold", marketData.btcChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                            {marketData.btcChange >= 0 ? '+' : ''}{marketData.btcChange.toFixed(2)}%
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10">
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">ETH</p>
                          <p className="text-lg font-bold text-slate-800 dark:text-white">${marketData.ethPrice.toLocaleString()}</p>
                          <p className={cn("text-sm font-semibold", marketData.ethChange >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                            {marketData.ethChange >= 0 ? '+' : ''}{marketData.ethChange.toFixed(2)}%
                          </p>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10">
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Fear & Greed</p>
                          <p className="text-lg font-bold text-slate-800 dark:text-white">{marketData.fearGreed}</p>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{marketData.fearGreedLabel}</p>
                        </div>
                      </div>
                    )}

                    {/* Quick Commands */}
                    <div className="flex flex-wrap justify-center gap-2">
                      {quickCommands.map((cmd, i) => (
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
                        : "bg-white dark:bg-white/10 backdrop-blur-sm border border-slate-300 dark:border-white/10 shadow-sm"
                    )}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2">
                          <Bot className="w-4 h-4 text-teal-700 dark:text-teal-400" />
                          <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">AI Concierge</span>
                        </div>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">{msg.content}</p>

                      {/* Verdict Card */}
                      {msg.data?.verdict && (
                        <div className="mt-4 p-4 rounded-xl bg-slate-100 dark:bg-black/20 border border-slate-300 dark:border-white/10">
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
                              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-teal-100 hover:bg-teal-200 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 text-teal-700 dark:text-white font-semibold transition-colors border border-teal-300 dark:border-teal-500/20"
                            >
                              <ExternalLink className="w-4 h-4" />
                              View Full Analysis
                            </Link>
                          )}
                        </div>
                      )}

                      {/* Chart */}
                      {msg.data?.chartData && msg.data?.tradePlan && (
                        <div className="mt-4 rounded-xl overflow-hidden bg-slate-200/50 dark:bg-black/20">
                          <TradePlanChart
                            symbol="Analysis"
                            direction={(msg.data.direction?.toLowerCase() || 'long') as 'long' | 'short'}
                            entries={[{ price: msg.data.tradePlan.entry, percentage: 100 }]}
                            stopLoss={{ price: msg.data.tradePlan.stopLoss, percentage: 0 }}
                            takeProfits={msg.data.tradePlan.takeProfits.map((tp, i) => ({
                              price: tp,
                              percentage: 0,
                              riskReward: i + 1,
                            }))}
                            currentPrice={msg.data.tradePlan.entry}
                            analysisTime={msg.timestamp}
                          />
                        </div>
                      )}

                      {/* Scan Complete - View Results Button */}
                      {msg.data?.scanComplete && (
                        <div className="mt-4">
                          <button
                            onClick={() => router.push('/analyze')}
                            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold transition-all shadow-lg hover:shadow-amber-500/30"
                          >
                            <Crown className="w-5 h-5" />
                            View Top 5 Coins on Analyze Page
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
                    <div className="bg-white dark:bg-white/10 backdrop-blur-sm border border-slate-300 dark:border-white/10 rounded-2xl px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Scan in Progress */}
                {scanInProgress && !isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 backdrop-blur-sm border border-amber-200 dark:border-amber-500/20 rounded-2xl px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
                        <div>
                          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Scanning top 30 coins...</span>
                          <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-0.5">Results will appear automatically when ready</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-slate-300 dark:border-white/10 bg-slate-100/80 dark:bg-slate-900/50">
                {/* Quick Commands (shown after first message) */}
                {!showWelcome && messages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {quickCommands.slice(0, 3).map((cmd, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(cmd.command)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-white/10 transition-colors shadow-sm"
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
                        : "bg-white dark:bg-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/20 hover:text-slate-800 dark:hover:text-white border-slate-300 dark:border-white/10"
                    )}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask me anything about trading..."
                    className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 transition-colors shadow-sm"
                    disabled={isLoading}
                  />

                  <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className={cn(
                      "p-3 rounded-xl transition-all",
                      input.trim() && !isLoading
                        ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/30 hover:shadow-xl"
                        : "bg-slate-200 dark:bg-white/10 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-300 dark:border-transparent"
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
            {/* Features Card */}
            <div className="rounded-2xl bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-300 dark:border-white/10 p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                What I Can Do
              </h3>
              <div className="space-y-3">
                {[
                  { icon: BarChart3, label: '7-Step Analysis', desc: 'Full technical analysis' },
                  { icon: Target, label: 'Trade Plans', desc: 'Entry, SL, TP levels' },
                  { icon: Brain, label: 'AI Experts', desc: '4 specialized experts' },
                  { icon: Shield, label: 'Risk Assessment', desc: 'Safety checks' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors border border-slate-200 dark:border-transparent">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500/30 to-emerald-500/30 dark:from-teal-500/20 dark:to-emerald-500/20 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-teal-700 dark:text-teal-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">{item.label}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Example Prompts */}
            <div className="rounded-2xl bg-white dark:bg-slate-900/50 backdrop-blur-xl border border-slate-300 dark:border-white/10 p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Try Asking</h3>
              <div className="space-y-2">
                {[
                  'Analyze SOL for day trading',
                  'What is the RSI indicator?',
                  'Show me the top 5 coins',
                  'BTC 4h analysis',
                ].map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors font-medium"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-500/10 dark:to-emerald-500/10 backdrop-blur-xl border border-teal-300 dark:border-teal-500/20 p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Analysis Cost</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-white">25 credits</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Each full analysis uses 25 credits. Questions and help are free!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
