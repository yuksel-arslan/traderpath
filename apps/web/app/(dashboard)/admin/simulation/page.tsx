'use client';

import { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowLeft,
  RefreshCw,
  Target,
  Zap,
  Users,
  Cpu,
  Activity,
  Clock,
  Layers,
  Radio,
  CreditCard,
  Globe,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Area, ComposedChart, BarChart, Bar, Legend } from 'recharts';

// ===========================================
// Types
// ===========================================

type AIModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

interface SimulationConfig {
  // Fixed Costs (Monthly Base)
  claudeCodeCost: number;
  vercelBaseCost: number;
  railwayBaseCost: number;
  neonDbBaseCost: number;

  // Variable Costs (per user/request)
  vercelCostPerDAU: number;      // Vercel edge function cost per DAU
  railwayCostPerDAU: number;     // Railway CPU cost per DAU
  neonDbCostPerDAU: number;      // Neon DB query cost per DAU

  // AI Costs (per analysis)
  aiModel: AIModel;
  aiCostPerAnalysis: number;

  // Daily Pass Pricing (credits) - COMBINED L3+L4
  capitalFlowPassCredits: number; // L3 + L4 combined
  analysisPassCredits: number;

  // Credit Pricing
  creditPriceUsd: number;

  // Signal Service Pricing
  signalBasicPrice: number;
  signalProPrice: number;

  // User Projections
  weeklyNewUsers: number;
  userRetentionRate: number;
  dailyActiveRate: number;

  // Usage Distribution (Daily Pass)
  capitalFlowUsageRate: number; // % of DAU using Capital Flow
  analysisUsageRate: number;    // % of DAU using Analysis
  avgAnalysesPerActiveUser: number;

  // Signal Service Projections
  signalConversionRate: number;
  signalBasicRatio: number;
  signalChurnRate: number;
}

interface WeeklyData {
  week: string;
  weekNum: number;
  totalUsers: number;
  avgDailyActiveUsers: number;
  // Daily Pass Revenue
  capitalFlowRevenue: number;
  analysisRevenue: number;
  dailyPassRevenue: number;
  // Signal Service Revenue
  signalBasicSubs: number;
  signalProSubs: number;
  signalMRR: number;
  signalWeeklyRevenue: number;
  // Totals
  totalRevenue: number;
  // Costs breakdown
  fixedCost: number;
  variableCost: number; // Infrastructure cost that scales with users
  aiCost: number;
  totalCost: number;
  profit: number;
  cumProfit: number;
  totalAnalyses: number;
  // For breakdown
  capitalFlowUsers: number;
  analysisUsers: number;
}

// ===========================================
// Default Configuration
// ===========================================

const AI_MODEL_COSTS: Record<AIModel, number> = {
  'gemini-2.5-flash': 0.003,
  'gemini-2.5-pro': 0.02,
};

const defaultConfig: SimulationConfig = {
  // Fixed costs (monthly base)
  claudeCodeCost: 100,
  vercelBaseCost: 20,
  railwayBaseCost: 20,
  neonDbBaseCost: 20,
  // Variable costs per DAU per day
  // Estimates based on typical usage patterns:
  // - Vercel: ~$0.002/DAU/day (edge functions, bandwidth)
  // - Railway: ~$0.005/DAU/day (CPU, memory for API requests)
  // - Neon: ~$0.003/DAU/day (queries, storage, compute)
  vercelCostPerDAU: 0.002,
  railwayCostPerDAU: 0.005,
  neonDbCostPerDAU: 0.003,
  // AI
  aiModel: 'gemini-2.5-flash',
  aiCostPerAnalysis: AI_MODEL_COSTS['gemini-2.5-flash'],
  // Daily Pass - COMBINED L3+L4 = 50 credits
  capitalFlowPassCredits: 50,  // L3 (25) + L4 (25) combined
  analysisPassCredits: 100,
  // Credit price
  creditPriceUsd: 0.10,
  // Signal Service
  signalBasicPrice: 9,
  signalProPrice: 19,
  // Users
  weeklyNewUsers: 10,
  userRetentionRate: 70,
  dailyActiveRate: 25,
  // Daily Pass Usage - simplified
  capitalFlowUsageRate: 50,    // 50% of DAU uses Capital Flow
  analysisUsageRate: 30,       // 30% of DAU uses Analysis
  avgAnalysesPerActiveUser: 3,
  // Signal Service Usage
  signalConversionRate: 8,
  signalBasicRatio: 40,
  signalChurnRate: 10,
};

// ===========================================
// Number Input Component
// ===========================================

function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix,
  prefix,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  prefix?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-slate-400">{label}</span>
        <div className="flex items-center gap-1">
          {prefix && <span className="text-sm text-slate-500">{prefix}</span>}
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-20 px-2 py-1.5 text-right font-sans text-sm border border-slate-700 rounded-lg bg-slate-800/50 text-white focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none"
          />
          {suffix && <span className="text-sm text-slate-500">{suffix}</span>}
        </div>
      </div>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

// ===========================================
// Main Component
// ===========================================

export default function SimulationPage() {
  const [config, setConfig] = useState<SimulationConfig>(defaultConfig);
  const [weeks, setWeeks] = useState(12);

  // Calculate weekly data
  const weeklyData = useMemo((): WeeklyData[] => {
    const data: WeeklyData[] = [];
    let totalUsers = 0;
    let cumProfit = 0;
    let signalBasicSubs = 0;
    let signalProSubs = 0;
    // Fixed costs - monthly base divided by 4 for weekly
    const weeklyFixedCost = (config.claudeCodeCost + config.vercelBaseCost + config.railwayBaseCost + config.neonDbBaseCost) / 4;
    // Variable cost per DAU per day
    const variableCostPerDAUPerDay = config.vercelCostPerDAU + config.railwayCostPerDAU + config.neonDbCostPerDAU;

    for (let i = 1; i <= weeks; i++) {
      const newUsers = Math.round(config.weeklyNewUsers);
      const retainedUsers = Math.round(totalUsers * (config.userRetentionRate / 100));
      totalUsers = retainedUsers + newUsers;

      const avgDailyActiveUsers = Math.round(totalUsers * (config.dailyActiveRate / 100));
      const activeDaysPerWeek = 7;

      // Capital Flow Pass Revenue (L3+L4 combined)
      const capitalFlowUsersPerDay = Math.round(avgDailyActiveUsers * (config.capitalFlowUsageRate / 100));
      const capitalFlowDailyRevenue = capitalFlowUsersPerDay * config.capitalFlowPassCredits * config.creditPriceUsd;
      const capitalFlowRevenue = capitalFlowDailyRevenue * activeDaysPerWeek;

      // Analysis Pass Revenue
      const analysisUsersPerDay = Math.round(avgDailyActiveUsers * (config.analysisUsageRate / 100));
      const analysisDailyRevenue = analysisUsersPerDay * config.analysisPassCredits * config.creditPriceUsd;
      const analysisRevenue = analysisDailyRevenue * activeDaysPerWeek;

      const dailyPassRevenue = capitalFlowRevenue + analysisRevenue;

      // Signal Service Subscriptions
      const newSignalSubs = Math.round(newUsers * (config.signalConversionRate / 100));
      const churnedBasic = Math.round(signalBasicSubs * (config.signalChurnRate / 100) / 4);
      const churnedPro = Math.round(signalProSubs * (config.signalChurnRate / 100) / 4);

      const newBasicSubs = Math.round(newSignalSubs * (config.signalBasicRatio / 100));
      const newProSubs = newSignalSubs - newBasicSubs;

      signalBasicSubs = Math.max(0, signalBasicSubs + newBasicSubs - churnedBasic);
      signalProSubs = Math.max(0, signalProSubs + newProSubs - churnedPro);

      const signalMRR = (signalBasicSubs * config.signalBasicPrice) + (signalProSubs * config.signalProPrice);
      const signalWeeklyRevenue = signalMRR / 4;

      const totalRevenue = dailyPassRevenue + signalWeeklyRevenue;

      // Cost calculations
      // AI Cost: per analysis
      const totalAnalyses = Math.round(analysisUsersPerDay * config.avgAnalysesPerActiveUser * activeDaysPerWeek);
      const aiCost = totalAnalyses * config.aiCostPerAnalysis;

      // Fixed cost: infrastructure base cost (weekly portion)
      const fixedCost = weeklyFixedCost;

      // Variable cost: scales with DAU (per user per day × DAU × 7 days)
      const variableCost = avgDailyActiveUsers * variableCostPerDAUPerDay * activeDaysPerWeek;

      const totalCost = fixedCost + variableCost + aiCost;
      const profit = totalRevenue - totalCost;
      cumProfit += profit;

      data.push({
        week: `W${i}`,
        weekNum: i,
        totalUsers,
        avgDailyActiveUsers,
        capitalFlowRevenue: Number(capitalFlowRevenue.toFixed(2)),
        analysisRevenue: Number(analysisRevenue.toFixed(2)),
        dailyPassRevenue: Number(dailyPassRevenue.toFixed(2)),
        signalBasicSubs,
        signalProSubs,
        signalMRR: Number(signalMRR.toFixed(2)),
        signalWeeklyRevenue: Number(signalWeeklyRevenue.toFixed(2)),
        totalRevenue: Number(totalRevenue.toFixed(2)),
        fixedCost: Number(fixedCost.toFixed(2)),
        variableCost: Number(variableCost.toFixed(2)),
        aiCost: Number(aiCost.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        cumProfit: Number(cumProfit.toFixed(2)),
        totalAnalyses,
        capitalFlowUsers: capitalFlowUsersPerDay,
        analysisUsers: analysisUsersPerDay,
      });
    }

    return data;
  }, [config, weeks]);

  // Summary calculations
  const summary = useMemo(() => {
    const lastWeek = weeklyData[weeklyData.length - 1];
    const totalRevenue = weeklyData.reduce((sum, w) => sum + w.totalRevenue, 0);
    const totalCost = weeklyData.reduce((sum, w) => sum + w.totalCost, 0);
    const totalProfit = totalRevenue - totalCost;
    const breakEvenWeek = weeklyData.findIndex(w => w.cumProfit >= 0) + 1;

    // Daily Pass
    const capitalFlowTotal = weeklyData.reduce((sum, w) => sum + w.capitalFlowRevenue, 0);
    const analysisTotal = weeklyData.reduce((sum, w) => sum + w.analysisRevenue, 0);
    const dailyPassTotal = capitalFlowTotal + analysisTotal;

    // Signal Service
    const signalTotal = weeklyData.reduce((sum, w) => sum + w.signalWeeklyRevenue, 0);
    const finalMRR = lastWeek?.signalMRR || 0;
    const finalBasicSubs = lastWeek?.signalBasicSubs || 0;
    const finalProSubs = lastWeek?.signalProSubs || 0;

    // Total daily pass credits
    const totalDailyCredits = config.capitalFlowPassCredits + config.analysisPassCredits;
    const dailyPassUsd = totalDailyCredits * config.creditPriceUsd;

    // Revenue split
    const dailyPassPercent = totalRevenue > 0 ? (dailyPassTotal / totalRevenue) * 100 : 0;
    const signalPercent = totalRevenue > 0 ? (signalTotal / totalRevenue) * 100 : 0;

    // Total analyses
    const totalAnalyses = weeklyData.reduce((sum, w) => sum + w.totalAnalyses, 0);
    const totalAiCost = weeklyData.reduce((sum, w) => sum + w.aiCost, 0);

    // Cost breakdown
    const totalFixedCost = weeklyData.reduce((sum, w) => sum + w.fixedCost, 0);
    const totalVariableCost = weeklyData.reduce((sum, w) => sum + w.variableCost, 0);

    // Monthly totals (for display)
    const monthlyFixedBase = config.claudeCodeCost + config.vercelBaseCost + config.railwayBaseCost + config.neonDbBaseCost;
    const variableCostPerDAU = config.vercelCostPerDAU + config.railwayCostPerDAU + config.neonDbCostPerDAU;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      breakEvenWeek: breakEvenWeek > 0 ? breakEvenWeek : 'N/A',
      finalUsers: lastWeek?.totalUsers || 0,
      finalDAU: lastWeek?.avgDailyActiveUsers || 0,
      // Daily Pass
      capitalFlowTotal,
      analysisTotal,
      dailyPassTotal,
      totalDailyCredits,
      dailyPassUsd,
      // Signal Service
      signalTotal,
      finalMRR,
      finalBasicSubs,
      finalProSubs,
      // Revenue split
      dailyPassPercent,
      signalPercent,
      // Analyses
      totalAnalyses,
      totalAiCost,
      // Cost breakdown
      totalFixedCost,
      totalVariableCost,
      monthlyFixedBase,
      variableCostPerDAU,
    };
  }, [weeklyData, config]);

  const handleReset = () => setConfig(defaultConfig);

  const updateConfig = (key: keyof SimulationConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateAIModel = (model: AIModel) => {
    setConfig(prev => ({
      ...prev,
      aiModel: model,
      aiCostPerAnalysis: AI_MODEL_COSTS[model],
    }));
  };

  return (
    <div className="min-h-screen bg-[#030712]">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/finance" className="p-2 hover:bg-white/5 rounded-lg transition border border-white/10">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3 text-white">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                Revenue Simulation
              </h1>
              <p className="text-sm text-slate-400 mt-1">Capital Flow Pass + Asset Analysis + Signal Service</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm border border-white/10 rounded-lg hover:bg-white/5 transition text-slate-300"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
          <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-xs text-slate-400">Revenue</span>
            </div>
            <p className="text-2xl font-bold text-green-400">${summary.totalRevenue.toFixed(0)}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500/20 to-rose-500/10 border border-red-500/20 rounded-xl p-4 group relative">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-xs text-slate-400">Cost</span>
            </div>
            <p className="text-2xl font-bold text-red-400">${summary.totalCost.toFixed(0)}</p>
            {/* Hover tooltip with breakdown */}
            <div className="absolute left-0 top-full mt-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 text-xs shadow-xl min-w-[140px]">
                <div className="flex justify-between gap-4 mb-1">
                  <span className="text-slate-400">Fixed:</span>
                  <span className="text-slate-300">${summary.totalFixedCost.toFixed(0)}</span>
                </div>
                <div className="flex justify-between gap-4 mb-1">
                  <span className="text-amber-400">Variable:</span>
                  <span className="text-amber-300">${summary.totalVariableCost.toFixed(0)}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-violet-400">AI:</span>
                  <span className="text-violet-300">${summary.totalAiCost.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400">Profit</span>
            </div>
            <p className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
              ${summary.totalProfit.toFixed(0)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-400">Break-even</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">
              {typeof summary.breakEvenWeek === 'number' ? `W${summary.breakEvenWeek}` : 'N/A'}
            </p>
          </div>
          <div className="bg-gradient-to-br from-teal-500/20 to-cyan-500/10 border border-teal-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-4 h-4 text-teal-400" />
              <span className="text-xs text-slate-400">Signal MRR</span>
            </div>
            <p className="text-2xl font-bold text-teal-400">${summary.finalMRR.toFixed(0)}</p>
          </div>
          <div className="bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-violet-400" />
              <span className="text-xs text-slate-400">Users</span>
            </div>
            <p className="text-2xl font-bold text-violet-400">{summary.finalUsers}</p>
          </div>
          <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/10 border border-pink-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-pink-400" />
              <span className="text-xs text-slate-400">DAU</span>
            </div>
            <p className="text-2xl font-bold text-pink-400">{summary.finalDAU}</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-500/20 to-sky-500/10 border border-cyan-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs text-slate-400">Analyses</span>
            </div>
            <p className="text-2xl font-bold text-cyan-400">{summary.totalAnalyses}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-4 space-y-4">
            {/* Daily Pass Pricing - COMBINED L3+L4 */}
            <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-white" />
                </div>
                Daily Pass System
              </h3>
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-violet-300">Capital Flow Pass</span>
                    <span className="text-xs text-violet-400">L3 + L4 Combined</span>
                  </div>
                  <NumberInput
                    label="Price"
                    value={config.capitalFlowPassCredits}
                    onChange={(v) => updateConfig('capitalFlowPassCredits', v)}
                    min={10}
                    max={200}
                    suffix="cr/day"
                    hint="Sector Activity + AI Recommendations"
                  />
                </div>
                <div className="p-3 rounded-lg bg-teal-500/10 border border-teal-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-teal-300">Asset Analysis Pass</span>
                    <span className="text-xs text-teal-400">Max 10/day</span>
                  </div>
                  <NumberInput
                    label="Price"
                    value={config.analysisPassCredits}
                    onChange={(v) => updateConfig('analysisPassCredits', v)}
                    min={10}
                    max={500}
                    suffix="cr/day"
                    hint="7-Step or MLIS Pro analysis"
                  />
                </div>
                <div className="pt-3 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-300">Full Day Cost</span>
                    <div className="text-right">
                      <span className="font-sans text-lg text-violet-400">{summary.totalDailyCredits} cr</span>
                      <span className="text-slate-500 ml-2">(${summary.dailyPassUsd.toFixed(2)})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Credit Pricing */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                <CreditCard className="w-5 h-5 text-green-400" />
                Credit Pricing
              </h3>
              <NumberInput
                label="Price per Credit"
                value={config.creditPriceUsd}
                onChange={(v) => updateConfig('creditPriceUsd', v)}
                min={0.01}
                max={1}
                step={0.01}
                prefix="$"
              />
            </div>

            {/* Signal Service */}
            <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/20 rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                <Radio className="w-5 h-5 text-teal-400" />
                Signal Service
              </h3>
              <div className="space-y-3">
                <NumberInput label="Basic Plan" value={config.signalBasicPrice} onChange={(v) => updateConfig('signalBasicPrice', v)} min={1} max={50} prefix="$" suffix="/mo" />
                <NumberInput label="Pro Plan" value={config.signalProPrice} onChange={(v) => updateConfig('signalProPrice', v)} min={1} max={100} prefix="$" suffix="/mo" />
                <div className="pt-3 border-t border-teal-500/20 space-y-3">
                  <NumberInput label="Conversion Rate" value={config.signalConversionRate} onChange={(v) => updateConfig('signalConversionRate', v)} min={1} max={50} suffix="%" />
                  <NumberInput label="Basic vs Pro" value={config.signalBasicRatio} onChange={(v) => updateConfig('signalBasicRatio', v)} min={0} max={100} suffix="% Basic" />
                  <NumberInput label="Monthly Churn" value={config.signalChurnRate} onChange={(v) => updateConfig('signalChurnRate', v)} min={0} max={50} suffix="%" />
                </div>
              </div>
            </div>

            {/* Infrastructure Costs */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                <Layers className="w-5 h-5 text-slate-400" />
                Infrastructure Costs
              </h3>
              <div className="space-y-4">
                {/* Fixed Base Costs */}
                <div className="space-y-2">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Fixed Base (Monthly)</div>
                  <NumberInput label="Claude Code" value={config.claudeCodeCost} onChange={(v) => updateConfig('claudeCodeCost', v)} prefix="$" suffix="/mo" />
                  <NumberInput label="Vercel Base" value={config.vercelBaseCost} onChange={(v) => updateConfig('vercelBaseCost', v)} prefix="$" suffix="/mo" />
                  <NumberInput label="Railway Base" value={config.railwayBaseCost} onChange={(v) => updateConfig('railwayBaseCost', v)} prefix="$" suffix="/mo" />
                  <NumberInput label="Neon DB Base" value={config.neonDbBaseCost} onChange={(v) => updateConfig('neonDbBaseCost', v)} prefix="$" suffix="/mo" />
                </div>

                {/* Variable Costs */}
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Variable (Per DAU/Day)</div>
                  <NumberInput
                    label="Vercel"
                    value={config.vercelCostPerDAU}
                    onChange={(v) => updateConfig('vercelCostPerDAU', v)}
                    prefix="$"
                    step={0.001}
                    hint="Edge functions, bandwidth"
                  />
                  <NumberInput
                    label="Railway"
                    value={config.railwayCostPerDAU}
                    onChange={(v) => updateConfig('railwayCostPerDAU', v)}
                    prefix="$"
                    step={0.001}
                    hint="CPU, memory for API requests"
                  />
                  <NumberInput
                    label="Neon DB"
                    value={config.neonDbCostPerDAU}
                    onChange={(v) => updateConfig('neonDbCostPerDAU', v)}
                    prefix="$"
                    step={0.001}
                    hint="Queries, compute time"
                  />
                </div>

                {/* Summary */}
                <div className="pt-3 border-t border-white/10 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fixed Base</span>
                    <span className="font-sans text-slate-300">${summary.monthlyFixedBase}/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Variable</span>
                    <span className="font-sans text-amber-400">${summary.variableCostPerDAU.toFixed(3)}/DAU/day</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>At {summary.finalDAU} DAU</span>
                    <span>+${(summary.finalDAU * summary.variableCostPerDAU * 30).toFixed(2)}/mo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Cost */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                <Cpu className="w-5 h-5 text-violet-400" />
                AI Model
              </h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => updateAIModel('gemini-2.5-flash')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      config.aiModel === 'gemini-2.5-flash'
                        ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white'
                        : 'bg-white/5 text-slate-400 border border-white/10'
                    }`}
                  >
                    Flash ($0.003)
                  </button>
                  <button
                    onClick={() => updateAIModel('gemini-2.5-pro')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      config.aiModel === 'gemini-2.5-pro'
                        ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white'
                        : 'bg-white/5 text-slate-400 border border-white/10'
                    }`}
                  >
                    Pro ($0.02)
                  </button>
                </div>
                <NumberInput label="Cost/Analysis" value={config.aiCostPerAnalysis} onChange={(v) => updateConfig('aiCostPerAnalysis', v)} min={0.001} max={0.1} step={0.001} prefix="$" />
                <div className="pt-2 text-xs text-slate-500">
                  Total AI Cost: <span className="text-violet-400">${summary.totalAiCost.toFixed(2)}</span> for {summary.totalAnalyses} analyses
                </div>
              </div>
            </div>

            {/* User Projections */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-violet-400" />
                User Projections
              </h3>
              <div className="space-y-3">
                <NumberInput label="New Users/Week" value={config.weeklyNewUsers} onChange={(v) => updateConfig('weeklyNewUsers', v)} min={1} max={500} />
                <NumberInput label="Retention Rate" value={config.userRetentionRate} onChange={(v) => updateConfig('userRetentionRate', v)} min={0} max={100} suffix="%" />
                <NumberInput label="Daily Active Rate" value={config.dailyActiveRate} onChange={(v) => updateConfig('dailyActiveRate', v)} min={1} max={100} suffix="%" />
              </div>
            </div>

            {/* Usage Distribution */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                <Activity className="w-5 h-5 text-teal-400" />
                Daily Pass Usage
              </h3>
              <div className="space-y-3">
                <NumberInput label="Capital Flow Usage" value={config.capitalFlowUsageRate} onChange={(v) => updateConfig('capitalFlowUsageRate', v)} min={0} max={100} suffix="% DAU" hint="% of DAU buying Capital Flow Pass" />
                <NumberInput label="Analysis Usage" value={config.analysisUsageRate} onChange={(v) => updateConfig('analysisUsageRate', v)} min={0} max={100} suffix="% DAU" hint="% of DAU buying Analysis Pass" />
                <NumberInput label="Analyses/User/Day" value={config.avgAnalysesPerActiveUser} onChange={(v) => updateConfig('avgAnalysesPerActiveUser', v)} min={1} max={10} />
              </div>
            </div>

            {/* Simulation Period */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <NumberInput label="Simulation Period" value={weeks} onChange={setWeeks} min={4} max={52} suffix="weeks" />
            </div>
          </div>

          {/* Charts Panel */}
          <div className="lg:col-span-8 space-y-6">
            {/* Revenue Split */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-400">Daily Pass Revenue</span>
                  <span className="text-xs font-medium text-violet-400">{summary.dailyPassPercent.toFixed(0)}%</span>
                </div>
                <p className="text-3xl font-bold text-violet-400 mb-3">${summary.dailyPassTotal.toFixed(0)}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Capital Flow (L3+L4)</span>
                    <span className="font-sans text-violet-300">${summary.capitalFlowTotal.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Asset Analysis</span>
                    <span className="font-sans text-teal-300">${summary.analysisTotal.toFixed(0)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border border-teal-500/20 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-400">Signal Service Revenue</span>
                  <span className="text-xs font-medium text-teal-400">{summary.signalPercent.toFixed(0)}%</span>
                </div>
                <p className="text-3xl font-bold text-teal-400 mb-3">${summary.signalTotal.toFixed(0)}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Basic ({summary.finalBasicSubs} subs)</span>
                    <span className="font-sans text-cyan-300">${(summary.finalBasicSubs * config.signalBasicPrice * weeks / 4).toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pro ({summary.finalProSubs} subs)</span>
                    <span className="font-sans text-teal-300">${(summary.finalProSubs * config.signalProPrice * weeks / 4).toFixed(0)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Revenue Chart */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                <Layers className="w-5 h-5 text-teal-400" />
                Weekly Revenue by Source
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          capitalFlowRevenue: 'Capital Flow',
                          analysisRevenue: 'Asset Analysis',
                          signalWeeklyRevenue: 'Signal Service',
                        };
                        return [`$${value.toFixed(2)}`, labels[name] || name];
                      }}
                    />
                    <Bar dataKey="capitalFlowRevenue" stackId="a" fill="#8b5cf6" name="Capital Flow" />
                    <Bar dataKey="analysisRevenue" stackId="a" fill="#14b8a6" name="Asset Analysis" />
                    <Bar dataKey="signalWeeklyRevenue" stackId="a" fill="#06b6d4" name="Signal Service" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-violet-500 rounded" />
                  <span className="text-slate-400">Capital Flow</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-teal-500 rounded" />
                  <span className="text-slate-400">Analysis</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-cyan-500 rounded" />
                  <span className="text-slate-400">Signal</span>
                </div>
              </div>
            </div>

            {/* Profitability */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                Weekly Profitability
              </h3>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = { totalRevenue: 'Revenue', totalCost: 'Cost', profit: 'Profit' };
                        return [`$${value.toFixed(2)}`, labels[name] || name];
                      }}
                    />
                    <ReferenceLine y={0} stroke="#64748b" />
                    <Area type="monotone" dataKey="totalRevenue" fill="#10b981" fillOpacity={0.1} stroke="#10b981" strokeWidth={2} />
                    <Line type="monotone" dataKey="totalCost" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 2 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                <Layers className="w-5 h-5 text-red-400" />
                Cost Breakdown (Scales with Users)
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = {
                          fixedCost: 'Fixed (Infrastructure)',
                          variableCost: 'Variable (per DAU)',
                          aiCost: 'AI (per Analysis)',
                        };
                        return [`$${value.toFixed(2)}`, labels[name] || name];
                      }}
                    />
                    <Bar dataKey="fixedCost" stackId="cost" fill="#64748b" name="Fixed" />
                    <Bar dataKey="variableCost" stackId="cost" fill="#f59e0b" name="Variable" />
                    <Bar dataKey="aiCost" stackId="cost" fill="#8b5cf6" name="AI" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-slate-500 rounded" />
                  <span className="text-slate-400">Fixed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-amber-500 rounded" />
                  <span className="text-slate-400">Variable (DAU)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-violet-500 rounded" />
                  <span className="text-slate-400">AI</span>
                </div>
              </div>
            </div>

            {/* Cumulative Profit */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                <DollarSign className="w-5 h-5 text-amber-400" />
                Cumulative Profit
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative']}
                    />
                    <ReferenceLine y={0} stroke="#64748b" />
                    <Area type="monotone" dataKey="cumProfit" fill="url(#cumProfitGradient)" stroke="#f59e0b" strokeWidth={2} />
                    <defs>
                      <linearGradient id="cumProfitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Signal Subscribers */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                <Radio className="w-5 h-5 text-teal-400" />
                Signal Subscribers &amp; MRR
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value: number, name: string) => {
                        if (name === 'signalMRR') return [`$${value.toFixed(0)}`, 'MRR'];
                        return [value, name === 'signalBasicSubs' ? 'Basic Subs' : 'Pro Subs'];
                      }}
                    />
                    <Bar yAxisId="left" dataKey="signalBasicSubs" fill="#22d3ee" name="Basic Subs" />
                    <Bar yAxisId="left" dataKey="signalProSubs" fill="#2dd4bf" name="Pro Subs" />
                    <Line yAxisId="right" type="monotone" dataKey="signalMRR" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} name="MRR" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* User Growth */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-violet-400" />
                User Growth
              </h3>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="week" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid #374151', borderRadius: '8px' }}
                      formatter={(value: number, name: string) => {
                        const labels: Record<string, string> = { totalUsers: 'Total Users', avgDailyActiveUsers: 'DAU' };
                        return [value, labels[name] || name];
                      }}
                    />
                    <Line type="monotone" dataKey="totalUsers" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 2 }} />
                    <Line type="monotone" dataKey="avgDailyActiveUsers" stroke="#ec4899" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#ec4899', r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-5">
              <h3 className="font-semibold mb-4 text-white">Weekly Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="text-left p-2 text-slate-400">Week</th>
                      <th className="text-right p-2 text-slate-400">Users</th>
                      <th className="text-right p-2 text-slate-400">DAU</th>
                      <th className="text-right p-2 text-slate-400">Revenue</th>
                      <th className="text-right p-2 text-slate-400">Fixed</th>
                      <th className="text-right p-2 text-amber-400/80">Var$</th>
                      <th className="text-right p-2 text-violet-400/80">AI$</th>
                      <th className="text-right p-2 text-slate-400">Cost</th>
                      <th className="text-right p-2 text-slate-400">Profit</th>
                      <th className="text-right p-2 text-slate-400">Cum.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {weeklyData.slice(0, 12).map((w) => (
                      <tr key={w.week} className="hover:bg-white/5">
                        <td className="p-2 font-medium text-white">{w.week}</td>
                        <td className="p-2 text-right text-slate-300">{w.totalUsers}</td>
                        <td className="p-2 text-right text-pink-400">{w.avgDailyActiveUsers}</td>
                        <td className="p-2 text-right font-sans text-green-400">${w.totalRevenue}</td>
                        <td className="p-2 text-right font-sans text-slate-400">${w.fixedCost}</td>
                        <td className="p-2 text-right font-sans text-amber-400">${w.variableCost}</td>
                        <td className="p-2 text-right font-sans text-violet-400">${w.aiCost}</td>
                        <td className="p-2 text-right font-sans text-red-400">${w.totalCost}</td>
                        <td className={`p-2 text-right font-sans ${w.profit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>${w.profit}</td>
                        <td className={`p-2 text-right font-sans ${w.cumProfit >= 0 ? 'text-amber-400' : 'text-red-400'}`}>${w.cumProfit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {weeks > 12 && <p className="text-xs text-slate-500 text-center mt-3">Showing 12 of {weeks} weeks</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
