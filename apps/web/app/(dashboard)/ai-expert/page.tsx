'use client';

// ===========================================
// AI Experts Selection Page
// Choose which AI expert to chat with (3 credits each)
// ===========================================

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Bot,
  MessageCircle,
  LineChart,
  Target,
  Eye,
  ShieldAlert,
  Sparkles,
  Gem,
  Zap,
  BookOpen,
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
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-500/10 to-cyan-500/10',
    borderColor: 'border-blue-500/30',
    creditCost: 3,
  },
  {
    id: 'nexus',
    name: 'NEXUS',
    role: 'Risk Assessment AI',
    description: 'Calculates risk/reward ratios, position sizing, and portfolio risk. Helps optimize your trading strategy.',
    specialty: ['Risk Management', 'Position Sizing', 'Portfolio Analysis'],
    icon: Target,
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-500/10 to-orange-500/10',
    borderColor: 'border-amber-500/30',
    creditCost: 3,
  },
  {
    id: 'oracle',
    name: 'ORACLE',
    role: 'Whale Detection AI',
    description: 'Tracks large wallet movements, exchange flows, and smart money positioning. Spots accumulation and distribution.',
    specialty: ['Whale Tracking', 'Exchange Flows', 'Smart Money'],
    icon: Eye,
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-500/10 to-pink-500/10',
    borderColor: 'border-purple-500/30',
    creditCost: 3,
  },
  {
    id: 'sentinel',
    name: 'SENTINEL',
    role: 'Security & Scam AI',
    description: 'Detects pump & dump schemes, rug pulls, and market manipulation. Your guard against crypto scams.',
    specialty: ['Scam Detection', 'Manipulation Alerts', 'Safety Checks'],
    icon: ShieldAlert,
    gradient: 'from-red-500 to-rose-500',
    bgGradient: 'from-red-500/10 to-rose-500/10',
    borderColor: 'border-red-500/30',
    creditCost: 3,
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 rounded-full border border-purple-500/20 text-sm font-medium mb-6">
          <Bot className="w-4 h-4 text-purple-500" />
          <span className="bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 text-transparent bg-clip-text">
            AI Expert Team
          </span>
          <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded text-xs font-bold">NEW</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 text-transparent bg-clip-text">
            Uzman AI Ekibi
          </span>
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          Dört uzman AI, her biri kendi alanında uzmanlaşmış.
          <br />
          <span className="text-primary font-medium">TradePath örnekleriyle</span> zenginleştirilmiş yanıtlar alın.
        </p>

        {/* Credits & Info */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 rounded-full border border-amber-500/20">
            <Gem className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-600">
              {credits?.balance || 0} kredi mevcut
            </span>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-full border border-green-500/20">
            <BookOpen className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-green-600">
              Gerçek örneklerle öğren
            </span>
          </div>
        </div>
      </motion.div>

      {/* Expert Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto"
      >
        {AI_EXPERTS.map((expert) => {
          const Icon = expert.icon;
          return (
            <motion.div key={expert.id} variants={item}>
              <Link
                href={`/ai-expert/${expert.id}`}
                className={`block bg-gradient-to-br ${expert.bgGradient} rounded-2xl border ${expert.borderColor} p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 group`}
              >
                <div className="flex items-start gap-5">
                  {/* AI Avatar */}
                  <div className={`w-20 h-20 bg-gradient-to-br ${expert.gradient} rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-10 h-10 text-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Name & Role */}
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-2xl">{expert.name}</h3>
                      <Sparkles className="w-5 h-5 text-amber-500" />
                    </div>
                    <p className={`text-sm mb-3 bg-gradient-to-r ${expert.gradient} bg-clip-text text-transparent font-semibold`}>
                      {expert.role}
                    </p>

                    {/* Description */}
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                      {expert.description}
                    </p>

                    {/* Specialties */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      {expert.specialty.map((spec) => (
                        <span
                          key={spec}
                          className="text-xs px-3 py-1.5 bg-background/80 rounded-full text-muted-foreground border border-border/50"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>

                    {/* Chat Button */}
                    <div className="flex items-center justify-between">
                      <div className={`inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r ${expert.gradient} text-white rounded-xl font-semibold text-sm shadow-lg group-hover:shadow-xl transition-shadow`}>
                        <MessageCircle className="w-4 h-4" />
                        Sohbet Başlat
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                      <div className="flex items-center gap-1.5 text-amber-500">
                        <Zap className="w-4 h-4" />
                        <span className="text-sm font-bold">{expert.creditCost} kredi</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Bottom Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center mt-12"
      >
        <div className="inline-flex flex-col items-center gap-2 p-6 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-cyan-500/5 rounded-2xl border border-purple-500/10">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="font-medium">Her mesaj <span className="text-amber-500 font-bold">3 kredi</span> - TradePath örnekleriyle desteklenir</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Uzman AI'lar, gerçek TradePath analizlerinizden ve quiz sorularından örnekler kullanarak size özel yanıtlar verir.
          </p>
          <Link href="/credits" className="text-primary hover:underline text-sm font-medium mt-2 flex items-center gap-1">
            Kredi satın al
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
