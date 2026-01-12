'use client';

// ===========================================
// AI Experts Selection Page
// Choose which AI expert to chat with (5 credits each)
// ===========================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bot,
  MessageCircle,
  LineChart,
  Target,
  Eye,
  Shield,
  ShieldAlert,
  Sparkles,
  Gem,
  Zap,
  ChevronRight,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../../../lib/utils';
import { authFetch } from '../../../lib/api';

// AI Expert definitions - World-Class Professionals
const AI_EXPERTS = [
  {
    id: 'aria',
    name: 'ARIA',
    title: 'Chief Technical Analyst',
    role: 'Technical Analysis Expert',
    yearsExperience: 15,
    background: 'Former Goldman Sachs • CMT Certified • 73% trend prediction accuracy',
    description: 'Master-level technical analysis with RSI divergence detection, MACD interpretation, and multi-timeframe confluence. Analyzes patterns others miss.',
    specialty: ['RSI & MACD Mastery', 'Pattern Recognition', 'Multi-TF Analysis'],
    icon: LineChart,
    color: 'text-blue-500',
    bgLight: 'bg-blue-50',
    bgDark: 'dark:bg-blue-500/10',
    borderLight: 'border-blue-200',
    borderDark: 'dark:border-blue-500/30',
    gradientFrom: '#3b82f6',
    gradientTo: '#60a5fa',
    creditCost: 5,
  },
  {
    id: 'nexus',
    name: 'NEXUS',
    title: 'Chief Risk Officer',
    role: 'Risk Management Expert',
    yearsExperience: 20,
    background: 'Former Bridgewater Associates • PhD MIT • $50B+ managed',
    description: 'Quantitative risk models for position sizing, stop loss optimization, and portfolio protection. Survived 2018, 2020, 2022 crashes.',
    specialty: ['Position Sizing', 'Risk/Reward Calc', 'Capital Protection'],
    icon: Target,
    color: 'text-amber-500',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-500/10',
    borderLight: 'border-amber-200',
    borderDark: 'dark:border-amber-500/30',
    gradientFrom: '#f59e0b',
    gradientTo: '#fbbf24',
    creditCost: 5,
  },
  {
    id: 'oracle',
    name: 'ORACLE',
    title: 'On-Chain Intelligence Director',
    role: 'Whale Tracking Expert',
    yearsExperience: 8,
    background: 'Founded analytics firm (acq. by Chainalysis) • Advisor to Grayscale',
    description: 'Pioneer in whale wallet tracking and exchange flow analysis. Sees institutional movements before they impact price.',
    specialty: ['Whale Monitoring', 'Exchange Flow', 'Smart Money'],
    icon: Eye,
    color: 'text-purple-500',
    bgLight: 'bg-purple-50',
    bgDark: 'dark:bg-purple-500/10',
    borderLight: 'border-purple-200',
    borderDark: 'dark:border-purple-500/30',
    gradientFrom: '#a855f7',
    gradientTo: '#c084fc',
    creditCost: 5,
  },
  {
    id: 'sentinel',
    name: 'SENTINEL',
    title: 'Security & Fraud Prevention Lead',
    role: 'Security Expert',
    yearsExperience: 12,
    background: 'Former Binance Security • Prevented $500M+ in scams • White-hat hacker',
    description: 'Identified 2,000+ honeypots before they harmed users. Expert in rug pull detection, contract auditing, and manipulation patterns.',
    specialty: ['Scam Detection', 'Contract Audit', 'Trap Analysis'],
    icon: ShieldAlert,
    color: 'text-red-500',
    bgLight: 'bg-red-50',
    bgDark: 'dark:bg-red-500/10',
    borderLight: 'border-red-200',
    borderDark: 'dark:border-red-500/30',
    gradientFrom: '#ef4444',
    gradientTo: '#f87171',
    creditCost: 5,
  },
];

// Interface for expert stats
interface ExpertStats {
  totalConversations: number;
  totalMessages: number;
  activeUsers: number;
  expertUsage: {
    aria: number;
    nexus: number;
    oracle: number;
    sentinel: number;
  };
}

export default function AIExpertsPage() {
  const [expertStats, setExpertStats] = useState<ExpertStats | null>(null);

  // Fetch expert stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await authFetch('/api/ai-expert/stats');
        if (res.ok) {
          const data = await res.json();
          setExpertStats(data.data || data);
        }
      } catch (error) {
        // Stats are optional, don't show error
        console.log('Expert stats not available');
      }
    };
    fetchStats();
  }, []);

  // Fetch credit balance
  const { data: credits } = useQuery({
    queryKey: ['credits'],
    queryFn: async () => {
      const res = await authFetch('/api/credits/balance');
      const result = await res.json();
      return result.data || { balance: 0 };
    },
  });

  // Fetch user info (for admin check)
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await authFetch('/api/auth/me');
      const result = await res.json();
      return result.data?.user || { isAdmin: false };
    },
  });

  const isAdmin = user?.isAdmin === true;

  // Calculate total expert usage
  const totalUsage = expertStats?.expertUsage
    ? Object.values(expertStats.expertUsage).reduce((a, b) => a + b, 0)
    : 0;

  // Get usage for specific expert
  const getExpertUsage = (expertId: string): number => {
    if (!expertStats?.expertUsage) return 0;
    return expertStats.expertUsage[expertId as keyof typeof expertStats.expertUsage] || 0;
  };

  return (
    <div className="w-full px-4 md:px-8 lg:px-12 py-6 space-y-6">

      {/* ===== Premium Header Section ===== */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/5 dark:from-amber-500/10 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-500/5 dark:from-purple-500/10 via-transparent to-transparent" />

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-5" style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />

        {/* Content */}
        <div className="relative z-10 p-6 md:p-8">
          {/* Header Row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-amber-500/30 blur-lg rounded-full" />
                <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Bot className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">AI Expert Team</h1>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded text-xs font-bold border border-emerald-500/20">NEW</span>
                </div>
                <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
                  Four world-class specialists, each mastering their own domain
                </p>
              </div>
            </div>

            {/* Admin/Credits Badge */}
            {isAdmin ? (
              <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <Shield className="w-5 h-5 text-emerald-500" />
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Admin</span>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 px-4 py-2.5 bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 rounded-xl">
                <Gem className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-bold text-gray-900 dark:text-white">{credits?.balance || 0} credits</span>
              </div>
            )}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{expertStats?.totalConversations || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-500">Conversations</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{expertStats?.totalMessages || 0}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-500">Messages</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-100/80 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalUsage}</div>
                  <div className="text-xs text-gray-500 dark:text-slate-500">Total Calls</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Expert Cards ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {AI_EXPERTS.map((expert) => {
          const Icon = expert.icon;
          const usage = getExpertUsage(expert.id);

          return (
            <Link
              key={expert.id}
              href={`/ai-expert/${expert.id}`}
              className="group relative bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 hover:shadow-xl hover:border-gray-300 dark:hover:border-slate-600 transition-all duration-300"
            >
              {/* Usage Badge - Top Right */}
              {usage > 0 && (
                <div className={cn(
                  "absolute top-4 right-4 px-2.5 py-1 rounded-lg text-xs font-bold",
                  expert.bgLight, expert.bgDark, expert.borderLight, expert.borderDark, "border"
                )}>
                  <span className={expert.color}>{usage} calls</span>
                </div>
              )}

              <div className="flex items-start gap-5">
                {/* AI Avatar with Glow */}
                <div className="relative flex-shrink-0">
                  <div
                    className="absolute inset-0 rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"
                    style={{ background: `linear-gradient(135deg, ${expert.gradientFrom}, ${expert.gradientTo})` }}
                  />
                  <div
                    className={cn(
                      "relative w-16 h-16 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform",
                      expert.bgLight, expert.bgDark, "border", expert.borderLight, expert.borderDark
                    )}
                  >
                    <Icon className={cn("w-8 h-8", expert.color)} />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name & Title */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-xl text-gray-900 dark:text-white">{expert.name}</h3>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </div>
                  <p className={cn("text-sm font-semibold mb-2", expert.color)}>
                    {expert.title}
                  </p>

                  {/* Professional Background */}
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                    {expert.yearsExperience}+ years • {expert.background}
                  </p>

                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-slate-300 mb-4 line-clamp-2">
                    {expert.description}
                  </p>

                  {/* Specialties */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {expert.specialty.map((spec) => (
                      <span
                        key={spec}
                        className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-slate-700 rounded-full text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>

                  {/* Chat Button & Credit Cost */}
                  <div className="flex items-center justify-between">
                    <div
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm border transition-all group-hover:shadow-md"
                      style={{
                        background: `linear-gradient(135deg, ${expert.gradientFrom}15, ${expert.gradientTo}15)`,
                        borderColor: `${expert.gradientFrom}30`,
                      }}
                    >
                      <MessageCircle className={cn("w-4 h-4", expert.color)} />
                      <span className={expert.color}>Start Chat</span>
                      <ChevronRight className={cn("w-4 h-4 group-hover:translate-x-1 transition-transform", expert.color)} />
                    </div>

                    {isAdmin ? (
                      <div className="flex items-center gap-1.5 text-emerald-500">
                        <Shield className="w-4 h-4" />
                        <span className="text-sm font-bold">Free</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-500">
                        <Zap className="w-4 h-4" />
                        <span className="text-sm font-bold">{expert.creditCost} credits</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ===== Bottom Info ===== */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="w-4 h-4 text-amber-500" />
          {isAdmin ? (
            <span className="text-gray-700 dark:text-slate-300">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Admin</span> - All AI experts are free for you
            </span>
          ) : (
            <span className="text-gray-700 dark:text-slate-300">
              Each message costs <span className="text-amber-600 dark:text-amber-400 font-bold">5 credits</span> - powered by TraderPath examples
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1.5">
          AI Experts use real examples from your TraderPath analyses and quiz questions to give you personalized answers.
        </p>
      </div>
    </div>
  );
}
