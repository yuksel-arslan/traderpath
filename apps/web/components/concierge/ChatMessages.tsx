'use client';

import { useEffect, useRef } from 'react';
import { Bot, User } from 'lucide-react';
import { ChatMessage } from './useConcierge';
import { ResultCard } from './ResultCard';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-teal-500/20 to-coral-500/20 flex items-center justify-center">
            <Bot className="w-10 h-10 text-teal-500" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
            TraderPath Concierge
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Your AI assistant for crypto analysis. Send a message to analyze coins,
            set alerts, or view your analysis history.
          </p>
          <div className="flex flex-wrap gap-2 justify-center text-sm">
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              &quot;How is BTC?&quot;
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              &quot;ETH 4h analysis&quot;
            </span>
            <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              &quot;Help&quot;
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {msg.role === 'assistant' && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
          )}

          <div
            className={`max-w-[80%] ${
              msg.role === 'user'
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-2xl rounded-tr-sm px-4 py-3'
                : 'space-y-3'
            }`}
          >
            {msg.role === 'user' ? (
              <p className="text-sm">{msg.content}</p>
            ) : (
              <>
                {/* Check if this is an analysis result */}
                {msg.data &&
                msg.intent &&
                ['QUICK_ANALYSIS', 'SPECIFIC_ANALYSIS'].includes(msg.intent) &&
                !Array.isArray(msg.data) &&
                typeof msg.data === 'object' &&
                'verdict' in msg.data ? (
                  <ResultCard data={msg.data as import('./useConcierge').QuickAnalysisResult} />
                ) : msg.data &&
                  msg.intent === 'MULTI_ANALYSIS' &&
                  Array.isArray(msg.data) ? (
                  <div className="space-y-3">
                    {(msg.data as import('./useConcierge').QuickAnalysisResult[]).map((result, idx) => (
                      <ResultCard key={idx} data={result} compact />
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl rounded-tl-sm px-4 py-3 border border-slate-200 dark:border-slate-700/50">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {msg.content.split('\n').map((line, idx) => (
                        <p key={idx} className="mb-1 last:mb-0 text-slate-900 dark:text-slate-100">
                          {line.startsWith('**') ? (
                            <strong>{line.replace(/\*\*/g, '')}</strong>
                          ) : (
                            line
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <span className="text-xs text-slate-400 dark:text-slate-500 block mt-1">
              {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {msg.role === 'user' && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
          )}
        </div>
      ))}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex gap-3 justify-start">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <Bot size={16} className="text-white" />
          </div>
          <div className="bg-slate-100 dark:bg-slate-800/50 rounded-2xl rounded-tl-sm px-4 py-3 border border-slate-200 dark:border-slate-700/50">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
