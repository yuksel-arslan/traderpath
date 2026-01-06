'use client';

// ===========================================
// AI Experts Selection Page
// Choose which AI expert to chat with (3 credits each)
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
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../../../lib/utils';

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
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    creditCost: 3,
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
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    creditCost: 3,
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
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    creditCost: 3,
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
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    creditCost: 3,
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
        const token = localStorage.getItem('accessToken');
        if (!token) return;

        const res = await fetch('/api/ai-expert/stats', {
          headers: { Authorization: `Bearer ${token}` },
        });
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
      const token = localStorage.getItem('accessToken');
      if (!token) return { balance: 0 };

      const res = await fetch('/api/credits/balance', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      return result.data || { balance: 0 };
    },
  });

  // Fetch user info (for admin check)
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return { isAdmin: false };

      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await res.json();
      return result.data?.user || { isAdmin: false };
    },
  });

  const isAdmin = user?.isAdmin === true;

  // Calculate total expert usage
  const totalUsage = expertStats?.expertUsage
    ? Object.values(expertStats.expertUsage).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className="w-full px-6 md:px-12 lg:px-16 py-8 space-y-6">
      {/* ===== Statistics Header ===== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Total Conversations */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 text-center">
          <MessageCircle className="w-5 h-5 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{expertStats?.totalConversations || 0}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Conversations</div>
        </div>

        {/* Total Messages */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 text-center">
          <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{expertStats?.totalMessages || 0}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Messages</div>
        </div>

        {/* Total Usage */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 text-center">
          <Bot className="w-5 h-5 text-amber-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalUsage}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">Total Calls</div>
        </div>

        {/* ARIA Usage */}
        <div className="bg-blue-50 dark:bg-blue-500/10 rounded-xl p-4 border border-blue-200 dark:border-blue-500/30 text-center">
          <LineChart className="w-5 h-5 text-blue-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{expertStats?.expertUsage?.aria || 0}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">ARIA</div>
        </div>

        {/* NEXUS Usage */}
        <div className="bg-amber-50 dark:bg-amber-500/10 rounded-xl p-4 border border-amber-200 dark:border-amber-500/30 text-center">
          <Target className="w-5 h-5 text-amber-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{expertStats?.expertUsage?.nexus || 0}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">NEXUS</div>
        </div>

        {/* ORACLE Usage */}
        <div className="bg-purple-50 dark:bg-purple-500/10 rounded-xl p-4 border border-purple-200 dark:border-purple-500/30 text-center">
          <Eye className="w-5 h-5 text-purple-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{expertStats?.expertUsage?.oracle || 0}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">ORACLE</div>
        </div>

        {/* SENTINEL Usage */}
        <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-200 dark:border-red-500/30 text-center">
          <ShieldAlert className="w-5 h-5 text-red-500 mx-auto mb-2" />
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{expertStats?.expertUsage?.sentinel || 0}</div>
          <div className="text-xs text-gray-500 dark:text-slate-400">SENTINEL</div>
        </div>
      </div>

      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-6 h-6 text-amber-500" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Expert Team</h1>
              <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded text-xs font-bold">NEW</span>
            </div>
            <p className="text-gray-500 dark:text-slate-400">
              Four specialized AI experts, each mastering their own domain
            </p>
          </div>
          {isAdmin ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold text-green-600">
                Admin
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg">
              <Gem className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {credits?.balance || 0} credits
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Expert Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {AI_EXPERTS.map((expert) => {
          const Icon = expert.icon;
          return (
            <Link
              key={expert.id}
              href={`/ai-expert/${expert.id}`}
              className={`block bg-card border rounded-xl p-6 lg:p-8 hover:shadow-lg hover:border-border/80 transition-all group`}
            >
              <div className="flex items-start gap-4 lg:gap-6">
                {/* AI Avatar */}
                <div className={`w-16 h-16 lg:w-20 lg:h-20 ${expert.bg} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                  <Icon className={`w-8 h-8 lg:w-10 lg:h-10 ${expert.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name & Title */}
                  <div className="flex items-center gap-2 mb-0.5">
                    <h3 className="font-bold text-xl lg:text-2xl">{expert.name}</h3>
                    <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-amber-500" />
                  </div>
                  <p className={`text-sm lg:text-base ${expert.color} font-semibold`}>
                    {expert.title}
                  </p>

                  {/* Professional Background */}
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    {expert.yearsExperience}+ years experience • {expert.background}
                  </p>

                  {/* Description */}
                  <p className="text-sm lg:text-base text-muted-foreground mb-4 lg:mb-5">
                    {expert.description}
                  </p>

                  {/* Specialties */}
                  <div className="flex flex-wrap gap-2 lg:gap-3 mb-4 lg:mb-5">
                    {expert.specialty.map((spec) => (
                      <span
                        key={spec}
                        className="text-xs lg:text-sm px-2 lg:px-3 py-1 lg:py-1.5 bg-accent rounded-full text-muted-foreground"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>

                  {/* Chat Button */}
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 lg:gap-3 px-4 lg:px-5 py-2 lg:py-2.5 bg-slate-200 dark:bg-slate-700 rounded-lg font-semibold text-sm lg:text-base border border-slate-300 dark:border-slate-600 group-hover:shadow-md transition-shadow">
                      <MessageCircle className="w-4 h-4 lg:w-5 lg:h-5 gradient-text-rg-animate" />
                      <span className="gradient-text-rg-animate">Start Chat</span>
                      <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5 gradient-text-rg-animate group-hover:translate-x-1 transition-transform" />
                    </div>
                    {isAdmin ? (
                      <div className="flex items-center gap-1.5 text-green-500">
                        <Shield className="w-4 h-4 lg:w-5 lg:h-5" />
                        <span className="text-sm lg:text-base font-bold">Free</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-amber-500">
                        <Zap className="w-4 h-4 lg:w-5 lg:h-5" />
                        <span className="text-sm lg:text-base font-bold">{expert.creditCost} credits</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom Info */}
      <div className="mt-8 lg:mt-10">
        <div className="bg-card border rounded-lg p-4 lg:p-5">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            {isAdmin ? (
              <span>
                <span className="text-green-500 font-bold">Admin</span> - All AI experts are free for you
              </span>
            ) : (
              <span>Each message costs <span className="text-amber-500 font-bold">3 credits</span> - powered by TradePath examples</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            AI Experts use real examples from your TradePath analyses and quiz questions to give you personalized answers.
          </p>
        </div>
      </div>
    </div>
  );
}
