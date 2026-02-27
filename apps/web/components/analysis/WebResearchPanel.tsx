'use client';

import { useState } from 'react';
import { Globe, ChevronDown, ChevronUp, ExternalLink, TrendingUp, TrendingDown, Minus, Search } from 'lucide-react';

interface WebResearchSummary {
  mode: 'fast' | 'news' | 'deep';
  summary: string | null;
  sentiment: { label: string; score: number } | null;
  citationCount: number;
  citations: Array<{
    source: string;
    title: string;
    sentiment: 'bullish' | 'bearish' | 'neutral';
    reliability: number;
  }>;
}

interface WebResearchPanelProps {
  research: WebResearchSummary | null;
}

const MODE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  fast: { bg: 'bg-gray-500/20 dark:bg-gray-500/20', text: 'text-gray-600 dark:text-gray-400', label: 'Fast' },
  news: { bg: 'bg-blue-500/20 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', label: 'News' },
  deep: { bg: 'bg-purple-500/20 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', label: 'Deep' },
};

const SENTIMENT_STYLES: Record<string, { bg: string; text: string; icon: typeof TrendingUp }> = {
  bullish: { bg: 'bg-green-500/20 dark:bg-green-500/20', text: 'text-green-600 dark:text-green-400', icon: TrendingUp },
  bearish: { bg: 'bg-red-500/20 dark:bg-red-500/20', text: 'text-red-600 dark:text-red-400', icon: TrendingDown },
  neutral: { bg: 'bg-amber-500/20 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', icon: Minus },
};

function getReliabilityColor(reliability: number): string {
  if (reliability >= 75) return 'bg-green-500';
  if (reliability >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function getReliabilityTrackColor(reliability: number): string {
  if (reliability >= 75) return 'bg-green-500/20 dark:bg-green-500/20';
  if (reliability >= 50) return 'bg-amber-500/20 dark:bg-amber-500/20';
  return 'bg-red-500/20 dark:bg-red-500/20';
}

export function WebResearchPanel({ research }: WebResearchPanelProps) {
  const [expanded, setExpanded] = useState(false);

  // Hide panel entirely when no meaningful data
  if (!research) return null;

  const hasRealData = (research.summary && research.summary.length > 0) || (research.citations?.length ?? 0) > 0;
  if (!hasRealData) return null;

  const modeStyle = MODE_STYLES[research.mode] || MODE_STYLES.fast;
  const citations = research.citations ?? [];
  const visibleCitations = expanded ? citations : citations.slice(0, 3);
  const hasMoreCitations = citations.length > 3;
  const isFastWithNoSummary = research.mode === 'fast' && !research.summary;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700/50">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Web Research
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${modeStyle.bg} ${modeStyle.text}`}>
            {modeStyle.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sentiment Indicator */}
          {research.sentiment && (
            <SentimentBadge label={research.sentiment.label} score={research.sentiment.score} />
          )}

          {/* Citation Count */}
          {research.citationCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
              {research.citationCount} source{research.citationCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Summary or Fast Mode Message */}
        {isFastWithNoSummary ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 italic">
            Basic research - upgrade to News or Deep for detailed insights
          </p>
        ) : research.summary ? (
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {research.summary}
          </p>
        ) : null}

        {/* Citations */}
        {citations.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Sources
            </div>

            <div className="space-y-2">
              {visibleCitations.map((citation, index) => {
                const sentimentStyle = SENTIMENT_STYLES[citation.sentiment] || SENTIMENT_STYLES.neutral;
                const SentimentIcon = sentimentStyle.icon;

                return (
                  <div
                    key={index}
                    className="flex items-start gap-3 rounded-md border border-slate-100 dark:border-slate-700/40 bg-slate-50 dark:bg-slate-800/30 px-3 py-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                          {citation.source}
                        </span>
                        <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${sentimentStyle.bg} ${sentimentStyle.text}`}>
                          <SentimentIcon className="h-2.5 w-2.5" />
                          {citation.sentiment}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {citation.title}
                      </p>
                    </div>

                    {/* Reliability Bar */}
                    <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                      <div className={`w-16 h-1.5 rounded-full ${getReliabilityTrackColor(citation.reliability)}`}>
                        <div
                          className={`h-full rounded-full ${getReliabilityColor(citation.reliability)} transition-all`}
                          style={{ width: `${Math.min(Math.max(citation.reliability, 0), 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 tabular-nums w-6 text-right">
                        {citation.reliability}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expand/Collapse Toggle */}
            {hasMoreCitations && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors mt-1"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" />
                    Show less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" />
                    Show all {citations.length} sources
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SentimentBadge({ label, score }: { label: string; score: number }) {
  // Guard: label prop could be non-string from API data
  const normalized = typeof label === 'string' ? label.toLowerCase() : '';
  let sentimentKey: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (normalized.includes('bullish') || normalized.includes('positive')) sentimentKey = 'bullish';
  else if (normalized.includes('bearish') || normalized.includes('negative')) sentimentKey = 'bearish';

  const style = SENTIMENT_STYLES[sentimentKey];
  const Icon = style.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      <Icon className="h-3 w-3" />
      {label}
      <span className="opacity-70">({score})</span>
    </span>
  );
}
