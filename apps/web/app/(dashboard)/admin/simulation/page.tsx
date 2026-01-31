'use client';

import { useState, useMemo } from 'react';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Settings,
  ArrowLeft,
  RefreshCw,
  Target,
  Zap,
  Users,
  Cpu,
  Bell,
  Mail,
  MessageCircle,
  FileText,
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
  aiCostPerAnalysis: number; // USD per analysis

  // Notification Costs (per notification)
  emailCostPerNotification: number;
  telegramCostPerNotification: number;
  discordCostPerNotification: number;
  reportGenerationCost: number;

  // Notification Settings
  notificationsPerAnalysis: number;
  reportGenerationRate: number;

  // Daily Pass Pricing (credits)
  layer3PassCredits: number; // Sector Activity
  layer4PassCredits: number; // AI Recommendations
  analysisPassCredits: number; // Asset Analysis
  maxAnalysesPerDay: number;

  // Credit Pricing
  creditPriceUsd: number;

  // User Projections
  weeklyNewUsers: number;
  userRetentionRate: number;
  weeklyGrowthRate: number;

  // User Activity Distribution (how many users use each pass daily)
  layer3UsageRate: number; // % of active users using L3
  layer4UsageRate: number; // % of active users using L4
  analysisUsageRate: number; // % of active users using Analysis
  avgAnalysesPerActiveUser: number; // avg analyses per user per day

  // Daily Active User Rate (% of total users active per day)
  dailyActiveRate: number;
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
  notificationCost: number;
  reportCost: number;
  totalCost: number;
  profit: number;
  cumProfit: number;
  totalAnalyses: number;
}

// ===========================================
// Default Configuration
// ===========================================

// AI Model Costs (USD per analysis - approximate)
const AI_MODEL_COSTS: Record<AIModel, number> = {
  'gemini-2.5-flash': 0.003,
  'gemini-2.5-pro': 0.02,
};

const defaultConfig: SimulationConfig = {
  // Fixed Costs
  claudeCodeCost: 100,
  vercelCost: 20,
  railwayCost: 20,
  neonDbCost: 20,

  // AI Costs
  aiModel: 'gemini-2.5-flash',
  aiCostPerAnalysis: AI_MODEL_COSTS['gemini-2.5-flash'],

  // Notification Costs
  emailCostPerNotification: 0.0001,
  telegramCostPerNotification: 0,
  discordCostPerNotification: 0,
  reportGenerationCost: 0.005,

  // Notification Settings
  notificationsPerAnalysis: 2,
  reportGenerationRate: 30,

  // Daily Pass Pricing (credits)
  layer3PassCredits: 25,
  layer4PassCredits: 25,
  analysisPassCredits: 100,
  maxAnalysesPerDay: 10,

  // Credit Pricing
  creditPriceUsd: 0.10,

  // User Projections
  weeklyNewUsers: 10,
  userRetentionRate: 70,
  weeklyGrowthRate: 5,

  // User Activity Distribution
  layer3UsageRate: 60, // 60% use Sector Activity
  layer4UsageRate: 40, // 40% use AI Recommendations
  analysisUsageRate: 30, // 30% do Asset Analysis
  avgAnalysesPerActiveUser: 3, // avg 3 analyses per active user

  // Daily Active Rate
  dailyActiveRate: 25, // 25% of users active daily
};

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
      // Calculate users with growth and retention
      const newUsers = Math.round(config.weeklyNewUsers * Math.pow(1 + config.weeklyGrowthRate / 100, i - 1));
      const retainedUsers = Math.round(totalUsers * (config.userRetentionRate / 100));
      totalUsers = retainedUsers + newUsers;

      // Daily active users (average over the week)
      const avgDailyActiveUsers = Math.round(totalUsers * (config.dailyActiveRate / 100));

      // Active days in a week (7 days * active rate)
      const activeDaysPerWeek = 7;

      // Daily Pass Revenue (per day)
      // Users who use L3
      const l3UsersPerDay = Math.round(avgDailyActiveUsers * (config.layer3UsageRate / 100));
      const l3DailyRevenue = l3UsersPerDay * config.layer3PassCredits * config.creditPriceUsd;

      // Users who use L4
      const l4UsersPerDay = Math.round(avgDailyActiveUsers * (config.layer4UsageRate / 100));
      const l4DailyRevenue = l4UsersPerDay * config.layer4PassCredits * config.creditPriceUsd;

      // Users who do Asset Analysis
      const analysisUsersPerDay = Math.round(avgDailyActiveUsers * (config.analysisUsageRate / 100));
      const analysisDailyRevenue = analysisUsersPerDay * config.analysisPassCredits * config.creditPriceUsd;

      // Weekly Revenue
      const layer3Revenue = l3DailyRevenue * activeDaysPerWeek;
      const layer4Revenue = l4DailyRevenue * activeDaysPerWeek;
      const analysisRevenue = analysisDailyRevenue * activeDaysPerWeek;
      const totalRevenue = layer3Revenue + layer4Revenue + analysisRevenue;

      // Total analyses per week
      const totalAnalyses = Math.round(analysisUsersPerDay * config.avgAnalysesPerActiveUser * activeDaysPerWeek);

      // AI cost: only for Asset Analysis
      const aiCost = totalAnalyses * config.aiCostPerAnalysis;

      // Notification costs
      const totalNotifications = totalAnalyses * config.notificationsPerAnalysis;
      const avgNotificationCost = (
        config.emailCostPerNotification +
        config.telegramCostPerNotification +
        config.discordCostPerNotification
      ) / 3;
      const notificationCost = totalNotifications * avgNotificationCost;

      // Report generation costs
      const reportsGenerated = Math.round(totalAnalyses * (config.reportGenerationRate / 100));
      const reportCost = reportsGenerated * config.reportGenerationCost;

      // Total cost and profit
      const fixedCost = weeklyFixedCost;
      const totalCost = fixedCost + aiCost + notificationCost + reportCost;
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
        notificationCost: Number(notificationCost.toFixed(4)),
        reportCost: Number(reportCost.toFixed(4)),
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
    const avgWeeklyProfit = totalProfit / weeks;
    const breakEvenWeek = weeklyData.findIndex(w => w.cumProfit >= 0) + 1;

    // Revenue breakdown
    const l3Total = weeklyData.reduce((sum, w) => sum + w.layer3Revenue, 0);
    const l4Total = weeklyData.reduce((sum, w) => sum + w.layer4Revenue, 0);
    const analysisTotal = weeklyData.reduce((sum, w) => sum + w.analysisRevenue, 0);

    // Daily pass totals (per active user per day)
    const dailyPassTotal = config.layer3PassCredits + config.layer4PassCredits + config.analysisPassCredits;
    const dailyPassUsd = dailyPassTotal * config.creditPriceUsd;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      avgWeeklyProfit,
      breakEvenWeek: breakEvenWeek > 0 ? breakEvenWeek : 'N/A',
      finalUsers: lastWeek?.totalUsers || 0,
      finalDailyActive: lastWeek?.avgDailyActiveUsers || 0,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      l3Total,
      l4Total,
      analysisTotal,
      dailyPassTotal,
      dailyPassUsd,
    };
  }, [weeklyData, weeks, config]);

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
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Calculator className="w-8 h-8 text-primary" />
              Revenue Simulation
            </h1>
            <p className="text-muted-foreground mt-1">Daily Pass Model - 150 Credits/Active Day</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-accent transition"
        >
          <RefreshCw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* Daily Pass Summary */}
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-8">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-amber-500" />
          Daily Pass Pricing Model
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Layer 3</span>
            </div>
            <p className="text-2xl font-bold">{config.layer3PassCredits}</p>
            <p className="text-xs text-muted-foreground">credits/day</p>
          </div>
          <div className="bg-card/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Target className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">Layer 4</span>
            </div>
            <p className="text-2xl font-bold">{config.layer4PassCredits}</p>
            <p className="text-xs text-muted-foreground">credits/day</p>
          </div>
          <div className="bg-card/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-violet-500" />
              <span className="text-sm font-medium">Analysis</span>
            </div>
            <p className="text-2xl font-bold">{config.analysisPassCredits}</p>
            <p className="text-xs text-muted-foreground">credits/day</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-lg p-4 text-center border border-amber-500/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">Total/Day</span>
            </div>
            <p className="text-2xl font-bold text-amber-500">{summary.dailyPassTotal}</p>
            <p className="text-xs text-muted-foreground">${summary.dailyPassUsd.toFixed(2)} USD</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span className="text-sm text-muted-foreground">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-green-500">${summary.totalRevenue.toFixed(2)}</p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-sm text-muted-foreground">Total Cost</span>
          </div>
          <p className="text-2xl font-bold text-red-500">${summary.totalCost.toFixed(2)}</p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">Net Profit</span>
          </div>
          <p className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            ${summary.totalProfit.toFixed(2)}
          </p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-muted-foreground">Break-even</span>
          </div>
          <p className="text-2xl font-bold text-amber-500">
            {typeof summary.breakEvenWeek === 'number' ? `Week ${summary.breakEvenWeek}` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-muted-foreground">Layer 3 Revenue</span>
          </div>
          <p className="text-xl font-bold text-purple-500">${summary.l3Total.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{((summary.l3Total / summary.totalRevenue) * 100 || 0).toFixed(1)}% of total</p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-amber-500" />
            <span className="text-sm text-muted-foreground">Layer 4 Revenue</span>
          </div>
          <p className="text-xl font-bold text-amber-500">${summary.l4Total.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{((summary.l4Total / summary.totalRevenue) * 100 || 0).toFixed(1)}% of total</p>
        </div>

        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-violet-500" />
            <span className="text-sm text-muted-foreground">Analysis Revenue</span>
          </div>
          <p className="text-xl font-bold text-violet-500">${summary.analysisTotal.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{((summary.analysisTotal / summary.totalRevenue) * 100 || 0).toFixed(1)}% of total</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
          {/* Daily Pass Settings */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Daily Pass Settings
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-sm">Layer 3 (Sectors)</span>
                  </div>
                  <span className="text-sm font-mono">{config.layer3PassCredits} cr</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={config.layer3PassCredits}
                  onChange={(e) => updateConfig('layer3PassCredits', Number(e.target.value))}
                  className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-sm">Layer 4 (AI Recs)</span>
                  </div>
                  <span className="text-sm font-mono">{config.layer4PassCredits} cr</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={config.layer4PassCredits}
                  onChange={(e) => updateConfig('layer4PassCredits', Number(e.target.value))}
                  className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-violet-500" />
                    <span className="text-sm">Asset Analysis</span>
                  </div>
                  <span className="text-sm font-mono">{config.analysisPassCredits} cr</span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="200"
                  value={config.analysisPassCredits}
                  onChange={(e) => updateConfig('analysisPassCredits', Number(e.target.value))}
                  className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Max Analyses/Day</span>
                  <span className="text-sm font-mono">{config.maxAnalysesPerDay}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={config.maxAnalysesPerDay}
                  onChange={(e) => updateConfig('maxAnalysesPerDay', Number(e.target.value))}
                  className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total/Day</span>
                  <span className="font-mono text-amber-500">
                    {config.layer3PassCredits + config.layer4PassCredits + config.analysisPassCredits} credits
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Credit Pricing */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Credit Pricing
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Credit Price (USD)</span>
                  <span className="text-sm font-mono">${config.creditPriceUsd.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.50"
                  step="0.01"
                  value={config.creditPriceUsd}
                  onChange={(e) => updateConfig('creditPriceUsd', Number(e.target.value))}
                  className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span>Revenue/Active User/Day</span>
                  <span className="font-mono text-green-500">
                    ${((config.layer3PassCredits + config.layer4PassCredits + config.analysisPassCredits) * config.creditPriceUsd).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Costs */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Monthly Fixed Costs
            </h3>
            <div className="space-y-4">
              {[
                { key: 'claudeCodeCost', label: 'Claude Code', color: 'bg-purple-500' },
                { key: 'vercelCost', label: 'Vercel', color: 'bg-blue-500' },
                { key: 'railwayCost', label: 'Railway', color: 'bg-indigo-500' },
                { key: 'neonDbCost', label: 'Neon DB', color: 'bg-green-500' },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${color}`} />
                      <span className="text-sm">{label}</span>
                    </div>
                    <span className="text-sm font-mono">${config[key as keyof SimulationConfig]}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={config[key as keyof SimulationConfig] as number}
                    onChange={(e) => updateConfig(key as keyof SimulationConfig, Number(e.target.value))}
                    className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Monthly</span>
                  <span className="font-mono">
                    ${config.claudeCodeCost + config.vercelCost + config.railwayCost + config.neonDbCost}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Costs */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Cpu className="w-4 h-4" />
              AI Cost (per Analysis)
            </h3>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground mb-2 block">Model Selection</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateAIModel('gemini-2.5-flash')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      config.aiModel === 'gemini-2.5-flash'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent hover:bg-accent/80'
                    }`}
                  >
                    Flash
                  </button>
                  <button
                    onClick={() => updateAIModel('gemini-2.5-pro')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      config.aiModel === 'gemini-2.5-pro'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent hover:bg-accent/80'
                    }`}
                  >
                    Pro
                  </button>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Cost/Analysis</span>
                  <span className="text-sm font-mono text-red-400">${config.aiCostPerAnalysis.toFixed(4)}</span>
                </div>
                <input
                  type="range"
                  min="0.001"
                  max="0.05"
                  step="0.001"
                  value={config.aiCostPerAnalysis}
                  onChange={(e) => updateConfig('aiCostPerAnalysis', Number(e.target.value))}
                  className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* User Projections */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" />
              User Projections
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">New Users/Week</span>
                  <span className="text-sm font-mono">{config.weeklyNewUsers}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={config.weeklyNewUsers}
                  onChange={(e) => updateConfig('weeklyNewUsers', Number(e.target.value))}
                  className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Retention Rate</span>
                  <span className="text-sm font-mono">{config.userRetentionRate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.userRetentionRate}
                  onChange={(e) => updateConfig('userRetentionRate', Number(e.target.value))}
                  className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Weekly Growth Rate</span>
                  <span className="text-sm font-mono">{config.weeklyGrowthRate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={config.weeklyGrowthRate}
                  onChange={(e) => updateConfig('weeklyGrowthRate', Number(e.target.value))}
                  className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Daily Active Rate</span>
                  <span className="text-sm font-mono">{config.dailyActiveRate}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="80"
                  value={config.dailyActiveRate}
                  onChange={(e) => updateConfig('dailyActiveRate', Number(e.target.value))}
                  className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Usage Distribution */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Usage Distribution
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">L3 Usage Rate</span>
                  <span className="text-sm font-mono text-purple-500">{config.layer3UsageRate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.layer3UsageRate}
                  onChange={(e) => updateConfig('layer3UsageRate', Number(e.target.value))}
                  className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">L4 Usage Rate</span>
                  <span className="text-sm font-mono text-amber-500">{config.layer4UsageRate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.layer4UsageRate}
                  onChange={(e) => updateConfig('layer4UsageRate', Number(e.target.value))}
                  className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Analysis Usage Rate</span>
                  <span className="text-sm font-mono text-violet-500">{config.analysisUsageRate}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={config.analysisUsageRate}
                  onChange={(e) => updateConfig('analysisUsageRate', Number(e.target.value))}
                  className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Avg Analyses/User/Day</span>
                  <span className="text-sm font-mono">{config.avgAnalysesPerActiveUser}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={config.avgAnalysesPerActiveUser}
                  onChange={(e) => updateConfig('avgAnalysesPerActiveUser', Number(e.target.value))}
                  className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Simulation Period */}
          <div className="bg-card border rounded-lg p-4">
            <div className="flex justify-between mb-2">
              <span className="font-semibold">Simulation Period</span>
              <span className="font-mono">{weeks} weeks</span>
            </div>
            <input
              type="range"
              min="4"
              max="52"
              value={weeks}
              onChange={(e) => setWeeks(Number(e.target.value))}
              className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Charts Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revenue by Pass Type */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              Weekly Revenue by Pass Type
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={{ stroke: '#374151' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={{ stroke: '#374151' }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      padding: '10px',
                    }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        layer3Revenue: 'Layer 3 (Sectors)',
                        layer4Revenue: 'Layer 4 (AI Recs)',
                        analysisRevenue: 'Asset Analysis',
                      };
                      return [`$${value.toFixed(2)}`, labels[name] || name];
                    }}
                    labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                  />
                  <Bar dataKey="layer3Revenue" stackId="a" fill="#a855f7" />
                  <Bar dataKey="layer4Revenue" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="analysisRevenue" stackId="a" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded" />
                <span>Layer 3</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-500 rounded" />
                <span>Layer 4</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-violet-500 rounded" />
                <span>Analysis</span>
              </div>
            </div>
          </div>

          {/* Weekly Profit Chart */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Weekly Profitability
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={{ stroke: '#374151' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={{ stroke: '#374151' }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      padding: '10px',
                    }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        totalRevenue: 'Revenue',
                        totalCost: 'Cost',
                        profit: 'Profit',
                      };
                      return [`$${value.toFixed(2)}`, labels[name] || name];
                    }}
                    labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                  />
                  <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
                  <Area
                    type="monotone"
                    dataKey="totalRevenue"
                    fill="#10b981"
                    fillOpacity={0.1}
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalCost"
                    stroke="#ef4444"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 3 }}
                    activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span>Revenue</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-red-500" style={{ borderStyle: 'dashed', borderWidth: 1 }} />
                <span>Cost</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-blue-500" />
                <span>Profit</span>
              </div>
            </div>
          </div>

          {/* Cumulative Profit Chart */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
              Cumulative Profit
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={{ stroke: '#374151' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={{ stroke: '#374151' }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      padding: '10px',
                    }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative Profit']}
                    labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                  />
                  <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
                  <Area
                    type="monotone"
                    dataKey="cumProfit"
                    fill="url(#cumProfitGradient)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                  />
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

          {/* User Growth Chart */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              User & Analysis Growth
            </h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={{ stroke: '#374151' }}
                  />
                  <YAxis
                    yAxisId="users"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={{ stroke: '#374151' }}
                  />
                  <YAxis
                    yAxisId="analyses"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={{ stroke: '#374151' }}
                    tickLine={{ stroke: '#374151' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      padding: '10px',
                    }}
                    formatter={(value: number, name: string) => {
                      const labels: Record<string, string> = {
                        totalUsers: 'Total Users',
                        avgDailyActiveUsers: 'Daily Active',
                        totalAnalyses: 'Analyses/Week',
                      };
                      return [value, labels[name] || name];
                    }}
                    labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                  />
                  <Line
                    yAxisId="users"
                    type="monotone"
                    dataKey="totalUsers"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ fill: '#a855f7', r: 3 }}
                  />
                  <Line
                    yAxisId="users"
                    type="monotone"
                    dataKey="avgDailyActiveUsers"
                    stroke="#ec4899"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ fill: '#ec4899', r: 3 }}
                  />
                  <Line
                    yAxisId="analyses"
                    type="monotone"
                    dataKey="totalAnalyses"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={{ fill: '#06b6d4', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-purple-500" />
                <span>Total Users</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-pink-500" style={{ borderStyle: 'dashed' }} />
                <span>Daily Active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-cyan-500" />
                <span>Analyses/Week</span>
              </div>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-semibold mb-4">Weekly Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-accent/50">
                  <tr>
                    <th className="text-left p-2">Week</th>
                    <th className="text-right p-2">Users</th>
                    <th className="text-right p-2">DAU</th>
                    <th className="text-right p-2">L3</th>
                    <th className="text-right p-2">L4</th>
                    <th className="text-right p-2">Analysis</th>
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
                      <td className="p-2 text-right font-mono text-purple-400">${w.layer3Revenue}</td>
                      <td className="p-2 text-right font-mono text-amber-400">${w.layer4Revenue}</td>
                      <td className="p-2 text-right font-mono text-violet-400">${w.analysisRevenue}</td>
                      <td className="p-2 text-right font-mono text-green-500">${w.totalRevenue}</td>
                      <td className="p-2 text-right font-mono text-red-500">${w.totalCost}</td>
                      <td className={`p-2 text-right font-mono ${w.profit >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                        ${w.profit}
                      </td>
                      <td className={`p-2 text-right font-mono ${w.cumProfit >= 0 ? 'text-amber-500' : 'text-red-500'}`}>
                        ${w.cumProfit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {weeks > 12 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Showing first 12 of {weeks} weeks
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
