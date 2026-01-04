'use client';

// ===========================================
// AI Expert Chat Page
// Smart chat interface with approval flow
// ===========================================

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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

// Formatting function to style AI messages
function formatAIMessage(content: string): string {
  let formatted = content
    // Clean excessive line breaks (3+ lines -> 2 lines)
    .replace(/\n{3,}/g, '\n\n')
    // Style section titles (lines starting with emoji)
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

// Answer Footer Component - Single unified footer with link
function AnswerFooter() {
  return (
    <div className="mt-4">
      <Link
        href="/analyze"
        className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl hover:border-green-500/40 transition group"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-green-500" />
          <span className="text-sm">
            See in TradePath running{' '}
            <span className="font-semibold text-green-600 dark:text-green-400">Full Analysis</span>
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-green-500 group-hover:translate-x-1 transition-transform" />
      </Link>
    </div>
  );
}

export default function AIExpertChatPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const expertId = params.expertId as string;
  const expert = AI_EXPERTS[expertId as keyof typeof AI_EXPERTS];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Redirect if invalid expert
  useEffect(() => {
    if (!expert) {
      router.push('/ai-expert');
    }
  }, [expert, router]);

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
        setMessages(prev => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: data.data!.response,
            timestamp: new Date(),
          },
        ]);
        queryClient.invalidateQueries({ queryKey: ['credits'] });
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
                      <AnswerFooter />
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
