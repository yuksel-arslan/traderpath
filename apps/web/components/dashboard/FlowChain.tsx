'use client';

import { ScoreRing, PulseDot, FlowArrow } from '@/components/ui/intelligence';

interface FlowStep {
  id: string;
  label: string;
  status: 'bullish' | 'bearish' | 'neutral' | 'ready';
  value: string;
  detail: string;
  score: number;
}

interface FlowChainProps {
  capitalFlow: {
    liquidityBias: 'risk_on' | 'risk_off' | 'neutral';
    markets: {
      market: string;
      flow7d: number;
      phase: string;
      rotationSignal: string | null;
    }[];
    recommendation: {
      primaryMarket: string;
      phase: string;
      action: string;
      confidence: number;
      reason: string;
      sectors?: string[];
    };
  } | null;
  recentAnalyses: { symbol: string; direction?: string; score: number; entryPrice?: number; stopLoss?: number; takeProfit1?: number }[];
}

const statusColors: Record<string, string> = {
  bullish: '#00F5A0',
  bearish: '#FF4757',
  neutral: '#FFB800',
  ready: '#00D4FF',
};

function buildFlowSteps(
  capitalFlow: FlowChainProps['capitalFlow'],
  recentAnalyses: FlowChainProps['recentAnalyses']
): FlowStep[] {
  if (!capitalFlow) {
    return [
      { id: 'flow', label: 'Capital Flow', status: 'neutral', value: '--', detail: 'Loading...', score: 0 },
      { id: 'sector', label: 'Sector', status: 'neutral', value: '--', detail: 'Loading...', score: 0 },
      { id: 'asset', label: 'Top Asset', status: 'neutral', value: '--', detail: 'Loading...', score: 0 },
      { id: 'plan', label: 'Trade Plan', status: 'neutral', value: '--', detail: 'Loading...', score: 0 },
    ];
  }

  const bias = capitalFlow.liquidityBias;
  const biasStatus = bias === 'risk_on' ? 'bullish' : bias === 'risk_off' ? 'bearish' : 'neutral';
  const topMarket = [...capitalFlow.markets].sort((a, b) => b.flow7d - a.flow7d)[0];
  const flowValue = topMarket
    ? `${topMarket.flow7d >= 0 ? '+' : ''}$${Math.abs(topMarket.flow7d).toFixed(1)}B`
    : '--';
  const flowScore = Math.min(100, Math.max(0, Math.round(capitalFlow.recommendation.confidence * 100)));

  const sectorName = capitalFlow.recommendation.sectors?.[0] || capitalFlow.recommendation.primaryMarket || '--';
  const sectorScore = Math.min(100, Math.max(0, flowScore - 5));

  const topAnalysis = recentAnalyses[0];
  const assetSymbol = topAnalysis?.symbol?.replace(/USDT$/i, '') || '--';
  const assetScore = topAnalysis?.score || 0;

  const hasPlan = topAnalysis && topAnalysis.entryPrice;
  const planValue = hasPlan
    ? `${topAnalysis.direction?.toUpperCase() || 'LONG'} ${assetSymbol}`
    : '--';
  const planDetail = hasPlan
    ? `Entry $${topAnalysis.entryPrice} | SL $${topAnalysis.stopLoss || '--'} | TP $${topAnalysis.takeProfit1 || '--'}`
    : 'Run analysis for trade plan';

  return [
    {
      id: 'flow',
      label: 'Capital Flow',
      status: biasStatus,
      value: flowValue,
      detail: topMarket ? `${topMarket.market} · ${topMarket.phase} phase` : 'No data',
      score: flowScore,
    },
    {
      id: 'sector',
      label: 'Sector',
      status: biasStatus,
      value: sectorName,
      detail: capitalFlow.recommendation.reason?.slice(0, 40) || 'Sector rotation data',
      score: sectorScore,
    },
    {
      id: 'asset',
      label: 'Top Asset',
      status: assetScore >= 70 ? 'bullish' : assetScore >= 40 ? 'neutral' : 'bearish',
      value: assetSymbol,
      detail: topAnalysis ? `Score: ${assetScore}/100` : 'No recent analysis',
      score: assetScore,
    },
    {
      id: 'plan',
      label: 'Trade Plan',
      status: hasPlan ? 'ready' : 'neutral',
      value: planValue,
      detail: planDetail,
      score: hasPlan ? assetScore : 0,
    },
  ];
}

export function FlowChain({ capitalFlow, recentAnalyses }: FlowChainProps) {
  const steps = buildFlowSteps(capitalFlow, recentAnalyses);

  return (
    <div className="rounded-xl p-5 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-white/40">
          Flow &rarr; Action Pipeline
        </span>
        <PulseDot color="#00F5A0" size={6} />
      </div>
      {/* Desktop: horizontal, Mobile: vertical */}
      <div className="hidden lg:flex items-stretch gap-0">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center flex-1">
            <div
              className="rounded-lg p-3 flex-1 min-w-[140px]"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${statusColors[step.status]}30`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/35">
                  {step.label}
                </span>
                <ScoreRing score={step.score} size={32} strokeWidth={2.5} color={statusColors[step.status]} />
              </div>
              <div className="text-sm font-bold" style={{ color: statusColors[step.status] }}>
                {step.value}
              </div>
              <div className="text-[11px] mt-1 text-gray-500 dark:text-white/40 truncate">
                {step.detail}
              </div>
            </div>
            {i < steps.length - 1 && <FlowArrow color={statusColors[step.status]} />}
          </div>
        ))}
      </div>
      {/* Mobile: vertical stack */}
      <div className="lg:hidden space-y-3">
        {steps.map((step, i) => (
          <div key={step.id}>
            <div
              className="rounded-lg p-3"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${statusColors[step.status]}30`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/35">
                  {step.label}
                </span>
                <ScoreRing score={step.score} size={32} strokeWidth={2.5} color={statusColors[step.status]} />
              </div>
              <div className="text-sm font-bold" style={{ color: statusColors[step.status] }}>
                {step.value}
              </div>
              <div className="text-[11px] mt-1 text-gray-500 dark:text-white/40">
                {step.detail}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex justify-center py-1">
                <svg width="16" height="24" viewBox="0 0 16 24" fill="none">
                  <path d="M8 0V20M8 20L2 14M8 20L14 14" stroke={statusColors[step.status]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
                    <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
                  </path>
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
