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
} from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Area, ComposedChart } from 'recharts';

// ===========================================
// Types
// ===========================================

interface SimulationConfig {
  // Fixed Costs (Monthly)
  claudeCodeCost: number;
  vercelCost: number;
  railwayCost: number;
  neonDbCost: number;

  // Revenue Settings
  creditPriceUsd: number;
  creditsPerAnalysis: number;

  // User Projections
  weeklyNewUsers: number;
  userRetentionRate: number; // percentage
  analysesPerUserPerWeek: number;

  // Growth
  weeklyGrowthRate: number; // percentage
}

interface WeeklyData {
  week: string;
  weekNum: number;
  users: number;
  analyses: number;
  revenue: number;
  cost: number;
  profit: number;
  cumProfit: number;
}

// ===========================================
// Default Configuration
// ===========================================

const defaultConfig: SimulationConfig = {
  // Fixed Costs
  claudeCodeCost: 100,
  vercelCost: 20,
  railwayCost: 20,
  neonDbCost: 20,

  // Revenue
  creditPriceUsd: 0.10,
  creditsPerAnalysis: 25,

  // User Projections
  weeklyNewUsers: 10,
  userRetentionRate: 70,
  analysesPerUserPerWeek: 3,

  // Growth
  weeklyGrowthRate: 5,
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

      // Calculate analyses and revenue
      const analyses = Math.round(totalUsers * config.analysesPerUserPerWeek);
      const creditsUsed = analyses * config.creditsPerAnalysis;
      const revenue = creditsUsed * config.creditPriceUsd;

      // Cost and profit
      const cost = weeklyFixedCost;
      const profit = revenue - cost;
      cumProfit += profit;

      data.push({
        week: `W${i}`,
        weekNum: i,
        users: totalUsers,
        analyses,
        revenue: Number(revenue.toFixed(2)),
        cost: Number(cost.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        cumProfit: Number(cumProfit.toFixed(2)),
      });
    }

    return data;
  }, [config, weeks]);

  // Summary calculations
  const summary = useMemo(() => {
    const lastWeek = weeklyData[weeklyData.length - 1];
    const totalRevenue = weeklyData.reduce((sum, w) => sum + w.revenue, 0);
    const totalCost = weeklyData.reduce((sum, w) => sum + w.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const avgWeeklyProfit = totalProfit / weeks;
    const breakEvenWeek = weeklyData.findIndex(w => w.cumProfit >= 0) + 1;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      avgWeeklyProfit,
      breakEvenWeek: breakEvenWeek || 'N/A',
      finalUsers: lastWeek?.users || 0,
      finalWeeklyRevenue: lastWeek?.revenue || 0,
      profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    };
  }, [weeklyData, weeks]);

  const handleReset = () => setConfig(defaultConfig);

  const updateConfig = (key: keyof SimulationConfig, value: number) => {
    setConfig(prev => ({ ...prev, [key]: value }));
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
            <p className="text-muted-foreground mt-1">Project revenue and profitability scenarios</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-6">
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
                    value={config[key as keyof SimulationConfig]}
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

          {/* Revenue Settings */}
          <div className="bg-card border rounded-lg p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Revenue Settings
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
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm">Credits per Analysis</span>
                  <span className="text-sm font-mono">{config.creditsPerAnalysis}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50"
                  value={config.creditsPerAnalysis}
                  onChange={(e) => updateConfig('creditsPerAnalysis', Number(e.target.value))}
                  className="w-full h-2 bg-accent rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span>Revenue per Analysis</span>
                  <span className="font-mono text-green-500">
                    ${(config.creditPriceUsd * config.creditsPerAnalysis).toFixed(2)}
                  </span>
                </div>
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
                  <span className="text-sm">Analyses/User/Week</span>
                  <span className="text-sm font-mono">{config.analysesPerUserPerWeek}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={config.analysesPerUserPerWeek}
                  onChange={(e) => updateConfig('analysesPerUserPerWeek', Number(e.target.value))}
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
                        revenue: 'Revenue',
                        cost: 'Cost',
                        profit: 'Profit',
                      };
                      return [`$${value.toFixed(2)}`, labels[name] || name];
                    }}
                    labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                  />
                  <ReferenceLine y={0} stroke="#64748b" strokeWidth={1} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    fill="#10b981"
                    fillOpacity={0.1}
                    stroke="#10b981"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="cost"
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
                      return [value, name === 'users' ? 'Active Users' : 'Analyses'];
                    }}
                    labelStyle={{ color: '#9ca3af', marginBottom: '4px' }}
                  />
                  <Line
                    yAxisId="users"
                    type="monotone"
                    dataKey="users"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ fill: '#a855f7', r: 3 }}
                  />
                  <Line
                    yAxisId="analyses"
                    type="monotone"
                    dataKey="analyses"
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
                <span>Users (left axis)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-cyan-500" />
                <span>Analyses (right axis)</span>
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
                    <th className="text-right p-2">Analyses</th>
                    <th className="text-right p-2">Revenue</th>
                    <th className="text-right p-2">Cost</th>
                    <th className="text-right p-2">Profit</th>
                    <th className="text-right p-2">Cum. Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {weeklyData.slice(0, 12).map((w) => (
                    <tr key={w.week} className="hover:bg-accent/30">
                      <td className="p-2 font-medium">{w.week}</td>
                      <td className="p-2 text-right">{w.users}</td>
                      <td className="p-2 text-right">{w.analyses}</td>
                      <td className="p-2 text-right font-mono text-green-500">${w.revenue}</td>
                      <td className="p-2 text-right font-mono text-red-500">${w.cost}</td>
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
