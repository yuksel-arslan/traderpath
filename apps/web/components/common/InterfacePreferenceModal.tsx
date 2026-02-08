'use client';

import { useState, useId } from 'react';
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
  ArrowRight,
  TrendingUp,
  Shield,
  Brain,
} from 'lucide-react';
import { authFetch } from '@/lib/api';
import { StarLogo } from './TraderPathLogo';

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
  const uniqueId = useId();

  if (!isOpen) return null;

  const handleSelect = async (preference: 'ui' | 'concierge') => {
    setIsLoading(preference);
    try {
      const response = await authFetch('/api/user/preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredInterface: preference }),
      });

      if (response.ok) {
        onSelect(preference);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="preference-dialog-title">
      {/* Accessible title for screen readers */}
      <h2 id="preference-dialog-title" className="sr-only">Choose Interface Preference</h2>
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 bg-[#030712]/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl sm:rounded-3xl shadow-2xl border border-white/10 bg-[#0a0f1a]">
        {/* Animated background gradient orbs */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl pointer-events-none">
          <div
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-30"
            style={{
              background: 'radial-gradient(circle, #2DD4BF 0%, transparent 70%)',
              animation: 'float 6s ease-in-out infinite',
            }}
          />
          <div
            className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-3xl opacity-30"
            style={{
              background: 'radial-gradient(circle, #F87171 0%, transparent 70%)',
              animation: 'float 8s ease-in-out infinite reverse',
            }}
          />
        </div>

        {/* Header */}
        <div className="relative px-6 sm:px-10 pt-8 sm:pt-10 pb-6 text-center">
          {/* Logo with morphing container */}
          <div className="flex justify-center mb-6">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24">
              {/* Outer morphing glow ring */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(135deg, #2DD4BF, #14B8A6, #F87171, #EF5A6F)',
                  borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                  boxShadow: '0 0 30px rgba(45, 212, 191, 0.5), 0 0 60px rgba(248, 113, 113, 0.3)',
                  animation: 'morph 8s ease-in-out infinite',
                }}
              />
              {/* Inner dark background */}
              <div
                className="absolute flex items-center justify-center bg-[#0a0f1a]"
                style={{
                  inset: '4px',
                  borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
                  animation: 'morph 8s ease-in-out infinite',
                }}
              >
                <StarLogo size={48} uniqueId={`modal-${uniqueId}`} animated={false} />
              </div>
            </div>
          </div>

          {/* Title */}
          <h2
            className="text-3xl sm:text-4xl font-bold mb-3"
            style={{
              background: 'linear-gradient(135deg, #7FFFD4, #2DD4BF, #F87171, #EF5A6F)',
              backgroundSize: '200% 200%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradient-shift 4s ease infinite',
            }}
          >
            Welcome to TraderPath
          </h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Choose your preferred trading analysis experience
          </p>
        </div>

        {/* Options */}
        <div className="px-6 sm:px-10 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

            {/* AI Concierge Option */}
            <button
              onClick={() => handleSelect('concierge')}
              disabled={isLoading !== null}
              className={`relative group p-6 sm:p-8 rounded-2xl text-left transition-all duration-300 overflow-hidden ${
                isLoading === 'concierge'
                  ? 'ring-2 ring-[#2DD4BF]'
                  : 'hover:scale-[1.02]'
              } ${isLoading !== null && isLoading !== 'concierge' ? 'opacity-40' : ''}`}
              style={{
                background: 'linear-gradient(135deg, rgba(45, 212, 191, 0.15), rgba(20, 184, 166, 0.05))',
                border: '1px solid rgba(45, 212, 191, 0.3)',
              }}
            >
              {/* Hover glow effect */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'radial-gradient(circle at center, rgba(45, 212, 191, 0.2) 0%, transparent 70%)',
                }}
              />

              {/* Loading indicator */}
              {isLoading === 'concierge' && (
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#2DD4BF] flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}

              <div className="relative z-10">
                {/* Badge */}
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold mb-5"
                  style={{
                    background: 'linear-gradient(135deg, #2DD4BF, #14B8A6)',
                    color: 'white',
                    boxShadow: '0 0 20px rgba(45, 212, 191, 0.4)',
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  RECOMMENDED
                </div>

                {/* Icon */}
                <div className="relative mb-5">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #2DD4BF, #0D9488)',
                      boxShadow: '0 10px 40px rgba(45, 212, 191, 0.4)',
                    }}
                  >
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                  {/* Animated pulse ring */}
                  <div
                    className="absolute inset-0 w-16 h-16 rounded-2xl border-2 border-[#2DD4BF]/50 animate-ping"
                    style={{ animationDuration: '2s' }}
                  />
                </div>

                {/* Title */}
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  AI Concierge
                </h3>

                {/* Description */}
                <p className="text-slate-400 text-sm mb-5">
                  Natural language trading assistant. Just ask and get instant analysis.
                </p>

                {/* Features */}
                <ul className="space-y-3 mb-5">
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-6 h-6 rounded-lg bg-[#2DD4BF]/20 flex items-center justify-center">
                      <MessageSquare className="w-3.5 h-3.5 text-[#2DD4BF]" />
                    </div>
                    &quot;How is BTC doing?&quot;
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-6 h-6 rounded-lg bg-[#2DD4BF]/20 flex items-center justify-center">
                      <Mic className="w-3.5 h-3.5 text-[#2DD4BF]" />
                    </div>
                    Voice commands supported
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-6 h-6 rounded-lg bg-[#2DD4BF]/20 flex items-center justify-center">
                      <Zap className="w-3.5 h-3.5 text-[#2DD4BF]" />
                    </div>
                    Instant AI-powered insights
                  </li>
                </ul>

                {/* CTA */}
                <div
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all group-hover:gap-3"
                  style={{
                    background: 'linear-gradient(135deg, #2DD4BF, #0D9488)',
                  }}
                >
                  <span>Start Chatting</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>

            {/* Classic Interface Option */}
            <button
              onClick={() => handleSelect('ui')}
              disabled={isLoading !== null}
              className={`relative group p-6 sm:p-8 rounded-2xl text-left transition-all duration-300 overflow-hidden ${
                isLoading === 'ui'
                  ? 'ring-2 ring-[#F87171]'
                  : 'hover:scale-[1.02]'
              } ${isLoading !== null && isLoading !== 'ui' ? 'opacity-40' : ''}`}
              style={{
                background: 'linear-gradient(135deg, rgba(248, 113, 113, 0.15), rgba(239, 90, 111, 0.05))',
                border: '1px solid rgba(248, 113, 113, 0.3)',
              }}
            >
              {/* Hover glow effect */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: 'radial-gradient(circle at center, rgba(248, 113, 113, 0.2) 0%, transparent 70%)',
                }}
              />

              {/* Loading indicator */}
              {isLoading === 'ui' && (
                <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F87171] flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}

              <div className="relative z-10">
                {/* Badge */}
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold mb-5"
                  style={{
                    background: 'rgba(248, 113, 113, 0.2)',
                    color: '#FCA5A5',
                    border: '1px solid rgba(248, 113, 113, 0.3)',
                  }}
                >
                  <Shield className="w-3.5 h-3.5" />
                  FULL CONTROL
                </div>

                {/* Icon */}
                <div className="relative mb-5">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #F87171, #DC2626)',
                      boxShadow: '0 10px 40px rgba(248, 113, 113, 0.4)',
                    }}
                  >
                    <LayoutDashboard className="w-8 h-8 text-white" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  Classic Interface
                </h3>

                {/* Description */}
                <p className="text-slate-400 text-sm mb-5">
                  Step-by-step analysis with full control over every parameter.
                </p>

                {/* Features */}
                <ul className="space-y-3 mb-5">
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-6 h-6 rounded-lg bg-[#F87171]/20 flex items-center justify-center">
                      <TrendingUp className="w-3.5 h-3.5 text-[#F87171]" />
                    </div>
                    40+ technical indicators
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-6 h-6 rounded-lg bg-[#F87171]/20 flex items-center justify-center">
                      <MousePointer className="w-3.5 h-3.5 text-[#F87171]" />
                    </div>
                    Detailed control panel
                  </li>
                  <li className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="w-6 h-6 rounded-lg bg-[#F87171]/20 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-[#F87171]" />
                    </div>
                    7-step comprehensive analysis
                  </li>
                </ul>

                {/* CTA */}
                <div
                  className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all group-hover:gap-3"
                  style={{
                    background: 'linear-gradient(135deg, #F87171, #DC2626)',
                  }}
                >
                  <span>Open Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-10 py-4 border-t border-white/10 text-center">
          <p className="text-xs text-slate-500">
            You can change your preference anytime in{' '}
            <span className="text-[#2DD4BF]">Settings</span>
          </p>
        </div>
      </div>
    </div>
  );
}
