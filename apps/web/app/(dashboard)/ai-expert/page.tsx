'use client';

// ===========================================
// AI Experts Selection Page
// Choose which AI expert to chat with (3 credits each)
// ===========================================

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
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

// AI Expert definitions
const AI_EXPERTS = [
  {
    id: 'aria',
    name: 'ARIA',
    role: 'Market Analysis AI',
    description: 'Expert in technical analysis, price patterns, and market trends. Analyzes charts across multiple timeframes.',
    specialty: ['Technical Analysis', 'Chart Patterns', 'Trend Detection'],
    icon: LineChart,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    creditCost: 3,
  },
  {
    id: 'nexus',
    name: 'NEXUS',
    role: 'Risk Assessment AI',
    description: 'Calculates risk/reward ratios, position sizing, and portfolio risk. Helps optimize your trading strategy.',
    specialty: ['Risk Management', 'Position Sizing', 'Portfolio Analysis'],
    icon: Target,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    creditCost: 3,
  },
  {
    id: 'oracle',
    name: 'ORACLE',
    role: 'Whale Detection AI',
    description: 'Tracks large wallet movements, exchange flows, and smart money positioning. Spots accumulation and distribution.',
    specialty: ['Whale Tracking', 'Exchange Flows', 'Smart Money'],
    icon: Eye,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    creditCost: 3,
  },
  {
    id: 'sentinel',
    name: 'SENTINEL',
    role: 'Security & Scam AI',
    description: 'Detects pump & dump schemes, rug pulls, and market manipulation. Your guard against crypto scams.',
    specialty: ['Scam Detection', 'Manipulation Alerts', 'Safety Checks'],
    icon: ShieldAlert,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    creditCost: 3,
  },
];

export default function AIExpertsPage() {
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

  return (
    <div className="w-full px-6 md:px-12 lg:px-16 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Bot className="w-6 h-6 text-amber-500" />
              <h1 className="text-2xl font-bold">AI Expert Team</h1>
              <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded text-xs font-bold">NEW</span>
            </div>
            <p className="text-muted-foreground">
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
            <div className="flex items-center gap-2 px-4 py-2 bg-card border rounded-lg">
              <Gem className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold">
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
                  {/* Name & Role */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-xl lg:text-2xl">{expert.name}</h3>
                    <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 text-amber-500" />
                  </div>
                  <p className={`text-sm lg:text-base mb-2 lg:mb-3 ${expert.color} font-medium`}>
                    {expert.role}
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
