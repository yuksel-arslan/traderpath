'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bot,
  LayoutDashboard,
  MessageSquare,
  MousePointer,
  Zap,
  Sparkles,
  Check,
  Loader2,
  Mic,
  Volume2,
} from 'lucide-react';
import { authFetch } from '@/lib/api';

interface InterfacePreferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (preference: 'ui' | 'concierge') => void;
}

export function InterfacePreferenceModal({
  isOpen,
  onClose,
  onSelect,
}: InterfacePreferenceModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<'ui' | 'concierge' | null>(null);

  if (!isOpen) return null;

  const handleSelect = async (preference: 'ui' | 'concierge') => {
    setIsLoading(preference);
    try {
      // Save preference to backend
      const response = await authFetch('/api/user/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredInterface: preference }),
      });

      if (response.ok) {
        onSelect(preference);

        // Navigate based on selection
        if (preference === 'concierge') {
          router.push('/concierge');
        } else {
          router.push('/analyze');
        }

        onClose();
      }
    } catch (error) {
      console.error('Failed to save preference:', error);
      setIsLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - scrollable on mobile */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="relative px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6 bg-gradient-to-br from-teal-500/10 via-transparent to-coral-500/10">
          <div className="absolute top-0 right-0 w-32 h-32 sm:w-64 sm:h-64 bg-gradient-to-br from-teal-500/20 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-48 sm:h-48 bg-gradient-to-tr from-coral-500/20 to-transparent rounded-full blur-3xl" />

          <div className="relative text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500" />
              <span className="text-xs sm:text-sm font-medium text-teal-600 dark:text-teal-400">
                Welcome to TraderPath!
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Choose Your Experience
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Tap to select and continue instantly
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="px-4 sm:px-8 py-4 sm:py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* AI Concierge Option */}
            <button
              onClick={() => handleSelect('concierge')}
              disabled={isLoading !== null}
              className={`relative group p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 text-left transition-all ${
                isLoading === 'concierge'
                  ? 'border-teal-500 bg-teal-500/10 ring-2 sm:ring-4 ring-teal-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-500/5 active:scale-[0.98]'
              } ${isLoading !== null && isLoading !== 'concierge' ? 'opacity-50' : ''}`}
            >
              {/* Loading/Selected indicator */}
              {isLoading === 'concierge' && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-5 h-5 sm:w-6 sm:h-6 bg-teal-500 rounded-full flex items-center justify-center">
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 text-white animate-spin" />
                </div>
              )}

              {/* Badge */}
              <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white text-[10px] sm:text-xs font-bold rounded-full mb-3 sm:mb-4">
                <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                RECOMMENDED
              </div>

              {/* Icon with Voice Animation */}
              <div className="relative mb-3 sm:mb-4">
                {/* Animated rings */}
                <div className="absolute inset-0 w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-teal-500/20 animate-ping opacity-75" style={{ animationDuration: '2s' }} />
                <div className="absolute inset-[-4px] sm:inset-[-6px] w-[52px] h-[52px] sm:w-[68px] sm:h-[68px] rounded-2xl sm:rounded-3xl border-2 border-teal-500/30 animate-pulse" />

                {/* Main icon */}
                <div className="relative w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg shadow-teal-500/30">
                  <Bot className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                </div>

                {/* Sound wave visualization */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-0.5 h-3 sm:h-4">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-0.5 sm:w-1 bg-gradient-to-t from-teal-500 to-cyan-400 rounded-full animate-soundwave"
                      style={{
                        animationDelay: `${i * 0.1}s`,
                        animationDuration: `${0.4 + i * 0.1}s`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Title */}
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1 sm:mb-2">
                AI Concierge
              </h3>

              {/* Description */}
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-3 sm:mb-4">
                Chat with AI. Just type &quot;How is BTC?&quot;
              </p>

              {/* Features - hidden on very small screens */}
              <ul className="space-y-1.5 sm:space-y-2 hidden sm:block">
                <li className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-500 flex-shrink-0" />
                  Natural language questions
                </li>
                <li className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-500 flex-shrink-0" />
                  One message analysis
                </li>
                <li className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-500 flex-shrink-0 animate-pulse" />
                  <span className="flex items-center gap-1">
                    Voice commands
                    <Volume2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-teal-400" />
                  </span>
                </li>
              </ul>

              {/* Example */}
              <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-slate-100 dark:bg-slate-800 rounded-lg sm:rounded-xl">
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1">
                  Example:
                </p>
                <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                  &quot;Analyze ETH on 4h&quot;
                </p>
              </div>

              {/* Tap hint */}
              <div className="mt-3 sm:mt-4 flex items-center justify-center gap-1 text-teal-500">
                <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-[10px] sm:text-xs font-medium">Tap to select</span>
              </div>
            </button>

            {/* Classic UI Option */}
            <button
              onClick={() => handleSelect('ui')}
              disabled={isLoading !== null}
              className={`relative group p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 text-left transition-all ${
                isLoading === 'ui'
                  ? 'border-slate-500 bg-slate-500/10 ring-2 sm:ring-4 ring-slate-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-500 hover:bg-slate-500/5 active:scale-[0.98]'
              } ${isLoading !== null && isLoading !== 'ui' ? 'opacity-50' : ''}`}
            >
              {/* Loading/Selected indicator */}
              {isLoading === 'ui' && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-5 h-5 sm:w-6 sm:h-6 bg-slate-500 rounded-full flex items-center justify-center">
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 text-white animate-spin" />
                </div>
              )}

              {/* Badge */}
              <div className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] sm:text-xs font-bold rounded-full mb-3 sm:mb-4">
                CLASSIC
              </div>

              {/* Icon */}
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                <LayoutDashboard className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
              </div>

              {/* Title */}
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-1 sm:mb-2">
                Classic Interface
              </h3>

              {/* Description */}
              <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm mb-3 sm:mb-4">
                Step-by-step forms with full control.
              </p>

              {/* Features - hidden on very small screens */}
              <ul className="space-y-1.5 sm:space-y-2 hidden sm:block">
                <li className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <MousePointer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 flex-shrink-0" />
                  Detailed control panel
                </li>
                <li className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 flex-shrink-0" />
                  All charts and indicators
                </li>
                <li className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500 flex-shrink-0" />
                  7-step analysis
                </li>
              </ul>

              {/* Example */}
              <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-slate-100 dark:bg-slate-800 rounded-lg sm:rounded-xl">
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mb-0.5 sm:mb-1">
                  Flow:
                </p>
                <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                  Coin → Timeframe → Analyze
                </p>
              </div>

              {/* Tap hint */}
              <div className="mt-3 sm:mt-4 flex items-center justify-center gap-1 text-slate-500">
                <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="text-[10px] sm:text-xs font-medium">Tap to select</span>
              </div>
            </button>
          </div>
        </div>

        {/* Footer - simplified */}
        <div className="px-4 sm:px-8 py-3 sm:py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 text-center">
            You can change your preference anytime in settings
          </p>
        </div>
      </div>
    </div>
  );
}
