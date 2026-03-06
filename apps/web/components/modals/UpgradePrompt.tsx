'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  Crown,
  Zap,
  Star,
  Lock,
  ArrowRight,
  Sparkles,
  Check,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { SubscriptionTier, getTierDisplayName } from '../../hooks/useSubscription';

export type UpgradeFeature =
  | 'capital_flow_l3'
  | 'capital_flow_l4'
  | 'asset_analysis'
  | 'ai_features'
  | 'reports_export'
  | 'automation'
  | 'rewards'
  | 'scheduled_reports'
  | 'pdf_reports'
  | 'daily_limit';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  feature: UpgradeFeature;
  currentTier?: SubscriptionTier;
  /** Optional: specific message to display */
  message?: string;
  /** Optional: show inline instead of modal */
  inline?: boolean;
}

// Feature metadata
const FEATURE_INFO: Record<UpgradeFeature, {
  title: string;
  description: string;
  icon: typeof Crown;
  requiredTier: SubscriptionTier;
  benefits: string[];
}> = {
  capital_flow_l3: {
    title: 'Sector Activity Access',
    description: 'Get detailed sector-level capital flow analysis to identify opportunities.',
    icon: Zap,
    requiredTier: 'starter',
    benefits: [
      'DeFi, L2, Tech, Finance sectors',
      'Sector rotation signals',
      'Entry timing optimization',
    ],
  },
  capital_flow_l4: {
    title: 'AI Recommendations',
    description: 'Get AI-powered BUY/SELL recommendations based on capital flow analysis.',
    icon: Sparkles,
    requiredTier: 'starter',
    benefits: [
      'Actionable BUY/SELL signals',
      'Confidence scores',
      'Suggested assets to analyze',
    ],
  },
  asset_analysis: {
    title: 'Asset Analysis',
    description: 'Access 7-Step Classic and MLIS Pro analysis for any asset.',
    icon: Star,
    requiredTier: 'pro',
    benefits: [
      '7-Step Classic Analysis',
      'MLIS Pro 5-layer Analysis',
      '40+ technical indicators',
    ],
  },
  ai_features: {
    title: 'AI Features',
    description: 'Access AI Concierge and AI Expert panel for advanced insights.',
    icon: Sparkles,
    requiredTier: 'elite',
    benefits: [
      'AI Concierge (natural language)',
      'AI Expert Q&A (ARIA, NEXUS, ORACLE)',
      'Voice commands support',
    ],
  },
  reports_export: {
    title: 'Reports & Export',
    description: 'Export your analyses as PDF reports.',
    icon: Star,
    requiredTier: 'starter',
    benefits: [
      'PDF report downloads',
      'Screenshot export',
    ],
  },
  automation: {
    title: 'Automation',
    description: 'Set up scheduled reports and price alerts.',
    icon: Zap,
    requiredTier: 'starter',
    benefits: [
      'Scheduled analysis reports',
      'Price alerts',
      'Multi-channel delivery',
    ],
  },
  rewards: {
    title: 'Rewards',
    description: 'Earn credits through daily activities.',
    icon: Star,
    requiredTier: 'free',
    benefits: [
      'Daily login rewards',
      'Lucky spin wheel',
      'Quiz challenges',
    ],
  },
  scheduled_reports: {
    title: 'Scheduled Reports',
    description: 'Set up automated analysis reports delivered to your inbox.',
    icon: Zap,
    requiredTier: 'starter',
    benefits: [
      'Daily/Weekly/Monthly schedules',
      'Email + Telegram + Discord',
      'Auto-analysis at your times',
    ],
  },
  pdf_reports: {
    title: 'PDF Reports',
    description: 'Download professional PDF reports of your analyses.',
    icon: Star,
    requiredTier: 'starter',
    benefits: [
      'Executive Summary format',
      'Full detailed reports',
      'Share with your team',
    ],
  },
  daily_limit: {
    title: 'Daily Analysis Limit',
    description: 'You have reached your daily analysis limit.',
    icon: Lock,
    requiredTier: 'pro',
    benefits: [
      '5 analyses/day (Free & Starter)',
      '10 analyses/day (Pro)',
      '15 analyses/day (Elite)',
    ],
  },
};

// Tier colors
const TIER_COLORS: Record<SubscriptionTier, { gradient: string; border: string }> = {
  free: { gradient: 'from-slate-500 to-slate-600', border: 'border-slate-500' },
  starter: { gradient: 'from-blue-500 to-blue-600', border: 'border-blue-500' },
  pro: { gradient: 'from-purple-500 to-purple-600', border: 'border-purple-500' },
  elite: { gradient: 'from-amber-500 to-amber-600', border: 'border-amber-500' },
};

// Inline upgrade card (for embedding in pages)
export function UpgradeCard({ feature, currentTier = 'free', message }: {
  feature: UpgradeFeature;
  currentTier?: SubscriptionTier;
  message?: string;
}) {
  const router = useRouter();
  const info = FEATURE_INFO[feature];
  const Icon = info.icon;
  const tierColors = TIER_COLORS[info.requiredTier];

  return (
    <div className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 overflow-hidden">
      {/* Decorative gradient orb */}
      <div className={cn(
        'absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl',
        `bg-gradient-to-br ${tierColors.gradient}`
      )} />

      <div className="relative z-10">
        {/* Lock icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-slate-800/80 border border-slate-700/50 mb-4">
          <Lock className="w-7 h-7 text-slate-400" />
        </div>

        {/* Content */}
        <h3 className="text-xl font-bold text-white mb-2">{info.title}</h3>
        <p className="text-slate-400 text-sm mb-4">
          {message || info.description}
        </p>

        {/* Benefits */}
        <div className="space-y-2 mb-6">
          {info.benefits.map((benefit, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span className="text-slate-300">{benefit}</span>
            </div>
          ))}
        </div>

        {/* Required tier badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-slate-500">Available from:</span>
          <span className={cn(
            'px-2 py-0.5 text-xs font-medium rounded-full text-white',
            `bg-gradient-to-r ${tierColors.gradient}`
          )}>
            {getTierDisplayName(info.requiredTier)}
          </span>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => router.push('/pricing')}
          className={cn(
            'w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2',
            'transition-all duration-200 hover:opacity-90',
            `bg-gradient-to-r ${tierColors.gradient}`
          )}
        >
          <Crown className="w-4 h-4" />
          Upgrade to {getTierDisplayName(info.requiredTier)}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Modal upgrade prompt
export function UpgradePrompt({
  isOpen,
  onClose,
  feature,
  currentTier = 'free',
  message,
  inline = false,
}: UpgradePromptProps) {
  const router = useRouter();
  const info = FEATURE_INFO[feature];
  const Icon = info.icon;
  const tierColors = TIER_COLORS[info.requiredTier];

  if (!isOpen) return null;

  // Inline version
  if (inline) {
    return <UpgradeCard feature={feature} currentTier={currentTier} message={message} />;
  }

  // Modal version
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Decorative gradient orbs */}
        <div className={cn(
          'absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl',
          `bg-gradient-to-br ${tierColors.gradient}`
        )} />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 opacity-10 blur-3xl" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700/80 transition z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="relative z-10 p-6">
          {/* Icon */}
          <div className={cn(
            'flex items-center justify-center w-16 h-16 rounded-xl mb-6 mx-auto',
            `bg-gradient-to-br ${tierColors.gradient}`
          )}>
            <Icon className="w-8 h-8 text-white" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white text-center mb-2">
            Unlock {info.title}
          </h2>

          {/* Description */}
          <p className="text-slate-400 text-center mb-6">
            {message || info.description}
          </p>

          {/* Benefits */}
          <div className="bg-slate-800/50 rounded-xl p-4 mb-6">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">
              What you will get
            </p>
            <div className="space-y-2">
              {info.benefits.map((benefit, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn(
                    'w-5 h-5 rounded-full flex items-center justify-center',
                    `bg-gradient-to-br ${tierColors.gradient}`
                  )}>
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-sm text-slate-300">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Current tier info */}
          {currentTier !== 'free' && (
            <p className="text-xs text-slate-500 text-center mb-4">
              Your current plan: <span className="text-slate-400">{getTierDisplayName(currentTier)}</span>
            </p>
          )}

          {/* CTA Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => {
                router.push('/pricing');
                onClose();
              }}
              className={cn(
                'w-full py-3 rounded-xl font-medium text-white flex items-center justify-center gap-2',
                'transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]',
                `bg-gradient-to-r ${tierColors.gradient}`
              )}
            >
              <Crown className="w-5 h-5" />
              Upgrade to {getTierDisplayName(info.requiredTier)}
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-medium text-slate-400 hover:text-white transition"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpgradePrompt;
