'use client';

import { useEffect } from 'react';
import { Bot, Coins, Trash2 } from 'lucide-react';
import {
  ChatInput,
  ChatMessages,
  QuickCommands,
  useConcierge,
} from '@/components/concierge';

export default function ConciergePage() {
  const {
    messages,
    isLoading,
    creditsRemaining,
    suggestions,
    quickCommands,
    sendMessage,
    fetchSuggestions,
    fetchQuickCommands,
    clearMessages,
  } = useConcierge();

  useEffect(() => {
    fetchSuggestions('en');
    fetchQuickCommands('en');
  }, [fetchSuggestions, fetchQuickCommands]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                  AI Concierge
                </h1>
                <p className="text-sm text-slate-500">
                  Your crypto assistant is always with you
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Credits indicator */}
              {creditsRemaining !== null && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 rounded-lg">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    {creditsRemaining} credits
                  </span>
                </div>
              )}

              {/* Clear chat button */}
              {messages.length > 0 && (
                <button
                  onClick={clearMessages}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  title="Clear chat"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 max-w-4xl mx-auto w-full flex flex-col">
        <ChatMessages messages={messages} isLoading={isLoading} />
      </div>

      {/* Input area */}
      <div className="border-t border-slate-200 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
          {/* Quick commands */}
          <QuickCommands
            commands={quickCommands}
            onCommand={sendMessage}
            onFetch={() => fetchQuickCommands('en')}
            isLoading={isLoading}
          />

          {/* Suggestions */}
          {suggestions.length > 0 && messages.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(suggestion)}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-full text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Chat input */}
          <ChatInput
            onSend={sendMessage}
            isLoading={isLoading}
            placeholder="Type your message... (e.g. How is BTC?)"
          />
        </div>
      </div>
    </div>
  );
}
