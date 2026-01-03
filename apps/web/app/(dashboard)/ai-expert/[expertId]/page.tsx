'use client';

// ===========================================
// AI Expert Chat Page
// Beautiful chat interface with TradePath examples
// ===========================================

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
  ShieldAlert,
  Sparkles,
  Zap,
  BookOpen,
  TrendingUp,
  GraduationCap,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '../../../../lib/utils';

// AI Expert definitions
const AI_EXPERTS = {
  aria: {
    id: 'aria',
    name: 'ARIA',
    role: 'Market Analysis AI',
    description: 'Expert in technical analysis, price patterns, and market trends.',
    icon: LineChart,
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-500/5 to-cyan-500/5',
    exampleQuestions: [
      'What is RSI divergence and how to interpret it?',
      'How to identify support/resistance levels for BTC?',
      'How to use the MACD indicator?',
    ],
  },
  nexus: {
    id: 'nexus',
    name: 'NEXUS',
    role: 'Risk Assessment AI',
    description: 'Calculates risk/reward ratios, position sizing, and portfolio risk.',
    icon: Target,
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-500/5 to-orange-500/5',
    exampleQuestions: [
      'How to calculate position size?',
      'Where should I place my stop loss?',
      'How to determine risk/reward ratio?',
    ],
  },
  oracle: {
    id: 'oracle',
    name: 'ORACLE',
    role: 'Whale Detection AI',
    description: 'Tracks large wallet movements, exchange flows, and smart money.',
    icon: Eye,
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-500/5 to-pink-500/5',
    exampleQuestions: [
      'How to detect whale accumulation?',
      'What does exchange outflow mean?',
      'What is smart money doing?',
    ],
  },
  sentinel: {
    id: 'sentinel',
    name: 'SENTINEL',
    role: 'Security & Scam AI',
    description: 'Detects pump & dump schemes, rug pulls, and market manipulation.',
    icon: ShieldAlert,
    gradient: 'from-red-500 to-rose-500',
    bgGradient: 'from-red-500/5 to-rose-500/5',
    exampleQuestions: [
      'How to detect a pump and dump?',
      'What are the signs of a rug pull?',
      'Is this token contract safe?',
    ],
  },
};

interface Example {
  type: 'analysis' | 'quiz' | 'pattern';
  title: string;
  description: string;
  details: Record<string, unknown>;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  examples?: Example[];
  timestamp: Date;
}

interface ChatResponse {
  success: boolean;
  data?: {
    response: string;
    examples: Example[];
    creditsUsed: number;
    newBalance: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

// Example card component
function ExampleCard({ example }: { example: Example }) {
  const [expanded, setExpanded] = useState(false);

  const typeConfig = {
    analysis: {
      icon: TrendingUp,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      label: 'Real Analysis',
    },
    quiz: {
      icon: GraduationCap,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      label: 'Education',
    },
    pattern: {
      icon: Lightbulb,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      label: 'Pattern',
    },
  };

  const config = typeConfig[example.type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'rounded-xl border p-3',
        config.bg,
        config.border
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', config.bg)}>
          <Icon className={cn('w-4 h-4', config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('text-xs px-2 py-0.5 rounded font-medium', config.bg, config.color)}>
              {config.label}
            </span>
            <span className="font-medium text-sm truncate">{example.title}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{example.description}</p>

          {Object.keys(example.details).length > 0 && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {expanded ? 'Hide' : 'Show details'}
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 pt-2 border-t border-border/50 grid gap-1">
                      {Object.entries(example.details).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground capitalize">{key}:</span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </motion.div>
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
            examples: data.data!.examples,
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
  const hasEnoughCredits = (credits?.balance || 0) >= 3;

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
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                <Gem className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-semibold text-amber-600">
                  {credits?.balance || 0} credits
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {messages.length === 0 ? (
            /* Empty state */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
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
                  Real examples
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 rounded-full text-amber-600 text-sm">
                  <Zap className="w-4 h-4" />
                  3 credits/message
                </div>
              </div>

              {/* Example questions */}
              <div className="space-y-3 max-w-lg mx-auto">
                <p className="text-sm text-muted-foreground mb-4">Example questions:</p>
                {expert.exampleQuestions.map((question, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => handleExampleClick(question)}
                    className={cn(
                      'block w-full text-left px-5 py-4 rounded-xl transition text-sm',
                      'bg-gradient-to-r hover:shadow-lg',
                      expert.bgGradient,
                      'border border-border/50 hover:border-primary/30'
                    )}
                  >
                    <Sparkles className="w-4 h-4 inline mr-2 text-amber-500" />
                    {question}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Message list */
            <div className="space-y-6">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex gap-4',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className={cn(
                      'w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center flex-shrink-0',
                      expert.gradient
                    )}>
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[85%] space-y-3',
                    message.role === 'user' ? 'order-first' : ''
                  )}>
                    {/* Message bubble */}
                    <div
                      className={cn(
                        'rounded-2xl px-5 py-4',
                        message.role === 'user'
                          ? `bg-gradient-to-r ${expert.gradient} text-white`
                          : 'bg-muted'
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                    </div>

                    {/* Examples for assistant messages */}
                    {message.role === 'assistant' && message.examples && message.examples.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <BookOpen className="w-3 h-3" />
                          TradePath Examples
                        </div>
                        <div className="grid gap-2">
                          {message.examples.map((example, i) => (
                            <ExampleCard key={i} example={example} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {message.role === 'user' && (
                    <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Loading indicator */}
              {chatMutation.isPending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-4"
                >
                  <div className={cn(
                    'w-10 h-10 bg-gradient-to-br rounded-xl flex items-center justify-center flex-shrink-0',
                    expert.gradient
                  )}>
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl px-5 py-4 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {expert.name} is thinking...
                    </span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className={cn('border-t', expert.bgGradient)}>
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          {!hasEnoughCredits && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-3 p-4 bg-destructive/10 text-destructive rounded-xl text-sm border border-destructive/20"
            >
              <AlertCircle className="w-5 h-5" />
              <span>You need at least 3 credits to chat with this expert.</span>
              <Link href="/credits" className="underline font-semibold ml-auto">
                Get Credits
              </Link>
            </motion.div>
          )}

          {chatMutation.isError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-3 p-4 bg-destructive/10 text-destructive rounded-xl text-sm border border-destructive/20"
            >
              <AlertCircle className="w-5 h-5" />
              <span>{chatMutation.error.message}</span>
            </motion.div>
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
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              3 credits/message
            </span>
            <span>•</span>
            <span>Shift+Enter for new line</span>
          </div>
        </div>
      </div>
    </div>
  );
}
