'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Loader2, Coins, Trash2, Mic, MicOff, Sparkles, TrendingUp, TrendingDown, Minus, ExternalLink, AlertTriangle, HelpCircle, BarChart3 } from 'lucide-react';
import { authFetch } from '@/lib/api';
import Link from 'next/link';

// Web Speech API type definitions
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

// Types
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
  analysisData?: AnalysisData;
}

interface AnalysisData {
  symbol?: string;
  interval?: string;
  verdict?: 'GO' | 'CONDITIONAL_GO' | 'WAIT' | 'AVOID';
  score?: number;
  direction?: 'long' | 'short';
  entry?: number;
  stopLoss?: number;
  takeProfit1?: number;
  takeProfit2?: number;
  riskReward?: number;
  analysisId?: string;
}

interface ConciergeResponse {
  success: boolean;
  intent: string;
  message: string;
  creditsSpent: number;
  creditsRemaining: number;
  error?: string;
  analysisId?: string;
  verdict?: string;
  score?: number;
  voltranSynthesis?: string;
}

// Quick Commands
const QUICK_COMMANDS = [
  { id: 'btc', label: 'BTC Analysis', command: 'How is BTC?', icon: '₿' },
  { id: 'eth', label: 'ETH Analysis', command: 'How is ETH?', icon: 'Ξ' },
  { id: 'help', label: 'Help', command: 'help', icon: '?' },
  { id: 'status', label: 'My Status', command: 'status', icon: '📊' },
];

// Verdict colors and icons
function getVerdictStyle(verdict?: string) {
  switch (verdict?.toUpperCase()) {
    case 'GO':
      return { bg: 'from-emerald-500 to-green-600', text: 'text-white', icon: TrendingUp };
    case 'CONDITIONAL_GO':
    case 'COND':
      return { bg: 'from-amber-500 to-yellow-600', text: 'text-white', icon: TrendingUp };
    case 'WAIT':
      return { bg: 'from-slate-500 to-gray-600', text: 'text-white', icon: Minus };
    case 'AVOID':
      return { bg: 'from-red-500 to-rose-600', text: 'text-white', icon: TrendingDown };
    default:
      return { bg: 'from-slate-500 to-gray-600', text: 'text-white', icon: Minus };
  }
}

export default function ConciergePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        setSpeechSupported(true);
        const recognition = new SpeechRecognitionClass();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          setInput(transcript);
        };

        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    // Add user message
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const response = await authFetch('/api/concierge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, language: 'en' }),
      });

      const data: ConciergeResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Parse analysis data if present
      let analysisData: AnalysisData | undefined;
      if (data.intent === 'ANALYSIS' && data.analysisId) {
        analysisData = {
          verdict: data.verdict as AnalysisData['verdict'],
          score: data.score,
          analysisId: data.analysisId,
        };
      }

      // Add assistant message
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        intent: data.intent,
        analysisData,
      };
      setMessages(prev => [...prev, assistantMsg]);
      setCredits(data.creditsRemaining);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);

      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

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
        // Already started
      }
    }
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
  };

  // Render message content with special formatting for analysis results
  const renderMessageContent = (msg: ChatMessage) => {
    // If it's an analysis result with data, show the result card
    if (msg.role === 'assistant' && msg.intent === 'ANALYSIS' && msg.analysisData) {
      const { verdict, score, analysisId } = msg.analysisData;
      const style = getVerdictStyle(verdict);
      const VerdictIcon = style.icon;

      return (
        <div className="space-y-3">
          {/* Verdict Card */}
          <div className={`bg-gradient-to-r ${style.bg} rounded-xl p-4 ${style.text}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <VerdictIcon className="w-5 h-5" />
                <span className="font-bold text-lg">{verdict || 'WAIT'}</span>
              </div>
              {score !== undefined && (
                <div className="flex items-center gap-1 bg-white/20 rounded-lg px-2 py-1">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-semibold">{score}/10</span>
                </div>
              )}
            </div>
          </div>

          {/* Message text */}
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

          {/* View Details Link */}
          {analysisId && (
            <Link
              href={`/analyze/details/${analysisId}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 rounded-lg transition-colors text-sm font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              View Full Analysis
            </Link>
          )}
        </div>
      );
    }

    // Help intent - show with special formatting
    if (msg.role === 'assistant' && msg.intent === 'HELP') {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-teal-500">
            <HelpCircle className="w-5 h-5" />
            <span className="font-semibold">AI Concierge Help</span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        </div>
      );
    }

    // Status intent
    if (msg.role === 'assistant' && msg.intent === 'STATUS') {
      return (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-amber-500">
            <BarChart3 className="w-5 h-5" />
            <span className="font-semibold">Your Status</span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        </div>
      );
    }

    // Error content
    if (msg.content.startsWith('Error:')) {
      return (
        <div className="flex items-start gap-2 text-red-500">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{msg.content}</p>
        </div>
      );
    }

    // Default text
    return <p className="text-sm whitespace-pre-wrap">{msg.content}</p>;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-slate-50 dark:bg-slate-900/50">
      {/* Gradient Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-80 h-80 bg-coral-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/25">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                AI Concierge
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your intelligent crypto assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {credits !== null && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/20 rounded-xl border border-amber-200/50 dark:border-amber-700/50">
                <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm font-bold text-amber-700 dark:text-amber-300">
                  {credits}
                </span>
              </div>
            )}

            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Clear chat"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              {/* Welcome Animation */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-teal-500/20 to-teal-600/20 animate-pulse" />
                <div className="absolute inset-2 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-2xl shadow-teal-500/30">
                  <Bot className="w-10 h-10 text-white" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                Welcome to AI Concierge
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
                I can analyze cryptocurrencies, answer trading questions, and help you make informed decisions. Try asking me something!
              </p>

              {/* Quick Commands */}
              <div className="flex flex-wrap gap-3 justify-center mb-6">
                {QUICK_COMMANDS.map((cmd) => (
                  <button
                    key={cmd.id}
                    onClick={() => sendMessage(cmd.command)}
                    disabled={isLoading}
                    className="group flex items-center gap-2 px-5 py-3 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 hover:border-teal-500/50 shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="text-lg">{cmd.icon}</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {cmd.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Example prompts */}
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Try: &quot;How is BTC?&quot; • &quot;What is RSI?&quot; • &quot;ETH 4h analysis&quot;
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-tr-sm shadow-lg shadow-teal-500/20'
                        : 'bg-white dark:bg-slate-800/50 text-slate-900 dark:text-white rounded-tl-sm shadow-sm border border-slate-100 dark:border-slate-700/50'
                    }`}
                  >
                    {renderMessageContent(msg)}
                    <span className={`text-xs mt-2 block ${
                      msg.role === 'user' ? 'text-teal-100' : 'text-slate-400'
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800/50 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-slate-100 dark:border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-sm text-slate-500">Analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-0 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-2 border border-slate-200 dark:border-slate-700/50 focus-within:border-teal-500/50 focus-within:ring-2 focus-within:ring-teal-500/20 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about crypto... (e.g. How is BTC?)"
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500"
            />

            {/* Voice input button */}
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                disabled={isLoading}
                className={`p-3 rounded-xl transition-all ${
                  isListening
                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600'
                }`}
                title={isListening ? 'Stop listening' : 'Voice input'}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            )}

            {/* Send button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={`p-3 rounded-xl transition-all ${
                input.trim() && !isLoading
                  ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 shadow-lg shadow-teal-500/30'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Listening indicator */}
          {isListening && (
            <div className="flex justify-center mt-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white text-sm rounded-full animate-pulse">
                <Mic className="w-4 h-4" />
                Listening... speak now
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
