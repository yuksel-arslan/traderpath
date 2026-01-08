'use client';

// ===========================================
// AI Expert Chat Page
// Smart chat interface with approval flow
// ===========================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Send,
  ArrowLeft,
  Loader2,
  Bot,
  User,
  Gem,
  AlertCircle,
  LineChart,
  Target,
  Eye,
  Shield,
  ShieldAlert,
  Sparkles,
  Zap,
  BookOpen,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '../../../../lib/utils';

// AI Expert definitions with 10 smart questions each
const AI_EXPERTS = {
  aria: {
    id: 'aria',
    name: 'ARIA',
    role: 'Market Analysis AI',
    description: 'Expert in technical analysis, price patterns, and market trends.',
    icon: LineChart,
    color: 'text-blue-500',
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-500/5 to-cyan-500/5',
    relatedStep: 2, // Asset Scanner
    exampleQuestions: [
      'What is RSI divergence and how to interpret it?',
      'How to identify support and resistance levels?',
      'How do I read MACD signals?',
      'Why is multi-timeframe analysis important?',
      'What does a Bollinger Band squeeze mean?',
      'What do moving average crossovers signal?',
      'How to determine trend direction?',
      'What is Volume Profile and POC?',
      'How to spot head and shoulders pattern?',
      'Which timeframe for day vs swing trading?',
    ],
  },
  nexus: {
    id: 'nexus',
    name: 'NEXUS',
    role: 'Risk Assessment AI',
    description: 'Calculates risk/reward ratios, position sizing, and portfolio risk.',
    icon: Target,
    color: 'text-amber-500',
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-500/5 to-orange-500/5',
    relatedStep: 5, // Trade Plan
    exampleQuestions: [
      'How to calculate position size?',
      'Where should I place my stop loss?',
      'How to determine risk/reward ratio?',
      'How much should I risk per trade?',
      'How to protect capital during drawdowns?',
      'Fixed vs trailing stop loss difference?',
      'How to avoid over-leveraging?',
      'DCA or single entry - which is better?',
      'How many positions should I have open?',
      'What is max drawdown and how to manage it?',
    ],
  },
  oracle: {
    id: 'oracle',
    name: 'ORACLE',
    role: 'Whale Detection AI',
    description: 'Tracks large wallet movements, exchange flows, and smart money.',
    icon: Eye,
    color: 'text-purple-500',
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-500/5 to-pink-500/5',
    relatedStep: 3, // Safety Check
    exampleQuestions: [
      'How to detect whale accumulation?',
      'What does exchange outflow mean?',
      'What is smart money doing?',
      'How to track smart money movements?',
      'Difference between accumulation and distribution?',
      'How to track institutional money flow?',
      'What does negative net flow indicate?',
      'How do whales manipulate the market?',
      'What is order flow imbalance?',
      'Signs that smart money is exiting?',
    ],
  },
  sentinel: {
    id: 'sentinel',
    name: 'SENTINEL',
    role: 'Security & Scam AI',
    description: 'Detects pump & dump schemes, rug pulls, and market manipulation.',
    icon: ShieldAlert,
    color: 'text-red-500',
    gradient: 'from-red-500 to-rose-500',
    bgGradient: 'from-red-500/5 to-rose-500/5',
    relatedStep: 6, // Trap Check
    exampleQuestions: [
      'How to spot pump and dump schemes?',
      'What are rug pull warning signs?',
      'Is this token contract safe?',
      'What is a bull trap and how to avoid it?',
      'How to identify a bear trap?',
      'What is liquidity hunting?',
      'How does stop hunting work?',
      'How to identify fake breakouts?',
      'Why are liquidity levels important?',
      'What is spoofing and layering?',
    ],
  },
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Expert icons as inline SVG strings
const EXPERT_ICONS = {
  ARIA: '<svg class="w-4 h-4 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
  NEXUS: '<svg class="w-4 h-4 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  ORACLE: '<svg class="w-4 h-4 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  SENTINEL: '<svg class="w-4 h-4 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  VOLTRAN: '<svg class="w-4 h-4 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/></svg>',
};

const VERDICT_STYLES = {
  GO: { bg: 'bg-green-500/20', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/30' },
  'CONDITIONAL GO': { bg: 'bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' },
  WAIT: { bg: 'bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/30' },
  AVOID: { bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/30' },
  PENDING: { bg: 'bg-gray-500/20', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-500/30' },
  ERROR: { bg: 'bg-red-500/20', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/30' },
};

const EXPERT_STYLES = {
  ARIA: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
  NEXUS: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  ORACLE: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/20' },
  SENTINEL: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' },
};

// Formatting function to style AI messages
function formatAIMessage(content: string): string {
  let formatted = content
    // Clean excessive line breaks (3+ lines -> 2 lines)
    .replace(/\n{3,}/g, '\n\n');

  // Replace expert markers with styled HTML
  formatted = formatted.replace(/\[EXPERT:(ARIA|NEXUS|ORACLE|SENTINEL)\]\s*/g, (_, expertId) => {
    const style = EXPERT_STYLES[expertId as keyof typeof EXPERT_STYLES];
    const icon = EXPERT_ICONS[expertId as keyof typeof EXPERT_ICONS];
    return `<div class="flex items-start gap-2 p-3 my-2 rounded-lg ${style.bg} border ${style.border}"><span class="${style.text}">${icon}</span><div class="flex-1"><span class="font-semibold ${style.text}">${expertId}</span><span class="text-muted-foreground ml-1">—</span> `;
  });

  // Close expert blocks (at double newline or end)
  formatted = formatted.replace(/<\/span> ([^<]+?)(\n\n|$)/g, '</span> $1</div></div>$2');

  // Replace VOLTRAN marker
  formatted = formatted.replace(/\[VOLTRAN\]\s*/g, () => {
    const icon = EXPERT_ICONS.VOLTRAN;
    return `<div class="flex items-start gap-2 p-3 my-2 rounded-lg bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20"><span class="text-purple-500">${icon}</span><div class="flex-1"><span class="font-semibold bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent">VOLTRAN PANEL VERDICT</span><span class="text-muted-foreground ml-1">—</span> `;
  });

  // Replace panel header
  formatted = formatted.replace(/\[PANEL_HEADER\]\s*(.+?)(\n|$)/g, (_, title) => {
    return `<div class="text-lg font-bold mb-2">${title.trim()}</div>`;
  });

  // Replace verdict markers
  formatted = formatted.replace(/\[(GO|CONDITIONAL GO|WAIT|AVOID|PENDING|ERROR)\]\s*/g, (_, verdict) => {
    const style = VERDICT_STYLES[verdict as keyof typeof VERDICT_STYLES] || VERDICT_STYLES.PENDING;
    return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text} ${style.border} border mr-2">${verdict}</span>`;
  });

  formatted = formatted
    // Style section titles (lines starting with emoji) - legacy support
    .replace(/^(📍|📊|📌|📚|🚀|💡|✅|⚠️|🔥|🐋|🔐|🎯|📈|📐)\s*(.+?)$/gm,
      '<div class="ai-section-title"><span class="ai-emoji">$1</span> $2</div>')
    // Style bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Style italic text
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Style bullet points
    .replace(/^[•]\s+(.+)$/gm, '<div class="ai-bullet"><span class="ai-bullet-dot">●</span><span>$1</span></div>')
    .replace(/^[-]\s+(.+)$/gm, '<div class="ai-bullet"><span class="ai-bullet-dot">●</span><span>$1</span></div>')
    // Style numbered lists (1. 2. 3.)
    .replace(/^(\d+)\.\s+(.+)$/gm,
      '<div class="ai-numbered"><span class="ai-number">$1</span><span>$2</span></div>')
    // Clean up --- separators
    .replace(/---/g, '<hr class="my-3 border-border/50" />')
    // Double line break -> paragraph spacing
    .replace(/\n\n/g, '<div class="ai-paragraph-break"></div>')
    // Single line break -> br
    .replace(/\n/g, '<br/>');

  return formatted;
}

interface ChatResponse {
  success: boolean;
  data?: {
    response: string;
    creditsUsed: number;
    newBalance: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

// Answer Footer Component - Add to Report + Download Full Report buttons
function AnswerFooter({
  content,
  analysisId,
  onAddToReport
}: {
  content: string;
  analysisId: string | null;
  onAddToReport: (content: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleAddToReport = async () => {
    if (!analysisId) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const res = await fetch(`/api/reports/by-analysis/${analysisId}/ai-expert-comment`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: content }),
      });

      if (res.ok) {
        setAdded(true);
        onAddToReport(content);
      } else {
        const data = await res.json();
        setError(data.error?.message || 'Failed to add to report');
      }
    } catch (err) {
      console.error('Failed to add to report:', err);
      setError('Failed to add to report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFullReport = async () => {
    if (!analysisId) return;

    setDownloading(true);
    setDownloadError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setDownloadError('Not authenticated');
        return;
      }

      // Deduct 25 credits for full report
      const creditRes = await fetch('/api/credits/deduct', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 25,
          reason: 'Full PDF Report Download',
          analysisId
        }),
      });

      if (!creditRes.ok) {
        const creditData = await creditRes.json();
        if (creditData.error?.code === 'INSUFFICIENT_CREDITS') {
          setDownloadError('Insufficient credits (need 25)');
        } else {
          setDownloadError(creditData.error?.message || 'Failed to deduct credits');
        }
        return;
      }

      // Fetch report data
      const reportRes = await fetch(`/api/reports/by-analysis/${analysisId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!reportRes.ok) {
        setDownloadError('Report not found');
        return;
      }

      const reportData = await reportRes.json();
      if (!reportData.data?.reportData) {
        setDownloadError('Report data not found');
        return;
      }

      // Generate PDF
      const { generateAnalysisReport } = await import('../../../../components/reports/AnalysisReport');
      await generateAnalysisReport({
        ...reportData.data.reportData,
        aiExpertComment: reportData.data.aiExpertComment || content,
      });

    } catch (err) {
      console.error('Failed to download report:', err);
      setDownloadError('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Add to Report Button - Only show if analysisId is available and not added yet */}
        {analysisId && !added && (
          <button
            onClick={handleAddToReport}
            disabled={loading}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition",
              error
                ? "bg-red-500/10 text-red-600 border border-red-500/20"
                : "bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20"
            )}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : error ? (
              <>
                <AlertCircle className="w-4 h-4" />
                {error}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add to Report
              </>
            )}
          </button>
        )}

        {/* Full Analysis Link - show when no analysisId */}
        {!analysisId && (
          <Link
            href="/analyze"
            className="flex items-center justify-between flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl hover:border-green-500/40 transition group"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-green-500" />
              <span className="text-sm">
                Run <span className="font-semibold text-green-600 dark:text-green-400">Full Analysis</span>
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-green-500 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}
      </div>

      {/* Download Full Report Button - Show after comment is added */}
      {added && analysisId && (
        <button
          onClick={handleDownloadFullReport}
          disabled={downloading}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition",
            downloadError
              ? "bg-red-500/10 text-red-600 border border-red-500/20"
              : "bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-600 hover:to-green-600 shadow-lg shadow-green-500/25"
          )}
        >
          {downloading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating PDF...
            </>
          ) : downloadError ? (
            <>
              <AlertCircle className="w-5 h-5" />
              {downloadError}
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Download Full Report
              <span className="ml-1 px-2 py-0.5 bg-white/20 rounded text-xs">25 credits</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

export default function AIExpertChatPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const expertId = params.expertId as string;
  const expert = AI_EXPERTS[expertId as keyof typeof AI_EXPERTS];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [contextProcessed, setContextProcessed] = useState(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [commentSaved, setCommentSaved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Use ref to keep current analysisId value accessible in callbacks
  const analysisIdRef = useRef<string | null>(null);
  const commentSavedRef = useRef(false);

  // Redirect if invalid expert
  useEffect(() => {
    if (!expert) {
      router.push('/ai-expert');
    }
  }, [expert, router]);

  // Handle context from sessionStorage (e.g., from trade plan analysis)
  useEffect(() => {
    if (contextProcessed) return;

    const fromAnalysis = searchParams.get('fromAnalysis');
    if (fromAnalysis === 'true') {
      const contextMessage = sessionStorage.getItem('aiExpertContext');
      const storedAnalysisId = sessionStorage.getItem('aiExpertAnalysisId');

      if (contextMessage) {
        setInput(contextMessage);
        sessionStorage.removeItem('aiExpertContext');
      }
      if (storedAnalysisId) {
        setAnalysisId(storedAnalysisId);
        analysisIdRef.current = storedAnalysisId;
        sessionStorage.removeItem('aiExpertAnalysisId');
      }
      setContextProcessed(true);
      router.replace(`/ai-expert/${expertId}`, { scroll: false });
    }
  }, [searchParams, contextProcessed, router, expertId]);

  // Save AI Expert comment to report (uses refs for current values)
  const saveCommentToReport = async (comment: string) => {
    const currentAnalysisId = analysisIdRef.current;
    if (!currentAnalysisId || commentSavedRef.current) return;

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      console.log('Saving AI Expert comment for analysisId:', currentAnalysisId);

      // Find report by analysisId and save comment
      const res = await fetch(`/api/reports/by-analysis/${currentAnalysisId}/ai-expert-comment`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment }),
      });

      if (res.ok) {
        console.log('AI Expert comment saved successfully');
        setCommentSaved(true);
        commentSavedRef.current = true;
      } else {
        const errorData = await res.json();
        console.error('Failed to save AI Expert comment:', errorData);
      }
    } catch (error) {
      console.error('Failed to save AI Expert comment:', error);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch credit balance
  const { data: credits } = useQuery({
    queryKey: ['credits'],
    queryFn: async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return { balance: 0 };

      const res = await fetch('/api/credits/balance', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      return result.data || { balance: 0 };
    },
  });

  // Fetch user info (for admin check)
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return { isAdmin: false };

      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      return result.data?.user || { isAdmin: false };
    },
  });

  // Chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string): Promise<ChatResponse> => {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/ai-expert/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          expertId,
          message,
          conversationHistory: messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.message || 'Failed to get response');
      }

      return res.json();
    },
    onSuccess: (data) => {
      if (data.success && data.data) {
        const response = data.data!.response;
        setMessages(prev => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: response,
            timestamp: new Date(),
          },
        ]);
        queryClient.invalidateQueries({ queryKey: ['credits'] });

        // Auto-save AI Expert comment to report if coming from analysis
        // Uses refs to get current values (state may be stale in callback)
        saveCommentToReport(response);
      }
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    inputRef.current?.focus();

    chatMutation.mutate(userMessage.content);
  };

  const handleExampleClick = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  if (!expert) return null;

  const Icon = expert.icon;
  const isAdmin = user?.isAdmin === true;
  const hasEnoughCredits = isAdmin || (credits?.balance || 0) >= 3;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className={cn(
        'border-b bg-gradient-to-r backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10',
        expert.bgGradient
      )}>
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/ai-expert"
                className="p-2 hover:bg-muted rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className={cn('w-14 h-14 bg-gradient-to-br rounded-xl flex items-center justify-center shadow-lg', expert.gradient)}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{expert.name}</h1>
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </div>
                <p className={cn('text-sm bg-gradient-to-r bg-clip-text text-transparent font-medium', expert.gradient)}>
                  {expert.role}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isAdmin ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 rounded-full border border-green-500/20">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-semibold text-green-600">
                    Admin
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                  <Gem className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-amber-600">
                    {credits?.balance || 0} credits
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {messages.length === 0 ? (
            /* Empty state */
            <div className="text-center py-12">
              <div className={cn(
                'w-28 h-28 bg-gradient-to-br rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl',
                expert.gradient
              )}>
                <Icon className="w-14 h-14 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Chat with {expert.name}</h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                {expert.description}
              </p>

              {/* Feature badges */}
              <div className="flex items-center justify-center gap-3 mb-8">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 rounded-full text-green-600 text-sm">
                  <BookOpen className="w-4 h-4" />
                  With real examples
                </div>
                {isAdmin ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 rounded-full text-green-600 text-sm">
                    <Shield className="w-4 h-4" />
                    Free (Admin)
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 rounded-full text-amber-600 text-sm">
                    <Zap className="w-4 h-4" />
                    3 credits/msg
                  </div>
                )}
              </div>

              {/* Example questions - 10 smart questions with scroll */}
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-muted-foreground">10 Smart Questions:</p>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    Click to ask
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2">
                  {expert.exampleQuestions.map((question, i) => (
                    <button
                      key={i}
                      onClick={() => handleExampleClick(question)}
                      className="flex items-start gap-3 text-left px-4 py-3 rounded-xl transition text-sm bg-card border hover:shadow-lg hover:scale-[1.02]"
                    >
                      <span className={cn(
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                        expert.color.replace('text-', 'bg-').replace('-500', '-500/20'),
                        expert.color
                      )}>
                        {i + 1}
                      </span>
                      <span className="flex-1">{question}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>

                {/* TradePath Feature Link */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
                  <div className="flex items-center gap-2 text-sm">
                    <ExternalLink className="w-4 h-4 text-blue-500" />
                    <span className="text-muted-foreground">
                      Test this in TradePath{' '}
                      <Link href="/analyze" className="text-primary font-medium hover:underline">
                        Analyze → Step {expert.relatedStep}
                      </Link>
                      {' '}to see real data.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Message list */
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {/* AI Avatar */}
                  {message.role === 'assistant' && (
                    <div className={cn(
                      'w-9 h-9 bg-gradient-to-br rounded-full flex items-center justify-center flex-shrink-0 shadow-md',
                      expert.gradient
                    )}>
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}

                  <div className={cn(
                    'max-w-[80%] space-y-2',
                    message.role === 'user' ? 'order-first' : ''
                  )}>
                    {/* Sender name for AI */}
                    {message.role === 'assistant' && (
                      <span className={cn(
                        'text-xs font-semibold bg-gradient-to-r bg-clip-text text-transparent',
                        expert.gradient
                      )}>
                        {expert.name}
                      </span>
                    )}

                    {/* Message bubble */}
                    <div
                      className={cn(
                        'px-4 py-3 shadow-sm',
                        message.role === 'user'
                          ? `bg-gradient-to-r ${expert.gradient} text-white rounded-2xl rounded-br-md`
                          : 'bg-card border border-border rounded-2xl rounded-tl-md'
                      )}
                    >
                      <div className="text-sm leading-[1.7] text-foreground/90">
                        {message.role === 'assistant' ? (
                          <div
                            className="ai-message-content"
                            dangerouslySetInnerHTML={{
                              __html: formatAIMessage(message.content)
                            }}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                    </div>

                    {/* Timestamp */}
                    <span className={cn(
                      'text-[10px] text-muted-foreground',
                      message.role === 'user' ? 'text-right block' : ''
                    )}>
                      {message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {/* Answer Footer - show for all assistant messages */}
                    {message.role === 'assistant' && (
                      <AnswerFooter
                        content={message.content}
                        analysisId={analysisId}
                        onAddToReport={() => setCommentSaved(true)}
                      />
                    )}
                  </div>

                  {/* User Avatar */}
                  {message.role === 'user' && (
                    <div className="w-9 h-9 bg-gradient-to-br from-slate-500 to-slate-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {chatMutation.isPending && (
                <div className="flex gap-3">
                  <div className={cn(
                    'w-9 h-9 bg-gradient-to-br rounded-full flex items-center justify-center flex-shrink-0 shadow-md',
                    expert.gradient
                  )}>
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="space-y-2">
                    <span className={cn(
                      'text-xs font-semibold bg-gradient-to-r bg-clip-text text-transparent',
                      expert.gradient
                    )}>
                      {expert.name}
                    </span>
                    <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-3 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="border-t bg-card">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          {!hasEnoughCredits && (
            <div className="flex items-center gap-2 mb-3 p-4 bg-destructive/10 text-destructive rounded-xl text-sm border border-destructive/20">
              <AlertCircle className="w-5 h-5" />
              <span>You need at least 3 credits to chat with this expert.</span>
              <Link href="/credits" className="underline font-semibold ml-auto">
                Buy Credits
              </Link>
            </div>
          )}

          {chatMutation.isError && (
            <div className="flex items-center gap-2 mb-3 p-4 bg-destructive/10 text-destructive rounded-xl text-sm border border-destructive/20">
              <AlertCircle className="w-5 h-5" />
              <span>{chatMutation.error.message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={`Ask ${expert.name} a question...`}
              className="flex-1 resize-none rounded-xl border bg-background px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[56px] max-h-[150px]"
              rows={1}
              disabled={!hasEnoughCredits || chatMutation.isPending}
            />
            <button
              type="submit"
              disabled={!input.trim() || !hasEnoughCredits || chatMutation.isPending}
              className={cn(
                'px-6 py-4 rounded-xl font-semibold transition flex items-center gap-2',
                'bg-gradient-to-r disabled:opacity-50 disabled:cursor-not-allowed',
                expert.gradient,
                'text-white hover:opacity-90 hover:shadow-lg'
              )}
            >
              {chatMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </form>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
            {isAdmin ? (
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-green-500" />
                Free (Admin)
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                3 credits/msg
              </span>
            )}
            <span>•</span>
            <span>Shift+Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}
