'use client';

import { useEffect, useRef } from 'react';
import { Bot, User, Globe, BarChart3, Target, ArrowRight, Info } from 'lucide-react';
import { ChatMessage } from './useConcierge';
import { ResultCard } from './ResultCard';

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

// Parse structured text blocks from concierge responses
function parseMessageSections(content: string) {
  const sections: Array<{
    type: 'header' | 'subheader' | 'kv' | 'market' | 'recommendation' | 'tip' | 'text' | 'divider';
    title?: string;
    value?: string;
    data?: Record<string, string>;
    items?: Array<{ label: string; value: string; phase?: string; change?: string }>;
  }> = [];

  const lines = content.split('\n').filter(l => l.trim());

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip pure divider lines
    if (/^[═━─]+$/.test(line)) {
      continue;
    }

    // Header lines (contain emoji + text between dividers or starting with emoji)
    if (line.includes('═══') || line.includes('━━━')) {
      const cleaned = line.replace(/[═━─]/g, '').trim();
      if (cleaned) {
        sections.push({ type: 'header', title: cleaned });
      }
      continue;
    }

    // Subheader (starts with emoji + LAYER or STEP or section marker)
    if (/^[📊📈🎯💡🔍⚡🏦📉🛡️✅❌⚠️🌐]/.test(line) && (line.includes('LAYER') || line.includes('STEP') || line.includes('RECOMMENDATION') || line.includes('ADIM') || line.includes('TAVSİYE') || line.includes('KATMAN'))) {
      sections.push({ type: 'subheader', title: line });
      continue;
    }

    // Market flow lines (e.g., "CRYPTO: -1.6% 7D | EARLY phase")
    if (/^[A-Z]+:\s+[+-]?\d/.test(line) && (line.includes('phase') || line.includes('faz'))) {
      const match = line.match(/^([A-Z]+):\s+([+-]?\d+\.?\d*%)\s+7D\s*\|\s*([🟢🟡🔴🟠]?)\s*(\w+)\s+phase/i);
      if (match) {
        const existing = sections.find(s => s.type === 'market');
        const item = { label: match[1], value: match[2], phase: match[4], change: match[2] };
        if (existing && existing.items) {
          existing.items.push(item);
        } else {
          sections.push({ type: 'market', items: [item] });
        }
        continue;
      }
    }

    // Key-value lines (e.g., "Fed Balance Sheet: $0.00T")
    if (line.includes(':') && !line.startsWith('•') && !line.startsWith('-') && !line.startsWith('*')) {
      const colonIdx = line.indexOf(':');
      const key = line.substring(0, colonIdx).replace(/^[📊📈🎯💡🔍⚡🏦📉🛡️✅❌⚠️🌐]\s*/, '').trim();
      const val = line.substring(colonIdx + 1).trim();
      if (key && val && key.length < 60) {
        sections.push({ type: 'kv', title: key, value: val });
        continue;
      }
    }

    // Recommendation line
    if (line.includes('Action:') || line.includes('Aksiyon:') || (line.includes('confidence') && line.includes('%'))) {
      sections.push({ type: 'recommendation', title: line });
      continue;
    }

    // Tip lines (start with bullet or 💡)
    if (line.startsWith('💡') || line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
      sections.push({ type: 'tip', title: line.replace(/^[💡•\-*]\s*/, '').replace(/^"/, '').replace(/"$/, '') });
      continue;
    }

    // Regular text
    if (line) {
      sections.push({ type: 'text', title: line });
    }
  }

  return sections;
}

function getPhaseColor(phase: string) {
  const p = phase?.toLowerCase();
  if (p === 'early') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  if (p === 'mid') return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
  if (p === 'late') return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
  if (p === 'exit') return 'text-red-500 bg-red-500/10 border-red-500/20';
  return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
}

function getChangeColor(val: string) {
  if (val.startsWith('+')) return 'text-emerald-500';
  if (val.startsWith('-')) return 'text-red-500';
  return 'text-gray-400 dark:text-white/50';
}

// Styled message content for assistant responses
export function StyledMessage({ content }: { content: string }) {
  const sections = parseMessageSections(content);

  // If no structured content detected, render as simple text
  if (sections.length === 0 || sections.every(s => s.type === 'text')) {
    return (
      <div className="space-y-1.5">
        {content.split('\n').filter(l => l.trim()).map((line, idx) => {
          const cleaned = line.replace(/[═━─]/g, '').trim();
          if (!cleaned) return null;
          // Bold markers
          if (cleaned.startsWith('**') || /\*\*[^*]+\*\*/.test(cleaned)) {
            return (
              <p key={idx} className="text-sm font-semibold text-gray-900 dark:text-white">
                {cleaned.replace(/\*\*/g, '')}
              </p>
            );
          }
          return (
            <p key={idx} className="text-sm text-gray-700 dark:text-white/80 leading-relaxed">
              {cleaned}
            </p>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sections.map((section, idx) => {
        switch (section.type) {
          case 'header':
            return (
              <div key={idx} className="flex items-center gap-2 pb-1.5 border-b border-gray-200 dark:border-white/[0.06]">
                <div className="w-1 h-5 rounded-full bg-gradient-to-b from-[#14B8A6] to-[#EF5A6F]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  {section.title?.replace(/[📊📈🎯💡🔍⚡🏦📉🛡️✅❌⚠️🌐"]/g, '').trim()}
                </h3>
              </div>
            );

          case 'subheader':
            return (
              <div key={idx} className="flex items-center gap-2 mt-2">
                {section.title?.includes('LAYER 1') || section.title?.includes('KATMAN 1') ? <Globe className="w-4 h-4 text-teal-500" /> :
                 section.title?.includes('LAYER 2') || section.title?.includes('KATMAN 2') ? <BarChart3 className="w-4 h-4 text-teal-500" /> :
                 section.title?.includes('RECOMMENDATION') || section.title?.includes('TAVSİYE') ? <Target className="w-4 h-4 text-amber-500" /> :
                 <Info className="w-4 h-4 text-teal-500" />}
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-white/70">
                  {section.title?.replace(/[📊📈🎯💡🔍⚡🏦📉🛡️✅❌⚠️🌐]/g, '').trim()}
                </span>
              </div>
            );

          case 'market':
            return (
              <div key={idx} className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {section.items?.map((item, i) => (
                  <div key={i} className={`rounded-lg border p-2.5 ${getPhaseColor(item.phase || '')}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{item.label}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getPhaseColor(item.phase || '')}`}>
                        {item.phase?.toUpperCase()}
                      </span>
                    </div>
                    <span className={`text-sm font-bold ${getChangeColor(item.change || '')}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {item.change}
                    </span>
                  </div>
                ))}
              </div>
            );

          case 'kv':
            return (
              <div key={idx} className="flex items-center justify-between py-1 px-2 rounded-lg bg-gray-50 dark:bg-white/[0.03]">
                <span className="text-xs text-gray-500 dark:text-white/40">{section.title}</span>
                <span className="text-xs font-semibold text-gray-900 dark:text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {section.value?.replace(/→.*$/, '').trim()}
                  {section.value?.includes('→') && (
                    <span className="ml-2 text-[10px] text-gray-400 dark:text-white/30">
                      {section.value.split('→')[1]?.trim()}
                    </span>
                  )}
                </span>
              </div>
            );

          case 'recommendation':
            return (
              <div key={idx} className="p-3 rounded-xl bg-gradient-to-r from-teal-500/10 to-emerald-500/10 border border-teal-500/20">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-teal-500" />
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {section.title?.replace(/[📊📈🎯💡🔍⚡🏦📉🛡️✅❌⚠️🌐]/g, '').trim()}
                  </span>
                </div>
              </div>
            );

          case 'tip':
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <ArrowRight className="w-3 h-3 text-teal-500 mt-1 flex-shrink-0" />
                <span className="text-xs text-gray-600 dark:text-white/50">
                  {section.title}
                </span>
              </div>
            );

          case 'text':
            return (
              <p key={idx} className="text-sm text-gray-700 dark:text-white/80 leading-relaxed">
                {section.title?.replace(/\*\*/g, '')}
              </p>
            );

          default:
            return null;
        }
      })}
    </div>
  );
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
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-teal-500/20 to-[#EF5A6F]/20 flex items-center justify-center">
            <Bot className="w-10 h-10 text-teal-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            TraderPath Concierge
          </h3>
          <p className="text-gray-600 dark:text-white/50 mb-4">
            Your AI assistant for crypto analysis. Send a message to analyze coins,
            set alerts, or view your analysis history.
          </p>
          <div className="flex flex-wrap gap-2 justify-center text-sm">
            <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/50">
              &quot;BTC analiz yap&quot;
            </span>
            <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/50">
              &quot;ETH 4h analysis&quot;
            </span>
            <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-white/50">
              &quot;Para nereye akiyor?&quot;
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
            className={`max-w-[85%] ${
              msg.role === 'user'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-2xl rounded-tr-sm px-4 py-3'
                : 'space-y-3'
            }`}
          >
            {msg.role === 'user' ? (
              <p className="text-sm">{msg.content}</p>
            ) : (
              <>
                {/* Analysis result card */}
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
                  /* Styled message card for text responses */
                  <div className="rounded-xl px-4 py-3 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06]">
                    <StyledMessage content={msg.content} />
                  </div>
                )}
              </>
            )}

            <span className="text-[10px] text-gray-400 dark:text-white/30 block mt-1">
              {new Date(msg.timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {msg.role === 'user' && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
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
          <div className="rounded-xl px-4 py-3 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.06]">
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
