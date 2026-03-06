'use client';

// ===========================================
// TradingAssistant — Compact Dashboard Widget
// Connects to existing /api/concierge/chat
// Full experience at /concierge
// ===========================================

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Send, Loader2, Bot, ChevronRight, Sparkles } from 'lucide-react';
import { authFetch } from '@/lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface UserContext {
  winRate: number;
  accuracy: number;
  activeCount: number;
  totalAnalyses: number;
  capitalFlowAction: string;
  topMarket: string;
  phase: string;
  credits: number;
}

interface TradingAssistantProps {
  userContext: UserContext;
}

// Generate 3 context-aware suggested questions from user data
function getSuggestedQuestions(ctx: UserContext): string[] {
  const q: string[] = [];

  // Capital flow question — always relevant
  if (ctx.capitalFlowAction === 'analyze' && ctx.topMarket) {
    q.push(`Why is ${ctx.topMarket} in ${ctx.phase} phase right now?`);
  } else if (ctx.capitalFlowAction === 'avoid') {
    q.push('Why should I avoid new positions now?');
  } else {
    q.push('Where is capital flowing right now?');
  }

  // Performance question — based on win rate
  if (ctx.totalAnalyses > 3) {
    if (ctx.winRate < 50) {
      q.push('What am I doing wrong with my entries?');
    } else if (ctx.winRate >= 65) {
      q.push('How do I scale my position size safely?');
    } else {
      q.push('How can I improve my win rate?');
    }
  } else {
    q.push('What should I analyze first?');
  }

  // Active trades question
  if (ctx.activeCount > 0) {
    q.push(`I have ${ctx.activeCount} open trades — should I add more?`);
  } else if (ctx.credits < 50) {
    q.push('How do I earn free credits?');
  } else {
    q.push(`Analyze ${ctx.topMarket || 'BTC'} for me quickly`);
  }

  return q;
}

export function TradingAssistant({ userContext }: TradingAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggested = getSuggestedQuestions(userContext);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
    };

    setMessages((prev) => [...prev.slice(-3), userMsg]); // Keep last 3 + new
    setInput('');
    setLoading(true);
    setHasInteracted(true);

    try {
      const res = await authFetch('/api/concierge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim() }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message || data.error || 'Something went wrong.',
      };

      setMessages((prev) => [...prev.slice(-3), assistantMsg]); // Keep last 4 total
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Connection error. Try the full Concierge page.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  // Visible messages: show last 2 pairs (4 messages max)
  const visibleMessages = messages.slice(-4);

  return (
    <div className="border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#111111]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-teal-500/10 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-teal-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-none">
              Trading Assistant
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Knows your data</p>
          </div>
        </div>
        <Link
          href="/concierge"
          className="text-xs font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex items-center gap-1"
        >
          Full Chat
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Messages area — only shown after first interaction */}
      {visibleMessages.length > 0 && (
        <div className="px-6 py-4 space-y-3 border-b border-gray-100 dark:border-gray-800 max-h-[240px] overflow-y-auto">
          {visibleMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] text-sm leading-relaxed px-3 py-2 rounded-lg ${
                  msg.role === 'user'
                    ? 'bg-teal-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Suggested questions — shown before first interaction */}
      {!hasInteracted && (
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-3">
            Suggested
          </p>
          <div className="space-y-2">
            {suggested.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="w-full text-left text-xs text-gray-600 dark:text-gray-400 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-800 hover:border-teal-500/50 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-start gap-2"
              >
                <Sparkles className="w-3 h-3 text-teal-500 shrink-0 mt-0.5" />
                <span>{q}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your trades..."
            disabled={loading}
            className="flex-1 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-3 py-2 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-8 h-8 flex items-center justify-center rounded-md bg-teal-500 hover:bg-teal-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
