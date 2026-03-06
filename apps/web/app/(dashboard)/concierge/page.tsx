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
  TrendingUp,
  Target,
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Globe,
  Activity,
  Clock,
  Crown,
  ChevronRight,
  Compass,
  Zap,
  BookOpen,
  Brain,
  LineChart,
  Eye,
  ShieldAlert,
} from 'lucide-react';
import { authFetch } from '@/lib/api';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { UpgradeCard } from '@/components/modals/UpgradePrompt';
import { StyledMessage } from '@/components/concierge';

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

// AI Expert profiles for quick access
const AI_EXPERTS = [
  {
    id: 'nexus',
    name: 'NEXUS',
    role: 'Risk & Position',
    icon: Target,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10 hover:bg-amber-500/20',
    border: 'border-amber-500/20',
  },
  {
    id: 'aria',
    name: 'ARIA',
    role: 'Technical Analysis',
    icon: LineChart,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10 hover:bg-blue-500/20',
    border: 'border-blue-500/20',
  },
  {
    id: 'oracle',
    name: 'ORACLE',
    role: 'Whale Tracking',
    icon: Eye,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10 hover:bg-purple-500/20',
    border: 'border-purple-500/20',
  },
  {
    id: 'sentinel',
    name: 'SENTINEL',
    role: 'Security & Traps',
    icon: ShieldAlert,
    color: 'text-red-500',
    bg: 'bg-red-500/10 hover:bg-red-500/20',
    border: 'border-red-500/20',
  },
] as const;

export default function ConciergePage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [capitalFlow, setCapitalFlow] = useState<CapitalFlowData | null>(null);
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
        const res = await authFetch('/api/capital-flow/summary');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setCapitalFlow(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to fetch capital flow:', error);
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

  // Navigate to AI Expert with analysis context
  const goToExpert = useCallback((expertId: string, analysisId?: string, contextSummary?: string) => {
    if (contextSummary) {
      sessionStorage.setItem('aiExpertContext', contextSummary);
    }
    if (analysisId) {
      sessionStorage.setItem('aiExpertAnalysisId', analysisId);
    }
    router.push(`/ai-expert/${expertId}${analysisId ? '?fromAnalysis=true' : ''}`);
  }, [router]);

  // Build a context summary from the last assistant message for expert handoff
  const getLastAnalysisContext = useCallback(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant' && m.data?.verdict);
    if (!lastAssistant) return '';
    return lastAssistant.content;
  }, [messages]);

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
    <div className="h-[calc(100dvh-3.5rem)] flex flex-col text-foreground overflow-hidden">
      <div className="max-w-[1800px] mx-auto w-full px-3 sm:px-6 lg:px-10 flex flex-col flex-1 min-h-0">
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

        </div>

        {/* Main Content — flex-1 fills remaining space */}
        <div className="flex-1 min-h-0 flex flex-col pb-3 sm:pb-4">
          {/* Chat Area — full width */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-0 flex flex-col rounded-xl bg-card border border-border overflow-hidden">
              {/* Messages — flex-1 fills available space */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
                {/* Welcome State — 10 Smart Questions */}
                {messages.length === 0 && (
                  <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="text-center pt-4 sm:pt-8 pb-4 sm:pb-6">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
                        <Bot className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-1.5">
                        AI Concierge
                      </h2>
                      <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                        Your capital flow-aware trading assistant. Ask anything about markets, analysis, and opportunities.
                      </p>

                      {/* Feature badges */}
                      <div className="flex items-center justify-center gap-2 sm:gap-3 mt-4 flex-wrap">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-teal-500/10 rounded-full text-teal-600 dark:text-teal-400 text-xs">
                          <Globe className="w-3.5 h-3.5" />
                          Capital Flow Intel
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-emerald-500/10 rounded-full text-emerald-600 dark:text-emerald-400 text-xs">
                          <Zap className="w-3.5 h-3.5" />
                          7-Step Analysis
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 bg-amber-500/10 rounded-full text-amber-600 dark:text-amber-400 text-xs">
                          <Compass className="w-3.5 h-3.5" />
                          Opportunity Radar
                        </div>
                      </div>
                    </div>

                    {/* 10 Smart Questions */}
                    <div className="flex-1 px-1 sm:px-2 pb-4">
                      <div className="max-w-2xl mx-auto">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                          <p className="text-xs sm:text-sm font-medium text-muted-foreground">10 Smart Questions:</p>
                          <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted px-2 py-0.5 sm:py-1 rounded-full">
                            Click to ask
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {[
                            {
                              question: 'Where is capital flowing and which market should I focus on?',
                              category: 'intelligence' as const,
                            },
                            {
                              question: 'What should I trade right now based on capital flow data?',
                              category: 'intelligence' as const,
                            },
                            {
                              question: 'Analyze BTC on the 4-hour timeframe',
                              category: 'analysis' as const,
                            },
                            {
                              question: 'Run a quick ETH analysis for day trading',
                              category: 'analysis' as const,
                            },
                            {
                              question: 'Give me the top 5 highest probability coins right now',
                              category: 'discovery' as const,
                            },
                            {
                              question: 'Which sectors are showing the strongest momentum?',
                              category: 'discovery' as const,
                            },
                            {
                              question: 'Is it safe to trade today? Any high-impact economic events?',
                              category: 'risk' as const,
                            },
                            {
                              question: 'Show my recent analysis results and overall win rate',
                              category: 'monitoring' as const,
                            },
                            {
                              question: 'Set a price alert for BTC when it drops to $90,000',
                              category: 'monitoring' as const,
                            },
                            {
                              question: 'How does the 7-step analysis engine work?',
                              category: 'education' as const,
                            },
                          ].map((item, i) => {
                            const categoryStyles = {
                              intelligence: { color: 'text-teal-500', bg: 'bg-teal-500/15', hoverBorder: 'hover:border-teal-500/40' },
                              analysis: { color: 'text-emerald-500', bg: 'bg-emerald-500/15', hoverBorder: 'hover:border-emerald-500/40' },
                              discovery: { color: 'text-amber-500', bg: 'bg-amber-500/15', hoverBorder: 'hover:border-amber-500/40' },
                              risk: { color: 'text-orange-500', bg: 'bg-orange-500/15', hoverBorder: 'hover:border-orange-500/40' },
                              monitoring: { color: 'text-cyan-500', bg: 'bg-cyan-500/15', hoverBorder: 'hover:border-cyan-500/40' },
                              education: { color: 'text-violet-500', bg: 'bg-violet-500/15', hoverBorder: 'hover:border-violet-500/40' },
                            };
                            const style = categoryStyles[item.category];
                            return (
                              <button
                                key={i}
                                onClick={() => sendMessage(item.question)}
                                className={cn(
                                  "flex items-start gap-2.5 sm:gap-3 text-left px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl transition-all text-xs sm:text-sm",
                                  "bg-card border border-border hover:shadow-lg hover:scale-[1.02]",
                                  style.hoverBorder
                                )}
                              >
                                <span className={cn(
                                  "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0",
                                  style.bg,
                                  style.color
                                )}>
                                  {i + 1}
                                </span>
                                <span className="flex-1 text-foreground leading-snug">{item.question}</span>
                                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                              </button>
                            );
                          })}
                        </div>

                        {/* Category Legend */}
                        <div className="mt-4 sm:mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 sm:gap-x-4 sm:gap-y-2">
                          {[
                            { label: 'Intelligence', color: 'bg-teal-500', count: 2 },
                            { label: 'Analysis', color: 'bg-emerald-500', count: 2 },
                            { label: 'Discovery', color: 'bg-amber-500', count: 2 },
                            { label: 'Risk', color: 'bg-orange-500', count: 1 },
                            { label: 'Monitoring', color: 'bg-cyan-500', count: 2 },
                            { label: 'Education', color: 'bg-violet-500', count: 1 },
                          ].map((cat) => (
                            <div key={cat.label} className="flex items-center gap-1.5 text-[10px] sm:text-xs text-muted-foreground">
                              <div className={cn("w-2 h-2 rounded-full", cat.color)} />
                              {cat.label}
                            </div>
                          ))}
                        </div>

                        {/* Pro tip */}
                        <div className="mt-4 sm:mt-5 p-3 sm:p-4 bg-gradient-to-r from-teal-500/10 to-emerald-500/10 rounded-xl border border-teal-500/20">
                          <div className="flex items-start gap-2 text-xs sm:text-sm">
                            <BookOpen className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
                            <span className="text-muted-foreground">
                              You can also type naturally — <span className="text-teal-600 dark:text-teal-400 font-medium">&quot;Should I buy SOL?&quot;</span>, <span className="text-teal-600 dark:text-teal-400 font-medium">&quot;Para nereye akiyor?&quot;</span>, or use the microphone.
                            </span>
                          </div>
                        </div>

                        {/* AI Experts Quick Access */}
                        <div className="mt-4 sm:mt-5 p-3 sm:p-4 rounded-xl border border-border bg-card">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Brain className="w-4 h-4 text-purple-500" />
                              <span className="text-xs sm:text-sm font-semibold text-foreground">Need Deep Analysis?</span>
                            </div>
                            <Link
                              href="/ai-expert"
                              className="text-[10px] sm:text-xs text-purple-500 hover:text-purple-600 dark:hover:text-purple-400 font-medium flex items-center gap-0.5"
                            >
                              View all
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {AI_EXPERTS.map((expert) => (
                              <button
                                key={expert.id}
                                onClick={() => goToExpert(expert.id)}
                                className={cn(
                                  "flex flex-col items-center gap-1.5 p-2.5 sm:p-3 rounded-xl transition-all border",
                                  expert.bg, expert.border,
                                  "hover:scale-[1.03] hover:shadow-md"
                                )}
                              >
                                <expert.icon className={cn("w-5 h-5 sm:w-6 sm:h-6", expert.color)} />
                                <span className={cn("text-xs font-bold", expert.color)}>{expert.name}</span>
                                <span className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight text-center">{expert.role}</span>
                              </button>
                            ))}
                          </div>
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
                            <div className="space-y-2">
                              <Link
                                href={`/analyze/details/${msg.data.analysisId}`}
                                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-teal-100 hover:bg-teal-200 dark:bg-teal-500/10 dark:hover:bg-teal-500/20 text-teal-700 dark:text-teal-400 font-semibold transition-colors border border-teal-200 dark:border-teal-500/20"
                              >
                                <ExternalLink className="w-4 h-4" />
                                View Full Analysis
                              </Link>

                              {/* Discuss with Expert */}
                              <div className="pt-1">
                                <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                  <Brain className="w-3 h-3" />
                                  Discuss this analysis with an expert:
                                </p>
                                <div className="grid grid-cols-2 gap-1.5">
                                  {AI_EXPERTS.map((expert) => (
                                    <button
                                      key={expert.id}
                                      onClick={() => goToExpert(expert.id, msg.data?.analysisId, msg.content)}
                                      className={cn(
                                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border",
                                        expert.bg, expert.border, expert.color
                                      )}
                                    >
                                      <expert.icon className="w-3 h-3" />
                                      <span className="truncate">{expert.name}</span>
                                      <span className="text-[9px] text-muted-foreground hidden sm:inline">· {expert.role}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
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
                    {/* Talk to Expert shortcut */}
                    <button
                      onClick={() => router.push('/ai-expert')}
                      className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-medium rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Brain className="w-3 h-3" />
                      Talk to Expert
                    </button>
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
