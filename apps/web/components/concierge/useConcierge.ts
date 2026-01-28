'use client';

import { useState, useCallback } from 'react';
import { authFetch } from '@/lib/api';

export type VerdictType = 'GO' | 'CONDITIONAL_GO' | 'WAIT' | 'AVOID';
export type IntentType =
  | 'QUICK_ANALYSIS'
  | 'SPECIFIC_ANALYSIS'
  | 'MULTI_ANALYSIS'
  | 'EXPERT_ASK'
  | 'ALERT_SET'
  | 'ALERT_LIST'
  | 'STATUS'
  | 'HELP'
  | 'UNKNOWN';

export interface QuickAnalysisResult {
  symbol: string;
  interval: string;
  tradeType: string;
  verdict: VerdictType;
  score: number;
  direction: 'long' | 'short';
  entry: number;
  stopLoss: number;
  takeProfit1: number;
  takeProfit2?: number;
  riskReward: number;
  reasoning: string;
  analysisId: string;
  creditsSpent: number;
}

export interface ConciergeResponse {
  success: boolean;
  intent: IntentType;
  message: string;
  data?: QuickAnalysisResult | QuickAnalysisResult[] | Record<string, unknown>;
  suggestions?: string[];
  creditsSpent: number;
  creditsRemaining: number;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: ConciergeResponse['data'];
  intent?: IntentType;
}

export interface QuickCommand {
  id: string;
  label: string;
  command: string;
  description: string;
}

export function useConcierge() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [quickCommands, setQuickCommands] = useState<QuickCommand[]>([]);

  const sendMessage = useCallback(async (message: string, language = 'en') => {
    setIsLoading(true);
    setError(null);

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await authFetch('/api/concierge/chat', {
        method: 'POST',
        body: JSON.stringify({ message, language }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        throw new Error('An error occurred');
      }

      const data: ConciergeResponse = await response.json();

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        data: data.data,
        intent: data.intent,
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Update state
      setCreditsRemaining(data.creditsRemaining);
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);

      // Add error message
      const errorAssistant: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `❌ ${errorMessage}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorAssistant]);

      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSuggestions = useCallback(async (language = 'en') => {
    try {
      const response = await authFetch(`/api/concierge/suggestions?language=${language}`);

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const fetchQuickCommands = useCallback(async (language = 'en') => {
    try {
      const response = await authFetch(`/api/concierge/quick-commands?language=${language}`);

      if (response.ok) {
        const data = await response.json();
        setQuickCommands(data.commands || []);
      }
    } catch {
      // Silently fail
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    creditsRemaining,
    suggestions,
    quickCommands,
    sendMessage,
    fetchSuggestions,
    fetchQuickCommands,
    clearMessages,
  };
}
