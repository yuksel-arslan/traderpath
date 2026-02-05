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
  Globe,
  Activity,
  Clock,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Area, ComposedChart, BarChart, Bar } from 'recharts';

// ===========================================
// Types
// ===========================================

type AIModel = 'gemini-2.5-flash' | 'gemini-2.5-pro';

interface SimulationConfig {
  // Fixed Costs (Monthly)
  claudeCodeCost: number;
  vercelCost: number;
  railwayCost: number;
  neonDbCost: number;

  // AI Costs (per analysis)
  aiModel: AIModel;
  aiCostPerAnalysis: number;

  // Daily Pass Pricing (credits)
  layer3PassCredits: number;
  layer4PassCredits: number;
  analysisPassCredits: number;

  // Credit Pricing
  creditPriceUsd: number;

  // User Projections
  weeklyNewUsers: number;
  userRetentionRate: number;
  dailyActiveRate: number;

  // Usage Distribution
  layer3UsageRate: number;
  layer4UsageRate: number;
  analysisUsageRate: number;
  avgAnalysesPerActiveUser: number;
}

interface WeeklyData {
  week: string;
  weekNum: number;
  totalUsers: number;
  avgDailyActiveUsers: number;
  layer3Revenue: number;
  layer4Revenue: number;
  analysisRevenue: number;
  totalRevenue: number;
  fixedCost: number;
  aiCost: number;
  totalCost: number;
  profit: number;
  cumProfit: number;
  totalAnalyses: number;
}

// ===========================================
// Default Configuration
// ===========================================

const AI_MODEL_COSTS: Record<AIModel, number> = {
  'gemini-2.5-flash': 0.003,
  'gemini-2.5-pro': 0.02,
};

const defaultConfig: SimulationConfig = {
  claudeCodeCost: 100,
  vercelCost: 20,
  railwayCost: 20,
  neonDbCost: 20,
  aiModel: 'gemini-2.5-flash',
  aiCostPerAnalysis: AI_MODEL_COSTS['gemini-2.5-flash'],
  layer3PassCredits: 25,
  layer4PassCredits: 25,
  analysisPassCredits: 100,
  creditPriceUsd: 0.10,
  weeklyNewUsers: 10,
  userRetentionRate: 70,
  dailyActiveRate: 25,
  layer3UsageRate: 60,
  layer4UsageRate: 40,
  analysisUsageRate: 30,
  avgAnalysesPerActiveUser: 3,
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
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  prefix?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 px-2 py-1.5 text-right font-mono text-sm border rounded-lg bg-background"
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
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
    const weeklyFixedCost = (config.claudeCodeCost + config.vercelCost + config.railwayCost + config.neonDbCost) / 4;

    for (let i = 1; i <= weeks; i++) {
      const newUsers = Math.round(config.weeklyNewUsers);
      const retainedUsers = Math.round(totalUsers * (config.userRetentionRate / 100));
      totalUsers = retainedUsers + newUsers;

      const avgDailyActiveUsers = Math.round(totalUsers * (config.dailyActiveRate / 100));
      const activeDaysPerWeek = 7;

      const l3UsersPerDay = Math.round(avgDailyActiveUsers * (config.layer3UsageRate / 100));
      const l3DailyRevenue = l3UsersPerDay * config.layer3PassCredits * config.creditPriceUsd;

      const l4UsersPerDay = Math.round(avgDailyActiveUsers * (config.layer4UsageRate / 100));
      const l4DailyRevenue = l4UsersPerDay * config.layer4PassCredits * config.creditPriceUsd;

      const analysisUsersPerDay = Math.round(avgDailyActiveUsers * (config.analysisUsageRate / 100));
      const analysisDailyRevenue = analysisUsersPerDay * config.analysisPassCredits * config.creditPriceUsd;

      const layer3Revenue = l3DailyRevenue * activeDaysPerWeek;
      const layer4Revenue = l4DailyRevenue * activeDaysPerWeek;
      const analysisRevenue = analysisDailyRevenue * activeDaysPerWeek;
      const totalRevenue = layer3Revenue + layer4Revenue + analysisRevenue;

      const totalAnalyses = Math.round(analysisUsersPerDay * config.avgAnalysesPerActiveUser * activeDaysPerWeek);
      const aiCost = totalAnalyses * config.aiCostPerAnalysis;

      const fixedCost = weeklyFixedCost;
      const totalCost = fixedCost + aiCost;
      const profit = totalRevenue - totalCost;
      cumProfit += profit;

      data.push({
        week: `W${i}`,
        weekNum: i,
        totalUsers,
        avgDailyActiveUsers,
        layer3Revenue: Number(layer3Revenue.toFixed(2)),
        layer4Revenue: Number(layer4Revenue.toFixed(2)),
        analysisRevenue: Number(analysisRevenue.toFixed(2)),
        totalRevenue: Number(totalRevenue.toFixed(2)),
        fixedCost: Number(fixedCost.toFixed(2)),
        aiCost: Number(aiCost.toFixed(2)),
        totalCost: Number(totalCost.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        cumProfit: Number(cumProfit.toFixed(2)),
        totalAnalyses,
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

    const l3Total = weeklyData.reduce((sum, w) => sum + w.layer3Revenue, 0);
    const l4Total = weeklyData.reduce((sum, w) => sum + w.layer4Revenue, 0);
    const analysisTotal = weeklyData.reduce((sum, w) => sum + w.analysisRevenue, 0);

    const dailyPassTotal = config.layer3PassCredits + config.layer4PassCredits + config.analysisPassCredits;
    const dailyPassUsd = dailyPassTotal * config.creditPriceUsd;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      breakEvenWeek: breakEvenWeek > 0 ? breakEvenWeek : 'N/A',
      finalUsers: lastWeek?.totalUsers || 0,
      l3Total,
      l4Total,
      analysisTotal,
      dailyPassTotal,
      dailyPassUsd,
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
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/finance" className="p-2 hover:bg-accent rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Calculator className="w-7 h-7 text-primary" />
              Revenue Simulation
            </h1>
            <p className="text-sm text-muted-foreground">Daily Pass Model</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-accent transition"
        >
          <RefreshCw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Revenue</span>
          </div>
          <p className="text-xl font-bold text-green-500">${summary.totalRevenue.toFixed(0)}</p>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-xs text-muted-foreground">Cost</span>
          </div>
          <p className="text-xl font-bold text-red-500">${summary.totalCost.toFixed(0)}</p>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Profit</span>
          </div>
          <p className={`text-xl font-bold ${summary.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${summary.totalProfit.toFixed(0)}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-muted-foreground">Break-even</span>
          </div>
          <p className="text-xl font-bold text-amber-500">
            {typeof summary.breakEvenWeek === 'number' ? `W${summary.breakEvenWeek}` : 'N/A'}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Final Users</span>
          </div>
          <p className="text-xl font-bold text-purple-500">{summary.finalUsers}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="space-y-4">
          {/* Daily Pass Pricing */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-amber-500" />
              Daily Pass Pricing
            </h3>
            <div className="space-y-3">
              <NumberInput
                label="Layer 3 (Sectors)"
                value={config.layer3PassCredits}
                onChange={(v) => updateConfig('layer3PassCredits', v)}
                min={1}
                max={100}
                suffix="cr"
              />
              <NumberInput
                label="Layer 4 (AI Recs)"
                value={config.layer4PassCredits}
                onChange={(v) => updateConfig('layer4PassCredits', v)}
                min={1}
                max={100}
                suffix="cr"
              />
              <NumberInput
                label="Asset Analysis"
                value={config.analysisPassCredits}
                onChange={(v) => updateConfig('analysisPassCredits', v)}
                min={10}
                max={500}
                suffix="cr"
              />
              <div className="pt-2 border-t flex justify-between text-sm">
                <span className="font-medium">Total/Day</span>
                <span className="font-mono text-amber-500">{summary.dailyPassTotal} cr (${summary.dailyPassUsd.toFixed(2)})</span>
              </div>
            </div>
          </div>

          {/* Credit Pricing */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-green-500" />
              Credit Pricing
            </h3>
            <NumberInput
              label="Credit Price"
              value={config.creditPriceUsd}
              onChange={(v) => updateConfig('creditPriceUsd', v)}
              min={0.01}
              max={1}
              step={0.01}
              prefix="$"
            />
          </div>

          {/* Fixed Costs */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <Layers className="w-4 h-4 text-slate-500" />
              Monthly Fixed Costs
            </h3>
            <div className="space-y-3">
              <NumberInput label="Claude Code" value={config.claudeCodeCost} onChange={(v) => updateConfig('claudeCodeCost', v)} prefix="$" />
              <NumberInput label="Vercel" value={config.vercelCost} onChange={(v) => updateConfig('vercelCost', v)} prefix="$" />
              <NumberInput label="Railway" value={config.railwayCost} onChange={(v) => updateConfig('railwayCost', v)} prefix="$" />
              <NumberInput label="Neon DB" value={config.neonDbCost} onChange={(v) => updateConfig('neonDbCost', v)} prefix="$" />
              <div className="pt-2 border-t flex justify-between text-sm">
                <span className="font-medium">Total/Month</span>
                <span className="font-mono">${config.claudeCodeCost + config.vercelCost + config.railwayCost + config.neonDbCost}</span>
              </div>
            </div>
          </div>

          {/* AI Cost */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <Cpu className="w-4 h-4 text-violet-500" />
              AI Cost
            </h3>
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => updateAIModel('gemini-2.5-flash')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    config.aiModel === 'gemini-2.5-flash' ? 'bg-primary text-primary-foreground' : 'bg-accent'
                  }`}
                >
                  Flash ($0.003)
                </button>
                <button
                  onClick={() => updateAIModel('gemini-2.5-pro')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    config.aiModel === 'gemini-2.5-pro' ? 'bg-primary text-primary-foreground' : 'bg-accent'
                  }`}
                >
                  Pro ($0.02)
                </button>
              </div>
              <NumberInput
                label="Per Analysis"
                value={config.aiCostPerAnalysis}
                onChange={(v) => updateConfig('aiCostPerAnalysis', v)}
                min={0.001}
                max={0.1}
                step={0.001}
                prefix="$"
              />
            </div>
          </div>

          {/* User Projections */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-purple-500" />
              User Projections
            </h3>
            <div className="space-y-3">
              <NumberInput label="New Users/Week" value={config.weeklyNewUsers} onChange={(v) => updateConfig('weeklyNewUsers', v)} min={1} max={500} />
              <NumberInput label="Retention Rate" value={config.userRetentionRate} onChange={(v) => updateConfig('userRetentionRate', v)} min={0} max={100} suffix="%" />
              <NumberInput label="Daily Active Rate" value={config.dailyActiveRate} onChange={(v) => updateConfig('dailyActiveRate', v)} min={1} max={100} suffix="%" />
            </div>
          </div>

          {/* Usage Distribution */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <Activity className="w-4 h-4 text-teal-500" />
              Usage Distribution
            </h3>
            <div className="space-y-3">
              <NumberInput label="L3 Usage" value={config.layer3UsageRate} onChange={(v) => updateConfig('layer3UsageRate', v)} min={0} max={100} suffix="%" />
              <NumberInput label="L4 Usage" value={config.layer4UsageRate} onChange={(v) => updateConfig('layer4UsageRate', v)} min={0} max={100} suffix="%" />
              <NumberInput label="Analysis Usage" value={config.analysisUsageRate} onChange={(v) => updateConfig('analysisUsageRate', v)} min={0} max={100} suffix="%" />
              <NumberInput label="Avg Analyses/User/Day" value={config.avgAnalysesPerActiveUser} onChange={(v) => updateConfig('avgAnalysesPerActiveUser', v)} min={1} max={10} />
            </div>
          </div>

          {/* Simulation Period */}
          <div className="bg-card border rounded-lg p-4">
            <NumberInput label="Simulation Period" value={weeks} onChange={setWeeks} min={4} max={52} suffix="weeks" />
          </div>
        </div>

        {/* Charts Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Revenue by Pass Type */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <Layers className="w-4 h-4 text-primary" />
              Weekly Revenue by Pass Type
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
                      const labels: Record<string, string> = { layer3Revenue: 'L3', layer4Revenue: 'L4', analysisRevenue: 'Analysis' };
                      return [`$${value.toFixed(2)}`, labels[name] || name];
                    }}
                  />
                  <Bar dataKey="layer3Revenue" stackId="a" fill="#a855f7" />
                  <Bar dataKey="layer4Revenue" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="analysisRevenue" stackId="a" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-purple-500 rounded" /><span>L3 (${summary.l3Total.toFixed(0)})</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-500 rounded" /><span>L4 (${summary.l4Total.toFixed(0)})</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 bg-violet-500 rounded" /><span>Analysis (${summary.analysisTotal.toFixed(0)})</span></div>
            </div>
          </div>

          {/* Profitability */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-primary" />
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

          {/* Cumulative Profit */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-amber-500" />
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

          {/* User Growth */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <Users className="w-4 h-4 text-purple-500" />
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
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-sm">Weekly Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-accent/50">
                  <tr>
                    <th className="text-left p-2">Week</th>
                    <th className="text-right p-2">Users</th>
                    <th className="text-right p-2">DAU</th>
                    <th className="text-right p-2">Revenue</th>
                    <th className="text-right p-2">Cost</th>
                    <th className="text-right p-2">Profit</th>
                    <th className="text-right p-2">Cum.</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {weeklyData.slice(0, 12).map((w) => (
                    <tr key={w.week} className="hover:bg-accent/30">
                      <td className="p-2 font-medium">{w.week}</td>
                      <td className="p-2 text-right">{w.totalUsers}</td>
                      <td className="p-2 text-right text-pink-400">{w.avgDailyActiveUsers}</td>
                      <td className="p-2 text-right font-mono text-green-500">${w.totalRevenue}</td>
                      <td className="p-2 text-right font-mono text-red-500">${w.totalCost}</td>
                      <td className={`p-2 text-right font-mono ${w.profit >= 0 ? 'text-blue-500' : 'text-red-500'}`}>${w.profit}</td>
                      <td className={`p-2 text-right font-mono ${w.cumProfit >= 0 ? 'text-amber-500' : 'text-red-500'}`}>${w.cumProfit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {weeks > 12 && <p className="text-xs text-muted-foreground text-center mt-2">Showing 12 of {weeks} weeks</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
