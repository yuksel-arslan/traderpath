'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ScoreRing, PulseDot, FlowArrow } from '@/components/ui/intelligence';
import { CoinIcon } from '@/components/common/CoinIcon';

interface FlowStep {
  id: string;
  label: string;
  status: 'bullish' | 'bearish' | 'neutral' | 'ready';
  value: string;
  detail: string;
  score: number;
}

interface SuggestedAsset {
  symbol: string;
  name: string;
  market: string;
  sector?: string;
  riskLevel: 'low' | 'medium' | 'high';
  reason: string;
}

interface SectorFlow {
  name: string;
  flow7d: number;
  trending: 'up' | 'down' | 'stable';
  topAssets: string[];
}

interface FlowChainProps {
  capitalFlow: {
    liquidityBias: 'risk_on' | 'risk_off' | 'neutral';
    markets: {
      market: string;
      flow7d: number;
      phase: string;
      rotationSignal: string | null;
      sectors?: SectorFlow[];
    }[];
    recommendation: {
      primaryMarket: string;
      phase: string;
      action: string;
      confidence: number;
      reason: string;
      sectors?: string[];
      suggestedAssets?: SuggestedAsset[];
    };
  } | null;
}

const statusColors: Record<string, string> = {
  bullish: '#00F5A0',
  bearish: '#FF4757',
  neutral: '#FFB800',
  ready: '#00D4FF',
};

const riskColors: Record<string, { text: string; bg: string }> = {
  low: { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10' },
  medium: { text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-500/10' },
  high: { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
};

function buildFlowSteps(
  capitalFlow: FlowChainProps['capitalFlow']
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
  const flowScore = Math.min(100, Math.max(0, Math.round(capitalFlow.recommendation.confidence)));

  // Sector: Use recommended sector name from capital flow
  const sectorName = capitalFlow.recommendation.sectors?.[0] || capitalFlow.recommendation.primaryMarket || '--';
  const sectorScore = Math.min(100, Math.max(0, flowScore - 5));

  // Find matching sector data from the primary market to get trending info
  const primaryMarketData = capitalFlow.markets.find(
    (m) => m.market === capitalFlow.recommendation.primaryMarket
  );
  const matchingSector = primaryMarketData?.sectors?.find(
    (s) => s.name === sectorName
  );
  const sectorTrending = matchingSector?.trending;
  const sectorStatus: FlowStep['status'] = sectorTrending === 'up' ? 'bullish' : sectorTrending === 'down' ? 'bearish' : biasStatus;

  // Asset: Use suggestedAssets from capital flow recommendation (NOT recent analyses)
  const suggestedAssets = capitalFlow.recommendation.suggestedAssets || [];
  const topAsset = suggestedAssets[0];

  // Fallback: if no suggestedAssets, try topAssets from the matching sector
  const fallbackAsset = !topAsset && matchingSector?.topAssets?.[0]
    ? matchingSector.topAssets[0]
    : null;

  const assetSymbol = topAsset?.symbol?.replace(/USDT$/i, '') || fallbackAsset || '--';
  const assetRisk = topAsset?.riskLevel;
  const assetConfidence = assetRisk === 'low' ? 80 : assetRisk === 'medium' ? 60 : assetRisk === 'high' ? 40 : 0;
  const assetScore = topAsset ? Math.min(100, Math.max(0, assetConfidence)) : 0;
  const assetCount = suggestedAssets.length;
  const assetDetail = assetCount > 1
    ? `${assetCount} assets recommended`
    : topAsset
      ? `${topAsset.sector || sectorName} · ${topAsset.riskLevel} risk`
      : fallbackAsset
        ? `${sectorName} sector top asset`
        : 'No recommendation';

  // Trade Plan: Use capital flow recommendation action and direction
  const action = capitalFlow.recommendation.action;
  const hasPlan = topAsset && action !== 'avoid';
  const planValue = hasPlan
    ? `${action.toUpperCase()} ${assetSymbol}`
    : action === 'avoid'
      ? 'AVOID'
      : '--';
  const planDetail = topAsset?.reason?.slice(0, 50) || capitalFlow.recommendation.reason?.slice(0, 50) || 'Run capital flow analysis';
  const planStatus: FlowStep['status'] = action === 'analyze' ? 'ready' : action === 'wait' ? 'neutral' : 'bearish';

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
      status: sectorStatus,
      value: sectorName,
      detail: matchingSector
        ? `${matchingSector.trending} trend · ${matchingSector.flow7d >= 0 ? '+' : ''}${matchingSector.flow7d.toFixed(1)}% 7d`
        : capitalFlow.recommendation.reason?.slice(0, 40) || 'Sector rotation data',
      score: sectorScore,
    },
    {
      id: 'asset',
      label: 'Top Asset',
      status: assetScore >= 60 ? 'bullish' : assetScore >= 40 ? 'neutral' : topAsset ? 'bearish' : 'neutral',
      value: assetSymbol,
      detail: assetDetail,
      score: assetScore,
    },
    {
      id: 'plan',
      label: 'Trade Plan',
      status: hasPlan ? planStatus : 'neutral',
      value: planValue,
      detail: planDetail,
      score: hasPlan ? flowScore : 0,
    },
  ];
}

function getTopAssets(capitalFlow: FlowChainProps['capitalFlow']): SuggestedAsset[] {
  if (!capitalFlow) return [];

  const suggested = capitalFlow.recommendation.suggestedAssets || [];
  if (suggested.length > 0) return suggested.slice(0, 5);

  // Fallback: collect topAssets from sectors of the primary market
  const primaryMarketData = capitalFlow.markets.find(
    (m) => m.market === capitalFlow.recommendation.primaryMarket
  );
  if (!primaryMarketData?.sectors) return [];

  const fallbacks: SuggestedAsset[] = [];
  for (const sector of primaryMarketData.sectors) {
    for (const symbol of sector.topAssets || []) {
      if (fallbacks.length >= 5) break;
      fallbacks.push({
        symbol: symbol.replace(/USDT$/i, ''),
        name: symbol.replace(/USDT$/i, ''),
        market: capitalFlow.recommendation.primaryMarket,
        sector: sector.name,
        riskLevel: 'medium',
        reason: `${sector.name} sector top asset`,
      });
    }
    if (fallbacks.length >= 5) break;
  }
  return fallbacks;
}

export function FlowChain({ capitalFlow }: FlowChainProps) {
  const steps = buildFlowSteps(capitalFlow);
  const topAssets = getTopAssets(capitalFlow);

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

      {/* TOP ASSETS — shown below the pipeline */}
      {topAssets.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-medium uppercase tracking-widest text-gray-500 dark:text-white/40">
              Top Assets
            </span>
            <span className="text-[10px] text-gray-400 dark:text-white/30">
              {topAssets.length} recommended
            </span>
          </div>

          {/* Desktop: horizontal row */}
          <div className="hidden sm:grid grid-cols-5 gap-2">
            {topAssets.map((asset) => {
              const clean = asset.symbol.replace(/USDT$/i, '');
              const risk = riskColors[asset.riskLevel] || riskColors.medium;
              const confidence = asset.riskLevel === 'low' ? 80 : asset.riskLevel === 'medium' ? 60 : 40;

              return (
                <Link
                  key={clean}
                  href={`/analyze?symbol=${clean}USDT&timeframe=4h`}
                  className="group rounded-lg p-3 transition-all hover:scale-[1.02]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <CoinIcon symbol={clean} size={24} />
                    <div className="min-w-0 flex-1">
                      <span
                        className="text-sm font-bold text-gray-900 dark:text-white block truncate"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {clean}
                      </span>
                    </div>
                    <ScoreRing score={confidence} size={28} strokeWidth={2.5} color={confidence >= 70 ? '#00F5A0' : confidence >= 50 ? '#FFB800' : '#FF4757'} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${risk.text} ${risk.bg}`}>
                      {asset.riskLevel}
                    </span>
                    <div className="flex items-center gap-0.5 text-[10px] font-medium text-gray-400 dark:text-white/30 group-hover:text-[#00D4FF] transition-colors">
                      Analyze
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>

                  {asset.sector && (
                    <p className="text-[10px] text-gray-400 dark:text-white/25 mt-1.5 truncate">
                      {asset.sector}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Mobile: vertical list */}
          <div className="sm:hidden space-y-2">
            {topAssets.map((asset) => {
              const clean = asset.symbol.replace(/USDT$/i, '');
              const risk = riskColors[asset.riskLevel] || riskColors.medium;
              const confidence = asset.riskLevel === 'low' ? 80 : asset.riskLevel === 'medium' ? 60 : 40;

              return (
                <Link
                  key={clean}
                  href={`/analyze?symbol=${clean}USDT&timeframe=4h`}
                  className="flex items-center gap-3 rounded-lg p-3 transition-all active:scale-[0.98]"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <CoinIcon symbol={clean} size={28} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-sm font-bold text-gray-900 dark:text-white"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {clean}
                      </span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${risk.text} ${risk.bg}`}>
                        {asset.riskLevel}
                      </span>
                    </div>
                    {asset.sector && (
                      <p className="text-[10px] text-gray-400 dark:text-white/30 truncate mt-0.5">
                        {asset.sector}
                      </p>
                    )}
                  </div>
                  <ScoreRing score={confidence} size={28} strokeWidth={2.5} color={confidence >= 70 ? '#00F5A0' : confidence >= 50 ? '#FFB800' : '#FF4757'} />
                  <ArrowRight className="w-4 h-4 text-gray-400 dark:text-white/30" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
