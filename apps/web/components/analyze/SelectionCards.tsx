'use client';

import { useRouter } from 'next/navigation';
import { MessageSquare, GitBranch, ArrowRight, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SelectionCardsProps {
  onSelectFlow: () => void;
}

const CHAT_FEATURES = [
  'Type a symbol or ask "What should I buy?"',
  'L1-L4 Capital Flow checked automatically',
  'Full 7-Step analysis runs in background',
  'Report saved and opened for you',
];

const FLOW_FEATURES = [
  'L1-L3 Capital Flow loads automatically',
  'Generate AI Asset Recommendations',
  'Select asset and configure timeframe',
  'Run analysis with full visibility',
];

export function SelectionCards({ onSelectFlow }: SelectionCardsProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 sm:gap-5">
      {/* Analyze via Chat */}
      <button
        onClick={() => router.push('/concierge')}
        className={cn(
          'group relative p-5 sm:p-6 rounded-2xl border-2 text-left transition-all duration-300',
          'border-slate-200 dark:border-[#4dd0e1]/20 bg-white dark:bg-[#071023]',
          'hover:border-violet-300 dark:hover:border-violet-400/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.1)] dark:hover:shadow-[0_0_30px_rgba(139,92,246,0.15)]',
          'active:scale-[0.98]'
        )}
      >
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-bold uppercase">
          Fastest
        </div>

        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
          <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>

        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5 sm:mb-2">
          Analyze via Chat
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-3 sm:mb-4">
          Tell the AI what you want to analyze. Capital Flow check, asset selection, and full analysis run automatically.
        </p>

        <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-5">
          {CHAT_FEATURES.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 text-sm font-semibold text-violet-400 group-hover:gap-3 transition-all">
          <MessageSquare className="w-4 h-4" />
          Open AI Chat
          <ArrowRight className="w-4 h-4" />
        </div>
      </button>

      {/* Analyze via Flow */}
      <button
        onClick={onSelectFlow}
        className={cn(
          'group relative p-5 sm:p-6 rounded-2xl border-2 text-left transition-all duration-300',
          'border-slate-200 dark:border-[#4dd0e1]/20 bg-white dark:bg-[#071023]',
          'hover:border-teal-300 dark:hover:border-[#4dd0e1]/50 hover:shadow-[0_0_30px_rgba(77,208,225,0.1)] dark:hover:shadow-[0_0_30px_rgba(77,208,225,0.15)]',
          'active:scale-[0.98]'
        )}
      >
        <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 px-2 py-0.5 rounded-full bg-[#4dd0e1]/20 text-[#4dd0e1] text-[10px] font-bold uppercase">
          Full Control
        </div>

        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20 mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300">
          <GitBranch className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </div>

        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5 sm:mb-2">
          Analyze via Flow
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-3 sm:mb-4">
          Follow the top-down Capital Flow funnel step by step. Review each layer, pick your asset from AI recommendations.
        </p>

        <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-5">
          {FLOW_FEATURES.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
              <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-teal-500 dark:text-[#4dd0e1] mt-0.5 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 text-sm font-semibold text-[#4dd0e1] group-hover:gap-3 transition-all">
          <GitBranch className="w-4 h-4" />
          Start Flow Analysis
          <ArrowRight className="w-4 h-4" />
        </div>
      </button>
    </div>
  );
}
